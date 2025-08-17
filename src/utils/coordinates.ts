export interface DMSCoordinate {
  degrees: number;
  minutes: number;
  seconds: number;
  direction: 'N' | 'S' | 'E' | 'W';
}

export interface ParsedCoordinates {
  latitude: number;
  longitude: number;
}

export function parseDMSCoordinates(input: string): ParsedCoordinates | null {
  // Remove extra spaces and normalize
  const cleaned = input.trim().replace(/\s+/g, ' ');
  
  // Regex to match DMS format: 28°52'43.1"N 77°07'34.0"E
  const dmsRegex = /(\d+)°(\d+)'([\d.]+)"([NSEW])\s+(\d+)°(\d+)'([\d.]+)"([NSEW])/;
  const match = cleaned.match(dmsRegex);
  
  if (!match) {
    return null;
  }
  
  const [, deg1, min1, sec1, dir1, deg2, min2, sec2, dir2] = match;
  
  // Determine which is lat and which is lng
  let latDeg, latMin, latSec, latDir, lngDeg, lngMin, lngSec, lngDir;
  
  if (dir1 === 'N' || dir1 === 'S') {
    [latDeg, latMin, latSec, latDir] = [parseInt(deg1), parseInt(min1), parseFloat(sec1), dir1];
    [lngDeg, lngMin, lngSec, lngDir] = [parseInt(deg2), parseInt(min2), parseFloat(sec2), dir2];
  } else {
    [lngDeg, lngMin, lngSec, lngDir] = [parseInt(deg1), parseInt(min1), parseFloat(sec1), dir1];
    [latDeg, latMin, latSec, latDir] = [parseInt(deg2), parseInt(min2), parseFloat(sec2), dir2];
  }
  
  // Convert to decimal degrees
  const latitude = dmsToDecimal(latDeg, latMin, latSec, latDir);
  const longitude = dmsToDecimal(lngDeg, lngMin, lngSec, lngDir);
  
  return { latitude, longitude };
}

function dmsToDecimal(degrees: number, minutes: number, seconds: number, direction: string): number {
  let decimal = degrees + minutes / 60 + seconds / 3600;
  
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }
  
  return decimal;
}

export function validateDMSInput(input: string): boolean {
  return parseDMSCoordinates(input) !== null;
}

export function formatCoordinates(lat: number, lng: number): string {
  const formatDMS = (coord: number, isLatitude: boolean) => {
    const abs = Math.abs(coord);
    const degrees = Math.floor(abs);
    const minutes = Math.floor((abs - degrees) * 60);
    const seconds = ((abs - degrees) * 60 - minutes) * 60;
    
    const direction = isLatitude 
      ? (coord >= 0 ? 'N' : 'S')
      : (coord >= 0 ? 'E' : 'W');
    
    return `${degrees}°${minutes}'${seconds.toFixed(1)}"${direction}`;
  };
  
  return `${formatDMS(lat, true)} ${formatDMS(lng, false)}`;
}