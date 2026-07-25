import type { ParkingMeterFeature, ParkingMeterProperties } from '../models';

/** RFC4180-style CSV row parser (matches iOS `parseCSVRow`). */
export function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes) {
        const next = line[i + 1];
        if (next === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        if (line[i] === ',') {
          result.push(current);
          current = '';
          i += 1;
        }
        continue;
      }
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      i += 1;
      continue;
    }

    current += char;
    i += 1;
  }

  result.push(current);
  return result.map((cell) => cell.trim());
}

export function parseFlexibleInt(raw: string | undefined | null): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const int = Number.parseInt(raw, 10);
  if (!Number.isNaN(int)) return int;
  const double = Number.parseFloat(raw);
  if (!Number.isNaN(double)) return Math.trunc(double);
  return undefined;
}

/** FNV-1a style hash matching iOS `deterministicObjectId`. */
export function deterministicObjectId(parkingSpaceId: string, poleId?: number): number {
  let hash = 2_166_136_261 >>> 0;
  for (let i = 0; i < parkingSpaceId.length; i += 1) {
    hash ^= parkingSpaceId.charCodeAt(i);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  if (poleId !== undefined) {
    hash ^= poleId | 0;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash & 0x7fff_ffff;
}

export function parseParkingMetersCSV(data: string, endpoint: string): ParkingMeterFeature[] {
  const lines = data.split(/\r?\n/);
  if (lines.length === 0) {
    console.log(`[ParkingMetersCSV][${endpoint}] Empty CSV payload`);
    return [];
  }

  const headerIndex = lines.findIndex((line) => {
    const normalized = line.replace(/^\uFEFF/, '');
    return (
      normalized.includes('PoleId') &&
      normalized.includes('ParkingSpaceId') &&
      normalized.includes('Latitude') &&
      normalized.includes('Longitude')
    );
  });

  if (headerIndex < 0) {
    console.log(`[ParkingMetersCSV][${endpoint}] Header row not found`);
    return [];
  }

  const headers = parseCSVRow(lines[headerIndex].replace(/^\uFEFF/, ''));
  const features: ParkingMeterFeature[] = [];

  for (let lineIndex = headerIndex + 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const trimmed = line.trim();
    if (!trimmed || /^,+$/.test(trimmed)) continue;

    const columns = parseCSVRow(line);
    if (columns.length < headers.length) continue;

    const map: Record<string, string> = {};
    for (let i = 0; i < headers.length; i += 1) {
      map[headers[i]] = columns[i] ?? '';
    }

    const vehicleType = (map.VehicleType ?? '').trim();
    if (vehicleType !== 'A') continue;

    const latitude = Number.parseFloat(map.Latitude ?? '');
    const longitude = Number.parseFloat(map.Longitude ?? '');
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) continue;

    const parkingSpaceId = (map.ParkingSpaceId ?? '').trim() || undefined;
    const poleId = parseFlexibleInt(map.PoleId);
    const objectId = deterministicObjectId(
      parkingSpaceId ?? `${latitude},${longitude}`,
      poleId,
    );
    const lpp = parseFlexibleInt(map.LPP) ?? null;

    const properties: ParkingMeterProperties = {
      districtTC: map.District_tc || null,
      vehicleType,
      lpp,
      objectId,
      operatingPeriod: map.OperatingPeriod || null,
      streetTC: map.Street_tc || null,
      parkingSpaceId: parkingSpaceId ?? null,
      sectionOfStreetTC: map.SectionOfStreet_tc || null,
    };

    features.push({
      geometry: { coordinates: [longitude, latitude] },
      type: 'Feature',
      properties,
    });
  }

  const deduplicated = new Map<number, ParkingMeterFeature>();
  for (const feature of features) {
    deduplicated.set(feature.properties.objectId, feature);
  }

  return [...deduplicated.values()].sort(
    (a, b) => a.properties.objectId - b.properties.objectId,
  );
}
