export type ThemeKey =
  | 'MIDNIGHT_NAVY'
  | 'SKY_BLUE_WHITE'
  | 'LUXURY_BEIGE_TAUPE'
  | 'SAGE_GREEN'
  | 'SOFT_BLUE_SLATE'
  | 'EUCALYPTUS'
  | 'OLIVE_CREAM'
  | 'DUSTY_LAVENDER'
  | 'CRIMSON_RED';

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
  maxAdults?: number;
  maxChildren?: number;
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
  active?: boolean;
  oosReason?: string | null;
  maxOccupancy?: number;
  bedType?: string;
  notes?: string;
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
  type?: string;
  dueAtIso?: string | null;
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
