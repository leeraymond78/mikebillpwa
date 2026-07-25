import type { Carpark, FavoriteLocation, ParkingMeterFeature } from '../models';
import { parkingMeterFeatureId } from '../models';

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

export function arraysEqualByJson<T>(a: T[], b: T[]): boolean {
  return stableStringify(a) === stableStringify(b);
}

export function recordsEqualByJson<T>(
  a: Record<string, T>,
  b: Record<string, T>,
): boolean {
  return stableStringify(a) === stableStringify(b);
}

export function sortMeterFeatures(features: ParkingMeterFeature[]): ParkingMeterFeature[] {
  return [...features].sort(
    (left, right) => parkingMeterFeatureId(left) - parkingMeterFeatureId(right),
  );
}

export function mergeCarpark(existing: Carpark | undefined, incoming: Carpark): Carpark {
  if (!existing) return incoming;
  return {
    parkingId: existing.parkingId,
    address: incoming.address === '' ? existing.address : incoming.address,
    thumbnail: incoming.thumbnail ?? existing.thumbnail,
    vacancyId: incoming.vacancyId ?? existing.vacancyId,
    superCharger: incoming.superCharger,
    destination: incoming.destination,
    name: incoming.name === '' ? existing.name : incoming.name,
    latitude: incoming.latitude,
    longitude: incoming.longitude,
    charger: incoming.charger,
    amount: incoming.amount === '' ? existing.amount : incoming.amount,
    features: incoming.features.length === 0 ? existing.features : incoming.features,
    dailyDiscount:
      incoming.dailyDiscount.length === 0 ? existing.dailyDiscount : incoming.dailyDiscount,
  };
}

/** Mirrors Swift `Array.move(fromOffsets:toOffset:)`. */
export function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || fromIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  const clampedTo = Math.max(0, Math.min(toIndex, next.length));
  next.splice(clampedTo, 0, item);
  return next;
}

/** Mirrors `AppModel.moveFavoriteLocationInFilteredView`. */
export function moveFavoriteInFilteredView(
  favoriteLocations: FavoriteLocation[],
  favorite: FavoriteLocation,
  toFilteredIndex: number,
  filter: number | null,
): FavoriteLocation[] {
  const matchesFilter = (item: FavoriteLocation) =>
    filter === null || item.mapMode === filter;

  const filtered = favoriteLocations.filter(matchesFilter);
  const oldFilteredIndex = filtered.findIndex((item) => item.id === favorite.id);
  if (oldFilteredIndex < 0) return favoriteLocations;

  let adjustedIndex = toFilteredIndex;
  if (adjustedIndex > oldFilteredIndex) {
    adjustedIndex -= 1;
  }
  adjustedIndex = Math.max(0, Math.min(adjustedIndex, filtered.length - 1));

  const originalIndex = favoriteLocations.findIndex((item) => item.id === favorite.id);
  if (originalIndex < 0) return favoriteLocations;

  const next = [...favoriteLocations];
  const [item] = next.splice(originalIndex, 1);

  const updatedFiltered = next.filter(matchesFilter);
  let targetOriginalIndex: number;
  if (adjustedIndex >= updatedFiltered.length) {
    targetOriginalIndex = next.length;
  } else {
    const target = updatedFiltered[adjustedIndex];
    const index = next.findIndex((candidate) => candidate.id === target.id);
    targetOriginalIndex = index >= 0 ? index : next.length;
  }

  next.splice(targetOriginalIndex, 0, item);
  return next;
}

export function notifyVacancyAlert(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([40, 30, 40]);
    }
  } catch {
    // Ignore unsupported vibration APIs.
  }
}
