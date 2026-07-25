/**
 * Smoke checks for models + CSV/API helpers (run via `npx tsx src/models/__smoke.ts`).
 * Not a full test suite — validates critical parity with iOS parsing.
 */
import {
  MapMode,
  OccupancyStatus,
  parseCarpark,
  parseOccupancyDate,
  parseVacancyResponse,
  HONG_KONG_DEFAULT_VIEWPORT,
} from './index';
import { deterministicObjectId, parseCSVRow, parseParkingMetersCSV } from '../services/csvUtils';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

assert(HONG_KONG_DEFAULT_VIEWPORT.latitude === 22.285519, 'HK default lat');
assert(MapMode.all === 0 && MapMode.parkingMeter === 1 && MapMode.carpark === 2, 'MapMode raw values');

const date = parseOccupancyDate('07/25/2026 01:30:00 PM');
assert(date !== null && date.getHours() === 13, 'occupancy date PM parse');

assert(parseCSVRow('a,"b,c",d').join('|') === 'a|b,c|d', 'quoted CSV field');

const csv = `PoleId,ParkingSpaceId,Latitude,Longitude,VehicleType,LPP,District_tc,OperatingPeriod,Street_tc,SectionOfStreet_tc
1,SPACE1,22.28,114.15,A,120,中西區,A,德輔道中,一段
2,SPACE2,22.29,114.16,B,60,灣仔,B,軒尼詩道,
`;
const features = parseParkingMetersCSV(csv, 'smoke');
assert(features.length === 1, 'VehicleType A filter');
assert(features[0].properties.parkingSpaceId === 'SPACE1', 'parkingSpaceId');
assert(features[0].geometry.coordinates[0] === 114.15, 'GeoJSON lon first');

const oid = deterministicObjectId('SPACE1', 1);
assert(oid === deterministicObjectId('SPACE1', 1), 'objectId stable');
assert(oid > 0, 'objectId positive');

const carpark = parseCarpark({
  parking_id: '42',
  address: 100,
  name: 'Test',
  latitude: '22.3',
  longitude: 114.2,
  charger: '1',
  amount: 28,
  features: [],
  daily_discount: [],
});
assert(carpark.parkingId === 42, 'flexible parking_id');
assert(carpark.address === '100', 'flexible address');
assert(carpark.charger === true, 'flexible bool');
assert(carpark.amount === '28', 'flexible amount');

const vacancy = parseVacancyResponse({
  parking_vacancy: { a: 12, b: '3', c: null },
});
assert(vacancy.parkingVacancy.a === '12', 'vacancy int→string');
assert(vacancy.parkingVacancy.c === '', 'vacancy null→empty');
assert(OccupancyStatus.vacant === 'V', 'occupancy raw');

console.log('[smoke] models + CSV helpers OK');
