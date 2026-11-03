import * as Lucide from 'lucide-react';
import { FilterToolbar } from '../../components/FilterToolbar';
import { SegmentedControl } from '../../components/SegmentedControl';
import { SelectField, TextField } from '../../components/primitives';
import { ROOM_STATUS_FILTERS, countActiveRoomFilters, type RoomFilters } from './roomFilters';

export type RoomViewMode = 'grid' | 'timeline';

const VIEW_OPTIONS = [
  { id: 'grid', label: 'Grid', Icon: Lucide.LayoutGrid },
  { id: 'timeline', label: 'Timeline', Icon: Lucide.CalendarRange },
] as const;

/* The same filters drive both the grid and the timeline; only the view switch changes. */
export function RoomFilterBar({
  filters,
  onChange,
  onClear,
  roomTypes,
  viewMode,
  onViewModeChange,
}: {
  filters: RoomFilters;
  onChange: (patch: Partial<RoomFilters>) => void;
  onClear: () => void;
  roomTypes: string[];
  viewMode: RoomViewMode;
  onViewModeChange: (mode: RoomViewMode) => void;
}) {
  return (
    <FilterToolbar
      ariaLabel="Room filters"
      onClear={onClear}
      clearDisabled={countActiveRoomFilters(filters) === 0}
      view={<SegmentedControl label="Room board view" options={VIEW_OPTIONS} value={viewMode} onChange={onViewModeChange} />}
    >
      <div className="relative col-span-2 min-w-0 sm:w-56 xl:w-64">
        <Lucide.Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <TextField
          type="search"
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Room, type or guest"
          aria-label="Search rooms"
          className="pl-9"
        />
      </div>

      <div className="col-span-2 min-w-0 sm:w-40">
        <SelectField value={filters.status} onChange={(e) => onChange({ status: e.target.value })} aria-label="Filter by room status">
          <option value="All">All statuses</option>
          {ROOM_STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="col-span-2 min-w-0 sm:w-44">
        <SelectField value={filters.type} onChange={(e) => onChange({ type: e.target.value })} aria-label="Filter by room type">
          <option value="All">All room types</option>
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
