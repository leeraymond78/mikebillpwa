import {
  asFlexibleBool,
  asFlexibleInt,
  asFlexibleString,
  requireFlexibleDouble,
  requireFlexibleInt,
} from './flexibleParse';
import { operatingPeriodDescription } from './operatingPeriod';

export const MapMode = {
  all: 0,
  parkingMeter: 1,
  carpark: 2,
} as const;

export type MapMode = (typeof MapMode)[keyof typeof MapMode];

export const MAP_MODE_TITLES: Record<MapMode, string> = {
  [MapMode.all]: 'All',
  [MapMode.parkingMeter]: 'Meters',
  [MapMode.carpark]: 'Carparks',
};

export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

export const HONG_KONG_DEFAULT_VIEWPORT: MapViewport = {
  latitude: 22.285519,
  longitude: 114.157273,
  zoom: 14.5,
};

export interface FavoriteLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  zoom: number;
  mapMode: MapMode;
}

export interface FavoriteCarpark {
  parkingId: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  thumbnail?: string | null;
  vacancyId?: string | null;
}

export interface SearchLocation {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
}

export const OccupancyStatus = {
  vacant: 'V',
  occupied: 'O',
  unknown: 'unknown',
} as const;

export type OccupancyStatus = (typeof OccupancyStatus)[keyof typeof OccupancyStatus];

export function parseOccupancyStatus(raw: string | null | undefined): OccupancyStatus {
  if (raw === OccupancyStatus.vacant) return OccupancyStatus.vacant;
  if (raw === OccupancyStatus.occupied) return OccupancyStatus.occupied;
  return OccupancyStatus.unknown;
}

export const ParkingMeterStatus = {
  normal: 'N',
  notForUse: 'NU',
  unknown: 'unknown',
} as const;

export type ParkingMeterStatus = (typeof ParkingMeterStatus)[keyof typeof ParkingMeterStatus];

export function parseParkingMeterStatus(raw: string | null | undefined): ParkingMeterStatus {
  if (raw === ParkingMeterStatus.normal) return ParkingMeterStatus.normal;
  if (raw === ParkingMeterStatus.notForUse) return ParkingMeterStatus.notForUse;
  return ParkingMeterStatus.unknown;
}

/** Matches iOS `OccupancyDateParser`: `MM/dd/yyyy hh:mm:ss a` (en_US_POSIX). */
const OCCUPANCY_DATE_RE =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i;

export function parseOccupancyDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const match = OCCUPANCY_DATE_RE.exec(trimmed);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const meridiem = match[7].toUpperCase();

  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  const date = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface OccupancyRecord {
  parkingSpaceId: string;
  parkingMeterStatus: ParkingMeterStatus;
  status: OccupancyStatus;
  dateChangedRaw?: string | null;
}

export function occupancyChangedAt(record: OccupancyRecord): Date | null {
  return parseOccupancyDate(record.dateChangedRaw);
}

export interface ParkingMeterProperties {
  districtTC?: string | null;
  vehicleType?: string | null;
  lpp?: number | null;
  objectId: number;
  operatingPeriod?: string | null;
  streetTC?: string | null;
  parkingSpaceId?: string | null;
  sectionOfStreetTC?: string | null;
}

export function getOperatingPeriodDescription(properties: ParkingMeterProperties): string {
  return operatingPeriodDescription(properties.operatingPeriod);
}

export interface ParkingMeterGeometry {
  /** GeoJSON order: [longitude, latitude] */
  coordinates: [number, number] | number[];
}

export function geometryLongitude(geometry: ParkingMeterGeometry): number {
  return geometry.coordinates[0] ?? 0;
}

export function geometryLatitude(geometry: ParkingMeterGeometry): number {
  return geometry.coordinates.length > 1 ? (geometry.coordinates[1] ?? 0) : 0;
}

export interface ParkingMeterFeature {
  geometry: ParkingMeterGeometry;
  type: string;
  properties: ParkingMeterProperties;
}

export function parkingMeterFeatureId(feature: ParkingMeterFeature): number {
  return feature.properties.objectId;
}

export interface ParkingMeterCollection {
  features: ParkingMeterFeature[];
}

export interface Carpark {
  parkingId: number;
  address: string;
  thumbnail?: string | null;
  vacancyId?: string | null;
  superCharger: boolean;
  destination: boolean;
  name: string;
  latitude: number;
  longitude: number;
  charger: boolean;
  amount: string;
  features: string[];
  dailyDiscount: string[];
}

export interface CarparkResponse {
  list: Carpark[];
  weekDay?: Record<string, number> | null;
}

export interface VacancyResponse {
  parkingVacancy: Record<string, string>;
}

export interface PhotoItem {
  photoURL: string;
}

export interface ParkingDiscount {
  title: string;
  period: string;
  description: string;
}

export interface FreeParking {
  data: ParkingDiscount[];
  link: string;
  photos: string[];
  remark?: string | null;
  businessHour?: string | null;
}

export interface DailyRateRow {
  weekDay: string;
  periodTime: string;
  amount: string;
}

export interface DailyRates {
  dailyCharge: DailyRateRow[];
}

export interface HourlyRateRow {
  weekDay: string;
  periodTime: string;
  amount: number;
  afterAmount?: number | null;
}

export interface HourlyRates {
  hourlyCharge: HourlyRateRow[];
  periodTitle?: string | null;
  periodAfterTitle?: string | null;
  showAfterPeriod?: boolean | null;
  showTimePeriod?: boolean | null;
}

export interface ParkingVideo {
  id: string;
  thumbnail: string;
  title: string;
  channelTitle: string;
  length: string;
}

export interface CarparkDetail {
  parkingId: number;
  latitude: number;
  longitude: number;
  vacancyId: string;
  name: string;
  address: string;
  indoor: boolean;
  heightLimit?: string | null;
  freeParking?: FreeParking | null;
  wilsonLink?: string | null;
  daily?: DailyRates | null;
  hourly?: HourlyRates | null;
  videos: ParkingVideo[];
  charger: boolean;
  photos: PhotoItem[];
}

export function carparkDetailPhotoURLs(detail: CarparkDetail): string[] {
  return detail.photos.map((p) => p.photoURL);
}

function recordOf(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function parseCarpark(raw: unknown): Carpark {
  const obj = recordOf(raw);
  return {
    parkingId: requireFlexibleInt(obj.parking_id, 'parking_id'),
    address: asFlexibleString(obj.address) ?? '',
    thumbnail: asFlexibleString(obj.thumbnail) ?? null,
    vacancyId: asFlexibleString(obj.vacancy_id) ?? null,
    superCharger: asFlexibleBool(obj.super_charger) ?? false,
    destination: asFlexibleBool(obj.destination) ?? false,
    name: asFlexibleString(obj.name) ?? '',
    latitude: requireFlexibleDouble(obj.latitude, 'latitude'),
    longitude: requireFlexibleDouble(obj.longitude, 'longitude'),
    charger: asFlexibleBool(obj.charger) ?? false,
    amount: asFlexibleString(obj.amount) ?? '',
    features: Array.isArray(obj.features) ? obj.features.map(String) : [],
    dailyDiscount: Array.isArray(obj.daily_discount)
      ? obj.daily_discount.map(String)
      : [],
  };
}

export function parseCarparkResponse(raw: unknown): CarparkResponse {
  const obj = recordOf(raw);
  const list = Array.isArray(obj.list) ? obj.list.map(parseCarpark) : [];
  const weekDay =
    obj.weekDay && typeof obj.weekDay === 'object' && !Array.isArray(obj.weekDay)
      ? (obj.weekDay as Record<string, number>)
      : null;
  return { list, weekDay };
}

/** Vacancy values may arrive as string | number | null — normalize to string map. */
export function parseVacancyResponse(raw: unknown): VacancyResponse {
  const obj = recordOf(raw);
  const nested = recordOf(obj.parking_vacancy);
  const parkingVacancy: Record<string, string> = {};

  for (const [key, value] of Object.entries(nested)) {
    if (value === null || value === undefined) {
      parkingVacancy[key] = '';
    } else if (typeof value === 'string') {
      parkingVacancy[key] = value;
    } else if (typeof value === 'number') {
      parkingVacancy[key] = String(value);
    } else {
      parkingVacancy[key] = String(value);
    }
  }

  return { parkingVacancy };
}

function parseDailyRateRow(raw: unknown): DailyRateRow {
  const obj = recordOf(raw);
  return {
    weekDay: asFlexibleString(obj.week_day) ?? '',
    periodTime: asFlexibleString(obj.period_time) ?? '',
    amount: asFlexibleString(obj.amount) ?? '',
  };
}

function parseFreeParking(raw: unknown): FreeParking | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = recordOf(raw);
  return {
    data: Array.isArray(obj.data)
      ? obj.data.map((item) => {
          const row = recordOf(item);
          return {
            title: asFlexibleString(row.title) ?? '',
            period: asFlexibleString(row.period) ?? '',
            description: asFlexibleString(row.description) ?? '',
          };
        })
      : [],
    link: asFlexibleString(obj.link) ?? '',
    photos: Array.isArray(obj.photos) ? obj.photos.map(String) : [],
    remark: asFlexibleString(obj.remark) ?? null,
    businessHour: asFlexibleString(obj.businessHour) ?? asFlexibleString(obj.business_hour) ?? null,
  };
}

function parseHourlyRates(raw: unknown): HourlyRates | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = recordOf(raw);
  const hourlyCharge = Array.isArray(obj.hourly_charge)
    ? obj.hourly_charge.map((item) => {
        const row = recordOf(item);
        return {
          weekDay: asFlexibleString(row.week_day) ?? '',
          periodTime: asFlexibleString(row.period_time) ?? '',
          amount: requireFlexibleInt(row.amount, 'amount'),
          afterAmount:
            row.after_amount === null || row.after_amount === undefined
              ? null
              : (asFlexibleInt(row.after_amount) ?? null),
        };
      })
    : [];

  return {
    hourlyCharge,
    periodTitle: asFlexibleString(obj.period_title) ?? null,
    periodAfterTitle: asFlexibleString(obj.period_after_title) ?? null,
    showAfterPeriod: asFlexibleBool(obj.show_after_period) ?? null,
    showTimePeriod: asFlexibleBool(obj.show_time_period) ?? null,
  };
}

function parseDailyRates(raw: unknown): DailyRates | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = recordOf(raw);
  return {
    dailyCharge: Array.isArray(obj.daily_charge)
      ? obj.daily_charge.map(parseDailyRateRow)
      : [],
  };
}

function parsePhotoItem(raw: unknown): PhotoItem {
  const obj = recordOf(raw);
  return { photoURL: asFlexibleString(obj.photo_url) ?? '' };
}

function parseParkingVideo(raw: unknown): ParkingVideo {
  const obj = recordOf(raw);
  return {
    id: asFlexibleString(obj.id) ?? '',
    thumbnail: asFlexibleString(obj.thumbnail) ?? '',
    title: asFlexibleString(obj.title) ?? '',
    channelTitle: asFlexibleString(obj.channelTitle) ?? asFlexibleString(obj.channel_title) ?? '',
    length: asFlexibleString(obj.length) ?? '',
  };
}

export function parseCarparkDetail(raw: unknown): CarparkDetail {
  const obj = recordOf(raw);
  return {
    parkingId: requireFlexibleInt(obj.parking_id, 'parking_id'),
    latitude: requireFlexibleDouble(obj.latitude, 'latitude'),
    longitude: requireFlexibleDouble(obj.longitude, 'longitude'),
    vacancyId: asFlexibleString(obj.vacancy_id) ?? '',
    name: asFlexibleString(obj.name) ?? '',
    address: asFlexibleString(obj.address) ?? '',
    indoor: asFlexibleBool(obj.indoor) ?? false,
    heightLimit: asFlexibleString(obj.height_limit) ?? null,
    freeParking: obj.free_parking ? parseFreeParking(obj.free_parking) : null,
    wilsonLink: asFlexibleString(obj.wilson_link) ?? null,
    daily: obj.daily ? parseDailyRates(obj.daily) : null,
    hourly: obj.hourly ? parseHourlyRates(obj.hourly) : null,
    videos: Array.isArray(obj.videos) ? obj.videos.map(parseParkingVideo) : [],
    charger: asFlexibleBool(obj.charger) ?? false,
    photos: Array.isArray(obj.photos) ? obj.photos.map(parsePhotoItem) : [],
  };
}

export function parseSearchLocation(raw: unknown): SearchLocation {
  const obj = recordOf(raw);
  return {
    id: asFlexibleString(obj.id) ?? '',
    title: asFlexibleString(obj.title) ?? '',
    latitude: requireFlexibleDouble(obj.latitude, 'latitude'),
    longitude: requireFlexibleDouble(obj.longitude, 'longitude'),
  };
}

export interface SearchLocationsResponse {
  list: SearchLocation[];
}

export function parseSearchLocationsResponse(raw: unknown): SearchLocationsResponse {
  const obj = recordOf(raw);
  return {
    list: Array.isArray(obj.list) ? obj.list.map(parseSearchLocation) : [],
  };
}
