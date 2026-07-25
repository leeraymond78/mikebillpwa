import type { ReactNode } from 'react';
import { LocateFixed, Plus, Search, Settings, Star } from 'lucide-react';

export function RefreshIndicator({ progress }: { progress: number }) {
  const remaining = Math.max(0, Math.min(1, 1 - progress));
  const seconds = Math.max(0, Math.ceil(remaining * 7));
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.max(circumference * 0.02, circumference * remaining);

  return (
    <div
      className="relative flex h-8 w-8 items-center justify-center"
      aria-label="Refresh countdown"
    >
      <svg className="absolute inset-0 h-8 w-8 -rotate-90" viewBox="0 0 32 32">
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.18}
          strokeWidth="2.5"
        />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-[stroke-dasharray] duration-75 linear"
        />
      </svg>
      <span className="relative text-[12px] font-semibold tabular-nums text-[var(--color-label)]">
        {seconds}
      </span>
    </div>
  );
}

export function ControlBar({
  refreshProgress,
  onSearch,
  onSettings,
  onFavorites,
  onAddFavorite,
  onLocate,
  onRefreshTap,
  locating = false,
}: {
  refreshProgress: number;
  onSearch: () => void;
  onSettings: () => void;
  onFavorites: () => void;
  onAddFavorite: () => void;
  onLocate: () => void;
  onRefreshTap: () => void;
  locating?: boolean;
}) {
  return (
    <div className="mx-auto flex w-fit items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-grouped-secondary)_72%,transparent)] px-2.5 py-2 shadow-[0_8px_16px_rgba(0,0,0,0.08)] ring-1 ring-[var(--color-card-stroke)] backdrop-blur-xl">
      <GlassIconButton label="Search" onClick={onSearch}>
        <Search className="h-[17px] w-[17px]" strokeWidth={2.25} />
      </GlassIconButton>
      <GlassIconButton label="Settings" onClick={onSettings}>
        <Settings className="h-[17px] w-[17px]" strokeWidth={2.25} />
      </GlassIconButton>
      <GlassIconButton label="Favorites" onClick={onFavorites}>
        <Star className="h-[17px] w-[17px]" strokeWidth={2.25} />
      </GlassIconButton>
      <GlassIconButton label="Add favorite" onClick={onAddFavorite}>
        <Plus className="h-[17px] w-[17px]" strokeWidth={2.25} />
      </GlassIconButton>
      <GlassIconButton
        label="Show current location"
        onClick={onLocate}
        active={locating}
      >
        <LocateFixed className="h-[17px] w-[17px]" strokeWidth={2.25} />
      </GlassIconButton>

      <div className="mx-0.5 h-[26px] w-px shrink-0 bg-[var(--color-separator)]" />

      <button
        type="button"
        aria-label="Open HK E-Meter"
        onClick={onRefreshTap}
        className="flex h-10 w-10 items-center justify-center"
      >
        <RefreshIndicator progress={refreshProgress} />
      </button>
    </div>
  );
}

function GlassIconButton({
  children,
  label,
  onClick,
  active = false,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center active:opacity-60 ${
        active ? 'text-[var(--color-accent)]' : 'text-[var(--color-label)]'
      }`}
    >
      <span className="flex h-[30px] w-[30px] items-center justify-center">{children}</span>
    </button>
  );
}
