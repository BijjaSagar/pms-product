import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { FilterChip } from '../../components/controls';
import { TextField } from '../../components/primitives';
import { CardSkeleton } from '../../components/Skeleton';
import { ToggleRow } from './SettingsKit';

export interface AmenityItem {
  code: string;
  name: string;
  /** Optional group heading, such as "Safety". Items without one are listed together. */
  group?: string;
  active: boolean;
}

type Filter = 'all' | 'on' | 'off';

/**
 * A searchable checklist of amenities: filter by what is on or off, grouped when the items have a group,
 * one toggle per amenity. Used by both the property and the category amenity screens.
 */
export function AmenityChecklist({
  items,
  loading,
  error,
  disabled,
  onToggle,
  noun = 'amenities',
  onLabel = 'Offered',
  offLabel = 'Not offered',
}: {
  /** Null until the first load finishes. */
  items: AmenityItem[] | null;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  onToggle: (code: string, next: boolean) => void;
  /** What the items are called in labels, for example "fields". */
  noun?: string;
  /** Wording for the on and off states, for example "Shown" and "Hidden". */
  onLabel?: string;
  offLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  if (!items) {
    return loading && !error ? (
      <CardSkeleton lines={5} label={`Loading ${noun}`} />
    ) : (
      <p role="alert" className="py-8 text-center text-label text-danger-text">
        {error ?? 'Nothing to show.'}
      </p>
    );
  }

  const onCount = items.filter((i) => i.active).length;
  const needle = query.trim().toLowerCase();
  const visible = items.filter(
    (i) => (filter === 'all' || (filter === 'on') === i.active) && (!needle || i.name.toLowerCase().includes(needle)),
  );

  // Keep the order the amenities came in, grouped by heading.
  const groups = new Map<string, AmenityItem[]>();
  for (const item of visible) {
    const key = item.group ?? '';
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Lucide.Search
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <TextField
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${noun}`}
            aria-label={`Search ${noun}`}
            className="!pl-8"
          />
        </div>
        <div className="pms-chip-row gap-2" role="group" aria-label={`Show ${noun}`}>
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            All · {items.length}
          </FilterChip>
          <FilterChip active={filter === 'on'} onClick={() => setFilter('on')}>
            {onLabel} · {onCount}
          </FilterChip>
          <FilterChip active={filter === 'off'} onClick={() => setFilter('off')}>
            {offLabel} · {items.length - onCount}
          </FilterChip>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-label text-ink-muted">
          {items.length === 0 ? `No ${noun} to show.` : `Nothing matches your search.`}
        </p>
      ) : (
        [...groups.entries()].map(([group, list]) => (
          <section key={group || 'all'} aria-label={group || noun}>
            {group ? (
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3 className="text-micro font-bold uppercase tracking-[0.14em] text-ink-muted">{group}</h3>
                <span className="text-label text-ink-muted tnum">
                  {list.filter((i) => i.active).length} of {list.length} {onLabel.toLowerCase()}
                </span>
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {list.map((item) => (
                <ToggleRow
                  key={item.code}
                  label={item.name}
                  checked={item.active}
                  disabled={disabled}
                  onChange={(next) => onToggle(item.code, next)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
