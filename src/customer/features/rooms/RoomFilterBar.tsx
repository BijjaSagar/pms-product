import * as Lucide from 'lucide-react';
import { FilterToolbar } from '../../../shared/components/ui/FilterToolbar';
import { SelectField, TextField } from '../../../shared/components/ui/primitives';
import { countActiveRoomFilters, type RoomFilters } from './roomFilters';

export function RoomFilterBar({
  filters,
  onChange,
  onClear,
  roomTypes,
}: {
  filters: RoomFilters;
  onChange: (patch: Partial<RoomFilters>) => void;
  onClear: () => void;
  roomTypes: string[];
}) {
  return (
    <FilterToolbar ariaLabel="Room filters" onClear={onClear} clearDisabled={countActiveRoomFilters(filters) === 0}>
      <div className="relative col-span-2 min-w-0 sm:w-56 xl:w-64">
        <Lucide.Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <TextField
          type="search"
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Room or category"
          aria-label="Search rooms"
          className="pl-9"
        />
      </div>

      <div className="col-span-2 min-w-0 sm:w-44">
        <SelectField value={filters.type} onChange={(e) => onChange({ type: e.target.value })} aria-label="Filter by room category">
          <option value="All">All room categories</option>
          {roomTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>
      </div>
    </FilterToolbar>
  );
}
