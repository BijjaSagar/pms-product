import type { ReactNode } from 'react';


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
        <span className="text-[12px] font-medium" style={{ color: 'var(--color-danger-text)' }} role="alert">
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
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.id)}
            className="min-h-[38px] flex-none whitespace-nowrap rounded-[9px] px-3.5 py-2 text-sm font-semibold snap-start"
            style={{
              background: selected ? 'var(--color-surface)' : 'transparent',
              color: selected ? 'var(--color-ink)' : 'var(--color-ink-secondary)',
              boxShadow: selected ? 'var(--shadow-md), inset 0 1px 0 var(--color-surface)' : 'none',
              border: selected ? '1px solid var(--color-border)' : '1px solid transparent',
            }}
          >
            {t.label}
          </button>
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
  if (totalPages <= 1) return <p className="text-sm text-ink-secondary">{summary}</p>;
  const windowPages = Array.from({ length: totalPages }, (_, i) => i).filter(
    (i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1,
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-ink-secondary">
      <p className="text-sm text-ink-secondary font-normal">{summary}</p>
      <div className="flex max-w-full items-center gap-1.5 overflow-x-auto pb-0.5" role="navigation" aria-label="Pagination">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-border text-ink-secondary hover:bg-hover-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          ‹
        </button>
        {windowPages.map((i, idx) => {
          const showEllipsis = idx > 0 && i - windowPages[idx - 1] > 1;
          const isCurrent = i === page;
          return (
            <span key={i} className="flex flex-none items-center gap-1.5">
              {showEllipsis ? <span className="px-1 text-ink-muted">…</span> : null}
              <button
                type="button"
                onClick={() => onChange(i)}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Page ${i + 1}`}
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer ${isCurrent
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'border border-border bg-surface text-ink hover:bg-hover-surface'
                  }`}
                style={{
                  background: isCurrent ? 'var(--color-primary)' : 'var(--color-surface)',
                  borderColor: isCurrent ? 'var(--color-primary)' : 'var(--color-border)',
                  color: isCurrent ? 'var(--color-primary-foreground)' : 'var(--color-ink)',
                }}
              >
                {i + 1}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          disabled={page === totalPages - 1}
          onClick={() => onChange(page + 1)}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-border text-ink-secondary hover:bg-hover-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          ›
        </button>
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
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={pressedLabel}
      className="min-h-[30px] flex-none whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-semibold snap-start"
      style={{
        borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
        background: active ? 'var(--color-primary)' : 'var(--color-surface)',
        color: active ? 'var(--color-primary-foreground)' : 'var(--color-ink-secondary)',
        boxShadow: active ? 'var(--shadow-primary)' : 'var(--shadow-xs)',
      }}
    >
      {children}
    </button>
  );
}
