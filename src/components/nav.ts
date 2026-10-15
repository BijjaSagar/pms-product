export type ViewId =
  | 'dashboard'
  | 'reservations'
  | 'new-reservation'
  | 'check-in'
  | 'check-out'
  | 'in-house'
  | 'guests'
  | 'walk-in'
  | 'room-overview'
  | 'room-types'
  | 'room-inventory'
  | 'status-board'
  | 'housekeeping'
  | 'maintenance'
  | 'folios'
  | 'payments'
  | 'invoices'
  | 'reports'
  | 'occupancy-report'
  | 'revenue-report'
  | 'arrivals-departures'
  | 'staff-roles'
  | 'properties'
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
      { id: 'in-house', label: 'In-house Guests', hint: 'Currently staying' },
      { id: 'guests', label: 'Guest Directory', hint: 'Profiles & loyalty' },
      { id: 'walk-in', label: 'Walk-in Guests', hint: 'Register without booking' },
    ],
  },
  {
    title: 'Rooms & Housekeeping',
    items: [
      { id: 'room-overview', label: 'Room Overview', hint: 'Cards & status' },
      { id: 'room-types', label: 'Room Types', hint: 'Categories & rates' },
      { id: 'room-inventory', label: 'Room Inventory', hint: 'Full room table' },
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
    ],
  },
  {
    title: 'Analytics',
    items: [
      { id: 'reports', label: 'Reports', hint: 'All reports' },
      { id: 'occupancy-report', label: 'Occupancy Report', hint: 'Occupancy trends' },
      { id: 'revenue-report', label: 'Revenue Report', hint: 'Revenue & ADR' },
      { id: 'arrivals-departures', label: 'Arrivals & Departures', hint: 'Movement report' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { id: 'staff-roles', label: 'Staff & Roles', hint: 'Team & permissions' },
      { id: 'properties', label: 'Properties', hint: 'Branches' },
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
  'new-reservation': 'reservation.create',
  'rate-management': 'reservation.read',
  'channel-manager': 'reservation.read',
  'check-in': 'stay.check-in',
  'check-out': 'stay.check-out',
  'in-house': 'reservation.read',
  guests: 'guest.read',
  'walk-in': 'reservation.create',
  'room-overview': 'room.read',
  'room-types': 'room.read',
  'room-inventory': 'room.read',
  'status-board': 'room.read',
  housekeeping: 'housekeeping.read',
  maintenance: 'maintenance.read',
  folios: 'folio.read',
  payments: 'payment.read',
  invoices: 'invoice.read',
  reports: 'report.read.operations',
  'occupancy-report': 'report.read.operations',
  'revenue-report': 'report.read.financial',
  'arrivals-departures': 'report.read.operations',
  'staff-roles': 'user.read',
  properties: 'property.read',
  settings: 'theme.update',
};

export function viewPermission(view: ViewId): string | undefined {
  return VIEW_PERMISSION[view];
}
