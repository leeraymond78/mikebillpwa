export interface LatLng {
  latitude: number;
  longitude: number;
}

export function latLngEquals(a: LatLng | null | undefined, b: LatLng | null | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a.latitude === b.latitude && a.longitude === b.longitude;
}
