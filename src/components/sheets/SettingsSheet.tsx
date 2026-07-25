import { MapMode, MAP_MODE_TITLES } from '../../models';
import { useAppStore } from '../../store';
import { BottomSheet, SheetDoneButton } from '../ui/BottomSheet';

export function SettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mapMode = useAppStore((s) => s.mapMode);
  const enableDarkMode = useAppStore((s) => s.enableDarkMode);
  const enableAlert = useAppStore((s) => s.enableAlert);
  const rememberLastView = useAppStore((s) => s.rememberLastView);
  const setMapMode = useAppStore((s) => s.setMapMode);
  const setEnableDarkMode = useAppStore((s) => s.setEnableDarkMode);
  const setEnableAlert = useAppStore((s) => s.setEnableAlert);
  const setRememberLastView = useAppStore((s) => s.setRememberLastView);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      trailing={<SheetDoneButton onClick={() => onOpenChange(false)} />}
    >
      <div className="space-y-6 px-4 pb-8 pt-2">
        <section>
          <h3 className="mb-2 px-1 text-[13px] font-normal uppercase tracking-wide text-[var(--color-secondary-label)]">
            Map
          </h3>
          <div className="overflow-hidden rounded-[12px] bg-[var(--color-grouped-secondary)]">
            <div className="px-4 py-3">
              <div className="mb-2 text-[15px] text-[var(--color-label)]">Visible Items</div>
              <div className="flex gap-1 rounded-[9px] bg-[var(--color-fill-tertiary)] p-0.5">
                {([MapMode.all, MapMode.parkingMeter, MapMode.carpark] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setMapMode(mode)}
                    className={`h-8 flex-1 rounded-[7px] text-[13px] font-semibold ${
                      mapMode === mode
                        ? 'bg-[var(--color-grouped-secondary)] text-[var(--color-label)] shadow-sm'
                        : 'text-[var(--color-secondary-label)]'
                    }`}
                  >
                    {MAP_MODE_TITLES[mode]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-2 px-1 text-[13px] text-[var(--color-secondary-label)]">
            Choose which parking information is shown on the map.
          </p>
        </section>

        <ToggleSection
          header="Appearance"
          label="Dark Appearance"
          checked={enableDarkMode}
          onChange={setEnableDarkMode}
        />

        <ToggleSection
          header="Notifications"
          label="Alerts"
          footer="Enable app alerts for parking-related updates."
          checked={enableAlert}
          onChange={setEnableAlert}
        />

        <ToggleSection
          header="Behavior"
          label="Remember Last Map Location"
          footer="Restore the previous map position the next time you open the app."
          checked={rememberLastView}
          onChange={setRememberLastView}
        />
      </div>
    </BottomSheet>
  );
}

function ToggleSection({
  header,
  label,
  footer,
  checked,
  onChange,
}: {
  header: string;
  label: string;
  footer?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-[13px] font-normal uppercase tracking-wide text-[var(--color-secondary-label)]">
        {header}
      </h3>
      <div className="overflow-hidden rounded-[12px] bg-[var(--color-grouped-secondary)]">
        <label className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-[17px] text-[var(--color-label)]">{label}</span>
          <input
            type="checkbox"
            role="switch"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${
              checked ? 'bg-[var(--color-green)]' : 'bg-[#e9e9ea] dark:bg-[#39393d]'
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${
                checked ? 'translate-x-[20px]' : 'translate-x-0'
              }`}
            />
          </span>
        </label>
      </div>
      {footer ? (
        <p className="mt-2 px-1 text-[13px] text-[var(--color-secondary-label)]">{footer}</p>
      ) : null}
    </section>
  );
}
