import type { ReactNode, SelectHTMLAttributes } from 'react';
import * as Lucide from 'lucide-react';
import { FIELD, LABEL } from './brandStyles';

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

/** A dropdown at the same size as the New Reservation dropdowns. */
export function BrandSelect({
  invalid,
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select {...rest} className={`${FIELD} cursor-pointer ${invalid ? '!border-danger-text' : ''} ${className}`}>
      {children}
    </select>
  );
}

/** A number field with minus and plus buttons, at the same height as the other controls. */
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
  const button =
    'flex w-9 flex-none cursor-pointer md:w-8 items-center justify-center text-ink-secondary transition-colors hover:bg-hover-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';
  return (
    <span role="group" aria-label={label} className={`pms-input flex w-full items-stretch overflow-hidden !p-0 ${className}`}>
      <button type="button" className={button} aria-label={`Fewer: ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - 1))}>
        <Lucide.Minus size={14} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(clamp(Math.floor(Number(e.target.value)) || min))}
        className="tnum min-w-0 flex-1 bg-transparent text-center text-title font-semibold outline-none max-md:text-[16px]"
      />
      <button type="button" className={button} aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
        <Lucide.Plus size={14} />
      </button>
    </span>
  );
}
