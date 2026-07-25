import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  Globe,
  Home,
  Map as MapIcon,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react';
import type { CarparkDetail } from '../../models';
import { apiService } from '../../services';
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
  DetailDiscountRow,
  DetailLabeledRow,
  DetailRateRow,
  LiquidActionButton,
  LiquidActionRow,
  LiquidSheetHeader,
  SheetGrabber,
} from '../ui/LiquidUI';

export function CarparkDetailSheet({
  detail,
  open,
  onOpenChange,
}: {
  detail: CarparkDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const carparks = useAppStore((s) => s.carparks);
  const vacancy = useAppStore((s) => s.vacancy);
  const isFavoriteCarpark = useAppStore((s) => s.isFavoriteCarpark);
  const toggleFavoriteCarpark = useAppStore((s) => s.toggleFavoriteCarpark);
  const [gallery, setGallery] = useState<{ urls: string[]; index: number } | null>(null);

  if (!detail) return null;

  const matched = carparks.find((item) => item.parkingId === detail.parkingId);
  const vacancyText = matched ? vacancy(matched) ?? 'Unknown' : 'Unknown';
  const vacancyColor =
    vacancyText === 'Unknown' ? 'var(--color-secondary-label)' : 'var(--color-green)';
  const favorited = isFavoriteCarpark(detail.parkingId);
  const photoURLs = detail.photos.map((p) => p.photoURL).filter(Boolean);
  const height = formatHeightLimit(detail.heightLimit);

  return (
    <>
      <BottomSheet open={open} onOpenChange={onOpenChange} detent="large">
        <div className="space-y-4 px-4 pb-7">
          <SheetGrabber className="pt-0" />
          <LiquidSheetHeader
            title={detail.name}
            subtitle={detail.address}
            trailing={
              <button
                type="button"
                aria-label="Toggle favorite"
                onClick={() => toggleFavoriteCarpark(detail)}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/14"
              >
                {favorited ? (
                  <Star className="h-[17px] w-[17px] fill-[var(--color-yellow)] text-[var(--color-yellow)]" />
                ) : (
                  <Plus className="h-[17px] w-[17px] text-[var(--color-label)]" strokeWidth={2.5} />
                )}
              </button>
            }
          />

          <LiquidActionRow>
            <LiquidActionButton
              icon={<AppleGlyph />}
              title="Apple Maps"
              onClick={() =>
                openAppleMapsDirections(detail.latitude, detail.longitude, detail.name)
              }
            />
            <LiquidActionButton
              icon={<Globe className="h-[17px] w-[17px]" strokeWidth={2.25} />}
              title="Google Maps"
              onClick={() => openGoogleMapsDirections(detail.latitude, detail.longitude)}
            />
            <LiquidActionButton
              icon={<MapIcon className="h-[17px] w-[17px]" strokeWidth={2.25} />}
              title="AMap"
              onClick={() =>
                openAMapDirections(detail.latitude, detail.longitude, detail.name)
              }
            />
          </LiquidActionRow>

          <CompactMetadataRow
            items={[
              { title: 'Vacancy', value: vacancyText, valueColor: vacancyColor },
              { title: 'Indoor', value: detail.indoor ? 'Yes' : 'No' },
              { title: 'EV', value: detail.charger ? 'Yes' : 'No' },
              { title: 'Height', value: height },
            ]}
          />

          {photoURLs.length > 0 ? (
            <DetailCardSection title="Photos">
              <div className="flex gap-3 overflow-x-auto [scrollbar-width:none]">
                {photoURLs.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    className="relative shrink-0"
                    onClick={() => setGallery({ urls: photoURLs, index })}
                  >
                    <RemoteImage
                      url={url}
                      className="h-[124px] w-[178px] rounded-2xl object-cover"
                    />
                    <span className="absolute top-2 right-2 rounded-full bg-black/55 p-2 text-white">
                      <Search className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                  </button>
                ))}
              </div>
            </DetailCardSection>
          ) : null}

          <DetailCardSection title="Info">
            <DetailLabeledRow title="Address" value={detail.address} />
            <DetailLabeledRow title="Indoor" value={detail.indoor ? 'Yes' : 'No'} />
            <DetailLabeledRow title="EV Charging" value={detail.charger ? 'Yes' : 'No'} />
            <DetailLabeledRow title="Height Limit" value={height} hidesDivider />
          </DetailCardSection>

          {detail.hourly && detail.hourly.hourlyCharge.length > 0 ? (
            <DetailCardSection title="Hourly Rates">
              {detail.hourly.hourlyCharge.map((rate) => (
                <DetailRateRow
                  key={`${rate.weekDay}-${rate.periodTime}-${rate.amount}`}
                  title={rate.weekDay}
                  detail={`${rate.periodTime} • HK$${rate.amount}/hr`}
                />
              ))}
            </DetailCardSection>
          ) : null}

          {detail.daily && detail.daily.dailyCharge.length > 0 ? (
            <DetailCardSection title="Daily Rates">
              {detail.daily.dailyCharge.map((rate) => (
                <DetailRateRow
                  key={`${rate.weekDay}-${rate.periodTime}-${rate.amount}`}
                  title={rate.weekDay}
                  detail={`${rate.periodTime} • HK$${rate.amount}/day`}
                />
              ))}
            </DetailCardSection>
          ) : null}

          {detail.freeParking && detail.freeParking.data.length > 0 ? (
            <DetailCardSection title="Parking Discounts">
              {detail.freeParking.link ? (
                <a
                  href={detail.freeParking.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-2.5 flex items-center gap-2.5 rounded-[14px] bg-[color-mix(in_srgb,var(--color-green)_88%,black)] px-3.5 py-3 text-white no-underline"
                >
                  <Home className="h-4 w-4" strokeWidth={2.25} />
                  <span className="flex-1 text-[15px] font-semibold">Wilson Parking Website</span>
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                </a>
              ) : null}

              {detail.freeParking.data.map((item, index) => (
                <div key={`${item.title}-${index}`}>
                  <DetailDiscountRow
                    title={item.title}
                    period={item.period}
                    description={item.description}
                  />
                  {detail.freeParking?.businessHour ? (
                    <DetailLabeledRow
                      title="Business Hours"
                      value={detail.freeParking.businessHour}
                    />
                  ) : null}
                  {detail.freeParking?.remark ? (
                    <DetailLabeledRow
                      title="Remark"
                      value={detail.freeParking.remark}
                      hidesDivider={
                        index === (detail.freeParking?.data.length ?? 0) - 1 &&
                        (detail.freeParking?.photos.length ?? 0) === 0
                      }
                    />
                  ) : null}
                </div>
              ))}

              {detail.freeParking.photos.length > 0 ? (
                <div className="mt-3 flex gap-3 overflow-x-auto [scrollbar-width:none]">
                  {detail.freeParking.photos.map((url, index) => (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      className="relative shrink-0"
                      onClick={() =>
                        setGallery({ urls: detail.freeParking!.photos, index })
                      }
                    >
                      <RemoteImage
                        url={url}
                        className="h-[124px] w-[178px] rounded-2xl object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </DetailCardSection>
          ) : null}

          {detail.videos.length > 0 ? (
            <DetailCardSection title="Videos">
              {detail.videos.map((video) => (
                <a
                  key={video.id}
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 py-1 text-left text-[var(--color-label)] no-underline"
                >
                  <RemoteImage
                    url={video.thumbnail}
                    className="h-[72px] w-24 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[15px] font-semibold">{video.title}</div>
                    <div className="text-[12px] text-[var(--color-secondary-label)]">
                      {video.channelTitle}
                    </div>
                    <div className="text-[11px] text-[var(--color-secondary-label)]">
                      {video.length}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--color-secondary-label)]" />
                </a>
              ))}
            </DetailCardSection>
          ) : null}
        </div>
      </BottomSheet>

      {gallery ? (
        <PhotoGallery
          urls={gallery.urls}
          index={gallery.index}
          onClose={() => setGallery(null)}
        />
      ) : null}
    </>
  );
}

function formatHeightLimit(value: string | null | undefined): string {
  if (!value) return '—';
  return value.endsWith('m') ? value : `${value}m`;
}

function RemoteImage({ url, className }: { url: string; className?: string }) {
  const normalized = useMemo(
    () => apiService.normalizedRemoteURLString(url),
    [url],
  );
  if (!normalized) {
    return (
      <div className={`bg-[var(--color-fill-tertiary)] ${className ?? ''}`} />
    );
  }
  return <img src={normalized} alt="" className={className} loading="lazy" />;
}

function PhotoGallery({
  urls,
  index,
  onClose,
}: {
  urls: string[];
  index: number;
  onClose: () => void;
}) {
  const [selection, setSelection] = useState(index);

  return (
    <div className="fixed inset-0 z-[70] bg-black">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-5">
        {urls.length > 1 ? (
          <div className="rounded-full bg-black/55 px-3 py-2 text-[15px] font-semibold text-white">
            {selection + 1} / {urls.length}
          </div>
        ) : (
          <span />
        )}
        <button
          type="button"
          aria-label="Close gallery"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>

      <div
        className="flex h-full snap-x snap-mandatory overflow-x-auto"
        onScroll={(event) => {
          const width = event.currentTarget.clientWidth;
          if (width <= 0) return;
          setSelection(Math.round(event.currentTarget.scrollLeft / width));
        }}
      >
        {urls.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="flex h-full w-full shrink-0 snap-center items-center justify-center px-2"
          >
            <RemoteImage url={url} className="max-h-full max-w-full object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="currentColor" aria-hidden>
      <path d="M16.37 12.63c.03-2.24 1.83-3.32 1.91-3.37-1.04-1.52-2.66-1.73-3.23-1.75-1.38-.14-2.69.81-3.39.81-.7 0-1.78-.79-2.93-.77-1.51.02-2.9.88-3.67 2.23-1.57 2.72-.4 6.74 1.12 8.95.75 1.08 1.64 2.29 2.81 2.25 1.14-.05 1.57-.73 2.95-.73 1.37 0 1.77.73 2.97.71 1.23-.02 2.01-1.1 2.76-2.19.87-1.26 1.22-2.48 1.24-2.54-.03-.01-2.38-.91-2.41-3.6zM14.5 5.9c.62-.75 1.04-1.8.92-2.84-.89.04-1.97.59-2.61 1.34-.57.66-1.07 1.72-.94 2.73 1 .08 2.02-.5 2.63-1.23z" />
    </svg>
  );
}
