/* One filter set for both the calendar and the list, so switching views keeps the same filters. */
export interface ReservationFilters {
  q: string;
  status: string;
  roomType: string;
  source: string;
  /* ISO dates (YYYY-MM-DD); an empty string leaves that side of the range open. */
  from: string;
  to: string;
}

export const EMPTY_RESERVATION_FILTERS: ReservationFilters = {
  q: '',
  status: 'All',
  roomType: 'All',
  source: 'All',
  from: '',
  to: '',
};

export const RESERVATION_ROOM_TYPES = ['Standard', 'Deluxe', 'Superior', 'Executive', 'Family Suite', 'Panorama Suite'] as const;

export const RESERVATION_SOURCES = ['Direct', 'Booking.com', 'Agoda', 'Expedia', 'Corporate', 'Walk-in'] as const;

/** Number of filters that narrow the results; the search text counts once it is not blank. */
export function countActiveFilters(filters: ReservationFilters): number {
  return [
    filters.q.trim() !== '',
    filters.status !== 'All',
    filters.roomType !== 'All',
    filters.source !== 'All',
    filters.from !== '' || filters.to !== '',
  ].filter(Boolean).length;
}
