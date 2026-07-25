import type { OccupancyRecord, ParkingMeterFeature } from '../../models';
import { OccupancyStatus } from '../../models';

export interface MeterCluster {
  id: string;
  latitude: number;
  longitude: number;
  vacant: number;
  total: number;
}

/** Individual meter markers only at this zoom and above. */
export const MINIMUM_INDIVIDUAL_METER_ZOOM = 15.5;

/** One cluster per street + section parking area (e.g. 耀星街, 龍和道). */
export function parkingAreaKey(feature: ParkingMeterFeature): string {
  const street = feature.properties.streetTC?.trim() || '';
  const section = feature.properties.sectionOfStreetTC?.trim() || '';
  if (street || section) return `${street}|${section}`;

  // Fallback: keep unknown-area meters from merging across the map.
  const spaceId = feature.properties.parkingSpaceId?.trim();
  if (spaceId) return `space:${spaceId}`;
  return `id:${feature.properties.objectId}`;
}

export function buildMeterClusters(
  features: ParkingMeterFeature[],
  occupancy: Record<string, OccupancyRecord>,
): MeterCluster[] {
  const buckets = new Map<
    string,
    { sumLat: number; sumLng: number; vacant: number; total: number }
  >();

  for (const feature of features) {
    const latitude = feature.geometry.coordinates[1] ?? 0;
    const longitude = feature.geometry.coordinates[0] ?? 0;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const id = parkingAreaKey(feature);
    let bucket = buckets.get(id);
    if (!bucket) {
      bucket = { sumLat: 0, sumLng: 0, vacant: 0, total: 0 };
      buckets.set(id, bucket);
    }

    bucket.sumLat += latitude;
    bucket.sumLng += longitude;
    bucket.total += 1;

    const spaceId = feature.properties.parkingSpaceId;
    if (spaceId && occupancy[spaceId]?.status === OccupancyStatus.vacant) {
      bucket.vacant += 1;
    }
  }

  const clusters: MeterCluster[] = [];
  for (const [id, bucket] of buckets) {
    clusters.push({
      id,
      latitude: bucket.sumLat / bucket.total,
      longitude: bucket.sumLng / bucket.total,
      vacant: bucket.vacant,
      total: bucket.total,
    });
  }
  return clusters;
}
