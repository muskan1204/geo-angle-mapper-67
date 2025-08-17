export interface Point {
  lat: number;
  lng: number;
}

export function calculateBearing(point1: Point, point2: Point): number {
  const lat1 = toRadians(point1.lat);
  const lat2 = toRadians(point2.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);
  
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  
  const bearing = toDegrees(Math.atan2(y, x));
  
  // Normalize to 0-360 degrees
  return (bearing + 360) % 360;
}

export function calculateDistance(point1: Point, point2: Point): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = toRadians(point1.lat);
  const lat2 = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

export function formatBearing(bearing: number): string {
  return `${bearing.toFixed(1)}°`;
}

export function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${distance.toFixed(1)} m`;
  }
  return `${(distance / 1000).toFixed(2)} km`;
}