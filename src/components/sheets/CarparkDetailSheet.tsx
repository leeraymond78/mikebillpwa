import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight,
  ChevronLeft,
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
  const photoURLs = detail.photos
    .map((p) => apiService.normalizedRemoteURLString(p.photoURL))
    .filter((url): url is string => Boolean(url));
  const height = formatHeightLimit(detail.heightLimit);

  return (
    <>
      <BottomSheet open={open} onOpenChange={onOpenChange} detent="large">
        <div className="space-y-4 px-4 pb-7">
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

      {gallery
        ? createPortal(
            <PhotoGallery
              urls={gallery.urls}
              index={gallery.index}
              onClose={() => setGallery(null)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function formatHeightLimit(value: string | null | undefined): string {
  if (!value) return '—';
  return value.endsWith('m') ? value : `${value}m`;
}

function RemoteImage({
  url,
  className,
  draggable = true,
}: {
  url: string;
  className?: string;
  draggable?: boolean;
}) {
  const normalized = useMemo(
    () => apiService.normalizedRemoteURLString(url),
    [url],
  );
  if (!normalized) {
    return (
      <div className={`bg-[var(--color-fill-tertiary)] ${className ?? ''}`} />
    );
  }
  return (
    <img
      src={normalized}
      alt=""
      className={className}
      loading="lazy"
      draggable={draggable}
    />
  );
}

/**
 * Simple iOS-friendly gallery: one photo at a time, chevron buttons,
 * swipe between photos, large close control, centered thumbnails.
 */
function PhotoGallery({
  urls,
  index,
  onClose,
}: {
  urls: string[];
  index: number;
  onClose: () => void;
}) {
  const images = useMemo(
    () =>
      urls
        .map((url) => apiService.normalizedRemoteURLString(url))
        .filter((url): url is string => Boolean(url)),
    [urls],
  );
  const [selection, setSelection] = useState(() =>
    Math.max(0, Math.min(index, Math.max(0, images.length - 1))),
  );
  const stageRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const goTo = (next: number) => {
    if (images.length === 0) return;
    setSelection(Math.max(0, Math.min(images.length - 1, next)));
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || images.length <= 1) return;

    const onStart = (event: globalThis.TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const onEnd = (event: globalThis.TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) {
        setSelection((value) => Math.min(images.length - 1, value + 1));
      } else {
        setSelection((value) => Math.max(0, value - 1));
      }
    };

    stage.addEventListener('touchstart', onStart, { passive: true });
    stage.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      stage.removeEventListener('touchstart', onStart);
      stage.removeEventListener('touchend', onEnd);
    };
  }, [images.length]);

  useEffect(() => {
    for (const offset of [-1, 1] as const) {
      const url = images[selection + offset];
      if (!url) continue;
      const preload = new Image();
      preload.src = url;
    }
  }, [images, selection]);

  if (images.length === 0) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
        <button
          type="button"
          aria-label="Close gallery"
          onClick={onClose}
          className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white"
          style={{ top: 'max(0.75rem, var(--safe-top))' }}
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <p className="text-[15px] text-white/70">No photos available</p>
      </div>
    );
  }

  const current = images[selection] ?? images[0];
  const hasMany = images.length > 1;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Photo gallery"
    >
      <div
        className="relative z-30 flex shrink-0 items-center justify-between gap-3 px-3"
        style={{ paddingTop: 'max(0.5rem, var(--safe-top))' }}
      >
        {hasMany ? (
          <div className="rounded-full bg-white/15 px-3 py-2 text-[15px] font-semibold text-white">
            {selection + 1} / {images.length}
          </div>
        ) : (
          <span className="h-11 w-11" />
        )}
        <button
          type="button"
          aria-label="Close gallery"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white active:bg-white/35"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      <div
        ref={stageRef}
        className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden px-12"
      >
        <img
          key={current}
          src={current}
          alt=""
          className="max-h-full max-w-full select-none object-contain"
          draggable={false}
        />

        {hasMany ? (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              disabled={selection === 0}
              onClick={() => goTo(selection - 1)}
              className="absolute left-2 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-25"
            >
              <ChevronLeft className="h-7 w-7" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              disabled={selection >= images.length - 1}
              onClick={() => goTo(selection + 1)}
              className="absolute right-2 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-25"
            >
              <ChevronRight className="h-7 w-7" strokeWidth={2.25} />
            </button>
          </>
        ) : null}
      </div>

      {hasMany ? (
        <div
          className="relative z-30 w-full shrink-0 border-t border-white/10 bg-black"
          style={{ paddingBottom: 'max(0.75rem, var(--safe-bottom))' }}
        >
          <div className="flex w-full items-center justify-center gap-3 px-4 py-3">
            {images.map((url, i) => {
              const selected = i === selection;
              return (
                <button
                  key={`thumb-${url}-${i}`}
                  type="button"
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={selected}
                  onClick={() => goTo(i)}
                  className={`h-16 w-[5.5rem] shrink-0 overflow-hidden rounded-xl ${
                    selected ? 'opacity-100 ring-2 ring-white ring-offset-0' : 'opacity-55'
                  }`}
                >
                  <img
                    src={url}
                    alt=""
                    className="pointer-events-none h-full w-full object-cover"
                    draggable={false}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
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
