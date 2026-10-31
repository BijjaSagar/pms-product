import * as Lucide from 'lucide-react';
import { Button, SelectField, TextField } from '../../components/primitives';

/* One filter set for both the calendar and the list, so switching views keeps the same filters. */
export interface ReservationFilters {
  q: string;
  status: string;
  roomType: string;
  source: string;
}

export const EMPTY_RESERVATION_FILTERS: ReservationFilters = { q: '', status: 'All', roomType: 'All', source: 'All' };

export const RESERVATION_STATUSES = [
  'Confirmed',
  'Pending',
  'Tentative',
  'Checked-in',
  'Checked-out',
  'Cancelled',
  'No-show',
] as const;

export const RESERVATION_ROOM_TYPES = ['Standard', 'Deluxe', 'Superior', 'Executive', 'Family Suite', 'Panorama Suite'] as const;

export const RESERVATION_SOURCES = ['Direct', 'Booking.com', 'Agoda', 'Expedia', 'Corporate', 'Walk-in'] as const;

export function ReservationFilterBar({
  filters,
  onChange,
  onClear,
}: {
  filters: ReservationFilters;
  onChange: (patch: Partial<ReservationFilters>) => void;
  onClear: () => void;
}) {
  return (
    <section className="pms-card p-4 sm:p-5" aria-label="Reservation filters">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-6">
        <div className="relative min-w-0 sm:col-span-2 xl:col-span-2">
          <Lucide.Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <TextField
            type="text"
            value={filters.q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Search guest, booking ID, room..."
            aria-label="Search reservations"
            className="pl-10"
          />
        </div>
        <SelectField value={filters.status} onChange={(e) => onChange({ status: e.target.value })} aria-label="Filter by status">
          <option value="All">All statuses</option>
          {RESERVATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        <SelectField value={filters.roomType} onChange={(e) => onChange({ roomType: e.target.value })} aria-label="Filter by room type">
          <option value="All">All room types</option>
          {RESERVATION_ROOM_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>
        <SelectField value={filters.source} onChange={(e) => onChange({ source: e.target.value })} aria-label="Filter by booking source">
          <option value="All">All sources</option>
          {RESERVATION_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        <Button variant="secondary" type="button" onClick={onClear} icon={<Lucide.RotateCcw size={13} className="text-ink-muted" />}>
          Clear filters
        </Button>
      </div>
    </section>
  );
}
