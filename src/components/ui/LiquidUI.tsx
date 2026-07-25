import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function SheetGrabber({ className }: { className?: string }) {
  return (
    <div className={cn('flex justify-center pt-2 pb-0.5', className)}>
      <div className="h-[5px] w-9 rounded-full bg-[var(--color-secondary-label)] opacity-40" />
    </div>
  );
}

export function CardSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[18px] bg-[var(--color-grouped-secondary)] shadow-[0_0_0_0.8px_var(--color-card-stroke)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LiquidSheetHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle: string;
  trailing?: ReactNode;
}) {
  return (
    <CardSurface className="p-[18px]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-[28px] font-bold leading-tight tracking-tight text-[var(--color-label)]">
            {title}
          </h2>
          <p className="mt-1.5 m-0 text-[15px] text-[var(--color-secondary-label)]">{subtitle}</p>
        </div>
        {trailing}
      </div>
    </CardSurface>
  );
}

export function LiquidActionButton({
  icon,
  title,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-16 w-[104px] shrink-0 flex-col items-center justify-center gap-[7px] rounded-2xl bg-[var(--color-grouped-secondary)] text-[var(--color-label)] shadow-[0_0_0_0.8px_var(--color-card-stroke)] active:opacity-80"
    >
      <span className="flex h-[17px] w-[17px] items-center justify-center">{icon}</span>
      <span className="px-1 text-center text-[11px] font-semibold leading-tight">{title}</span>
    </button>
  );
}

export function LiquidActionRow({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-0.5 overflow-x-auto px-0.5 [scrollbar-width:none]">
      <div className="flex gap-3">{children}</div>
    </div>
  );
}

export interface MetadataItem {
  title: string;
  value: string;
  valueColor?: string;
}

export function CompactMetadataRow({ items }: { items: MetadataItem[] }) {
  return (
    <CardSurface className="px-1 py-2">
      <div className="flex items-start">
        {items.map((item, index) => (
          <div
            key={item.title}
            className="relative min-w-0 flex-1 px-2.5"
          >
            <div className="text-[11px] font-medium text-[var(--color-secondary-label)]">
              {item.title}
            </div>
            <div
              className="mt-1.5 text-[15px] font-semibold leading-snug"
              style={{ color: item.valueColor ?? 'var(--color-label)' }}
            >
              {item.value}
            </div>
            {index < items.length - 1 ? (
              <div className="absolute top-1 right-0 h-[34px] w-px bg-[var(--color-label)] opacity-[0.08]" />
            ) : null}
          </div>
        ))}
      </div>
    </CardSurface>
  );
}

export function DetailCardSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="w-full text-left">
      <h3 className="m-0 mb-2.5 px-1 text-[17px] font-semibold text-[var(--color-label)]">
        {title}
      </h3>
      <CardSurface className="overflow-hidden p-3.5">{children}</CardSurface>
    </section>
  );
}

export function DetailLabeledRow({
  title,
  value,
  hidesDivider = false,
}: {
  title: string;
  value: string;
  hidesDivider?: boolean;
}) {
  return (
    <div
      className={cn(
        'py-2.5',
        !hidesDivider && 'border-b border-[var(--color-separator)]',
      )}
    >
      <div className="text-[12px] text-[var(--color-secondary-label)]">{title}</div>
      <div className="mt-1.5 text-[17px] leading-snug text-[var(--color-label)]">{value}</div>
    </div>
  );
}

export function DetailRateRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border-b border-[var(--color-separator)] py-2.5">
      <div className="text-[15px] font-semibold text-[var(--color-label)]">{title}</div>
      <div className="mt-1 text-[12px] text-[var(--color-secondary-label)]">{detail}</div>
    </div>
  );
}

export function DetailDiscountRow({
  title,
  period,
  description,
}: {
  title: string;
  period: string;
  description: string;
}) {
  return (
    <div className="border-b border-[var(--color-separator)] py-2.5">
      <div className="text-[17px] font-semibold text-[var(--color-label)]">{title}</div>
      <div className="mt-1 text-[12px] text-[var(--color-secondary-label)]">{period}</div>
      <div className="mt-1 text-[15px] text-[var(--color-label)]">{description}</div>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1.5 rounded-[10px] bg-[var(--color-fill-tertiary)] p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[14px] font-semibold transition-colors',
              selected
                ? 'bg-[var(--color-grouped-secondary)] text-[var(--color-label)] shadow-sm'
                : 'bg-transparent text-[var(--color-secondary-label)]',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
