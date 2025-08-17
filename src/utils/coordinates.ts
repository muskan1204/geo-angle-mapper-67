// Utility functions for coordinate formatting

export function toDMS(lat: number, lng: number): string {
  const formatDMS = (coord: number, isLatitude: boolean) => {
    const direction = isLatitude 
      ? (coord >= 0 ? 'N' : 'S')
      : (coord >= 0 ? 'E' : 'W');
    
    const absolute = Math.abs(coord);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;
    
    return `${degrees}°${minutes.toString().padStart(2, '0')}'${seconds.toFixed(1).padStart(4, '0')}"${direction}`;
  };

  return `${formatDMS(lat, true)} ${formatDMS(lng, false)}`;
}

export function fromDMS(dmsString: string): { lat: number; lng: number } | null {
  // This is a simplified parser - you might want to make it more robust
  const regex = /(\d+)°(\d+)'([\d.]+)"([NSEW])/g;
  const matches = Array.from(dmsString.matchAll(regex));
  
  if (matches.length !== 2) return null;
  
  const coords = matches.map(match => {
    const degrees = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const seconds = parseFloat(match[3]);
    const direction = match[4];
    
    let decimal = degrees + minutes / 60 + seconds / 3600;
    
    if (direction === 'S' || direction === 'W') {
      decimal = -decimal;
    }
    
    return decimal;
  });
  
  return { lat: coords[0], lng: coords[1] };
}

// Existing functions for compatibility
export function validateDMSInput(input: string): boolean {
  if (!input.trim()) return false;
  
  // Check for basic DMS format pattern
  const pattern = /^\s*\d+°\d+'\d+\.?\d*"\s*[NS]\s+\d+°\d+'\d+\.?\d*"\s*[EW]\s*$/i;
  return pattern.test(input);
}

export function parseDMSCoordinates(input: string): { latitude: number; longitude: number } | null {
  const result = fromDMS(input);
  if (!result) return null;
  
  return {
    latitude: result.lat,
    longitude: result.lng
  };
}