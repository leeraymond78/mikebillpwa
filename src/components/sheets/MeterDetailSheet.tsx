import { Globe, Map as MapIcon } from 'lucide-react';
import type { ParkingMeterFeature } from '../../models';
import {
  getOperatingPeriodDescription,
  OccupancyStatus,
  ParkingMeterStatus,
} from '../../models';
import { useAppStore } from '../../store';
import {
  openAMapDirections,
  openAppleMapsDirections,
  openGoogleMapsDirections,
} from '../../core/navigation';
import { BottomSheet } from '../ui/BottomSheet';
import {
  CompactMetadataRow,
  DetailCardSection,
  DetailLabeledRow,
  LiquidActionButton,
  LiquidActionRow,
  LiquidSheetHeader,
} from '../ui/LiquidUI';

export function MeterDetailSheet({
  feature,
  open,
  onOpenChange,
}: {
  feature: ParkingMeterFeature | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const meterRecord = useAppStore((s) => s.meterRecord);

  if (!feature) return null;

  const record = meterRecord(feature);
  const streetTitle = [feature.properties.streetTC, feature.properties.sectionOfStreetTC]
    .filter(Boolean)
    .join(', ');

  let occupancyText = 'Unknown';
  let occupancyColor = 'var(--color-secondary-label)';
  if (record?.status === OccupancyStatus.vacant) {
    occupancyText = 'Vacant';
    occupancyColor = 'var(--color-green)';
  } else if (record?.status === OccupancyStatus.occupied) {
    occupancyText = 'Occupied';
    occupancyColor = 'var(--color-red)';
  }

  const meterStatusText =
    record?.parkingMeterStatus === ParkingMeterStatus.notForUse ? 'Not for Use' : 'Normal';

  const lat = feature.geometry.coordinates[1] ?? 0;
  const lng = feature.geometry.coordinates[0] ?? 0;
  const title = streetTitle || 'Parking Meter';

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} detent="large">
      <div className="space-y-4 px-4 pb-7">
        <LiquidSheetHeader
          title={title}
          subtitle={feature.properties.districtTC ?? 'Parking Meter'}
        />

        <LiquidActionRow>
          <LiquidActionButton
            icon={<AppleGlyph />}
            title="Apple Maps"
            onClick={() => openAppleMapsDirections(lat, lng, title)}
          />
          <LiquidActionButton
            icon={<Globe className="h-[17px] w-[17px]" strokeWidth={2.25} />}
            title="Google Maps"
            onClick={() => openGoogleMapsDirections(lat, lng)}
          />
          <LiquidActionButton
            icon={<MapIcon className="h-[17px] w-[17px]" strokeWidth={2.25} />}
            title="AMap"
            onClick={() => openAMapDirections(lat, lng, title)}
          />
        </LiquidActionRow>

        <CompactMetadataRow
          items={[
            { title: 'Occupancy', value: occupancyText, valueColor: occupancyColor },
            { title: 'Status', value: meterStatusText },
            { title: 'Max', value: `${feature.properties.lpp ?? 0} mins` },
            { title: 'Area', value: feature.properties.districtTC ?? '—' },
          ]}
        />

        <DetailCardSection title="Details">
          <DetailLabeledRow title="Street" value={title} />
          <DetailLabeledRow
            title="Operation"
            value={getOperatingPeriodDescription(feature.properties)}
          />
          <DetailLabeledRow title="Meter Status" value={meterStatusText} hidesDivider />
        </DetailCardSection>
      </div>
    </BottomSheet>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="currentColor" aria-hidden>
      <path d="M16.37 12.63c.03-2.24 1.83-3.32 1.91-3.37-1.04-1.52-2.66-1.73-3.23-1.75-1.38-.14-2.69.81-3.39.81-.7 0-1.78-.79-2.93-.77-1.51.02-2.9.88-3.67 2.23-1.57 2.72-.4 6.74 1.12 8.95.75 1.08 1.64 2.29 2.81 2.25 1.14-.05 1.57-.73 2.95-.73 1.37 0 1.77.73 2.97.71 1.23-.02 2.01-1.1 2.76-2.19.87-1.26 1.22-2.48 1.24-2.54-.03-.01-2.38-.91-2.41-3.6zM14.5 5.9c.62-.75 1.04-1.8.92-2.84-.89.04-1.97.59-2.61 1.34-.57.66-1.07 1.72-.94 2.73 1 .08 2.02-.5 2.63-1.23z" />
    </svg>
  );
}
