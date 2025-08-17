import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { calculateBearing, Point } from '@/utils/bearing';
import { toDMS } from '@/utils/coordinates';

interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  label: string;
}

interface MapLine {
  id: string;
  start: Point;
  end: Point;
  bearing: number;
  distance: number;
  label: string;
}

interface LocationPin {
  position: { lat: number; lng: number };
  coordinates: string;
}

interface MapDisplayProps {
  center: { lat: number; lng: number };
  markers: MapMarker[];
  onMarkerAdd: (marker: MapMarker) => void;
  onLineAdd: (line: MapLine) => void;
  lines: MapLine[];
  selectedMarkers: string[];
  onMarkerSelect: (markerId: string) => void;
}

const MapDisplay: React.FC<MapDisplayProps> = ({
  center,
  markers,
  onMarkerAdd,
  onLineAdd,
  lines,
  selectedMarkers,
  onMarkerSelect
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const linesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
  const selectedLineRef = useRef<google.maps.Polyline | null>(null);
  const bearingInfoRef = useRef<google.maps.InfoWindow | null>(null);
  const locationPinRef = useRef<google.maps.Marker | null>(null);
  const locationInfoRef = useRef<google.maps.InfoWindow | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [locationPin, setLocationPin] = useState<LocationPin | null>(null);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    const loadGoogleMaps = () => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps && window.google.maps.Map) {
        console.log('Google Maps already loaded');
        initializeMap();
        return;
      }

      // Remove any existing script
      const existingScript = document.querySelector('script[src*="maps.gomaps.pro"]');
      if (existingScript) {
        existingScript.remove();
      }

      console.log('Loading Google Maps script...');
      const script = document.createElement('script');
      script.src = `https://maps.gomaps.pro/maps/api/js?key=AlzaSyiM8OYCyljsYjuky803NNye7gppnFGdYxO&libraries=geometry&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      // Create global callback
      (window as any).initGoogleMaps = () => {
        console.log('Google Maps loaded successfully');
        setLoadError(null);
        initializeMap();
      };

      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`Retrying... (${retryCount}/${maxRetries})`);
          setTimeout(loadGoogleMaps, 2000);
        } else {
          setLoadError('Failed to load Google Maps after multiple attempts');
        }
      };

      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current) {
        console.error('Map container not found');
        return;
      }

      if (!window.google || !window.google.maps) {
        console.error('Google Maps not available');
        setLoadError('Google Maps API not available');
        return;
      }

      try {
        console.log('Initializing map...');
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 18,
          mapTypeId: 'satellite',
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        });

        mapInstanceRef.current = map;
        setIsMapLoaded(true);
        setLoadError(null);
        console.log('Map initialized successfully');

        // Add click listener for adding markers and location pin
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const position = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng()
            };
            
            // Show yellow location pin with coordinates
            setLocationPin({
              position,
              coordinates: toDMS(position.lat, position.lng)
            });
            
            const newMarker: MapMarker = {
              id: `marker-${Date.now()}`,
              position,
              label: `Point ${markers.length + 1}`
            };
            
            onMarkerAdd(newMarker);
          }
        });
      } catch (error) {
        console.error('Error initializing map:', error);
        setLoadError('Error initializing map');
      }
    };

    loadGoogleMaps();

    // Cleanup
    return () => {
      if ((window as any).initGoogleMaps) {
        delete (window as any).initGoogleMaps;
      }
    };
  }, []);

  // Update map center when center prop changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(18);
    }
  }, [center]);

  // Update markers
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();

    // Add new markers
    markers.forEach(markerData => {
      const isSelected = selectedMarkers.includes(markerData.id);
      
      const marker = new google.maps.Marker({
        position: markerData.position,
        map: mapInstanceRef.current,
        title: markerData.label,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 12 : 8,
          fillColor: isSelected ? '#ef4444' : '#0ea5e9',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        label: {
          text: (markers.indexOf(markerData) + 1).toString(),
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 'bold'
        }
      });

      marker.addListener('click', () => {
        onMarkerSelect(markerData.id);
      });

      markersRef.current.set(markerData.id, marker);
    });
  }, [markers, selectedMarkers, isMapLoaded]);

  // Update lines
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return;

    // Clear existing lines
    linesRef.current.forEach(line => line.setMap(null));
    linesRef.current.clear();

    // Add new lines
    lines.forEach(lineData => {
      const line = new google.maps.Polyline({
        path: [lineData.start, lineData.end],
        geodesic: true,
        strokeColor: '#0ea5e9',
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: mapInstanceRef.current
      });

      linesRef.current.set(lineData.id, line);
    });
  }, [lines, isMapLoaded]);

  // Real-time bearing display when two markers are selected
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return;

    // Cleanup if not exactly two selected
    if (selectedMarkers.length !== 2) {
      if (selectedLineRef.current) {
        selectedLineRef.current.setMap(null);
        selectedLineRef.current = null;
      }
      if (bearingInfoRef.current) {
        bearingInfoRef.current.close();
        bearingInfoRef.current = null as any;
      }
      return;
    }

    const m1 = markers.find(m => m.id === selectedMarkers[0]);
    const m2 = markers.find(m => m.id === selectedMarkers[1]);
    if (!m1 || !m2) return;

    const start = new google.maps.LatLng(m1.position.lat, m1.position.lng);
    const end = new google.maps.LatLng(m2.position.lat, m2.position.lng);

    // Draw/Update temporary line
    if (!selectedLineRef.current) {
      selectedLineRef.current = new google.maps.Polyline({
        path: [start, end],
        geodesic: true,
        strokeColor: '#22c55e',
        strokeOpacity: 0.9,
        strokeWeight: 3,
        map: mapInstanceRef.current
      });
    } else {
      selectedLineRef.current.setPath([start, end]);
    }

    // Compute bearing using geometry.spherical
    let heading = 0;
    if (google.maps.geometry && google.maps.geometry.spherical) {
      heading = google.maps.geometry.spherical.computeHeading(start, end);
    } else {
      // Fallback to our own bearing
      heading = calculateBearing({ lat: m1.position.lat, lng: m1.position.lng }, { lat: m2.position.lat, lng: m2.position.lng });
    }
    const normalized = (heading + 360) % 360;

    // Show InfoWindow at midpoint
    const midpoint = new google.maps.LatLng(
      (m1.position.lat + m2.position.lat) / 2,
      (m1.position.lng + m2.position.lng) / 2
    );

    const content = `<div style="padding:6px 10px;border-radius:8px;background:hsl(var(--measurement-bg));color:hsl(var(--measurement-text));font-weight:600;font-family:ui-monospace, SFMono-Regular, Menlo, monospace;box-shadow:0 8px 20px rgba(0,0,0,0.15);">${normalized.toFixed(1)}°</div>`;

    if (!bearingInfoRef.current) {
      bearingInfoRef.current = new google.maps.InfoWindow({
        content,
        position: midpoint,
        disableAutoPan: true,
      });
      bearingInfoRef.current.open({ map: mapInstanceRef.current });
    } else {
      bearingInfoRef.current.setContent(content);
      bearingInfoRef.current.setPosition(midpoint);
      if (!(bearingInfoRef.current as any).getMap()) {
        bearingInfoRef.current.open({ map: mapInstanceRef.current });
      }
    }
  }, [selectedMarkers, markers, isMapLoaded]);

  // Yellow location pin display
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return;

    // Clear existing location pin
    if (locationPinRef.current) {
      locationPinRef.current.setMap(null);
      locationPinRef.current = null;
    }
    if (locationInfoRef.current) {
      locationInfoRef.current.close();
      locationInfoRef.current = null;
    }

    // Add new location pin if exists
    if (locationPin) {
      // Create yellow pin similar to Google Earth Pro
      locationPinRef.current = new google.maps.Marker({
        position: locationPin.position,
        map: mapInstanceRef.current,
        icon: {
          path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
          fillColor: '#FFD700', // Golden yellow
          fillOpacity: 0.9,
          strokeColor: '#000000',
          strokeWeight: 1,
          scale: 1.5,
          anchor: new google.maps.Point(0, 0),
        },
        title: locationPin.coordinates,
        zIndex: 1000
      });

      // Show coordinates info window
      const content = `
        <div style="
          padding: 8px 12px;
          background: #FFD700;
          color: #000000;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px;
          font-weight: 600;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border: 1px solid #000000;
          white-space: nowrap;
        ">
          📍 ${locationPin.coordinates}
        </div>
      `;

      locationInfoRef.current = new google.maps.InfoWindow({
        content,
        position: locationPin.position,
        disableAutoPan: false,
      });

      locationInfoRef.current.open({ map: mapInstanceRef.current });

      // Auto-hide after 5 seconds
      setTimeout(() => {
        if (locationInfoRef.current) {
          locationInfoRef.current.close();
        }
      }, 5000);
    }
  }, [locationPin, isMapLoaded]);

  return (
    <Card className="w-full h-full overflow-hidden relative">
      <div 
        ref={mapRef} 
        className="w-full h-full min-h-[500px] bg-muted/20"
        style={{ minHeight: '500px' }}
      />
      {!isMapLoaded && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-4 border-map-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading Google Maps...</p>
          </div>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-center space-y-2 p-4">
            <div className="text-destructive text-sm font-medium">Map Loading Error</div>
            <p className="text-xs text-muted-foreground">{loadError}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="text-xs text-map-primary hover:underline"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default MapDisplay;
