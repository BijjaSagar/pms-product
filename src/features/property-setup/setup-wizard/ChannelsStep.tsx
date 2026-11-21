import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { CARD, FIELD, HEADING } from '../../../components/brand/brandStyles';
import { categoryTone } from '../categoryTones';
import type { OtaChannel } from '../../../lib/api/pms';

interface ChannelsStepProps {
  /** The OTAs a super admin currently offers; null while they load. */
  channels: OtaChannel[] | null;
  error?: string | null;
  onRetry?: () => void;
  /** How many channels the chosen plan allows. */
  limit: number;
  value: string[];
  onChange: (next: string[]) => void;
}

const initials = (name: string) => name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '?';

/** Step 5: tick up to `limit` OTAs to connect. */
export function ChannelsStep({ channels, error, onRetry, limit, value, onChange }: ChannelsStepProps) {
  const [query, setQuery] = useState('');
  const all = channels ?? [];
  const shown = all.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));

  const toggle = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter((n) => n !== name));
    } else if (value.length < limit) {
      onChange([...value, name]);
    }
  };

  if (!channels) {
    return error ? (
      <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-danger-border bg-danger-bg px-4 py-3 text-[13px] font-medium text-danger-text">
        <span>Could not load the OTAs: {error}</span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="cursor-pointer rounded-lg border border-danger-border px-3 py-1 font-semibold hover:bg-white/60">
            Try again
          </button>
        )}
      </div>
    ) : (
      <p className="pt-3 text-[13px] text-ink-secondary" role="status">
        Loading OTAs…
      </p>
    );
  }
  if (channels.length === 0) {
    return <p className="pt-3 text-[13px] text-ink-secondary">No OTAs are available right now. Please contact support.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <section className={`${CARD} flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4`} aria-label="OTAs selected">
        <div>
          <p className="text-[12px] text-ink-secondary">OTAs selected</p>
          <p className={`tnum text-[20px] font-semibold leading-tight text-ink ${HEADING}`}>
            {value.length}
            <span className="text-ink-muted"> / {limit}</span>
          </p>
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: limit }, (_, i) => (
            <span key={i} className={`h-1.5 w-4 rounded-full ${i < value.length ? 'bg-primary' : 'bg-primary/10'}`} />
          ))}
        </div>
        <label className="relative w-full sm:ml-auto sm:w-64">
          <Lucide.Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input className={`${FIELD} !pl-9`} value={query} placeholder="Search OTAs" aria-label="Search OTAs" onChange={(e) => setQuery(e.target.value)} />
        </label>
      </section>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-8 text-center text-[13px] text-ink-secondary">No OTA matches that search.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((ota) => {
            const selected = value.includes(ota.name);
            // Once the plan's limit is reached the rest cannot be picked; a picked one can still be removed.
            const locked = !selected && value.length >= limit;
            return (
              <li key={ota.name}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  disabled={locked}
                  onClick={() => toggle(ota.name)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                    selected
                      ? 'cursor-pointer border-primary bg-primary/5'
                      : locked
                        ? 'cursor-not-allowed border-border bg-white opacity-50'
                        : 'cursor-pointer border-border bg-white hover:border-primary/40'
                  }`}
                >
                  <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl border text-[13px] font-bold ${HEADING} ${categoryTone(all.indexOf(ota)).tile}`}>
                    {initials(ota.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{ota.name}</span>
                    <span className="block truncate text-[12px] text-ink-secondary">{ota.region ?? ""}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-white'}`}
                  >
                    {selected && <Lucide.Check size={12} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
