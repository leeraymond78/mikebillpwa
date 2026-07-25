import { useEffect, useRef } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type { Carpark, MapViewport, ParkingMeterFeature } from '../../models';
import { MapMode, parkingMeterFeatureId } from '../../models';
import { useAppStore } from '../../store';
import type { LatLng } from '../../core/geo';
import {
  getCarparkMarkerIconURL,
  getMeterMarkerIconURL,
  getMeterMarkerZIndex,
} from './markerIcons';

const MARKER_RENDER_RADIUS_METERS = 5_000;
const PADDED_VISIBLE_REGION_MULTIPLIER = 1.25;
const MAX_RENDERED_METER_MARKERS = 2000;
const MAX_RENDERED_CARPARK_MARKERS = 80;
const MINIMUM_CARPARK_ZOOM_LEVEL = 15.5;
const METERS_PER_DEGREE_LATITUDE = 111_320;

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
/** Cloud map ID required for AdvancedMarkerElement. Override in env for production styling. */
const GOOGLE_MAPS_MAP_ID =
  (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined)?.trim() || 'DEMO_MAP_ID';

type AdvancedMarker = google.maps.marker.AdvancedMarkerElement;

export function GoogleMapView({ bottomControlInset = 118 }: { bottomControlInset?: number }) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--color-grouped)] px-8 text-center text-[15px] text-[var(--color-secondary-label)]">
        Google Maps API key missing. Set `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`.
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
      <MapCanvas bottomControlInset={bottomControlInset} />
    </APIProvider>
  );
}

function MapCanvas({ bottomControlInset }: { bottomControlInset: number }) {
  const viewport = useAppStore((s) => s.viewport);
  const enableDarkMode = useAppStore((s) => s.enableDarkMode);

  return (
    <GoogleMap
      className="h-full w-full"
      mapId={GOOGLE_MAPS_MAP_ID}
      defaultCenter={{ lat: viewport.latitude, lng: viewport.longitude }}
      defaultZoom={viewport.zoom}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl={false}
      zoomControl
      colorScheme={enableDarkMode ? 'DARK' : 'LIGHT'}
      reuseMaps
    >
      <MapController bottomControlInset={bottomControlInset} />
    </GoogleMap>
  );
}

function MapController({ bottomControlInset }: { bottomControlInset: number }) {
  const map = useMap();
  const markerLib = useMapsLibrary('marker');
  const meterMarkersRef = useRef<Map<number, AdvancedMarker>>(new Map());
  const carparkMarkersRef = useRef<Map<number, AdvancedMarker>>(new Map());
  const selectedMarkerRef = useRef<AdvancedMarker | null>(null);
  const isUserInteractingRef = useRef(false);
  const suppressViewportSyncUntilRef = useRef(0);
  const lastAppliedViewportRef = useRef<MapViewport | null>(null);

  const mapMode = useAppStore((s) => s.mapMode);
  const viewport = useAppStore((s) => s.viewport);
  const meterFeatures = useAppStore((s) => s.meterFeatures);
  const meterOccupancy = useAppStore((s) => s.meterOccupancy);
  const carparks = useAppStore((s) => s.carparks);
  const carparkVacancies = useAppStore((s) => s.carparkVacancies);
  const enableDarkMode = useAppStore((s) => s.enableDarkMode);
  const selectedCoordinate = useAppStore((s) => s.selectedCoordinate);
  const updateViewport = useAppStore((s) => s.updateViewport);
  const fetchVisibleData = useAppStore((s) => s.fetchVisibleData);
  const setSelectedMeter = useAppStore((s) => s.setSelectedMeter);
  const setSelectedCoordinate = useAppStore((s) => s.setSelectedCoordinate);
  const loadCarparkDetail = useAppStore((s) => s.loadCarparkDetail);
  const vacancyFn = useAppStore((s) => s.vacancy);
  const meterRecordFn = useAppStore((s) => s.meterRecord);

  useEffect(() => {
    if (!map) return;
    map.setOptions({
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      gestureHandling: 'greedy',
    });
    void bottomControlInset;
  }, [map, bottomControlInset]);

  useEffect(() => {
    if (!map) return;
    if (isUserInteractingRef.current || Date.now() < suppressViewportSyncUntilRef.current) {
      return;
    }

    const last = lastAppliedViewportRef.current;
    if (
      last &&
      Math.abs(last.latitude - viewport.latitude) < 0.000001 &&
      Math.abs(last.longitude - viewport.longitude) < 0.000001 &&
      Math.abs(last.zoom - viewport.zoom) < 0.001
    ) {
      return;
    }

    const center = map.getCenter();
    const zoom = map.getZoom() ?? viewport.zoom;
    if (center) {
      const isFar =
        Math.abs(center.lat() - viewport.latitude) > 0.0001 ||
        Math.abs(center.lng() - viewport.longitude) > 0.0001 ||
        Math.abs(zoom - viewport.zoom) > 0.05;
      if (!isFar) {
        lastAppliedViewportRef.current = viewport;
        return;
      }
    }

    lastAppliedViewportRef.current = viewport;
    map.setCenter({ lat: viewport.latitude, lng: viewport.longitude });
    map.setZoom(viewport.zoom);
  }, [map, viewport]);

  useEffect(() => {
    if (!map) return;

    const dragStart = map.addListener('dragstart', () => {
      isUserInteractingRef.current = true;
      suppressViewportSyncUntilRef.current = Date.now() + 1000;
    });

    const idle = map.addListener('idle', () => {
      isUserInteractingRef.current = false;
      suppressViewportSyncUntilRef.current = Date.now() + 350;

      const center = map.getCenter();
      const zoom = map.getZoom();
      if (!center || zoom == null) return;

      const next: MapViewport = {
        latitude: center.lat(),
        longitude: center.lng(),
        zoom,
      };
      lastAppliedViewportRef.current = next;
      updateViewport(next);

      const bounds = map.getBounds();
      if (!bounds) return;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      void fetchVisibleData(
        { latitude: ne.lat(), longitude: ne.lng() },
        { latitude: sw.lat(), longitude: sw.lng() },
      );
    });

    const click = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      setSelectedCoordinate({
        latitude: event.latLng.lat(),
        longitude: event.latLng.lng(),
      });
    });

    return () => {
      dragStart.remove();
      idle.remove();
      click.remove();
    };
  }, [map, updateViewport, fetchVisibleData, setSelectedCoordinate]);

  useEffect(() => {
    if (!map || !markerLib) return;

    const shouldShow = mapMode === MapMode.all || mapMode === MapMode.parkingMeter;
    if (!shouldShow) {
      clearMarkerMap(meterMarkersRef.current);
      return;
    }

    const center = map.getCenter();
    if (!center) return;

    const candidates = nearestRenderableMeterFeatures(
      map,
      { latitude: center.lat(), longitude: center.lng() },
      meterFeatures,
    );

    const active = new Set<number>();
    for (const feature of candidates) {
      const id = parkingMeterFeatureId(feature);
      active.add(id);
      const lat = feature.geometry.coordinates[1] ?? 0;
      const lng = feature.geometry.coordinates[0] ?? 0;
      const record = meterRecordFn(feature);
      const iconUrl = getMeterMarkerIconURL(feature, record);
      const zIndex = getMeterMarkerZIndex(feature, record);
      const content = createIconContent(iconUrl, 'center');

      let marker = meterMarkersRef.current.get(id);
      if (!marker) {
        marker = new markerLib.AdvancedMarkerElement({
          map,
          position: { lat, lng },
          content,
          zIndex,
          gmpClickable: true,
          title: [feature.properties.streetTC, feature.properties.sectionOfStreetTC]
            .filter(Boolean)
            .join(', '),
        });
        marker.addEventListener('gmp-click', () => {
          setSelectedMeter(feature);
        });
        meterMarkersRef.current.set(id, marker);
      } else {
        marker.position = { lat, lng };
        marker.content = content;
        marker.zIndex = zIndex;
        if (marker.map !== map) marker.map = map;
      }
    }

    for (const [id, marker] of meterMarkersRef.current) {
      if (!active.has(id)) {
        marker.map = null;
        meterMarkersRef.current.delete(id);
      }
    }
  }, [map, markerLib, mapMode, meterFeatures, meterOccupancy, viewport, meterRecordFn, setSelectedMeter]);

  useEffect(() => {
    if (!map || !markerLib) return;

    const zoom = map.getZoom() ?? 0;
    const shouldShow =
      (mapMode === MapMode.all || mapMode === MapMode.carpark) &&
      zoom >= MINIMUM_CARPARK_ZOOM_LEVEL;

    if (!shouldShow) {
      clearMarkerMap(carparkMarkersRef.current);
      return;
    }

    const center = map.getCenter();
    if (!center) return;

    const candidates = nearestRenderableCarparks(
      map,
      { latitude: center.lat(), longitude: center.lng() },
      carparks,
    );

    const active = new Set<number>();
    for (const carpark of candidates) {
      active.add(carpark.parkingId);
      const vacancy = vacancyFn(carpark);
      const iconUrl = getCarparkMarkerIconURL(carpark.amount, vacancy, enableDarkMode);
      const content = createIconContent(iconUrl, 'bottom');

      let marker = carparkMarkersRef.current.get(carpark.parkingId);
      if (!marker) {
        marker = new markerLib.AdvancedMarkerElement({
          map,
          position: { lat: carpark.latitude, lng: carpark.longitude },
          content,
          zIndex: 9000,
          gmpClickable: true,
          title: carpark.name,
        });
        marker.addEventListener('gmp-click', () => {
          void loadCarparkDetail(carpark);
        });
        carparkMarkersRef.current.set(carpark.parkingId, marker);
      } else {
        marker.position = { lat: carpark.latitude, lng: carpark.longitude };
        marker.content = content;
        if (marker.map !== map) marker.map = map;
      }
    }

    for (const [id, marker] of carparkMarkersRef.current) {
      if (!active.has(id)) {
        marker.map = null;
        carparkMarkersRef.current.delete(id);
      }
    }
  }, [
    map,
    markerLib,
    mapMode,
    carparks,
    carparkVacancies,
    enableDarkMode,
    viewport,
    vacancyFn,
    loadCarparkDetail,
  ]);

  useEffect(() => {
    if (!map || !markerLib) return;

    if (!selectedCoordinate) {
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.map = null;
        selectedMarkerRef.current = null;
      }
      return;
    }

    const position = {
      lat: selectedCoordinate.latitude,
      lng: selectedCoordinate.longitude,
    };

    if (!selectedMarkerRef.current) {
      let content: HTMLElement;
      if (markerLib.PinElement) {
        const pin = new markerLib.PinElement({
          background: '#30b0c7',
          borderColor: '#ffffff',
          glyphColor: '#ffffff',
          scale: 1.1,
        });
        content = pin.element;
      } else {
        content = createSelectedFallbackPin();
      }

      selectedMarkerRef.current = new markerLib.AdvancedMarkerElement({
        map,
        position,
        content,
        zIndex: 10000,
        title: 'Selected Location',
      });
    } else {
      selectedMarkerRef.current.position = position;
      if (selectedMarkerRef.current.map !== map) {
        selectedMarkerRef.current.map = map;
      }
    }
  }, [map, markerLib, selectedCoordinate]);

  useEffect(() => {
    return () => {
      clearMarkerMap(meterMarkersRef.current);
      clearMarkerMap(carparkMarkersRef.current);
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.map = null;
        selectedMarkerRef.current = null;
      }
    };
  }, []);

  return null;
}

function createIconContent(
  iconUrl: string,
  anchor: 'center' | 'bottom',
): HTMLImageElement {
  const img = document.createElement('img');
  img.src = iconUrl;
  img.alt = '';
  img.draggable = false;
  img.style.display = 'block';
  img.style.maxWidth = 'none';
  img.style.userSelect = 'none';
  img.style.pointerEvents = 'none';
  // AdvancedMarker default anchor is bottom-center; shift for circular meter icons.
  if (anchor === 'center') {
    img.style.transform = 'translateY(50%)';
  }
  return img;
}

function createSelectedFallbackPin(): HTMLElement {
  const el = document.createElement('div');
  el.style.width = '18px';
  el.style.height = '18px';
  el.style.borderRadius = '50%';
  el.style.background = '#30b0c7';
  el.style.border = '2px solid #ffffff';
  el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)';
  el.style.transform = 'translateY(50%)';
  return el;
}

function clearMarkerMap(storage: Map<number, AdvancedMarker>): void {
  for (const marker of storage.values()) {
    marker.map = null;
  }
  storage.clear();
}

interface PaddedBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

function paddedVisibleBounds(map: google.maps.Map): PaddedBounds | null {
  const bounds = map.getBounds();
  if (!bounds) return null;
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const minLatitude = sw.lat();
  const maxLatitude = ne.lat();
  const minLongitude = sw.lng();
  const maxLongitude = ne.lng();
  const latPadding =
    ((maxLatitude - minLatitude) * (PADDED_VISIBLE_REGION_MULTIPLIER - 1)) / 2;
  const lngPadding =
    ((maxLongitude - minLongitude) * (PADDED_VISIBLE_REGION_MULTIPLIER - 1)) / 2;

  return {
    minLatitude: minLatitude - latPadding,
    maxLatitude: maxLatitude + latPadding,
    minLongitude: minLongitude - lngPadding,
    maxLongitude: maxLongitude + lngPadding,
  };
}

function contains(bounds: PaddedBounds, latitude: number, longitude: number): boolean {
  return (
    latitude >= bounds.minLatitude &&
    latitude <= bounds.maxLatitude &&
    longitude >= bounds.minLongitude &&
    longitude <= bounds.maxLongitude
  );
}

function nearestRenderableMeterFeatures(
  map: google.maps.Map,
  center: LatLng,
  features: ParkingMeterFeature[],
): ParkingMeterFeature[] {
  const bounds = paddedVisibleBounds(map);
  if (!bounds) return [];

  const metersPerDegreeLongitude = Math.max(
    1,
    METERS_PER_DEGREE_LATITUDE * Math.cos((center.latitude * Math.PI) / 180),
  );
  const maxDistanceSquared = MARKER_RENDER_RADIUS_METERS * MARKER_RENDER_RADIUS_METERS;
  const candidates: { feature: ParkingMeterFeature; distanceSquared: number }[] = [];

  for (const feature of features) {
    const latitude = feature.geometry.coordinates[1] ?? 0;
    const longitude = feature.geometry.coordinates[0] ?? 0;
    if (!contains(bounds, latitude, longitude)) continue;

    const deltaLatMeters = (latitude - center.latitude) * METERS_PER_DEGREE_LATITUDE;
    const deltaLngMeters = (longitude - center.longitude) * metersPerDegreeLongitude;
    const distanceSquared =
      deltaLatMeters * deltaLatMeters + deltaLngMeters * deltaLngMeters;
    if (distanceSquared > maxDistanceSquared) continue;
    candidates.push({ feature, distanceSquared });
  }

  candidates.sort((a, b) => a.distanceSquared - b.distanceSquared);
  return candidates.slice(0, MAX_RENDERED_METER_MARKERS).map((item) => item.feature);
}

function nearestRenderableCarparks(
  map: google.maps.Map,
  center: LatLng,
  carparks: Carpark[],
): Carpark[] {
  const bounds = paddedVisibleBounds(map);
  if (!bounds) return [];

  const metersPerDegreeLongitude = Math.max(
    1,
    METERS_PER_DEGREE_LATITUDE * Math.cos((center.latitude * Math.PI) / 180),
  );
  const maxDistanceSquared = MARKER_RENDER_RADIUS_METERS * MARKER_RENDER_RADIUS_METERS;
  const candidates: { carpark: Carpark; distanceSquared: number }[] = [];

  for (const carpark of carparks) {
    if (!contains(bounds, carpark.latitude, carpark.longitude)) continue;
    const deltaLatMeters = (carpark.latitude - center.latitude) * METERS_PER_DEGREE_LATITUDE;
    const deltaLngMeters =
      (carpark.longitude - center.longitude) * metersPerDegreeLongitude;
    const distanceSquared =
      deltaLatMeters * deltaLatMeters + deltaLngMeters * deltaLngMeters;
    if (distanceSquared > maxDistanceSquared) continue;
    candidates.push({ carpark, distanceSquared });
  }

  candidates.sort((a, b) => a.distanceSquared - b.distanceSquared);
  return candidates.slice(0, MAX_RENDERED_CARPARK_MARKERS).map((item) => item.carpark);
}
