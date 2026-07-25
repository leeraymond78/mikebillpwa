/**
 * Smoke checks for AppModel helper parity.
 * Run: `npx tsx src/store/__smoke.ts`
 */
import { MapMode, type FavoriteLocation } from '../models';
import { mergeCarpark, moveFavoriteInFilteredView, moveItem } from './helpers';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const moved = moveItem(['a', 'b', 'c'], 0, 2);
assert(moved.join('') === 'bca', 'moveItem 0→2');

const carpark = mergeCarpark(
  {
    parkingId: 1,
    address: 'old',
    thumbnail: 't1',
    vacancyId: 'v1',
    superCharger: false,
    destination: false,
    name: 'Old',
    latitude: 1,
    longitude: 2,
    charger: false,
    amount: '10',
    features: ['a'],
    dailyDiscount: ['d'],
  },
  {
    parkingId: 1,
    address: '',
    thumbnail: null,
    vacancyId: null,
    superCharger: true,
    destination: true,
    name: '',
    latitude: 3,
    longitude: 4,
    charger: true,
    amount: '',
    features: [],
    dailyDiscount: [],
  },
);
assert(carpark.address === 'old', 'merge keeps address');
assert(carpark.thumbnail === 't1', 'merge keeps thumbnail');
assert(carpark.name === 'Old', 'merge keeps name');
assert(carpark.latitude === 3, 'merge updates coords');
assert(carpark.superCharger === true, 'merge updates flags');

const favorites: FavoriteLocation[] = [
  {
    id: '1',
    name: 'A',
    latitude: 1,
    longitude: 1,
    zoom: 14,
    mapMode: MapMode.parkingMeter,
  },
  {
    id: '2',
    name: 'B',
    latitude: 2,
    longitude: 2,
    zoom: 14,
    mapMode: MapMode.carpark,
  },
  {
    id: '3',
    name: 'C',
    latitude: 3,
    longitude: 3,
    zoom: 14,
    mapMode: MapMode.parkingMeter,
  },
];

const reordered = moveFavoriteInFilteredView(favorites, favorites[2], 0, MapMode.parkingMeter);
assert(reordered[0].id === '3', 'filtered move places C first among meters');
assert(reordered.map((f) => f.id).join('') === '312', 'full order after filtered move');

console.log('[smoke] store helpers OK');
