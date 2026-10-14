// Static demo dataset for the PMS. All records are fictional.
// Totals and statuses are computed locally; nothing is persisted remotely.
// Types only + const data, erasable syntax safe.

export type ReservationStatus =
  | 'Confirmed'
  | 'Pending'
  | 'Checked-in'
  | 'Checked-out'
  | 'Cancelled'
  | 'No-show';

export type RoomStatus =
  | 'Available'
  | 'Occupied'
  | 'Dirty'
  | 'Cleaning'
  | 'Inspected'
  | 'Out-of-service';

export type HkStatus = 'Clean' | 'Dirty' | 'Cleaning' | 'Inspected';

export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue' | 'Failed' | 'Refunded' | 'Partially refunded';

export type FolioStatus = 'Open' | 'Settled' | 'Disputed';

export type MaintenanceStatus = 'Open' | 'In progress' | 'Resolved';

export type MaintenancePriority = 'Urgent' | 'High' | 'Medium' | 'Low';

export interface RoomType {
  id: string;
  name: string;
  description: string;
  count: number;
  maxOccupancy: number;
  beds: string;
  baseRate: number;
  amenities: string[];
  active: boolean;
}

export interface Reservation {
  id: string;
  backendId?: string;
  bookingCode?: string;
  currencyCode?: string;
  roomTypeId?: string;
  guest: string;
  guestId: string;
  room: string;
  roomNumber: string | null;
  roomType: string;
  checkIn: string;
  checkOut: string;
  checkInIso?: string;
  checkOutIso?: string;
  nights: number;
  adults: number;
  children: number;
  status: ReservationStatus;
  total: number;
  taxAmount?: number;
  paid: number;
  nightlyRate: number;
  channel: string;
  ratePlan: string;
  specialRequests: string;
  notes: string;
}

export interface Room {
  number: string;
  backendId?: string;
  roomTypeId?: string;
  type: string;
  floor: number;
  status: RoomStatus;
  hk: HkStatus;
  guest: string | null;
  guestId: string | null;
  reservationId: string | null;
  checkIn: string | null;
  checkOut: string | null;
  rate: number;
}

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  tier: 'VIP' | 'Gold' | 'Regular' | 'New';
  category: 'Leisure' | 'Corporate' | 'Group' | 'Long-stay';
  stays: number;
  spent: number;
  balance: number;
  lastVisit: string;
  preferences: string[];
  notes: string;
}

export interface HousekeepingTask {
  id: string;
  roomId?: string;
  backendStatus?: string;
  assignedToId?: string | null;
  room: string;
  roomType: string;
  task: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In progress' | 'Done';
  assignee: string;
  startTime: string;
  dueTime: string;
  durationMin: number;
  notes: string;
  updated: string;
}

export interface Invoice {
  id: string;
  backendId?: string;
  folioId?: string;
  currencyCode?: string;
  guest: string;
  room: string;
  amount: number;
  status: PaymentStatus | 'Issued' | 'Draft' | 'Void' | 'Credited';
  due: string;
  method: string;
}

export interface FolioCharge {
  backendId?: string;
  label: string;
  detail: string;
  amount: number;
}

export interface FolioPayment {
  ref: string;
  method: string;
  amount: number;
  date: string;
}

export interface Folio {
  id: string;
  backendId?: string;
  currencyCode?: string;
  checkOutDate?: string;
  reservationId: string;
  guest: string;
  guestId: string;
  room: string;
  status: FolioStatus;
  charges: FolioCharge[];
  tax: number;
  discount: number;
  payments: FolioPayment[];
}

export interface Payment {
  ref: string;
  backendId?: string;
  currencyCode?: string;
  guest: string;
  bookingId: string;
  date: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  txn: string;
}

export interface Expense {
  id: string;
  category: string;
  vendor: string;
  date: string;
  amount: number;
  status: 'Approved' | 'Pending' | 'Rejected';
  notes: string;
}

export interface RatePlan {
  id: string;
  name: string;
  roomType: string;
  standard: number;
  weekend: number;
  seasonal: number;
  minStay: number;
  meals: string;
  cancellation: string;
  validFrom: string;
  validTo: string;
  active: boolean;
}

export interface MaintenanceRequest {
  id: string;
  backendId?: string;
  backendStatus?: string;
  assignedToId?: string | null;
  room: string;
  category: string;
  description: string;
  priority: MaintenancePriority;
  reportedBy: string;
  assignee: string;
  created: string;
  due: string;
  status: MaintenanceStatus;
  notes: string[];
}

export interface Notice {
  id: string;
  title: string;
  detail: string;
  tone: 'warning' | 'info' | 'danger' | 'success';
  time: string;
  target: string;
}

export const EXPENSES: Expense[] = [
  { id: 'EXP-401', category: 'Housekeeping', vendor: 'Linen Co.', date: 'Oct 09', amount: 1240, status: 'Approved', notes: 'Monthly linen supply' },
  { id: 'EXP-402', category: 'Maintenance', vendor: 'FixRight Plumbing', date: 'Oct 10', amount: 320, status: 'Pending', notes: 'Suite 503 faucet repair' },
  { id: 'EXP-403', category: 'Food & Beverage', vendor: 'GreenFarm Produce', date: 'Oct 08', amount: 860, status: 'Approved', notes: 'Weekly restaurant stock' },
  { id: 'EXP-404', category: 'Utilities', vendor: 'City Power', date: 'Oct 01', amount: 2130, status: 'Approved', notes: 'September electricity' },
  { id: 'EXP-405', category: 'Marketing', vendor: 'Studio North', date: 'Oct 06', amount: 540, status: 'Rejected', notes: 'Duplicate of EXP-398' },
];

export const RATE_PLANS: RatePlan[] = [
  { id: 'RP-01', name: 'Best available', roomType: 'All types', standard: 186, weekend: 214, seasonal: 249, minStay: 1, meals: 'Room only', cancellation: 'Free until 48h before arrival', validFrom: 'Jan 01', validTo: 'Dec 31', active: true },
  { id: 'RP-02', name: 'Advance purchase', roomType: 'Standard, Deluxe', standard: 165, weekend: 189, seasonal: 219, minStay: 2, meals: 'Room only', cancellation: 'Non-refundable', validFrom: 'Jan 01', validTo: 'Dec 31', active: true },
  { id: 'RP-03', name: 'Corporate', roomType: 'All types', standard: 172, weekend: 172, seasonal: 198, minStay: 1, meals: 'Breakfast included', cancellation: 'Free until 24h before arrival', validFrom: 'Jan 01', validTo: 'Dec 31', active: true },
  { id: 'RP-04', name: 'Day rate', roomType: 'Standard', standard: 129, weekend: 129, seasonal: 149, minStay: 1, meals: 'Room only', cancellation: 'Same-day only', validFrom: 'Jan 01', validTo: 'Dec 31', active: false },
];

export const NOTICES: Notice[] = [
  { id: 'N-1', title: 'Suite 503 out of service', detail: 'Faucet leak — work order WO-118 in progress.', tone: 'danger', time: '08:55', target: 'status-board' },
  { id: 'N-2', title: '6 VIP arrivals today', detail: 'Amelia Hart (204) expects high floor, quiet side.', tone: 'warning', time: '09:10', target: 'check-in' },
  { id: 'N-3', title: 'INV-3305 overdue', detail: 'Sofia Lind — $1,080 pending since Oct 05.', tone: 'warning', time: '09:30', target: 'invoices' },
  { id: 'N-4', title: 'Card declined on file', detail: 'Daniel Okafor (RSV-9046) — front desk to call.', tone: 'danger', time: '09:45', target: 'reservations' },
  { id: 'N-5', title: 'Room 204 inspected', detail: 'Ready for VIP arrival this afternoon.', tone: 'success', time: '09:25', target: 'room-overview' },
  { id: 'N-6', title: '2 late check-outs approved', detail: '501 until 14:00; 305 until 12:30.', tone: 'info', time: '10:02', target: 'check-out' },
];

export function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function folioSubtotal(f: Folio): number {
  return f.charges.reduce((s, c) => s + c.amount, 0);
}

export function folioTotal(f: Folio): number {
  return folioSubtotal(f) + f.tax - f.discount;
}

export function folioPaid(f: Folio): number {
  return f.payments.reduce((s, p) => s + p.amount, 0);
}

export function folioBalance(f: Folio): number {
  return folioTotal(f) - folioPaid(f);
}
