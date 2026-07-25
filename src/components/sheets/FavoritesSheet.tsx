import { useMemo, useState, type ReactNode } from 'react';
import { Car, Ellipsis, Map as MapIcon } from 'lucide-react';
import type { FavoriteCarpark, FavoriteLocation } from '../../models';
import { apiService } from '../../services';
import { useAppStore } from '../../store';
import { buildStaticMapURL } from '../../core/navigation';
import { BottomSheet, SheetDoneButton } from '../ui/BottomSheet';
import { SegmentedControl } from '../ui/LiquidUI';

type FavoritesTab = 'maps' | 'carparks';

/** Prefer the Maps JS key (same referrer rules as the live map); fall back to a dedicated Static key. */
function staticMapApiKeys(): string[] {
  const keys = [
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim(),
    (import.meta.env.VITE_GOOGLE_MAPS_STATIC_KEY as string | undefined)?.trim(),
  ].filter((key): key is string => Boolean(key));
  return [...new Set(keys)];
}

export function FavoritesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = useState<FavoritesTab>('maps');
  const [editTarget, setEditTarget] = useState<FavoriteLocation | null>(null);
  const [editedName, setEditedName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<FavoriteLocation | null>(null);
  const [deleteCarparkTarget, setDeleteCarparkTarget] = useState<FavoriteCarpark | null>(null);
  const [dragMapId, setDragMapId] = useState<string | null>(null);
  const [dragCarparkId, setDragCarparkId] = useState<number | null>(null);

  const favoriteLocations = useAppStore((s) => s.favoriteLocations);
  const favoriteCarparks = useAppStore((s) => s.favoriteCarparks);
  const carparkVacancies = useAppStore((s) => s.carparkVacancies);
  const enableDarkMode = useAppStore((s) => s.enableDarkMode);
  const navigateToFavoriteLocation = useAppStore((s) => s.navigateToFavoriteLocation);
  const renameFavoriteLocation = useAppStore((s) => s.renameFavoriteLocation);
  const deleteFavoriteLocation = useAppStore((s) => s.deleteFavoriteLocation);
  const moveFavoriteLocation = useAppStore((s) => s.moveFavoriteLocation);
  const selectFavoriteCarpark = useAppStore((s) => s.selectFavoriteCarpark);
  const removeFavoriteCarpark = useAppStore((s) => s.removeFavoriteCarpark);
  const moveFavoriteCarpark = useAppStore((s) => s.moveFavoriteCarpark);

  const close = () => onOpenChange(false);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Favorites"
      leading={<SheetDoneButton align="leading" onClick={close} />}
    >
      <div className="px-4 pb-2 pt-2">
        <SegmentedControl
          value={tab}
          onChange={(value) => {
            setTab(value);
            setDragMapId(null);
            setDragCarparkId(null);
          }}
          options={[
            {
              value: 'maps',
              label: 'Maps',
              icon: <MapIcon className="h-4 w-4" strokeWidth={2.25} />,
            },
            {
              value: 'carparks',
              label: 'Carparks',
              icon: <Car className="h-4 w-4" strokeWidth={2.25} />,
            },
          ]}
        />
      </div>

      {tab === 'maps' ? (
        favoriteLocations.length === 0 ? (
          <EmptyState
            icon={<MapIcon className="h-10 w-10" />}
            title="No map bookmarks yet"
            description="Save map locations to bookmark coordinates and navigate back to them here"
          />
        ) : (
          <div className="space-y-3 px-4 pb-8 pt-1">
            {favoriteLocations.map((favorite, index) => (
              <div
                key={favorite.id}
                draggable
                onDragStart={() => setDragMapId(favorite.id)}
                onDragEnd={() => setDragMapId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragMapId == null) return;
                  const from = favoriteLocations.findIndex((item) => item.id === dragMapId);
                  if (from < 0 || from === index) return;
                  const to = index > from ? index + 1 : index;
                  moveFavoriteLocation(from, to);
                  setDragMapId(null);
                }}
                className={`flex items-center gap-3 rounded-2xl bg-[var(--color-grouped-secondary)] p-3 ${
                  dragMapId === favorite.id ? 'opacity-65' : ''
                }`}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => {
                    navigateToFavoriteLocation(favorite);
                    close();
                  }}
                >
                  <MapThumbnail favorite={favorite} dark={enableDarkMode} />
                  <div className="min-w-0">
                    <div className="truncate text-[22px] font-normal text-[var(--color-label)]">
                      {favorite.name}
                    </div>
                    <div className="text-[13px] text-[var(--color-secondary-label)]">
                      {favorite.latitude.toFixed(4)}, {favorite.longitude.toFixed(4)}
                    </div>
                    <div className="text-[13px] text-[var(--color-secondary-label)]">
                      Zoom {Math.round(favorite.zoom)}
                    </div>
                  </div>
                </button>
                <FavoriteMenu
                  onEdit={() => {
                    setEditTarget(favorite);
                    setEditedName(favorite.name);
                  }}
                  onDelete={() => setDeleteTarget(favorite)}
                />
              </div>
            ))}
          </div>
        )
      ) : favoriteCarparks.length === 0 ? (
        <EmptyState
          icon={<Car className="h-10 w-10" />}
          title="No favorite carparks"
          description="Star carparks from the detail view to see them here"
        />
      ) : (
        <div className="space-y-3 px-4 pb-8 pt-1">
          {favoriteCarparks.map((favorite, index) => (
            <div
              key={favorite.parkingId}
              draggable
              onDragStart={() => setDragCarparkId(favorite.parkingId)}
              onDragEnd={() => setDragCarparkId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragCarparkId == null) return;
                const from = favoriteCarparks.findIndex(
                  (item) => item.parkingId === dragCarparkId,
                );
                if (from < 0 || from === index) return;
                const to = index > from ? index + 1 : index;
                moveFavoriteCarpark(from, to);
                setDragCarparkId(null);
              }}
              className={`flex items-center gap-3 rounded-2xl bg-[var(--color-grouped-secondary)] p-3 ${
                dragCarparkId === favorite.parkingId ? 'opacity-65' : ''
              }`}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => {
                  void selectFavoriteCarpark(favorite).then(close);
                }}
              >
                <CarparkThumbnail favorite={favorite} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[22px] text-[var(--color-label)]">
                    {favorite.name}
                  </div>
                  <div className="line-clamp-2 text-[17px] text-[var(--color-secondary-label)]">
                    {favorite.address}
                  </div>
                  <FavoriteCarparkVacancy
                    vacancy={favoriteVacancy(favorite, carparkVacancies)}
                  />
                </div>
              </button>
              <FavoriteMenu
                editLabel="View Details"
                deleteLabel="Remove from Favorites"
                onEdit={() => {
                  void selectFavoriteCarpark(favorite).then(close);
                }}
                onDelete={() => setDeleteCarparkTarget(favorite)}
              />
            </div>
          ))}
        </div>
      )}

      {editTarget ? (
        <PromptDialog
          title="Rename Favorite"
          value={editedName}
          onChange={setEditedName}
          onCancel={() => setEditTarget(null)}
          onConfirm={() => {
            renameFavoriteLocation(editTarget, editedName.trim());
            setEditTarget(null);
          }}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete Favorite"
          message={`Are you sure you want to delete "${deleteTarget.name}"?`}
          confirmLabel="Delete"
          destructive
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteFavoriteLocation(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      ) : null}

      {deleteCarparkTarget ? (
        <ConfirmDialog
          title="Remove from Favorites"
          message={`Are you sure you want to remove "${deleteCarparkTarget.name}" from your favorites?`}
          confirmLabel="Remove"
          destructive
          onCancel={() => setDeleteCarparkTarget(null)}
          onConfirm={() => {
            removeFavoriteCarpark(deleteCarparkTarget);
            setDeleteCarparkTarget(null);
          }}
        />
      ) : null}
    </BottomSheet>
  );
}

function MapThumbnail({
  favorite,
  dark,
}: {
  favorite: FavoriteLocation;
  dark: boolean;
}) {
  const keys = useMemo(() => staticMapApiKeys(), []);
  const [keyIndex, setKeyIndex] = useState(0);
  const [failed, setFailed] = useState(keys.length === 0);

  const url = useMemo(() => {
    const apiKey = keys[keyIndex];
    if (!apiKey) return null;
    return buildStaticMapURL({
      latitude: favorite.latitude,
      longitude: favorite.longitude,
      zoom: favorite.zoom,
      dark,
      apiKey,
      width: 200,
      height: 152,
      scale: 2,
    });
  }, [favorite.latitude, favorite.longitude, favorite.zoom, dark, keys, keyIndex]);

  if (failed || !url) {
    return (
      <div className="flex h-[76px] w-[100px] shrink-0 items-center justify-center rounded-xl bg-[var(--color-fill-tertiary)] text-[var(--color-secondary-label)] shadow-[0_0_0_0.8px_var(--color-card-stroke)]">
        <MapIcon className="h-6 w-6" strokeWidth={2} />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      className="h-[76px] w-[100px] shrink-0 rounded-xl object-cover shadow-[0_0_0_0.8px_var(--color-card-stroke)]"
      onError={() => {
        if (keyIndex < keys.length - 1) {
          setKeyIndex((index) => index + 1);
          return;
        }
        setFailed(true);
      }}
    />
  );
}

function favoriteVacancy(
  favorite: FavoriteCarpark,
  vacancies: Record<string, string>,
): string | undefined {
  const vacancyId = favorite.vacancyId;
  if (!vacancyId) return undefined;
  const value = vacancies[vacancyId];
  if (value === undefined || value === '0' || value === '-1' || value === '') {
    return undefined;
  }
  return value;
}

function FavoriteCarparkVacancy({ vacancy }: { vacancy: string | undefined }) {
  if (vacancy == null) {
    return (
      <div className="mt-0.5 text-[15px] text-[var(--color-secondary-label)]">
        Vacancy unknown
      </div>
    );
  }

  return (
    <div className="mt-0.5 text-[15px] font-semibold text-[var(--color-green)]">
      {vacancy} vacant
    </div>
  );
}

function CarparkThumbnail({ favorite }: { favorite: FavoriteCarpark }) {
  const url = apiService.normalizedRemoteURLString(favorite.thumbnail);
  return url ? (
    <img
      src={url}
      alt=""
      className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover shadow-[0_0_0_0.8px_var(--color-card-stroke)]"
    />
  ) : (
    <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-[var(--color-fill-tertiary)] text-[var(--color-secondary-label)]">
      <Car className="h-6 w-6" />
    </div>
  );
}

function FavoriteMenu({
  onEdit,
  onDelete,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
}: {
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  deleteLabel?: string;
}) {
  return (
    <details className="relative">
      <summary className="flex h-7 w-7 list-none items-center justify-center text-[var(--color-secondary-label)] [&::-webkit-details-marker]:hidden">
        <Ellipsis className="h-5 w-5" />
      </summary>
      <div className="absolute right-0 z-10 mt-1 min-w-[180px] overflow-hidden rounded-xl bg-[var(--color-grouped-secondary)] py-1 shadow-xl ring-1 ring-black/10">
        <button
          type="button"
          className="block w-full px-4 py-2.5 text-left text-[15px] text-[var(--color-label)]"
          onClick={onEdit}
        >
          {editLabel}
        </button>
        <button
          type="button"
          className="block w-full px-4 py-2.5 text-left text-[15px] text-[var(--color-red)]"
          onClick={onDelete}
        >
          {deleteLabel}
        </button>
      </div>
    </details>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center text-[var(--color-secondary-label)]">
      <div className="mb-4 opacity-50">{icon}</div>
      <div className="text-[20px] font-semibold text-[var(--color-label)]">{title}</div>
      <p className="mt-2 m-0 max-w-xs text-[15px]">{description}</p>
    </div>
  );
}

function PromptDialog({
  title,
  value,
  onChange,
  onCancel,
  onConfirm,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-8">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--color-grouped-secondary)]">
        <div className="px-5 pt-5 text-center">
          <div className="text-[17px] font-semibold">{title}</div>
          <input
            autoFocus
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="mt-3 w-full rounded-lg bg-[var(--color-fill-tertiary)] px-3 py-2 text-[17px] outline-none"
          />
        </div>
        <div className="mt-4 grid grid-cols-2 border-t border-[var(--color-separator)]">
          <button type="button" className="py-3 text-[17px] text-[var(--color-accent)]" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="border-l border-[var(--color-separator)] py-3 text-[17px] font-semibold text-[var(--color-accent)] disabled:opacity-40"
            disabled={!value.trim()}
            onClick={onConfirm}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  destructive,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-8">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--color-grouped-secondary)]">
        <div className="px-5 pt-5 text-center">
          <div className="text-[17px] font-semibold">{title}</div>
          <p className="mt-2 m-0 text-[13px] text-[var(--color-secondary-label)]">{message}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 border-t border-[var(--color-separator)]">
          <button type="button" className="py-3 text-[17px] text-[var(--color-accent)]" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`border-l border-[var(--color-separator)] py-3 text-[17px] font-semibold ${
              destructive ? 'text-[var(--color-red)]' : 'text-[var(--color-accent)]'
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
