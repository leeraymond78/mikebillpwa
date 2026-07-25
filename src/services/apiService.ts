import {
  type Carpark,
  type CarparkDetail,
  type OccupancyRecord,
  type ParkingMeterFeature,
  type SearchLocation,
  parseCarparkDetail,
  parseCarparkResponse,
  parseOccupancyStatus,
  parseParkingMeterStatus,
  parseSearchLocationsResponse,
  parseVacancyResponse,
} from '../models';
import { parseCSVRow, parseParkingMetersCSV } from './csvUtils';
import { readCachedCSV, writeCachedCSV } from './csvCache';

const PARKING_METERS_CSV_REMOTE_URL =
  'https://resource.data.one.gov.hk/td/psiparkingspaces/spaceinfo/parkingspaces.csv';
const OCCUPANCY_CSV_URL =
  'https://resource.data.one.gov.hk/td/psiparkingspaces/occupancystatus/occupancystatus.csv';
const CARPARKS_URL = 'https://api.car4goal.com/parking/fetchPrivateParking';
const VACANCY_URL = 'https://api.car4goal.com/parking/fetchVacancy';
const CARPARK_DETAIL_URL = 'https://api.car4goal.com/parking/fetchParkingDetail';
const SEARCH_URL = 'https://api.car4goal.com/parking/fetchParkingLocation';

const PARKING_METERS_CSV_CACHE_FILENAME = 'parkingspaces.csv';
const REQUEST_TIMEOUT_MS = 30_000;

function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function logDecodingError(error: unknown, endpoint: string, data: string): void {
  const preview = data.slice(0, 1200);
  console.error(`[DecodeError] endpoint=${endpoint} error=`, error);
  console.error(`[DecodeError][Preview] endpoint=${endpoint} payload=${preview}`);
}

async function request(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | null;
  } = {},
): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: options.headers,
      body: options.body ?? undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`badServerResponse: ${response.status} ${response.statusText}`);
    }

    return response.arrayBuffer();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function requestText(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | null;
  } = {},
): Promise<string> {
  const buffer = await request(url, options);
  return new TextDecoder('utf-8').decode(buffer);
}

async function requestJson<T>(
  url: string,
  parse: (raw: unknown) => T,
  endpoint: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | null;
  } = {},
): Promise<T> {
  const text = await requestText(url, options);
  try {
    const raw: unknown = JSON.parse(text);
    return parse(raw);
  } catch (error) {
    logDecodingError(error, endpoint, text);
    throw error;
  }
}

class APIServiceImpl {
  /**
   * Normalize remote media URLs the same way as iOS `normalizedRemoteURLString`.
   */
  normalizedRemoteURLString(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) return null;
    let value = raw.trim();
    if (!value) return null;

    if (value.startsWith('//')) {
      value = `https:${value}`;
    }

    if (value.toLowerCase().startsWith('http://')) {
      value = `https://${value.slice('http://'.length)}`;
    }

    return value;
  }

  async loadCachedParkingMetersFromCSV(): Promise<ParkingMeterFeature[] | null> {
    const data = await readCachedCSV(PARKING_METERS_CSV_CACHE_FILENAME);
    if (!data) return null;

    const text = new TextDecoder('utf-8').decode(data);
    const parsed = parseParkingMetersCSV(text, 'loadCachedParkingMetersFromCSV');
    return parsed.length === 0 ? null : parsed;
  }

  async fetchAndCacheParkingMetersFromCSV(): Promise<ParkingMeterFeature[]> {
    const data = await request(PARKING_METERS_CSV_REMOTE_URL);
    try {
      await writeCachedCSV(PARKING_METERS_CSV_CACHE_FILENAME, data);
    } catch (error) {
      console.error('[ParkingMetersCSV][CacheWriteError]', error);
      throw error;
    }
    const text = new TextDecoder('utf-8').decode(data);
    return parseParkingMetersCSV(text, 'fetchAndCacheParkingMetersFromCSV');
  }

  async fetchMeterOccupancy(): Promise<Record<string, OccupancyRecord>> {
    const raw = await requestText(OCCUPANCY_CSV_URL);
    const lines = raw
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      console.log('[OccupancyCSV] Empty CSV response');
      return {};
    }

    const headers = parseCSVRow(lines[0].replace(/^\uFEFF/, ''));
    console.log(`[OccupancyCSV] totalLines=${lines.length} headers=${headers.join(',')}`);

    const result: Record<string, OccupancyRecord> = {};
    const malformedRows: { line: number; raw: string; parsedCount: number }[] = [];
    let missingIdCount = 0;

    for (let index = 1; index < lines.length; index += 1) {
      const line = lines[index];
      const columns = parseCSVRow(line);
      if (columns.length !== headers.length) {
        if (malformedRows.length < 10) {
          malformedRows.push({ line: index + 1, raw: line, parsedCount: columns.length });
        }
        continue;
      }

      const map: Record<string, string> = {};
      for (let i = 0; i < headers.length; i += 1) {
        map[headers[i]] = columns[i] ?? '';
      }

      const parkingSpaceId = (map.ParkingSpaceId ?? '').trim();
      if (!parkingSpaceId) {
        missingIdCount += 1;
        continue;
      }

      const dateChangedRaw = (
        map.OccupancyDateChanged ??
        map['OccupancyDateChanged\r'] ??
        ''
      ).trim();

      const record: OccupancyRecord = {
        parkingSpaceId,
        parkingMeterStatus: parseParkingMeterStatus(
          (map.ParkingMeterStatus ?? '').trim(),
        ),
        status: parseOccupancyStatus((map.OccupancyStatus ?? '').trim()),
        dateChangedRaw: dateChangedRaw || null,
      };

      result[record.parkingSpaceId] = record;
    }

    console.log(
      `[OccupancyCSV] parsedRecords=${Object.keys(result).length} malformedRows=${malformedRows.length} missingIdRows=${missingIdCount}`,
    );
    for (const malformed of malformedRows) {
      console.log(
        `[OccupancyCSV][Malformed] line=${malformed.line} parsedCount=${malformed.parsedCount} raw=${malformed.raw}`,
      );
    }

    return result;
  }

  async fetchCarparks(
    latitude: number,
    longitude: number,
    page = 1,
  ): Promise<Carpark[]> {
    const now = new Date();
    const end = new Date(now.getTime() + 3600_000);

    const payload = {
      page,
      filter_type: [] as unknown[],
      latitude,
      longitude,
      startFrom: formatDateTimeLocal(now),
      endFrom: formatDateTimeLocal(end),
    };

    const response = await requestJson(
      CARPARKS_URL,
      parseCarparkResponse,
      'fetchCarparks',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    return response.list;
  }

  async fetchCarparkVacancies(): Promise<Record<string, string>> {
    const response = await requestJson(
      VACANCY_URL,
      parseVacancyResponse,
      'fetchCarparkVacancies',
      {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
      },
    );
    return response.parkingVacancy;
  }

  async fetchCarparkDetail(parkingId: number): Promise<CarparkDetail> {
    const body = JSON.stringify({
      unique_id: crypto.randomUUID(),
      detail: true,
    });

    return requestJson(
      `${CARPARK_DETAIL_URL}/${parkingId}`,
      parseCarparkDetail,
      'fetchCarparkDetail',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body,
      },
    );
  }

  async searchLocations(query: string): Promise<SearchLocation[]> {
    const url = new URL(SEARCH_URL);
    url.searchParams.set('search', query);

    const response = await requestJson(
      url.toString(),
      parseSearchLocationsResponse,
      'searchLocations',
      {
        headers: {
          accept: 'application/json',
        },
      },
    );

    return response.list;
  }
}

export const apiService = new APIServiceImpl();
