import { Globe, Map as MapIcon } from 'lucide-react';
import type { LatLng } from '../../core/geo';
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

export function CoordinateDetailSheet({
  coordinate,
  open,
  onOpenChange,
}: {
  coordinate: LatLng | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!coordinate) return null;

  const latitudeText = coordinate.latitude.toFixed(6);
  const longitudeText = coordinate.longitude.toFixed(6);
  const summary = `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`;
  const hemisphere = `${coordinate.latitude >= 0 ? 'N' : 'S'} / ${coordinate.longitude >= 0 ? 'E' : 'W'}`;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} detent="large">
      <div className="space-y-4 px-4 pb-7">
        <LiquidSheetHeader title="Selected Location" subtitle={summary} />

        <LiquidActionRow>
          <LiquidActionButton
            icon={<AppleGlyph />}
            title="Apple Maps"
            onClick={() =>
              openAppleMapsDirections(
                coordinate.latitude,
                coordinate.longitude,
                'Selected Location',
              )
            }
          />
          <LiquidActionButton
            icon={<Globe className="h-[17px] w-[17px]" strokeWidth={2.25} />}
            title="Google Maps"
            onClick={() =>
              openGoogleMapsDirections(coordinate.latitude, coordinate.longitude)
            }
          />
          <LiquidActionButton
            icon={<MapIcon className="h-[17px] w-[17px]" strokeWidth={2.25} />}
            title="AMap"
            onClick={() =>
              openAMapDirections(
                coordinate.latitude,
                coordinate.longitude,
                'Selected Location',
              )
            }
          />
        </LiquidActionRow>

        <CompactMetadataRow
          items={[
            { title: 'Latitude', value: latitudeText },
            { title: 'Longitude', value: longitudeText },
            { title: 'Hemisphere', value: hemisphere },
            { title: 'Type', value: 'Dropped Pin' },
          ]}
        />

        <DetailCardSection title="Coordinates">
          <DetailLabeledRow title="Latitude" value={latitudeText} />
          <DetailLabeledRow title="Longitude" value={longitudeText} />
          <DetailLabeledRow title="Summary" value={summary} hidesDivider />
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
