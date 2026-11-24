import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Badge } from '../../components/ui/display';
import { Checkbox, TextField } from '../../components/ui/primitives';
import type { PropertyDetails } from '../../lib/api/pms';

/** Below this many properties, searching is more clutter than help. */
const SEARCH_FROM = 6;

/**
 * Picks which properties a user can open, from a list that may hold hundreds: searchable, with the
 * selection kept when the search narrows the list.
 */
export function PropertyMultiSelect({
  properties,
  value,
  onChange,
  disabled = false,
}: {
  properties: PropertyDetails[];
  value: string[];
  onChange: (propertyIds: string[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? properties.filter((p) => [p.name, p.code, p.city, p.country].some((text) => text.toLowerCase().includes(needle)))
    : properties;
  const selected = new Set(value);

  const toggle = (id: string) => onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  const selectShown = () => onChange([...new Set([...value, ...shown.map((p) => p.id)])]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-label text-ink-secondary">
        <span aria-live="polite">
          {value.length} of {properties.length} selected
        </span>
        {!disabled ? (
          <span className="flex items-center gap-3">
            <button type="button" className="cursor-pointer font-semibold text-primary hover:underline disabled:opacity-50" onClick={selectShown} disabled={shown.length === 0}>
              {needle ? 'Select shown' : 'Select all'}
            </button>
            <button type="button" className="cursor-pointer font-semibold text-primary hover:underline disabled:opacity-50" onClick={() => onChange([])} disabled={value.length === 0}>
              Clear
            </button>
          </span>
        ) : null}
      </div>

      {properties.length >= SEARCH_FROM ? (
        <div className="relative">
          <Lucide.Search size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <TextField
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search properties"
            aria-label="Search properties"
            className="!pl-8"
            disabled={disabled}
          />
        </div>
      ) : null}

      <ul className="max-h-56 divide-y divide-divider overflow-y-auto rounded-xl border border-border bg-surface" aria-label="Properties">
        {shown.length === 0 ? (
          <li className="px-3 py-4 text-center text-label text-ink-secondary">{properties.length === 0 ? 'There are no properties yet.' : 'No property matches.'}</li>
        ) : (
          shown.map((p) => (
            <li key={p.id}>
              <label className={`flex items-center gap-3 px-3 py-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-hover-surface'}`}>
                <Checkbox checked={selected.has(p.id)} onChange={() => toggle(p.id)} disabled={disabled} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium text-ink">{p.name}</span>
                  <span className="block truncate text-label text-ink-secondary">
                    {p.code} · {p.city}
                  </span>
                </span>
                {!p.isActive ? (
                  <Badge tone="warning" size="sm">
                    Inactive
                  </Badge>
                ) : null}
              </label>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
