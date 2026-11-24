import type { KeyboardEvent } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface PageTab<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  /** A small count or flag shown after the label. */
  badge?: string | number;
}

/**
 * The section tabs of a page: a pill bar that scrolls sideways on narrow screens. Arrow keys,
 * Home and End move between tabs. Give the panel `id={panelId}` and `aria-labelledby={`${idPrefix}-tab-${active}`}`.
 */
export function PageTabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
  idPrefix,
  panelId,
}: {
  tabs: PageTab<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
  idPrefix: string;
  panelId: string;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const at = tabs.findIndex((t) => t.id === active);
    let next = -1;
    if (e.key === 'ArrowRight') next = (at + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (at - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const target = tabs[next]!;
    onChange(target.id);
    document.getElementById(`${idPrefix}-tab-${target.id}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted-surface/70 p-1"
    >
      {tabs.map(({ id, label: text, icon: Icon, badge }) => {
        const selected = id === active;
        return (
          <button
            key={id}
            id={`${idPrefix}-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            className={`flex min-h-[36px] flex-none cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 text-body font-semibold transition-colors ${
              selected ? 'border border-border bg-surface text-ink shadow-xs' : 'border border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            {Icon ? <Icon size={15} aria-hidden="true" className={selected ? 'text-primary' : ''} /> : null}
            {text}
            {badge !== undefined ? (
              <span className={`tnum rounded-full px-1.5 text-micro font-bold ${selected ? 'bg-primary/10 text-primary' : 'bg-muted-surface text-ink-muted'}`}>
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
