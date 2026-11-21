import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode, SelectHTMLAttributes } from 'react';
import * as Lucide from 'lucide-react';
import { FIELD, LABEL } from './brandStyles';

/** Most matches drawn at once; a list of thousands of cities stays quick, and typing narrows it. */
const MAX_SHOWN = 100;

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
    <span role="group" aria-label={label} className={`pms-input flex w-full items-stretch overflow-hidden !p-0 focus-within:border-[var(--color-focus)] focus-within:[box-shadow:var(--ring-focus),var(--shadow-sm)] ${className}`}>
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
        className="tnum min-w-0 flex-1 bg-transparent text-center text-title font-semibold outline-none focus-visible:!shadow-none focus-visible:!outline-none max-md:text-[16px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" className={button} aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
        <Lucide.Plus size={14} />
      </button>
    </span>
  );
}

/**
 * A dropdown you can type into: the list narrows as you type, arrow keys move, Enter picks, Escape closes.
 * Only the options given can be chosen. Built for long lists such as countries and cities.
 */
export function BrandCombobox({
  value,
  options,
  onChange,
  placeholder = 'Select',
  searchPlaceholder = 'Type to search',
  emptyText = 'No matches',
  invalid,
  disabled,
  ariaLabel,
}: {
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  invalid?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const { shown, total } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { shown: options.slice(0, MAX_SHOWN), total: options.length };
    const starts: string[] = [];
    const contains: string[] = [];
    for (const option of options) {
      const at = option.toLowerCase().indexOf(q);
      if (at === 0) starts.push(option);
      else if (at > 0) contains.push(option);
    }
    const all = [...starts, ...contains];
    return { shown: all.slice(0, MAX_SHOWN), total: all.length };
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const choose = (option: string) => {
    onChange(option);
    close();
  };

  // Opening starts on the current choice; typing starts again from the best match.
  const openList = () => {
    if (disabled || open) return;
    setActive(Math.max(0, options.slice(0, MAX_SHOWN).indexOf(value)));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openList();
        return;
      }
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (shown.length === 0 ? 0 : (i + step + shown.length) % shown.length));
    } else if (e.key === 'Enter') {
      // Never submits the surrounding form from here.
      e.preventDefault();
      const option = shown[active];
      if (open && option !== undefined) choose(option);
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    } else if (e.key === 'Tab') {
      close();
    }
  };

  return (
    <div ref={root} className="relative">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && shown[active] !== undefined ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        autoComplete="off"
        disabled={disabled}
        value={open ? query : value}
        placeholder={open ? value || searchPlaceholder : placeholder}
        onFocus={openList}
        onClick={openList}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          if (!open) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={`${FIELD} cursor-pointer pr-9 ${invalid ? '!border-danger-text' : ''} ${open && value ? 'placeholder:text-ink' : ''}`}
      />
      <Lucide.ChevronDown
        size={15}
        aria-hidden="true"
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
      />
      {open && (
        // Pressing inside the list must not take focus from the input.
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-elevated shadow-lg"
        >
          <ul ref={listRef} id={listId} role="listbox" className="max-h-60 overflow-y-auto py-1">
            {shown.map((option, i) => (
              <li
                key={option}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={option === value}
                // The field sits inside a <label>; cancelling the click stops the label from refocusing the input and reopening the list.
                onClick={(e) => {
                  e.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-[14px] text-ink ${i === active ? 'bg-hover-surface' : ''} ${option === value ? 'font-semibold' : ''}`}
              >
                <span className="truncate">{option}</span>
                {option === value && <Lucide.Check size={14} className="flex-none text-primary" aria-hidden="true" />}
              </li>
            ))}
            {shown.length === 0 && <li className="px-3 py-2 text-[13px] text-ink-muted">{emptyText}</li>}
          </ul>
          {total > shown.length && (
            <p className="border-t border-border/70 px-3 py-1.5 text-[12px] text-ink-muted">
              Showing {shown.length} of {total}. Keep typing to narrow the list.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
