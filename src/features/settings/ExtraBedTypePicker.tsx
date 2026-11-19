import * as Lucide from 'lucide-react';
import type { RoomExtraBedTypeDetails } from '../../lib/api/pms';
import { IconButton, SelectField } from '../../components/primitives';

/**
 * Picks the extra bed types a room accepts from the fixed catalog the backend serves. The dropdown
 * lists only the types not yet chosen; each chosen type can be removed.
 */
export function ExtraBedTypePicker({
  catalog,
  value,
  onChange,
}: {
  catalog: RoomExtraBedTypeDetails[];
  /** Codes of the chosen extra bed types. */
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const chosen = catalog.filter((b) => value.includes(b.code));
  const available = catalog.filter((b) => !value.includes(b.code));

  return (
    <div className="flex flex-col gap-2.5">
      <SelectField
        aria-label="Add an extra bed type"
        value=""
        disabled={available.length === 0}
        onChange={(e) => e.target.value && onChange([...value, e.target.value])}
      >
        <option value="">{available.length === 0 ? 'Every extra bed type is added' : 'Add an extra bed type…'}</option>
        {available.map((b) => (
          <option key={b.code} value={b.code}>
            {b.name}
          </option>
        ))}
      </SelectField>

      {chosen.length === 0 ? (
        <p className="text-label text-ink-muted">No extra bed types added.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {chosen.map((b) => (
            <li
              key={b.code}
              className="flex items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Lucide.BedSingle size={15} className="flex-none text-primary" aria-hidden="true" />
                <span className="truncate text-body font-semibold text-ink">{b.name}</span>
              </span>
              <IconButton
                title={`Remove ${b.name}`}
                aria-label={`Remove ${b.name}`}
                onClick={() => onChange(value.filter((code) => code !== b.code))}
              >
                <Lucide.X size={14} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
