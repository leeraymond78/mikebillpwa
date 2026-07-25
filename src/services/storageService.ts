/**
 * localStorage persistence mirroring iOS `StorageService` + `UserDefaults`.
 * Large datasets should use `idbCache` — localStorage quota is ~5MB.
 */
class StorageServiceImpl {
  save<T>(value: T, key: string): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (this.isQuotaError(error)) {
        this.evictLargeCaches();
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return;
        } catch (retryError) {
          console.warn('[StorageService] save failed after eviction', key, retryError);
          return;
        }
      }
      console.warn('[StorageService] save failed', key, error);
    }
  }

  load<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setBool(value: boolean, key: string): void {
    this.save(value, key);
  }

  setInt(value: number, key: string): void {
    this.save(Math.trunc(value), key);
  }

  setDouble(value: number, key: string): void {
    this.save(value, key);
  }

  bool(key: string, defaultValue: boolean): boolean {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    try {
      return Boolean(JSON.parse(raw));
    } catch {
      return defaultValue;
    }
  }

  integer(key: string, defaultValue: number): number {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'number' ? Math.trunc(parsed) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  double(key: string): number | null {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'number' ? parsed : null;
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  /** Drop legacy oversized caches that blow the 5MB localStorage budget. */
  evictLargeCaches(): void {
    const bulky = [
      'cached_meters',
      'cached_meter_occupancy',
      'cached_carparks',
      'cached_vacancies',
    ];
    for (const key of bulky) {
      localStorage.removeItem(key);
    }
  }

  private isQuotaError(error: unknown): boolean {
    return (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    );
  }
}

export const storageService = new StorageServiceImpl();
