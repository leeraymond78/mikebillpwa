/**
 * Browser geolocation wrapper mirroring iOS `LocationService`.
 */
import type { LatLng } from '../core/geo';

type LocationListener = (coordinate: LatLng | null) => void;

class LocationServiceImpl {
  private currentLocation: LatLng | null = null;
  private listeners = new Set<LocationListener>();
  private watchId: number | null = null;

  getCurrentLocation(): LatLng | null {
    return this.currentLocation;
  }

  subscribe(listener: LocationListener): () => void {
    this.listeners.add(listener);
    listener(this.currentLocation);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.currentLocation);
    }
  }

  requestCurrentLocation(): void {
    if (!navigator.geolocation) {
      console.warn('[LocationService] geolocation unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        this.emit();
      },
      (error) => {
        console.warn('[LocationService] Location error:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 5_000,
      },
    );
  }

  /** Optional continuous watch for map "my location" UX. */
  startWatching(): void {
    if (!navigator.geolocation || this.watchId !== null) return;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        this.emit();
      },
      (error) => {
        console.warn('[LocationService] Watch error:', error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
      },
    );
  }

  stopWatching(): void {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

export const locationService = new LocationServiceImpl();
