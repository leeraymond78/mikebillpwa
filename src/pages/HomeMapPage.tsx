import { useEffect, useState } from 'react';
import { ControlBar } from '../components/controls/ControlBar';
import { SearchPanel } from '../components/controls/SearchPanel';
import { GoogleMapView } from '../components/map/GoogleMapView';
import { CarparkDetailSheet } from '../components/sheets/CarparkDetailSheet';
import { CoordinateDetailSheet } from '../components/sheets/CoordinateDetailSheet';
import { FavoritesSheet } from '../components/sheets/FavoritesSheet';
import { MeterDetailSheet } from '../components/sheets/MeterDetailSheet';
import { SettingsSheet } from '../components/sheets/SettingsSheet';
import { openHKEMeter } from '../core/navigation';
import { locationService } from '../services/locationService';
import { useAppStore } from '../store';

const REFRESH_CYCLE_DURATION = 7;
const LOCATE_ZOOM = 16;

function locationErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: number }).code;
    if (code === 1) return 'Location permission denied';
    if (code === 2) return 'Location unavailable';
    if (code === 3) return 'Location request timed out';
  }
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    (error as { message: string }).message
  ) {
    return (error as { message: string }).message;
  }
  return 'Unable to get current location';
}

/**
 * Mirrors iOS `HomeMapView`:
 * full-screen map + search overlay + glass control bar + modal sheets.
 */
export function HomeMapPage() {
  const [isShowingSearch, setIsShowingSearch] = useState(false);
  const [isShowingFavorites, setIsShowingFavorites] = useState(false);
  const [isShowingSettings, setIsShowingSettings] = useState(false);
  const [isShowingAddFavorite, setIsShowingAddFavorite] = useState(false);
  const [newFavoriteName, setNewFavoriteName] = useState('');
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [showHKEMeterAlert, setShowHKEMeterAlert] = useState(false);
  const [locating, setLocating] = useState(false);

  const selectedMeter = useAppStore((s) => s.selectedMeter);
  const selectedCarpark = useAppStore((s) => s.selectedCarpark);
  const carparkDetail = useAppStore((s) => s.carparkDetail);
  const selectedCoordinate = useAppStore((s) => s.selectedCoordinate);
  const lastErrorMessage = useAppStore((s) => s.lastErrorMessage);
  const addFavoriteLocation = useAppStore((s) => s.addFavoriteLocation);
  const updateViewport = useAppStore((s) => s.updateViewport);
  const setSelectedMeter = useAppStore((s) => s.setSelectedMeter);
  const setSelectedCoordinate = useAppStore((s) => s.setSelectedCoordinate);
  const clearError = useAppStore((s) => s.clearError);
  const clearSelections = useAppStore((s) => s.clearSelections);

  const centerOnCurrentLocation = (options?: { showError?: boolean }) => {
    if (locating) return;
    setLocating(true);
    locationService.startWatching();
    void locationService
      .requestCurrentLocationAsync()
      .then((coordinate) => {
        updateViewport({
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          zoom: LOCATE_ZOOM,
        });
      })
      .catch((error: unknown) => {
        if (options?.showError !== false) {
          useAppStore.setState({ lastErrorMessage: locationErrorMessage(error) });
        }
      })
      .finally(() => setLocating(false));
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now() / 1000;
      const cyclePosition = now % REFRESH_CYCLE_DURATION;
      setRefreshProgress(cyclePosition / REFRESH_CYCLE_DURATION);
    }, 50);
    return () => window.clearInterval(timer);
  }, []);

  // Center on device location at launch (deep-link locate routes win).
  useEffect(() => {
    if (window.location.hash.includes('locate')) return;

    setLocating(true);
    locationService.startWatching();
    void locationService
      .requestCurrentLocationAsync()
      .then((coordinate) => {
        updateViewport({
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          zoom: LOCATE_ZOOM,
        });
      })
      .catch(() => {
        // Keep default / remembered viewport if permission is denied or unavailable.
      })
      .finally(() => setLocating(false));
  }, [updateViewport]);

  const coordinateSheetOpen =
    selectedCoordinate != null &&
    selectedMeter == null &&
    selectedCarpark == null &&
    carparkDetail == null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-transparent">
      <div className="map-bleed absolute inset-0">
        <GoogleMapView />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <div className="pointer-events-auto">
          <SearchPanel
            visible={isShowingSearch}
            onClose={() => setIsShowingSearch(false)}
          />
        </div>

        <div className="flex-1" />

        <div className="pointer-events-auto safe-pb">
          <ControlBar
            refreshProgress={refreshProgress}
            locating={locating}
            onSearch={() => setIsShowingSearch((value) => !value)}
            onSettings={() => setIsShowingSettings(true)}
            onFavorites={() => setIsShowingFavorites(true)}
            onAddFavorite={() => {
              setNewFavoriteName('');
              setIsShowingAddFavorite(true);
            }}
            onLocate={() => centerOnCurrentLocation({ showError: true })}
            onRefreshTap={() => {
              openHKEMeter();
              window.setTimeout(() => setShowHKEMeterAlert(true), 700);
            }}
          />
        </div>
      </div>

      <SettingsSheet open={isShowingSettings} onOpenChange={setIsShowingSettings} />
      <FavoritesSheet open={isShowingFavorites} onOpenChange={setIsShowingFavorites} />

      <MeterDetailSheet
        feature={selectedMeter}
        open={selectedMeter != null}
        onOpenChange={(open) => {
          if (!open) setSelectedMeter(null);
        }}
      />

      <CarparkDetailSheet
        detail={carparkDetail}
        open={carparkDetail != null}
        onOpenChange={(open) => {
          if (!open) clearSelections();
        }}
      />

      <CoordinateDetailSheet
        coordinate={selectedCoordinate}
        open={coordinateSheetOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedCoordinate(null);
        }}
      />

      {isShowingAddFavorite ? (
        <PromptDialog
          title="Add Favorite"
          message="Save the current map center as a favorite location."
          value={newFavoriteName}
          onChange={setNewFavoriteName}
          confirmLabel="Save"
          onCancel={() => {
            setIsShowingAddFavorite(false);
            setNewFavoriteName('');
          }}
          onConfirm={() => {
            const name = newFavoriteName.trim();
            if (name) addFavoriteLocation(name);
            setIsShowingAddFavorite(false);
            setNewFavoriteName('');
          }}
        />
      ) : null}

      {showHKEMeterAlert ? (
        <AlertDialog
          title="HK E-Meter app not found"
          message="Install HK E-Meter to pay for on-street parking, or dismiss if the app opened successfully."
          onConfirm={() => setShowHKEMeterAlert(false)}
        />
      ) : null}

      {lastErrorMessage ? (
        <AlertDialog
          title="Error"
          message={lastErrorMessage}
          onConfirm={clearError}
        />
      ) : null}
    </div>
  );
}

function PromptDialog({
  title,
  message,
  value,
  onChange,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  value: string;
  onChange: (value: string) => void;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-8">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--color-grouped-secondary)]">
        <div className="px-5 pt-5 text-center">
          <div className="text-[17px] font-semibold text-[var(--color-label)]">{title}</div>
          <p className="mt-1 m-0 text-[13px] text-[var(--color-secondary-label)]">{message}</p>
          <input
            autoFocus
            value={value}
            placeholder="Name"
            onChange={(event) => onChange(event.target.value)}
            className="mt-3 w-full rounded-lg bg-[var(--color-fill-tertiary)] px-3 py-2 text-[17px] text-[var(--color-label)] outline-none"
          />
        </div>
        <div className="mt-4 grid grid-cols-2 border-t border-[var(--color-separator)]">
          <button
            type="button"
            className="py-3 text-[17px] text-[var(--color-accent)]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!value.trim()}
            className="border-l border-[var(--color-separator)] py-3 text-[17px] font-semibold text-[var(--color-accent)] disabled:opacity-40"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertDialog({
  title,
  message,
  onConfirm,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-8">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--color-grouped-secondary)]">
        <div className="px-5 pt-5 text-center">
          <div className="text-[17px] font-semibold text-[var(--color-label)]">{title}</div>
          <p className="mt-2 m-0 text-[13px] text-[var(--color-secondary-label)]">{message}</p>
        </div>
        <button
          type="button"
          className="mt-4 w-full border-t border-[var(--color-separator)] py-3 text-[17px] font-semibold text-[var(--color-accent)]"
          onClick={onConfirm}
        >
          OK
        </button>
      </div>
    </div>
  );
}
