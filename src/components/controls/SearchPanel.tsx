import { useEffect, useRef, useState } from 'react';
import { ChevronRight, MapPin, Search, X } from 'lucide-react';
import { useAppStore } from '../../store';

export function SearchPanel({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const searchLocations = useAppStore((s) => s.searchLocations);
  const searchResults = useAppStore((s) => s.searchResults);
  const isSearching = useAppStore((s) => s.isSearching);
  const applySearchResult = useAppStore((s) => s.applySearchResult);

  useEffect(() => {
    if (visible) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 150);
      return () => window.clearTimeout(timer);
    }
    setQuery('');
    searchLocations('');
    return undefined;
  }, [visible, searchLocations]);

  if (!visible) return null;

  return (
    <div className="animate-in fade-in slide-in-from-top-2 mx-4 mt-3 rounded-[24px] bg-[color-mix(in_srgb,var(--color-grouped-secondary)_88%,transparent)] p-3 shadow-[0_8px_18px_rgba(0,0,0,0.08)] ring-1 ring-[var(--color-card-stroke)] backdrop-blur-xl">
      <div className="flex items-center gap-2.5 rounded-2xl bg-[var(--color-grouped-secondary)] px-3.5 py-3">
        <Search className="h-4 w-4 shrink-0 text-[var(--color-secondary-label)]" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            searchLocations(value);
          }}
          placeholder="Search locations"
          autoCapitalize="off"
          autoCorrect="off"
          className="min-w-0 flex-1 bg-transparent text-[17px] text-[var(--color-label)] outline-none placeholder:text-[var(--color-secondary-label)]"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => {
              setQuery('');
              searchLocations('');
            }}
          >
            <X className="h-5 w-5 text-[var(--color-secondary-label)]" />
          </button>
        ) : null}
        <button
          type="button"
          className="text-[15px] text-[var(--color-accent)]"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>

      {isSearching ? (
        <div className="flex justify-center py-5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        </div>
      ) : searchResults.length > 0 ? (
        <div className="mt-2.5 max-h-[280px] overflow-y-auto rounded-2xl bg-[var(--color-grouped-secondary)]">
          {searchResults.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-black/5 dark:active:bg-white/5"
              onClick={() => {
                applySearchResult(item);
                onClose();
              }}
            >
              <MapPin className="h-5 w-5 shrink-0 text-[var(--color-accent)]" fill="currentColor" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] text-[var(--color-label)]">{item.title}</div>
                <div className="text-[12px] text-[var(--color-secondary-label)]">
                  Tap to center map
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--color-tertiary-label)]" />
              {index < searchResults.length - 1 ? null : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
