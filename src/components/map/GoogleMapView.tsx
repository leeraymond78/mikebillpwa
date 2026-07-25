import { useEffect, useRef } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type { Carpark, MapViewport, ParkingMeterFeature } from '../../models';
import { MapMode, parkingMeterFeatureId } from '../../models';
import { locationService } from '../../services/locationService';
import { useAppStore } from '../../store';
import type { LatLng } from '../../core/geo';
import {
  getCarparkMarkerIconURL,
  getMeterClusterIconURL,
  getMeterMarkerIconURL,
  getMeterMarkerZIndex,
} from './markerIcons';
import {
  buildMeterClusters,
  MINIMUM_INDIVIDUAL_METER_ZOOM,
} from './meterClusters';

const MARKER_RENDER_RADIUS_METERS = 5_000;
const PADDED_VISIBLE_REGION_MULTIPLIER = 1.25;
const MAX_RENDERED_METER_MARKERS = 2000;
const MAX_RENDERED_CARPARK_MARKERS = 80;
const MINIMUM_CARPARK_ZOOM_LEVEL = 15.5;
const METERS_PER_DEGREE_LATITUDE = 111_320;
const DOUBLE_TAP_MS = 320;
const SINGLE_TAP_SELECT_DELAY_MS = 340;

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
/** Cloud map ID required for AdvancedMarkerElement. Override in env for production styling. */
const GOOGLE_MAPS_MAP_ID =
  (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined)?.trim() || 'DEMO_MAP_ID';

type AdvancedMarker = google.maps.marker.AdvancedMarkerElement;

export function GoogleMapView() {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--color-grouped)] px-8 text-center text-[15px] text-[var(--color-secondary-label)]">
        Google Maps API key missing. Set `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`.
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
      <MapCanvas />
    </APIProvider>
  );
}

function MapCanvas() {
  const viewport = useAppStore((s) => s.viewport);
  const enableDarkMode = useAppStore((s) => s.enableDarkMode);

  return (
    <GoogleMap
      className="map-bleed h-full w-full"
      mapId={GOOGLE_MAPS_MAP_ID}
      defaultCenter={{ lat: viewport.latitude, lng: viewport.longitude }}
      defaultZoom={viewport.zoom}
      gestureHandling="greedy"
      disableDefaultUI
      clickableIcons={false}
      colorScheme={enableDarkMode ? 'DARK' : 'LIGHT'}
      reuseMaps
    >
      <MapController />
    </GoogleMap>
  );
}

function MapController() {
  const map = useMap();
  const markerLib = useMapsLibrary('marker');
  const meterMarkersRef = useRef<Map<number, AdvancedMarker>>(new Map());
  const clusterMarkersRef = useRef<Map<string, AdvancedMarker>>(new Map());
  const carparkMarkersRef = useRef<Map<number, AdvancedMarker>>(new Map());
  const selectedMarkerRef = useRef<AdvancedMarker | null>(null);
  const userLocationMarkerRef = useRef<AdvancedMarker | null>(null);
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
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
      // We handle double-tap zoom ourselves so it works reliably on iOS
      // (map `click` was opening Selected Location and eating the second tap).
      disableDoubleClickZoom: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      rotateControl: false,
      scaleControl: false,
      // Vector maps camera tilt/rotate control (the circular arrows button).
      cameraControl: false,
    } as google.maps.MapOptions);
  }, [map]);

  // iOS A2HS / visualViewport can settle after first paint; force Maps to refill.
  useEffect(() => {
    if (!map) return;

    const relayout = () => {
      google.maps.event.trigger(map, 'resize');
    };

    relayout();
    const timeouts = [50, 250, 1000].map((ms) => window.setTimeout(relayout, ms));
    window.addEventListener('resize', relayout);
    window.visualViewport?.addEventListener('resize', relayout);
    window.visualViewport?.addEventListener('scroll', relayout);

    return () => {
      for (const id of timeouts) window.clearTimeout(id);
      window.removeEventListener('resize', relayout);
      window.visualViewport?.removeEventListener('resize', relayout);
      window.visualViewport?.removeEventListener('scroll', relayout);
    };
  }, [map]);

  useEffect(() => {
    if (!map || !markerLib) return;

    const apply = (coordinate: LatLng | null) => {
      if (!coordinate) {
        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.map = null;
          userLocationMarkerRef.current = null;
        }
        return;
      }

      const position = {
        lat: coordinate.latitude,
        lng: coordinate.longitude,
      };

      if (!userLocationMarkerRef.current) {
        userLocationMarkerRef.current = new markerLib.AdvancedMarkerElement({
          map,
          position,
          content: createUserLocationDot(),
          zIndex: 9500,
          title: 'Current location',
        });
      } else {
        userLocationMarkerRef.current.position = position;
        if (userLocationMarkerRef.current.map !== map) {
          userLocationMarkerRef.current.map = map;
        }
      }
    };

    return locationService.subscribe(apply);
  }, [map, markerLib]);

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

    let pendingSelectTimer: number | null = null;
    let lastTapAt = 0;
    let lastTapLatLng: google.maps.LatLng | null = null;
    let lastZoomAt = 0;

    const clearPendingSelect = () => {
      if (pendingSelectTimer != null) {
        window.clearTimeout(pendingSelectTimer);
        pendingSelectTimer = null;
      }
    };

    const zoomInAt = (latLng: google.maps.LatLng) => {
      const now = Date.now();
      // Avoid +2 zoom when both click-pair and dblclick fire.
      if (now - lastZoomAt < 400) return;
      lastZoomAt = now;
      isUserInteractingRef.current = true;
      suppressViewportSyncUntilRef.current = Date.now() + 1000;
      const currentZoom = map.getZoom() ?? 14;
      map.panTo(latLng);
      map.setZoom(Math.min(currentZoom + 1, 21));
    };

    const isNearPreviousTap = (latLng: google.maps.LatLng) => {
      if (!lastTapLatLng) return false;
      return (
        Math.abs(lastTapLatLng.lat() - latLng.lat()) < 0.002 &&
        Math.abs(lastTapLatLng.lng() - latLng.lng()) < 0.002
      );
    };

    const click = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;

      const now = Date.now();
      if (now - lastTapAt < DOUBLE_TAP_MS && isNearPreviousTap(event.latLng)) {
        clearPendingSelect();
        lastTapAt = 0;
        lastTapLatLng = null;
        zoomInAt(event.latLng);
        return;
      }

      lastTapAt = now;
      lastTapLatLng = event.latLng;
      clearPendingSelect();

      const latitude = event.latLng.lat();
      const longitude = event.latLng.lng();
      pendingSelectTimer = window.setTimeout(() => {
        pendingSelectTimer = null;
        setSelectedCoordinate({ latitude, longitude });
      }, SINGLE_TAP_SELECT_DELAY_MS);
    });

    const dblclick = map.addListener('dblclick', (event: google.maps.MapMouseEvent) => {
      // Desktop / browsers that also emit dblclick after two clicks.
      clearPendingSelect();
      lastTapAt = 0;
      lastTapLatLng = null;
      if (event.latLng) zoomInAt(event.latLng);
    });

    return () => {
      clearPendingSelect();
      dragStart.remove();
      idle.remove();
      click.remove();
      dblclick.remove();
    };
  }, [map, updateViewport, fetchVisibleData, setSelectedCoordinate]);

  useEffect(() => {
    if (!map || !markerLib) return;

    const shouldShow = mapMode === MapMode.all || mapMode === MapMode.parkingMeter;
    if (!shouldShow) {
      clearMarkerMap(meterMarkersRef.current);
      clearClusterMarkerMap(clusterMarkersRef.current);
      return;
    }

    const zoom = map.getZoom() ?? viewport.zoom;
    const useClusters = zoom < MINIMUM_INDIVIDUAL_METER_ZOOM;

    if (useClusters) {
      clearMarkerMap(meterMarkersRef.current);

      const candidates = meterFeaturesInVisibleBounds(map, meterFeatures);
      const clusters = buildMeterClusters(candidates, meterOccupancy);
      const active = new Set<string>();

      for (const cluster of clusters) {
        active.add(cluster.id);
        const position = { lat: cluster.latitude, lng: cluster.longitude };
        const iconUrl = getMeterClusterIconURL(
          cluster.vacant,
          cluster.total,
          enableDarkMode,
        );
        const content = createIconContent(iconUrl, 'center');
        const zIndex = 3000 + cluster.vacant;
        const title = `${cluster.vacant}/${cluster.total} vacant`;

        let marker = clusterMarkersRef.current.get(cluster.id);
        if (!marker) {
          marker = new markerLib.AdvancedMarkerElement({
            map,
            position,
            content,
            zIndex,
            gmpClickable: true,
            title,
          });
          marker.addEventListener('gmp-click', () => {
            const pos = marker?.position;
            if (!pos) return;
            const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
            const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
            if (typeof lat !== 'number' || typeof lng !== 'number') return;
            map.panTo({ lat, lng });
            const currentZoom = map.getZoom() ?? zoom;
            map.setZoom(Math.min(currentZoom + 2, MINIMUM_INDIVIDUAL_METER_ZOOM));
          });
          clusterMarkersRef.current.set(cluster.id, marker);
        } else {
          marker.position = position;
          marker.content = content;
          marker.zIndex = zIndex;
          marker.title = title;
          if (marker.map !== map) marker.map = map;
        }
      }

      for (const [id, marker] of clusterMarkersRef.current) {
        if (!active.has(id)) {
          marker.map = null;
          clusterMarkersRef.current.delete(id);
        }
      }
      return;
    }

    clearClusterMarkerMap(clusterMarkersRef.current);

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
  }, [
    map,
    markerLib,
    mapMode,
    meterFeatures,
    meterOccupancy,
    viewport,
    enableDarkMode,
    meterRecordFn,
    setSelectedMeter,
  ]);

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
      clearClusterMarkerMap(clusterMarkersRef.current);
      clearMarkerMap(carparkMarkersRef.current);
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.map = null;
        selectedMarkerRef.current = null;
      }
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.map = null;
        userLocationMarkerRef.current = null;
      }
    };
  }, []);

  return null;
}

function createUserLocationDot(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.width = '18px';
  wrap.style.height = '18px';
  wrap.style.borderRadius = '50%';
  wrap.style.background = '#1a73e8';
  wrap.style.border = '2.5px solid #ffffff';
  wrap.style.boxShadow = '0 0 0 6px rgba(26,115,232,0.22), 0 2px 6px rgba(0,0,0,0.25)';
  wrap.style.transform = 'translateY(50%)';
  return wrap;
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

function clearClusterMarkerMap(storage: Map<string, AdvancedMarker>): void {
  for (const marker of storage.values()) {
    marker.map = null;
  }
  storage.clear();
}

function meterFeaturesInVisibleBounds(
  map: google.maps.Map,
  features: ParkingMeterFeature[],
): ParkingMeterFeature[] {
  const bounds = paddedVisibleBounds(map);
  if (!bounds) return [];
  return features.filter((feature) => {
    const latitude = feature.geometry.coordinates[1] ?? 0;
    const longitude = feature.geometry.coordinates[0] ?? 0;
    return contains(bounds, latitude, longitude);
  });
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
