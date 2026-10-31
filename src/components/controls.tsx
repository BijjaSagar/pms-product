import type { ReactNode } from 'react';
import { Button, IconButton } from './primitives';


export function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="pms-label">{label}</span>
      {children}
      {error ? (
        <span className="text-label font-medium" style={{ color: 'var(--color-danger-text)' }} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="pms-helper">{hint}</span>
      ) : null}
    </label>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (t: T) => void;
  label: string;
}) {
  return (
    <div
      className="pms-chip-row gap-1 rounded-[12px] border p-1"
      role="tablist"
      aria-label={label}
      style={{ borderColor: 'var(--color-border)', background: 'color-mix(in srgb, var(--color-muted-surface) 78%, var(--color-surface))', boxShadow: 'var(--shadow-xs), var(--shadow-inner)' }}
    >
      {tabs.map((t) => {
        const selected = t.id === active;
        return (
          <Button variant="secondary"
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.id)}
            className="flex-none whitespace-nowrap rounded-[9px] snap-start"
            style={{
              background: selected ? 'var(--color-surface)' : 'transparent',
              color: selected ? 'var(--color-ink)' : 'var(--color-ink-secondary)',
              boxShadow: selected ? 'var(--shadow-md), inset 0 1px 0 var(--color-surface)' : 'none',
              border: selected ? '1px solid var(--color-border)' : '1px solid transparent',
            }}
          >
            {t.label}
          </Button>
        );
      })}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
  summary,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  summary: string;
}) {
  if (totalPages <= 1) return <p className="text-body text-ink-secondary">{summary}</p>;
  const windowPages = Array.from({ length: totalPages }, (_, i) => i).filter(
    (i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1,
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-body text-ink-secondary">
      <p className="text-body text-ink-secondary font-normal">{summary}</p>
      <div className="flex max-w-full items-center gap-1.5 overflow-x-auto pb-0.5" role="navigation" aria-label="Pagination">
        <IconButton variant="ghost"
          type="button"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
          className="flex flex-none items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          ‹
        </IconButton>
        {windowPages.map((i, idx) => {
          const showEllipsis = idx > 0 && i - windowPages[idx - 1] > 1;
          const isCurrent = i === page;
          return (
            <span key={i} className="flex flex-none items-center gap-1.5">
              {showEllipsis ? <span className="px-1 text-ink-muted">…</span> : null}
              <IconButton variant="ghost"
                type="button"
                onClick={() => onChange(i)}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Page ${i + 1}`}
                className={`flex flex-none items-center justify-center transition-all cursor-pointer ${isCurrent ? 'bg-primary text-primary-foreground shadow-xs' : 'border border-border bg-surface text-ink hover:bg-hover-surface' }`}
                style={{
                  background: isCurrent ? 'var(--color-primary)' : 'var(--color-surface)',
                  borderColor: isCurrent ? 'var(--color-primary)' : 'var(--color-border)',
                  color: isCurrent ? 'var(--color-primary-foreground)' : 'var(--color-ink)',
                }}
              >
                {i + 1}
              </IconButton>
            </span>
          );
        })}
        <IconButton variant="ghost"
          type="button"
          disabled={page === totalPages - 1}
          onClick={() => onChange(page + 1)}
          className="flex flex-none items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          ›
        </IconButton>
      </div>
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
  pressedLabel,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  pressedLabel?: string;
}) {
  return (
    <Button variant="secondary"
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={pressedLabel}
      className="flex-none whitespace-nowrap"
      style={{
        borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
        background: active ? 'var(--color-primary)' : 'var(--color-surface)',
        color: active ? 'var(--color-primary-foreground)' : 'var(--color-ink-secondary)',
        boxShadow: active ? 'var(--shadow-primary)' : 'var(--shadow-xs)',
      }}
    >
      {children}
    </Button>
  );
}
