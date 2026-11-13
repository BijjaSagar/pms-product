export const RESERVATION_STATUS_FILTERS = ['Hold', 'Block', 'Check-in', 'Check-out', 'Maintenance'] as const;

/* Filter labels map onto the reservation statuses the store holds. Block and Maintenance describe room
   states rather than bookings, so no reservation matches them yet. */
const STATUS_FILTER_MATCHES: Record<string, readonly string[]> = {
  Hold: ['Tentative', 'Pending'],
  Block: [],
  'Check-in': ['Checked-in'],
  'Check-out': ['Checked-out'],
  Maintenance: [],
};


export function matchesStatusFilter(status: string, filter: string): boolean {
  if (filter === 'All') return true;
  return (STATUS_FILTER_MATCHES[filter] ?? []).includes(status);
}
