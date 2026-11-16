import type { ReactNode, SelectHTMLAttributes } from 'react';
import * as Lucide from 'lucide-react';
import { FIELD, FIELD_INVALID, LABEL } from './brandStyles';

/** A labelled form field with an optional hint and an inline error. */
export function BrandField({
  label,
  hint,
  error,
  className = '',
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <span className={LABEL}>{label}</span>
      {children}
      {error ? (
        <span className="text-[12px] font-medium text-danger-text" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-[12px] text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

/** A dropdown that looks like the text fields. */
export function BrandSelect({
  invalid,
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <span className="relative block">
      <select
        {...rest}
        className={`${invalid ? FIELD_INVALID : FIELD} cursor-pointer appearance-none pr-10 ${className}`}
      >
        {children}
      </select>
      <Lucide.ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
    </span>
  );
}

/** A number field with minus and plus buttons. */
export function BrandStepper({
  value,
  min,
  max,
  label,
  onChange,
  className = '',
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (next: number) => void;
  className?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const button = 'flex h-full w-10 flex-none cursor-pointer items-center justify-center text-ink-secondary transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-35';
  return (
    <span
      role="group"
      aria-label={label}
      className={`flex h-11 w-full items-stretch overflow-hidden rounded-[14px] border border-border bg-white shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${className}`}
    >
      <button type="button" className={button} aria-label={`Fewer: ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - 1))}>
        <Lucide.Minus size={15} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(clamp(Math.floor(Number(e.target.value)) || min))}
        className="tnum min-w-0 flex-1 bg-transparent text-center text-[14px] font-semibold text-ink outline-none"
      />
      <button type="button" className={button} aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
        <Lucide.Plus size={15} />
      </button>
    </span>
  );
}
