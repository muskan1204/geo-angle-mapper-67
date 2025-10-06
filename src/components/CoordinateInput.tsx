import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';
import { parseDMSCoordinates, validateDMSInput } from '@/utils/coordinates';
import { toast } from '@/hooks/use-toast';

interface CoordinateInputProps {
  onLocationSet: (lat: number, lng: number) => void;
}

const CoordinateInput: React.FC<CoordinateInputProps> = ({ onLocationSet }) => {
  const [input, setInput] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleInputChange = (value: string) => {
    setInput(value);
    // Check if it's a valid DMS coordinate
    setIsValid(validateDMSInput(value) || value.trim().length > 0);
  };

  const handleSubmit = async () => {
    // First try to parse as DMS coordinates
    const coords = parseDMSCoordinates(input);
    if (coords) {
      onLocationSet(coords.latitude, coords.longitude);
      toast({
        title: "Location Set",
        description: "Map centered on coordinates",
      });
      return;
    }

    // If not DMS, try geocoding as address
    if (input.trim()) {
      setIsSearching(true);
      try {
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ address: input });
        
        if (result.results && result.results.length > 0) {
          const location = result.results[0].geometry.location;
          onLocationSet(location.lat(), location.lng());
          toast({
            title: "Location Found",
            description: result.results[0].formatted_address,
          });
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

  const handleExampleClick = () => {
    const example = "28°52'43.1\"N 77°07'34.0\"E";
    setInput(example);
    setIsValid(true);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Navigation className="h-5 w-5 text-map-primary" />
          Coordinate Input
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="coordinates" className="text-sm font-medium">
            Search by Address or Coordinates
          </Label>
          <Input
            id="coordinates"
            placeholder="New Delhi, India or 28°52'43.1&quot;N 77°07'34.0&quot;E"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && isValid && handleSubmit()}
            className="text-sm transition-colors"
          />
          <p className="text-xs text-muted-foreground">
            Enter an address, place name, or DMS coordinates
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleSubmit}
            disabled={!isValid || isSearching}
            className="flex-1 bg-map-primary hover:bg-map-primary/90 text-white"
          >
            <MapPin className="mr-2 h-4 w-4" />
            {isSearching ? 'Searching...' : 'Search Location'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExampleClick}
            className="border-map-primary text-map-primary hover:bg-map-primary/10"
          >
            Example
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CoordinateInput;