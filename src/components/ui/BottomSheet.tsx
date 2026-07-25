import type { ReactNode } from 'react';
import { Drawer } from 'vaul';
import { cn } from '../../lib/cn';

export function BottomSheet({
  open,
  onOpenChange,
  children,
  detent = 'large',
  title,
  leading,
  trailing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** `medium` is a shorter cap; `large` uses nearly full height when content needs it. */
  detent?: 'medium' | 'large';
  title?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-[20px] bg-[var(--color-grouped)] outline-none',
            detent === 'medium' ? 'sheet-medium' : 'sheet-large',
          )}
          style={{ paddingBottom: 'var(--safe-bottom)' }}
        >
          <div className="mx-auto mt-2 mb-1 h-[5px] w-9 shrink-0 rounded-full bg-[var(--color-secondary-label)] opacity-40" />

          {(title || leading || trailing) && (
            <div className="relative flex h-11 shrink-0 items-center px-4">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">{leading}</div>
              {title ? (
                <Drawer.Title className="mx-auto m-0 text-[17px] font-semibold text-[var(--color-label)]">
                  {title}
                </Drawer.Title>
              ) : (
                <Drawer.Title className="sr-only">Sheet</Drawer.Title>
              )}
              <div className="absolute right-4 top-1/2 -translate-y-1/2">{trailing}</div>
            </div>
          )}

          {/*
            Grow with content up to the sheet max-height, then scroll.
            Use default flex basis (auto) — not flex-1 — so short sheets don't stretch.
          */}
          <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function SheetDoneButton({ onClick, align = 'trailing' }: { onClick: () => void; align?: 'leading' | 'trailing' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-[17px] font-normal text-[var(--color-accent)]',
        align === 'leading' ? 'font-normal' : 'font-semibold',
      )}
    >
      Done
    </button>
  );
}
