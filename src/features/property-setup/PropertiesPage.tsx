import * as Lucide from 'lucide-react';
import { BrandShell } from '../../components/brand/BrandShell';
import { Button } from '../../components/primitives';
import { CARD, EYEBROW, HEADING } from '../../components/brand/brandStyles';
import { roomListingApi } from '../../lib/api/pms';
import type { PropertyDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';

const CHIP = 'inline-flex items-center gap-1.5 rounded-full bg-muted-surface/70 px-2.5 py-1 text-[12px] font-medium text-ink-secondary';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function PropertyCard({ property, onOpen }: { property: PropertyDetails; onOpen: () => void }) {
  // Categories are the property's room offerings, so they come from its rooms.
  const rooms = useApiResource(() => roomListingApi.list(property.id), [property.id]);
  const place = [property.city, property.state, property.country].filter(Boolean).join(', ');

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${CARD} group relative flex h-full w-full cursor-pointer flex-col overflow-hidden p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg`}
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
        <span className={CHIP}>{property.defaultCurrency}</span>
      </span>
    </button>
  );
}

interface PropertiesPageProps {
  properties: PropertyDetails[];
  onAdd: () => void;
  onOpen: (propertyId: string) => void;
  /** Only an ADMIN can add properties. */
  canAdd: boolean;
  onSignOut: () => void;
}

/** Choose a property: every property as a card, plus a way to set up another. */
export function PropertiesPage({ properties, onAdd, onOpen, canAdd, onSignOut }: PropertiesPageProps) {
  return (
    <BrandShell>
      <div className="flex flex-none flex-wrap items-end justify-between gap-4">
        <div>
          <p className={EYEBROW}>Your properties</p>
          <h1 className={`mt-3 text-[clamp(1.875rem,3.2vw,2.5rem)] font-bold leading-tight tracking-[-0.045em] text-ink ${HEADING}`}>Choose a property</h1>
          <p className="mt-2 text-[15px] text-ink-secondary">Pick where you&apos;d like to work today{canAdd ? ', or set up another one' : ''}.</p>
        </div>
        <Button variant="ghost" icon={<Lucide.LogOut size={14} />} onClick={onSignOut}>
          Sign out
        </Button>
      </div>

      <ul className="mt-6 grid grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:overflow-y-auto lg:p-1">
        {properties.map((p) => (
          <li key={p.id}>
            <PropertyCard property={p} onOpen={() => onOpen(p.id)} />
          </li>
        ))}
        {canAdd && (
          <li>
            <button
              type="button"
              onClick={onAdd}
              className="flex h-full min-h-[170px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-border bg-white/40 p-5 text-ink-secondary transition-colors hover:border-primary/40 hover:bg-white/70 hover:text-primary"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-white shadow-sm">
                <Lucide.Plus size={18} aria-hidden="true" />
              </span>
              <span className="text-[14px] font-medium">Set up another property</span>
            </button>
          </li>
        )}
      </ul>
    </BrandShell>
  );
}
