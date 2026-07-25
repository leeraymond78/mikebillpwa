/**
 * Binary CSV cache using Cache API (mirrors iOS FileManager caches directory).
 * Falls back to IndexedDB-like memory-only when Cache API is unavailable.
 */
const CSV_CACHE_NAME = 'mikebill-csv-v1';
const PARKING_METERS_CSV_URL = 'https://mikebill.local/cache/parkingspaces.csv';

let memoryFallback: ArrayBuffer | null = null;

export async function readCachedCSV(filename: string): Promise<ArrayBuffer | null> {
  if (filename !== 'parkingspaces.csv') return null;

  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CSV_CACHE_NAME);
      const response = await cache.match(PARKING_METERS_CSV_URL);
      if (response) return response.arrayBuffer();
    } catch (error) {
      console.warn('[CSVCache] read failed', error);
    }
  }

  return memoryFallback;
}

export async function writeCachedCSV(filename: string, data: ArrayBuffer): Promise<void> {
  if (filename !== 'parkingspaces.csv') return;

  memoryFallback = data;

  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CSV_CACHE_NAME);
      await cache.put(
        PARKING_METERS_CSV_URL,
        new Response(data, {
          headers: { 'Content-Type': 'text/csv; charset=utf-8' },
        }),
      );
    } catch (error) {
      console.warn('[CSVCache] write failed', error);
    }
  }
}
