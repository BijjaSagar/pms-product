import * as Lucide from 'lucide-react';
import type { RoomBedTypeDetails } from '../../lib/api/pms';
import { IconButton, SelectField } from '../../components/primitives';

export const MAX_BEDS = 50;

/** Bed type code -> number of beds, for the bed types the room has. */
export type BedSelection = Record<string, number>;

/**
 * Picks a room's bed types from the fixed catalog the backend serves. The dropdown lists only the
 * types not yet chosen; each chosen type shows its number of beds and can be removed.
 */
export function BedTypePicker({
  catalog,
  value,
  onChange,
}: {
  catalog: RoomBedTypeDetails[];
  value: BedSelection;
  onChange: (next: BedSelection) => void;
}) {
  const chosen = catalog.filter((b) => b.code in value);
  const available = catalog.filter((b) => !(b.code in value));

  const setBeds = (code: string, beds: number) => onChange({ ...value, [code]: beds });
  const remove = (code: string) => {
    const { [code]: _removed, ...rest } = value;
    onChange(rest);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <SelectField
        aria-label="Add a bed type"
        value=""
        disabled={available.length === 0}
        onChange={(e) => e.target.value && setBeds(e.target.value, 1)}
      >
        <option value="">{available.length === 0 ? 'Every bed type is added' : 'Add a bed type…'}</option>
        {available.map((b) => (
          <option key={b.code} value={b.code}>
            {b.name}
          </option>
        ))}
      </SelectField>

      {chosen.length === 0 ? (
        <p className="text-label text-ink-muted">No bed types added.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {chosen.map((b) => {
            const beds = value[b.code] ?? 1;
            return (
              <li
                key={b.code}
                className="flex items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Lucide.BedDouble size={15} className="flex-none text-primary" aria-hidden="true" />
                  <span className="truncate text-body font-semibold text-ink">{b.name}</span>
                </span>
                <span className="flex flex-none items-center gap-1">
                  <IconButton
                    title={`Fewer ${b.name} beds`}
                    aria-label={`Fewer ${b.name} beds`}
                    disabled={beds <= 1}
                    onClick={() => setBeds(b.code, beds - 1)}
                  >
                    <Lucide.Minus size={14} />
                  </IconButton>
                  <span className="min-w-6 text-center text-body font-semibold text-ink tnum" aria-label={`${beds} ${b.name} beds`}>
                    {beds}
                  </span>
                  <IconButton
                    title={`More ${b.name} beds`}
                    aria-label={`More ${b.name} beds`}
                    disabled={beds >= MAX_BEDS}
                    onClick={() => setBeds(b.code, beds + 1)}
                  >
                    <Lucide.Plus size={14} />
                  </IconButton>
                  <IconButton title={`Remove ${b.name}`} aria-label={`Remove ${b.name}`} onClick={() => remove(b.code)}>
                    <Lucide.X size={14} />
                  </IconButton>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
