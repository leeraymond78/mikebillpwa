import { create } from 'zustand';
import { AppStorageKeys } from '../core/storageKeys';
import type { LatLng } from '../core/geo';
import {
  type Carpark,
  type CarparkDetail,
  type FavoriteCarpark,
  type FavoriteLocation,
  type MapViewport,
  type OccupancyRecord,
  type ParkingMeterFeature,
  type SearchLocation,
  HONG_KONG_DEFAULT_VIEWPORT,
  MapMode,
  carparkDetailPhotoURLs,
} from '../models';
import { apiService } from '../services/apiService';
import { idbGet, idbSet } from '../services/idbCache';
import { storageService } from '../services/storageService';
import {
  arraysEqualByJson,
  mergeCarpark,
  moveFavoriteInFilteredView,
  moveItem,
  recordsEqualByJson,
  sleep,
  sortMeterFeatures,
} from './helpers';

export interface AppState {
  mapMode: MapMode;
  viewport: MapViewport;
  enableDarkMode: boolean;
  rememberLastView: boolean;
  favoriteLocations: FavoriteLocation[];
  favoriteCarparks: FavoriteCarpark[];
  meterFeatures: ParkingMeterFeature[];
  meterOccupancy: Record<string, OccupancyRecord>;
  carparks: Carpark[];
  carparkVacancies: Record<string, string>;
  searchResults: SearchLocation[];
  isSearching: boolean;
  selectedMeter: ParkingMeterFeature | null;
  selectedCarpark: Carpark | null;
  carparkDetail: CarparkDetail | null;
  selectedCoordinate: LatLng | null;
  lastErrorMessage: string | null;
  isBootstrapped: boolean;
}

export interface AppActions {
  /** Call once at app start (starts 7s loop + CSV bootstrap). */
  bootstrap: () => void;
  dispose: () => void;

  updateViewport: (viewport: MapViewport) => void;
  setMapMode: (mode: MapMode) => void;
  setEnableDarkMode: (value: boolean) => void;
  setRememberLastView: (value: boolean) => void;

  addFavoriteLocation: (name: string) => void;
  deleteFavoriteLocation: (favorite: FavoriteLocation) => void;
  deleteFavoriteLocationAt: (index: number) => void;
  moveFavoriteLocation: (fromIndex: number, toIndex: number) => void;
  moveFavoriteLocationInFilteredView: (
    favorite: FavoriteLocation,
    toFilteredIndex: number,
    filter: MapMode | null,
  ) => void;
  renameFavoriteLocation: (favorite: FavoriteLocation, name: string) => void;
  changeFavoriteType: (favorite: FavoriteLocation) => void;
  toggleFavoriteType: (favorite: FavoriteLocation) => void;
  selectFavoriteLocation: (favorite: FavoriteLocation) => void;
  navigateToFavoriteLocation: (favorite: FavoriteLocation) => void;
  switchFavoriteView: (favorite: FavoriteLocation) => void;

  isFavoriteCarpark: (parkingId: number) => boolean;
  toggleFavoriteCarpark: (detail: CarparkDetail) => void;
  removeFavoriteCarpark: (carpark: FavoriteCarpark) => void;
  moveFavoriteCarpark: (fromIndex: number, toIndex: number) => void;
  selectFavoriteCarpark: (favorite: FavoriteCarpark) => Promise<void>;

  meterRecord: (feature: ParkingMeterFeature) => OccupancyRecord | undefined;
  vacancy: (carpark: Carpark) => string | undefined;

  searchLocations: (text: string) => void;
  applySearchResult: (item: SearchLocation) => void;

  fetchVisibleData: (northEast: LatLng, southWest: LatLng) => Promise<void>;
  refreshVacancyOnly: () => Promise<void>;
  loadCarparkDetail: (carpark: Carpark) => Promise<void>;

  setSelectedMeter: (feature: ParkingMeterFeature | null) => void;
  setSelectedCoordinate: (coordinate: LatLng | null) => void;
  clearSelections: () => void;
  clearError: () => void;

  /** Supports `mikebill://locate?lat=&lng=` and `#/locate?lat=&lng=`. */
  handleIncomingURL: (url: string | URL) => void;
}

export type AppStore = AppState & AppActions;

let shouldRetryMeterCSVFetch = false;
let refreshAbortController: AbortController | null = null;
let searchAbortController: AbortController | null = null;
let bootstrapped = false;

function loadInitialState(): AppState {
  // Migrate away from oversized localStorage blobs (web quota ~5MB).
  storageService.evictLargeCaches();

  const rememberLastView = storageService.bool(AppStorageKeys.rememberLastView, false);

  let viewport = HONG_KONG_DEFAULT_VIEWPORT;
  if (rememberLastView) {
    const lat = storageService.double(AppStorageKeys.lastLatitude);
    const lng = storageService.double(AppStorageKeys.lastLongitude);
    const zoom = storageService.double(AppStorageKeys.lastZoom);
    if (lat !== null && lng !== null && zoom !== null) {
      viewport = { latitude: lat, longitude: lng, zoom };
    }
  }

  const storedMapMode = storageService.integer(AppStorageKeys.currentMapMode, MapMode.all);
  const mapMode =
    storedMapMode === MapMode.parkingMeter ||
    storedMapMode === MapMode.carpark ||
    storedMapMode === MapMode.all
      ? storedMapMode
      : MapMode.all;

  return {
    mapMode,
    viewport,
    enableDarkMode: storageService.bool(AppStorageKeys.enableDarkMode, true),
    rememberLastView,
    favoriteLocations:
      storageService.load<FavoriteLocation[]>(AppStorageKeys.favoriteLocations) ?? [],
    favoriteCarparks:
      storageService.load<FavoriteCarpark[]>(AppStorageKeys.favoriteCarparks) ?? [],
    meterFeatures: [],
    meterOccupancy: {},
    carparks: [],
    carparkVacancies: {},
    searchResults: [],
    isSearching: false,
    selectedMeter: null,
    selectedCarpark: null,
    carparkDetail: null,
    selectedCoordinate: null,
    lastErrorMessage: null,
    isBootstrapped: false,
  };
}

function persistFavorites(locations: FavoriteLocation[]): void {
  storageService.save(locations, AppStorageKeys.favoriteLocations);
}

function persistFavoriteCarparks(carparks: FavoriteCarpark[]): void {
  storageService.save(carparks, AppStorageKeys.favoriteCarparks);
}

export const useAppStore = create<AppStore>((set, get) => {
  const replaceMeterFeatures = (fetched: ParkingMeterFeature[]) => {
    const normalized = sortMeterFeatures(fetched);
    const current = get().meterFeatures;
    if (arraysEqualByJson(normalized, current)) return;
    set({ meterFeatures: normalized });
    void idbSet(AppStorageKeys.cachedMeters, normalized);
  };

  const mergeCarparks = (fetched: Carpark[]) => {
    if (fetched.length === 0) return;
    const { carparks } = get();
    const mergedById = new Map(carparks.map((item) => [item.parkingId, item]));
    for (const carpark of fetched) {
      mergedById.set(carpark.parkingId, mergeCarpark(mergedById.get(carpark.parkingId), carpark));
    }
    const merged = [...mergedById.values()].sort((a, b) => a.parkingId - b.parkingId);
    if (arraysEqualByJson(merged, carparks)) return;
    set({ carparks: merged });
    void idbSet(AppStorageKeys.cachedCarparks, merged);
  };

  const applyMeterOccupancy = (fetched: Record<string, OccupancyRecord>) => {
    const current = get().meterOccupancy;
    if (recordsEqualByJson(fetched, current)) return;
    set({ meterOccupancy: fetched });
    void idbSet(AppStorageKeys.cachedMeterOccupancy, fetched);
  };

  const applyCarparkVacancies = (fetched: Record<string, string>) => {
    const current = get().carparkVacancies;
    if (recordsEqualByJson(fetched, current)) return;
    set({ carparkVacancies: fetched });
    void idbSet(AppStorageKeys.cachedVacancies, fetched);
  };

  const hydrateCachesFromIDB = async () => {
    try {
      const [meters, occupancy, carparks, vacancies] = await Promise.all([
        idbGet<ParkingMeterFeature[]>(AppStorageKeys.cachedMeters),
        idbGet<Record<string, OccupancyRecord>>(AppStorageKeys.cachedMeterOccupancy),
        idbGet<Carpark[]>(AppStorageKeys.cachedCarparks),
        idbGet<Record<string, string>>(AppStorageKeys.cachedVacancies),
      ]);
      set({
        ...(meters && meters.length > 0 ? { meterFeatures: meters } : {}),
        ...(occupancy ? { meterOccupancy: occupancy } : {}),
        ...(carparks && carparks.length > 0 ? { carparks } : {}),
        ...(vacancies ? { carparkVacancies: vacancies } : {}),
      });
    } catch (error) {
      console.warn('[AppModel][hydrateCachesFromIDB]', error);
    }
  };

  const bootstrapMetersFromCSV = async () => {
    const cachedMeters = await apiService.loadCachedParkingMetersFromCSV();
    if (cachedMeters && cachedMeters.length > 0) {
      replaceMeterFeatures(cachedMeters);
    }

    try {
      const remoteMeters = await apiService.fetchAndCacheParkingMetersFromCSV();
      if (remoteMeters.length > 0) {
        replaceMeterFeatures(remoteMeters);
      }
      shouldRetryMeterCSVFetch = false;
    } catch (error) {
      shouldRetryMeterCSVFetch = true;
      console.log('[AppModel][bootstrapMetersFromCSV][Error]', error);
    }
  };

  const startRefreshLoop = () => {
    refreshAbortController?.abort();
    refreshAbortController = new AbortController();
    const { signal } = refreshAbortController;

    void (async () => {
      while (!signal.aborted) {
        try {
          await sleep(7_000, signal);
        } catch {
          return;
        }
        if (signal.aborted) return;
        await get().refreshVacancyOnly();
      }
    })();
  };

  return {
    ...loadInitialState(),

    bootstrap: () => {
      if (bootstrapped) return;
      bootstrapped = true;
      startRefreshLoop();
      void (async () => {
        await hydrateCachesFromIDB();
        await bootstrapMetersFromCSV();
        set({ isBootstrapped: true });
      })();
    },

    dispose: () => {
      refreshAbortController?.abort();
      refreshAbortController = null;
      searchAbortController?.abort();
      searchAbortController = null;
      bootstrapped = false;
      set({ isBootstrapped: false });
    },

    updateViewport: (viewport) => {
      set({ viewport });
      if (!get().rememberLastView) return;
      storageService.setDouble(viewport.latitude, AppStorageKeys.lastLatitude);
      storageService.setDouble(viewport.longitude, AppStorageKeys.lastLongitude);
      storageService.setDouble(viewport.zoom, AppStorageKeys.lastZoom);
    },

    setMapMode: (mode) => {
      set({ mapMode: mode });
      storageService.setInt(mode, AppStorageKeys.currentMapMode);
    },

    setEnableDarkMode: (value) => {
      set({ enableDarkMode: value });
      storageService.setBool(value, AppStorageKeys.enableDarkMode);
    },

    setRememberLastView: (value) => {
      set({ rememberLastView: value });
      storageService.setBool(value, AppStorageKeys.rememberLastView);
    },

    addFavoriteLocation: (name) => {
      const { viewport, mapMode, favoriteLocations } = get();
      const favorite: FavoriteLocation = {
        id: crypto.randomUUID(),
        name,
        latitude: viewport.latitude,
        longitude: viewport.longitude,
        zoom: viewport.zoom,
        mapMode,
      };
      const next = [...favoriteLocations, favorite];
      set({ favoriteLocations: next });
      persistFavorites(next);
    },

    deleteFavoriteLocation: (favorite) => {
      const next = get().favoriteLocations.filter((item) => item.id !== favorite.id);
      set({ favoriteLocations: next });
      persistFavorites(next);
    },

    deleteFavoriteLocationAt: (index) => {
      const next = get().favoriteLocations.filter((_, i) => i !== index);
      set({ favoriteLocations: next });
      persistFavorites(next);
    },

    moveFavoriteLocation: (fromIndex, toIndex) => {
      const next = moveItem(get().favoriteLocations, fromIndex, toIndex);
      set({ favoriteLocations: next });
      persistFavorites(next);
    },

    moveFavoriteLocationInFilteredView: (favorite, toFilteredIndex, filter) => {
      const next = moveFavoriteInFilteredView(
        get().favoriteLocations,
        favorite,
        toFilteredIndex,
        filter,
      );
      set({ favoriteLocations: next });
      persistFavorites(next);
    },

    renameFavoriteLocation: (favorite, name) => {
      const next = get().favoriteLocations.map((item) =>
        item.id === favorite.id ? { ...item, name } : item,
      );
      set({ favoriteLocations: next });
      persistFavorites(next);
    },

    changeFavoriteType: (favorite) => {
      const next = get().favoriteLocations.map((item) => {
        if (item.id !== favorite.id) return item;
        const mapMode =
          item.mapMode === MapMode.parkingMeter ? MapMode.carpark : MapMode.parkingMeter;
        return { ...item, mapMode };
      });
      set({ favoriteLocations: next });
      persistFavorites(next);
    },

    toggleFavoriteType: (favorite) => {
      const next = get().favoriteLocations.map((item) => {
        if (item.id !== favorite.id) return item;
        let mapMode: MapMode;
        switch (item.mapMode) {
          case MapMode.all:
            mapMode = MapMode.parkingMeter;
            break;
          case MapMode.parkingMeter:
            mapMode = MapMode.carpark;
            break;
          case MapMode.carpark:
          default:
            mapMode = MapMode.all;
            break;
        }
        return { ...item, mapMode };
      });
      set({ favoriteLocations: next });
      persistFavorites(next);
    },

    selectFavoriteLocation: (favorite) => {
      get().setMapMode(favorite.mapMode);
      set({
        selectedCoordinate: {
          latitude: favorite.latitude,
          longitude: favorite.longitude,
        },
      });
      get().updateViewport({
        latitude: favorite.latitude,
        longitude: favorite.longitude,
        zoom: favorite.zoom,
      });
    },

    navigateToFavoriteLocation: (favorite) => {
      get().setMapMode(favorite.mapMode);
      set({
        selectedMeter: null,
        selectedCarpark: null,
        carparkDetail: null,
        selectedCoordinate: null,
      });
      get().updateViewport({
        latitude: favorite.latitude,
        longitude: favorite.longitude,
        zoom: favorite.zoom,
      });
    },

    switchFavoriteView: (favorite) => {
      const newMode =
        favorite.mapMode === MapMode.parkingMeter ? MapMode.carpark : MapMode.parkingMeter;
      get().setMapMode(newMode);
      set({
        selectedCoordinate: {
          latitude: favorite.latitude,
          longitude: favorite.longitude,
        },
      });
      get().updateViewport({
        latitude: favorite.latitude,
        longitude: favorite.longitude,
        zoom: favorite.zoom,
      });
    },

    isFavoriteCarpark: (parkingId) =>
      get().favoriteCarparks.some((item) => item.parkingId === parkingId),

    toggleFavoriteCarpark: (detail) => {
      const { favoriteCarparks } = get();
      const index = favoriteCarparks.findIndex((item) => item.parkingId === detail.parkingId);
      let next: FavoriteCarpark[];
      if (index >= 0) {
        next = favoriteCarparks.filter((_, i) => i !== index);
      } else {
        const photos = carparkDetailPhotoURLs(detail);
        next = [
          ...favoriteCarparks,
          {
            parkingId: detail.parkingId,
            name: detail.name,
            address: detail.address,
            latitude: detail.latitude,
            longitude: detail.longitude,
            thumbnail: photos[0] ?? null,
            vacancyId: detail.vacancyId,
          },
        ];
      }
      set({ favoriteCarparks: next });
      persistFavoriteCarparks(next);
    },

    removeFavoriteCarpark: (carpark) => {
      const next = get().favoriteCarparks.filter((item) => item.parkingId !== carpark.parkingId);
      const { carparkDetail, selectedCarpark } = get();
      set({
        favoriteCarparks: next,
        ...(carparkDetail?.parkingId === carpark.parkingId
          ? { carparkDetail: null, selectedCarpark: null }
          : selectedCarpark?.parkingId === carpark.parkingId
            ? { selectedCarpark: null }
            : {}),
      });
      persistFavoriteCarparks(next);
    },

    moveFavoriteCarpark: (fromIndex, toIndex) => {
      const next = moveItem(get().favoriteCarparks, fromIndex, toIndex);
      set({ favoriteCarparks: next });
      persistFavoriteCarparks(next);
    },

    selectFavoriteCarpark: async (favorite) => {
      get().updateViewport({
        latitude: favorite.latitude,
        longitude: favorite.longitude,
        zoom: 17.0,
      });

      const matched = get().carparks.find((item) => item.parkingId === favorite.parkingId);
      if (matched) {
        await get().loadCarparkDetail(matched);
        return;
      }

      const placeholder: Carpark = {
        parkingId: favorite.parkingId,
        address: favorite.address,
        thumbnail: favorite.thumbnail ?? null,
        vacancyId: favorite.vacancyId ?? null,
        superCharger: false,
        destination: false,
        name: favorite.name,
        latitude: favorite.latitude,
        longitude: favorite.longitude,
        charger: false,
        amount: '',
        features: [],
        dailyDiscount: [],
      };
      await get().loadCarparkDetail(placeholder);
    },

    meterRecord: (feature) => {
      const key = feature.properties.parkingSpaceId;
      if (!key) return undefined;
      return get().meterOccupancy[key];
    },

    vacancy: (carpark) => {
      const vacancyId = carpark.vacancyId;
      if (!vacancyId) return undefined;
      const value = get().carparkVacancies[vacancyId];
      if (value === undefined || value === '0' || value === '-1' || value === '') {
        return undefined;
      }
      return value;
    },

    searchLocations: (text) => {
      searchAbortController?.abort();
      const trimmed = text.trim();
      if (!trimmed) {
        set({ searchResults: [], isSearching: false });
        return;
      }

      set({ isSearching: true });
      const controller = new AbortController();
      searchAbortController = controller;

      void (async () => {
        try {
          await sleep(500, controller.signal);
          const results = await apiService.searchLocations(trimmed);
          if (controller.signal.aborted) return;
          set({ searchResults: results, isSearching: false });
        } catch (error) {
          if (controller.signal.aborted) return;
          if (error instanceof DOMException && error.name === 'AbortError') return;
          set({ searchResults: [], isSearching: false });
        }
      })();
    },

    applySearchResult: (item) => {
      set({
        selectedCoordinate: {
          latitude: item.latitude,
          longitude: item.longitude,
        },
        searchResults: [],
      });
      get().updateViewport({
        latitude: item.latitude,
        longitude: item.longitude,
        zoom: 17.0,
      });
    },

    fetchVisibleData: async (_northEast, _southWest) => {
      if (shouldRetryMeterCSVFetch) {
        await bootstrapMetersFromCSV();
      }
      try {
        const { viewport } = get();
        const fetchedCarparks = await apiService.fetchCarparks(
          viewport.latitude,
          viewport.longitude,
        );
        mergeCarparks(fetchedCarparks);
      } catch (error) {
        console.log('[AppModel][fetchVisibleData][Error]', error);
      }
    },

    refreshVacancyOnly: async () => {
      try {
        const [fetchedOccupancy, fetchedVacancies] = await Promise.all([
          apiService.fetchMeterOccupancy(),
          apiService.fetchCarparkVacancies(),
        ]);

        applyMeterOccupancy(fetchedOccupancy);
        applyCarparkVacancies(fetchedVacancies);
      } catch (error) {
        console.log('[AppModel][refreshVacancyOnly][Error]', error);
      }
    },

    loadCarparkDetail: async (carpark) => {
      try {
        set({ selectedCarpark: carpark });
        const detail = await apiService.fetchCarparkDetail(carpark.parkingId);
        set({ carparkDetail: detail });
      } catch (error) {
        console.log(
          `[AppModel][loadCarparkDetail][Error] parkingId=${carpark.parkingId} error=`,
          error,
        );
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        set({ lastErrorMessage: `Failed to load carpark details: ${message}` });
      }
    },

    setSelectedMeter: (feature) => {
      if (feature) {
        set({
          selectedMeter: feature,
          selectedCarpark: null,
          carparkDetail: null,
          selectedCoordinate: null,
        });
        return;
      }
      set({ selectedMeter: null });
    },

    setSelectedCoordinate: (coordinate) => {
      if (coordinate) {
        set({
          selectedCoordinate: coordinate,
          selectedMeter: null,
          selectedCarpark: null,
          carparkDetail: null,
        });
        return;
      }
      set({ selectedCoordinate: null });
    },

    clearSelections: () => {
      set({
        selectedMeter: null,
        selectedCarpark: null,
        carparkDetail: null,
        selectedCoordinate: null,
      });
    },

    clearError: () => {
      set({ lastErrorMessage: null });
    },

    handleIncomingURL: (urlInput) => {
      let url: URL;
      try {
        url = typeof urlInput === 'string' ? new URL(urlInput, window.location.origin) : urlInput;
      } catch {
        return;
      }

      // Native deep link: mikebill://locate?lat=&lng=
      // Web hash route: #/locate?lat=&lng= or #locate?lat=&lng=
      const isNativeLocate =
        url.protocol.replace(':', '').toLowerCase() === 'mikebill' &&
        url.hostname.toLowerCase() === 'locate';

      let latParam: string | null = null;
      let lngParam: string | null = null;

      if (isNativeLocate) {
        latParam = url.searchParams.get('lat');
        lngParam = url.searchParams.get('lng');
      } else {
        const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
        const hashPath = hash.startsWith('/') ? hash : `/${hash}`;
        const hashUrl = new URL(hashPath, 'https://mikebill.local');
        if (hashUrl.pathname.replace(/\/+$/, '') !== '/locate') return;
        latParam = hashUrl.searchParams.get('lat');
        lngParam = hashUrl.searchParams.get('lng');
      }

      if (latParam === null || lngParam === null) return;
      const latitude = Number.parseFloat(latParam);
      const longitude = Number.parseFloat(lngParam);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) return;

      set({
        selectedCoordinate: { latitude, longitude },
      });
      get().updateViewport({ latitude, longitude, zoom: 17.1 });
    },
  };
});

/** Non-hook access for map callbacks / services. */
export const appStore = {
  getState: () => useAppStore.getState(),
  setState: useAppStore.setState,
  subscribe: useAppStore.subscribe,
};
