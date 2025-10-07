import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import LocationSearchBox from '@/components/LocationSearchBox';
import MapDisplay from '@/components/MapDisplay';
import MeasurementsList from '@/components/MeasurementsList';
import { calculateBearing, calculateDistance, Point } from '@/utils/bearing';
import { MapPin, Crosshair } from 'lucide-react';

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

const Index = () => {
  const [mapCenter, setMapCenter] = useState({ lat: 28.8789, lng: 77.1258 }); // Default to Delhi
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [lines, setLines] = useState<MapLine[]>([]);
  const [selectedMarkers, setSelectedMarkers] = useState<string[]>([]);

  const handleLocationSet = (lat: number, lng: number) => {
    setMapCenter({ lat, lng });
  };

  const handleMarkerAdd = (marker: MapMarker) => {
    setMarkers(prev => {
      const updated = [...prev, marker];
      const lastTwo = updated.slice(-2).map(m => m.id);
      if (lastTwo.length === 2) setSelectedMarkers(lastTwo);
      return updated;
    });
  };

  const handleMarkerSelect = (markerId: string) => {
    setSelectedMarkers(prev => {
      if (prev.includes(markerId)) {
        return prev.filter(id => id !== markerId);
      } else if (prev.length < 2) {
        return [...prev, markerId];
      } else {
        // Replace the first selected with the new one
        return [prev[1], markerId];
      }
    });
  };

  const handleMeasureWall = () => {
    if (selectedMarkers.length !== 2) {
      toast({
        title: "Select Two Points",
        description: "Please select exactly two markers to measure a wall",
        variant: "destructive"
      });
      return;
    }

    const marker1 = markers.find(m => m.id === selectedMarkers[0]);
    const marker2 = markers.find(m => m.id === selectedMarkers[1]);

    if (!marker1 || !marker2) return;

    const point1: Point = { lat: marker1.position.lat, lng: marker1.position.lng };
    const point2: Point = { lat: marker2.position.lat, lng: marker2.position.lng };

    const bearing = calculateBearing(point1, point2);
    const distance = calculateDistance(point1, point2);

    const newLine: MapLine = {
      id: `line-${Date.now()}`,
      start: point1,
      end: point2,
      bearing,
      distance,
      label: `Wall ${lines.length + 1}`
    };

    setLines(prev => [...prev, newLine]);
    setSelectedMarkers([]);

    toast({
      title: "Wall Measured",
      description: `Bearing: ${bearing.toFixed(1)}° from North`,
    });
  };

  const handleReset = () => {
    setMarkers([]);
    setLines([]);
    setSelectedMarkers([]);
    toast({
      title: "Reset Complete",
      description: "All markers and measurements cleared",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-6 w-6 text-map-primary" />
                <h1 className="text-xl font-bold">Property Surveyor</h1>
              </div>
              <div className="hidden sm:block text-sm text-muted-foreground">
                Professional mapping & bearing calculator
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedMarkers.length === 2 && (() => {
                const m1 = markers.find(m => m.id === selectedMarkers[0]);
                const m2 = markers.find(m => m.id === selectedMarkers[1]);
                if (!m1 || !m2) return null;
                const b = calculateBearing(
                  { lat: m1.position.lat, lng: m1.position.lng },
                  { lat: m2.position.lat, lng: m2.position.lng }
                );
                return (
                  <Badge className="bg-measurement-bg text-measurement-text">{b.toFixed(1)}°</Badge>
                );
              })()}

              {selectedMarkers.length === 2 && (
                <Button 
                  onClick={handleMeasureWall}
                  className="bg-success hover:bg-success/90 text-white"
                >
                  <Crosshair className="mr-2 h-4 w-4" />
                  Measure Wall
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="border-b bg-card/30 backdrop-blur-sm sticky top-[73px] z-10">
        <div className="container mx-auto px-4 py-3">
          <LocationSearchBox 
            onLocationSet={handleLocationSet}
            onClose={() => {}}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-1 space-y-6 overflow-y-auto">
            <MeasurementsList 
              lines={lines}
              onReset={handleReset}
              selectedMarkers={selectedMarkers}
              markerCount={markers.length}
            />
          </div>

          {/* Main Map Area */}
          <div className="lg:col-span-3 relative">
            <MapDisplay
              center={mapCenter}
              markers={markers}
              onMarkerAdd={handleMarkerAdd}
              onLineAdd={(line) => setLines(prev => [...prev, line])}
              lines={lines}
              selectedMarkers={selectedMarkers}
              onMarkerSelect={handleMarkerSelect}
            />
            
            {/* Map Instructions Overlay */}
            {markers.length === 0 && (
              <div className="absolute top-4 left-4 right-4 bg-card/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg z-10">
                <h3 className="font-medium mb-2">Getting Started</h3>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Search for a location or enter coordinates</li>
                  <li>2. Click on the map to place markers at wall corners</li>
                  <li>3. Select two markers to measure wall bearing</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
