import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ruler, RotateCcw, Trash2 } from 'lucide-react';
import { formatBearing, formatDistance } from '@/utils/bearing';

interface MapLine {
  id: string;
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  bearing: number;
  distance?: number;
  label: string;
}

interface MeasurementsListProps {
  lines: MapLine[];
  onReset: () => void;
  selectedMarkers: string[];
  markerCount: number;
}

const MeasurementsList: React.FC<MeasurementsListProps> = ({
  lines,
  onReset,
  selectedMarkers,
  markerCount
}) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ruler className="h-5 w-5 text-map-primary" />
            Measurements
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="text-destructive border-destructive hover:bg-destructive/10"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-map-primary"></div>
            <span>{markerCount} Points</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-marker-red"></div>
            <span>{selectedMarkers.length} Selected</span>
          </div>
        </div>

        {selectedMarkers.length === 2 && (
          <div className="p-3 bg-map-primary/10 rounded-lg border border-map-primary/20">
            <p className="text-sm text-map-primary font-medium">
              Click "Measure Wall" to calculate bearing between selected points
            </p>
          </div>
        )}

        {lines.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Ruler className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No measurements yet</p>
            <p className="text-xs mt-1">
              Click on map to add points, then select two points to measure
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Wall Measurements</h3>
            {lines.map((line, index) => (
              <div
                key={line.id}
                className="p-3 bg-card border rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Wall {index + 1}</h4>
                  <Badge variant="secondary" className="bg-measurement-bg text-measurement-text">
                    {formatBearing(line.bearing)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div>
                    <span className="block font-medium">Bearing from North</span>
                    <span className="text-map-primary font-mono text-sm">
                      {formatBearing(line.bearing)}
                    </span>
                  </div>
                  
                  {line.distance && (
                    <div>
                      <span className="block font-medium">Distance</span>
                      <span className="text-map-secondary font-mono text-sm">
                        {formatDistance(line.distance)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  <div className="font-mono">
                    Start: {line.start.lat.toFixed(6)}, {line.start.lng.toFixed(6)}
                  </div>
                  <div className="font-mono">
                    End: {line.end.lat.toFixed(6)}, {line.end.lng.toFixed(6)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {lines.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Total walls measured: {lines.length}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MeasurementsList;