import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { BrandShell } from '../../components/brand/BrandShell';
import { Button } from '../../components/ui/primitives';
import { CARD, EYEBROW, HEADING } from '../../components/brand/brandStyles';
import { roomListingApi } from '../../lib/api/pms';
import type { PropertyDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';

const CHIP = 'inline-flex items-center gap-1.5 rounded-full bg-muted-surface/70 px-2.5 py-1 text-[12px] font-medium text-ink-secondary';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Cards load their own details, so a long list is shown a page at a time. */
const PAGE_SIZE = 12;
/** Below this many properties a search box is more clutter than help. */
const SEARCH_FROM = 7;

function PropertyCard({ property, onOpen }: { property: PropertyDetails; onOpen: () => void }) {
  // Categories are the property's room offerings, so they come from its rooms.
  const rooms = useApiResource(() => roomListingApi.list(property.id), [property.id]);
  const place = [property.city, property.state, property.country].filter(Boolean).join(', ');

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${CARD} group relative flex h-full w-full cursor-pointer flex-col overflow-hidden p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg ${property.isActive ? '' : 'opacity-70'}`}
    >
      <span className="absolute -right-8 -top-8 flex h-24 w-24 items-end justify-start rounded-full bg-primary/10 p-6 text-primary/70 transition-colors group-hover:bg-primary/15" aria-hidden="true">
        <Lucide.ArrowUpRight size={15} />
      </span>
      <span className="flex h-10 w-fit items-center rounded-xl bg-primary/10 px-3 text-[12px] font-bold tracking-wide text-primary">{property.code}</span>
      <span className={`mt-5 block text-[18px] font-semibold leading-snug tracking-[-0.02em] text-ink ${HEADING}`}>{property.name}</span>
      <span className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-secondary">
        <Lucide.MapPin size={12} className="flex-none" aria-hidden="true" />
        <span className="truncate">{place}</span>
      </span>
      <span className="mt-4 flex flex-wrap gap-1.5">
        <span className={CHIP}>
          <Lucide.Layers size={12} aria-hidden="true" /> {plural(property.numberOfFloors ?? 0, 'floor')}
        </span>
        <span className={CHIP}>
          <Lucide.BedDouble size={12} aria-hidden="true" /> {plural(property.totalRooms ?? 0, 'room')}
        </span>
        {rooms.data && <span className={CHIP}>{plural(rooms.data.length, 'category', 'categories')}</span>}
        {!property.isActive && <span className={`${CHIP} !bg-warning-bg !text-warning-text`}>Inactive</span>}
      </span>
    </button>
  );
}

interface PropertiesPageProps {
  properties: PropertyDetails[];
  onOpen: (propertyId: string) => void;
  onSignOut: () => void;
}

/** Choose a property: the properties a STAFF user is assigned to, as cards. */
export function PropertiesPage({ properties, onOpen, onSignOut }: PropertiesPageProps) {
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? properties.filter((p) => [p.name, p.code, p.city, p.state ?? '', p.country].some((value) => value.toLowerCase().includes(needle)))
    : properties;
  const visible = matches.slice(0, shown);

  return (
    <BrandShell>
      <div className="flex flex-none flex-wrap items-end justify-between gap-4">
        <div>
          <p className={EYEBROW}>Your properties</p>
          <h1 className={`mt-3 text-[clamp(1.875rem,3.2vw,2.5rem)] font-bold leading-tight tracking-[-0.045em] text-ink ${HEADING}`}>Choose a property</h1>
          <p className="mt-2 text-[15px] text-ink-secondary">Pick where you&apos;d like to work today.</p>
        </div>
        <Button variant="ghost" icon={<Lucide.LogOut size={14} />} onClick={onSignOut}>
          Sign out
        </Button>
      </div>

      {properties.length >= SEARCH_FROM && (
        <div className="relative mt-5 max-w-sm flex-none">
          <Lucide.Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE_SIZE);
            }}
            placeholder="Search by name, code or city"
            aria-label="Search properties"
            className="pms-input !pl-9"
          />
        </div>
      )}

      <ul className="mt-6 grid grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:overflow-y-auto lg:p-1">
        {visible.map((p) => (
          <li key={p.id}>
            <PropertyCard property={p} onOpen={() => onOpen(p.id)} />
          </li>
        ))}
        {matches.length === 0 && <li className="col-span-full text-[14px] text-ink-secondary">No property matches &ldquo;{query.trim()}&rdquo;.</li>}
      </ul>

      {matches.length > visible.length && (
        <div className="mt-4 flex flex-none items-center gap-3 text-[13px] text-ink-secondary">
          <span>
            Showing {visible.length} of {matches.length}
          </span>
          <Button variant="ghost" onClick={() => setShown((n) => n + PAGE_SIZE)}>
            Show more
          </Button>
        </div>
      )}
    </BrandShell>
  );
}
