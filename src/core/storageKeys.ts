/** Mirrors MikeBilliOS `AppStorageKeys` — keep string values identical. */
export const AppStorageKeys = {
  enableDarkMode: 'enableDarkMode',
  enableAlert: 'enableAlert',
  rememberLastView: 'rememberLastView',
  currentMapMode: 'currentMapMode',
  lastLatitude: 'lastLat',
  lastLongitude: 'lastLng',
  lastZoom: 'lastZoom',
  favoriteLocations: 'favoriteLocations',
  favoriteCarparks: 'favoriteCarparks',
  cachedMeters: 'cached_meters',
  cachedMeterOccupancy: 'cached_meter_occupancy',
  cachedCarparks: 'cached_carparks',
  cachedVacancies: 'cached_vacancies',
} as const;

export type AppStorageKey = (typeof AppStorageKeys)[keyof typeof AppStorageKeys];
