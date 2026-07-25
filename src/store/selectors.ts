import type { AppStore } from './appStore';

/** Fine-grained Zustand selectors for React components. */
export const selectViewport = (state: AppStore) => state.viewport;
export const selectMapMode = (state: AppStore) => state.mapMode;
export const selectDarkMode = (state: AppStore) => state.enableDarkMode;
export const selectMeterFeatures = (state: AppStore) => state.meterFeatures;
export const selectMeterOccupancy = (state: AppStore) => state.meterOccupancy;
export const selectCarparks = (state: AppStore) => state.carparks;
export const selectCarparkVacancies = (state: AppStore) => state.carparkVacancies;
export const selectSearchResults = (state: AppStore) => state.searchResults;
export const selectIsSearching = (state: AppStore) => state.isSearching;
export const selectSelectedMeter = (state: AppStore) => state.selectedMeter;
export const selectSelectedCarpark = (state: AppStore) => state.selectedCarpark;
export const selectCarparkDetail = (state: AppStore) => state.carparkDetail;
export const selectSelectedCoordinate = (state: AppStore) => state.selectedCoordinate;
export const selectFavoriteLocations = (state: AppStore) => state.favoriteLocations;
export const selectFavoriteCarparks = (state: AppStore) => state.favoriteCarparks;
export const selectLastErrorMessage = (state: AppStore) => state.lastErrorMessage;
export const selectIsBootstrapped = (state: AppStore) => state.isBootstrapped;
