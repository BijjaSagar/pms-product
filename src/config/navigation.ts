export type ViewId =
  | 'dashboard'
  | 'reservations'
  | 'room-calendar'
  | 'new-reservation'
  | 'check-in'
  | 'check-out'
  | 'guests'
  | 'room-overview'
  | 'room-types'
  | 'status-board'
  | 'housekeeping'
  | 'maintenance'
  | 'folios'
  | 'payments'
  | 'invoices'
  | 'night-audit'
  | 'reports'
  | 'occupancy-report'
  | 'revenue-report'
  | 'arrivals-departures'
  | 'staff-roles'
  | 'rate-management'
  | 'channel-manager'
  | 'settings';

export interface NavItem {
  id: ViewId;
  label: string;
  hint: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Cross-view navigation target. `query` pre-fills search, `focusId` opens a detail record. */
export interface NavTarget {
  view: ViewId;
  query?: string;
  focusId?: string;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', hint: 'Occupancy & revenue' }],
  },
  {
    title: 'Front Office',
    items: [
      { id: 'reservations', label: 'Reservations', hint: 'Bookings & calendar' },
      { id: 'new-reservation', label: 'New Reservation', hint: 'Create a booking' },
      { id: 'check-in', label: 'Check-in', hint: "Today's arrivals" },
      { id: 'check-out', label: 'Check-out', hint: 'Departures & folios' },
      { id: 'guests', label: 'Guest Directory', hint: 'Profiles & loyalty' },
    ],
  },
  {
    title: 'Rooms & Housekeeping',
    items: [
      { id: 'room-overview', label: 'Room Overview', hint: 'Cards & status' },
      { id: 'status-board', label: 'Status Board', hint: 'Compact live board' },
      { id: 'housekeeping', label: 'Housekeeping', hint: 'Tasks & upkeep' },
      { id: 'maintenance', label: 'Maintenance', hint: 'Requests & work orders' },
    ],
  },
  {
    title: 'Rates & Distribution',
    items: [
      { id: 'rate-management', label: 'Rate Management', hint: 'Rates, restrictions & seasonal' },
      { id: 'channel-manager', label: 'Channel Manager', hint: 'OTAs & rate sync' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { id: 'folios', label: 'Folios & Billing', hint: 'Guest folios' },
      { id: 'payments', label: 'Payments', hint: 'Ledger & receipts' },
      { id: 'invoices', label: 'Invoices', hint: 'Bills & previews' },
      { id: 'night-audit', label: 'Night Audit', hint: 'Day close & rollover' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { id: 'reports', label: 'Analytics', hint: 'Performance & reports hub' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { id: 'staff-roles', label: 'Staff & Roles', hint: 'Team & permissions' },
      { id: 'settings', label: 'Settings', hint: 'Property & appearance' },
    ],
  },
];

/** Flat lookup of every item, in sidebar order. */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

export function sectionOf(view: ViewId): string {
  const found = NAV_SECTIONS.find((s) => s.items.some((i) => i.id === view));
  return found ? found.title : '';
}

export function labelOf(view: ViewId): string {
  const found = NAV_ITEMS.find((i) => i.id === view);
  return found ? found.label : view;
}

/**
 * Permission that gates each view. The backend API is the real enforcement
 * boundary; this only decides what the shell shows. A view with no entry is
 * visible to every authenticated user.
 */
export const VIEW_PERMISSION: Partial<Record<ViewId, string>> = {
  dashboard: 'dashboard.read',
  reservations: 'reservation.read',
  'room-calendar': 'reservation.read',
  'new-reservation': 'reservation.create',
  'rate-management': 'reservation.read',
  'channel-manager': 'reservation.read',
  'check-in': 'stay.check-in',
  'check-out': 'stay.check-out',
  guests: 'guest.read',
  'room-overview': 'room.read',
  'room-types': 'room.read',
  'status-board': 'room.read',
  housekeeping: 'housekeeping.read',
  maintenance: 'maintenance.read',
  folios: 'folio.read',
  payments: 'payment.read',
  invoices: 'invoice.read',
  'night-audit': 'folio.read',
  reports: 'report.read.operations',
  'occupancy-report': 'report.read.operations',
  'revenue-report': 'report.read.financial',
  'arrivals-departures': 'report.read.operations',
  'staff-roles': 'user.read',
  settings: 'theme.update',
};

export function viewPermission(view: ViewId): string | undefined {
  return VIEW_PERMISSION[view];
}
