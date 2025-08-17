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

  const handleInputChange = (value: string) => {
    setInput(value);
    setIsValid(validateDMSInput(value));
  };

  const handleSubmit = () => {
    const coords = parseDMSCoordinates(input);
    if (coords) {
      onLocationSet(coords.latitude, coords.longitude);
      toast({
        title: "Location Set",
        description: "Map centered on coordinates",
      });
    } else {
      toast({
        title: "Invalid Format",
        description: "Please use format: 28°52'43.1\"N 77°07'34.0\"E",
        variant: "destructive"
      });
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
            Enter Coordinates (DMS Format)
          </Label>
          <Input
            id="coordinates"
            placeholder="28°52'43.1&quot;N 77°07'34.0&quot;E"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            className={`font-mono text-sm transition-colors ${
              input && !isValid ? 'border-destructive' : isValid ? 'border-success' : ''
            }`}
          />
          <p className="text-xs text-muted-foreground">
            Format: Degrees°Minutes&apos;Seconds&quot;Direction
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleSubmit}
            disabled={!isValid}
            className="flex-1 bg-map-primary hover:bg-map-primary/90 text-white"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Set Location
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExampleClick}
            className="border-map-primary text-map-primary hover:bg-map-primary/10"
          >
            Example
          </Button>
        </div>
        
        {input && !isValid && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
            Invalid format. Please ensure you include degrees (°), minutes (&apos;), seconds (&quot;), and direction (N/S/E/W).
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CoordinateInput;