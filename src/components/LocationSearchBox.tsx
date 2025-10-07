import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, MapPin } from 'lucide-react';
import { parseDMSCoordinates, validateDMSInput } from '@/utils/coordinates';
import { toast } from '@/hooks/use-toast';

interface LocationSearchBoxProps {
  onLocationSet: (lat: number, lng: number) => void;
  onClose: () => void;
}

const LocationSearchBox: React.FC<LocationSearchBoxProps> = ({ onLocationSet, onClose }) => {
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    // Wait for Google Maps API to load
    const initializeServices = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        autocompleteService.current = new google.maps.places.AutocompleteService();
        const div = document.createElement('div');
        placesService.current = new google.maps.places.PlacesService(div);
      } else {
        // Retry after a short delay if not loaded yet
        setTimeout(initializeServices, 100);
      }
    };
    
    initializeServices();
  }, []);

  const handleInputChange = (value: string) => {
    setInput(value);
    
    // Get autocomplete predictions
    if (value.length > 2 && autocompleteService.current && !validateDMSInput(value)) {
      autocompleteService.current.getPlacePredictions(
        { input: value },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setPredictions(predictions);
          } else {
            setPredictions([]);
          }
        }
      );
    } else {
      setPredictions([]);
    }
  };

  const handleSearch = async (address?: string) => {
    const searchTerm = address || input;
    
    // First try to parse as DMS coordinates
    const coords = parseDMSCoordinates(searchTerm);
    if (coords) {
      onLocationSet(coords.latitude, coords.longitude);
      toast({
        title: "Location Set",
        description: "Map centered on coordinates",
      });
      onClose();
      return;
    }

    // If not DMS, try geocoding as address
    if (searchTerm.trim()) {
      // Check if Google Maps is loaded
      if (!window.google || !window.google.maps) {
        toast({
          title: "Loading Maps",
          description: "Please wait for Google Maps to load...",
          variant: "destructive"
        });
        return;
      }

      setIsSearching(true);
      try {
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ address: searchTerm });
        
        if (result.results && result.results.length > 0) {
          const location = result.results[0].geometry.location;
          onLocationSet(location.lat(), location.lng());
          toast({
            title: "Location Found",
            description: result.results[0].formatted_address,
          });
          setPredictions([]);
          onClose();
        } else {
          toast({
            title: "Location Not Found",
            description: "Please try a different address or use DMS coordinates",
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "Search Error",
          description: "Unable to search for this location",
          variant: "destructive"
        });
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handlePredictionClick = (prediction: google.maps.places.AutocompletePrediction) => {
    setInput(prediction.description);
    handleSearch(prediction.description);
  };

  return (
    <div className="bg-card border rounded-lg shadow-lg p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium flex items-center gap-2">
          <Search className="h-4 w-4 text-map-primary" />
          Search Location
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <div className="relative">
          <Input
            placeholder="Search address or enter coordinates..."
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pr-10"
          />
          <Button
            size="sm"
            onClick={() => handleSearch()}
            disabled={isSearching || !input.trim()}
            className="absolute right-1 top-1 h-8 px-3 bg-map-primary hover:bg-map-primary/90 text-white"
          >
            {isSearching ? '...' : <MapPin className="h-4 w-4" />}
          </Button>
        </div>

        {/* Autocomplete dropdown */}
        {predictions.length > 0 && (
          <div className="bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto z-50">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                onClick={() => handlePredictionClick(prediction)}
                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors text-sm border-b last:border-b-0"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{prediction.structured_formatting.main_text}</div>
                    <div className="text-xs text-muted-foreground">
                      {prediction.structured_formatting.secondary_text}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Enter an address, place name, or DMS coordinates (e.g., 28°52'43.1"N 77°07'34.0"E)
        </p>
      </div>
    </div>
  );
};

export default LocationSearchBox;
