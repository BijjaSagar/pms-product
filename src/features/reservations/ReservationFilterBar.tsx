import * as Lucide from 'lucide-react';
import { FilterToolbar } from '../../components/FilterToolbar';
import { SegmentedControl } from '../../components/SegmentedControl';
import { SelectField, TextField } from '../../components/primitives';
import { DateRangePicker } from './DateRangePicker';
import { RESERVATION_STATUS_FILTERS } from './reservationStatusFilters';
import {
  RESERVATION_ROOM_TYPES,
  RESERVATION_SOURCES,
  countActiveFilters,
  type ReservationFilters,
} from './reservationFilters';

type ReservationViewMode = 'list' | 'calendar';

const VIEW_OPTIONS = [
  { id: 'calendar', label: 'Calendar', Icon: Lucide.CalendarRange },
  { id: 'list', label: 'List', Icon: Lucide.List },
] as const;

export function ReservationFilterBar({
  filters,
  onChange,
  onClear,
  viewMode,
  onViewModeChange,
}: {
  filters: ReservationFilters;
  onChange: (patch: Partial<ReservationFilters>) => void;
  onClear: () => void;
  viewMode: ReservationViewMode;
  onViewModeChange: (mode: ReservationViewMode) => void;
}) {
  return (
    <FilterToolbar
      ariaLabel="Reservation filters"
      onClear={onClear}
      clearDisabled={countActiveFilters(filters) === 0}
      view={<SegmentedControl label="View" options={VIEW_OPTIONS} value={viewMode} onChange={onViewModeChange} />}
    >
      <div className="relative col-span-2 min-w-0 sm:w-56 xl:w-64">
        <Lucide.Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <TextField
          type="search"
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Guest, booking or room"
          aria-label="Search reservations"
          className="pl-9"
        />
      </div>

      <div className="col-span-2 min-w-0 sm:w-52">
        <DateRangePicker from={filters.from} to={filters.to} onChange={(range) => onChange(range)} />
      </div>

      <div className="col-span-2 min-w-0 sm:w-36">
        <SelectField value={filters.status} onChange={(e) => onChange({ status: e.target.value })} aria-label="Filter by status">
          <option value="All">All statuses</option>
          {RESERVATION_STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="col-span-2 min-w-0 sm:w-40">
        <SelectField value={filters.roomType} onChange={(e) => onChange({ roomType: e.target.value })} aria-label="Filter by room type">
          <option value="All">All room types</option>
          {RESERVATION_ROOM_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="col-span-2 min-w-0 sm:w-32">
        <SelectField value={filters.source} onChange={(e) => onChange({ source: e.target.value })} aria-label="Filter by booking source">
          <option value="All">All sources</option>
          {RESERVATION_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
      </div>
    </FilterToolbar>
  );
}
