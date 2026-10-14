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

export const PROPERTY = {
  name: 'TriponX House',
  tagline: 'Boutique hotel · Lakeside district',
  address: '14 Marina Row, Lakeshore',
  phone: '+1 415 555 0100',
  email: 'stay@triponx.example',
  rooms: 159,
  floors: 5,
  checkInTime: '15:00',
  checkOutTime: '11:00',
  currency: 'USD',
  timezone: 'UTC−5',
  taxRate: 12,
} as const;

export const ROOM_TYPES: RoomType[] = [
  {
    id: 'RT-STD',
    name: 'Standard',
    description: 'Comfortable queen room with garden view, work desk and rain shower.',
    count: 58,
    maxOccupancy: 2,
    beds: '1 queen bed',
    baseRate: 129,
    amenities: ['Free Wi-Fi', 'Rain shower', 'Work desk', 'Smart TV', 'Coffee maker'],
    active: true,
  },
  {
    id: 'RT-DLX',
    name: 'Deluxe',
    description: 'Spacious king room with lake glimpse, seating nook and soaking tub.',
    count: 46,
    maxOccupancy: 3,
    beds: '1 king bed + daybed',
    baseRate: 186,
    amenities: ['Free Wi-Fi', 'Soaking tub', 'Seating nook', 'Smart TV', 'Mini bar', 'Bathrobes'],
    active: true,
  },
  {
    id: 'RT-FAM',
    name: 'Family',
    description: 'Two connected spaces with bunk nook for kids and a pantry counter.',
    count: 24,
    maxOccupancy: 5,
    beds: '1 queen + bunks',
    baseRate: 233,
    amenities: ['Free Wi-Fi', 'Bunk nook', 'Pantry counter', 'Smart TV', 'Board games'],
    active: true,
  },
  {
    id: 'RT-STE',
    name: 'Suite',
    description: 'Separate bedroom and lounge with lake balcony and espresso bar.',
    count: 22,
    maxOccupancy: 3,
    beds: '1 king + sofa bed',
    baseRate: 360,
    amenities: ['Free Wi-Fi', 'Lake balcony', 'Lounge', 'Espresso bar', 'Soaking tub', 'Evening turndown'],
    active: true,
  },
  {
    id: 'RT-PEN',
    name: 'Penthouse',
    description: 'Top-floor residence with terrace, dining room and dedicated host.',
    count: 9,
    maxOccupancy: 4,
    beds: '2 king beds',
    baseRate: 520,
    amenities: ['Free Wi-Fi', 'Private terrace', 'Dining room', 'Dedicated host', 'Champagne on arrival'],
    active: false,
  },
];

export const RESERVATIONS: Reservation[] = [
  { id: 'RSV-9041', guest: 'Amelia Hart', guestId: 'G-1021', room: 'Deluxe · 204', roomNumber: '204', roomType: 'Deluxe', checkIn: 'Oct 10', checkOut: 'Oct 13', nights: 3, adults: 2, children: 0, status: 'Confirmed', total: 624, paid: 0, nightlyRate: 186, channel: 'Direct', ratePlan: 'Best available', specialRequests: 'High floor, quiet side', notes: 'VIP — welcome amenity prepared.' },
  { id: 'RSV-9042', guest: 'Jonas Weber', guestId: 'G-1022', room: 'Suite · 501', roomNumber: '501', roomType: 'Suite', checkIn: 'Oct 10', checkOut: 'Oct 12', nights: 2, adults: 2, children: 1, status: 'Checked-in', total: 806, paid: 400, nightlyRate: 360, channel: 'Direct', ratePlan: 'Best available', specialRequests: 'Extra bed for child', notes: 'Deposit of $400 collected at check-in.' },
  { id: 'RSV-9043', guest: 'Priya Nair', guestId: 'G-1023', room: 'Standard · 112', roomNumber: '112', roomType: 'Standard', checkIn: 'Oct 11', checkOut: 'Oct 14', nights: 3, adults: 1, children: 0, status: 'Pending', total: 433, paid: 0, nightlyRate: 129, channel: 'OTA', ratePlan: 'Advance purchase', specialRequests: 'Early check-in if possible', notes: 'Awaiting card guarantee.' },
  { id: 'RSV-9044', guest: 'Marco Rossi', guestId: 'G-1024', room: 'Deluxe · 208', roomNumber: '208', roomType: 'Deluxe', checkIn: 'Oct 09', checkOut: 'Oct 10', nights: 1, adults: 1, children: 0, status: 'Checked-out', total: 208, paid: 208, nightlyRate: 186, channel: 'Corporate', ratePlan: 'Corporate', specialRequests: '', notes: 'Folio settled in full.' },
  { id: 'RSV-9045', guest: 'Sofia Lind', guestId: 'G-1025', room: 'Suite · 502', roomNumber: '502', roomType: 'Suite', checkIn: 'Oct 12', checkOut: 'Oct 15', nights: 3, adults: 2, children: 0, status: 'Confirmed', total: 1209, paid: 300, nightlyRate: 360, channel: 'Direct', ratePlan: 'Best available', specialRequests: 'Anniversary — flowers in room', notes: 'Partial deposit received.' },
  { id: 'RSV-9046', guest: 'Daniel Okafor', guestId: 'G-1027', room: 'Standard · 115', roomNumber: '115', roomType: 'Standard', checkIn: 'Oct 08', checkOut: 'Oct 10', nights: 2, adults: 2, children: 0, status: 'Cancelled', total: 0, paid: 0, nightlyRate: 129, channel: 'OTA', ratePlan: 'Advance purchase', specialRequests: '', notes: 'Cancelled outside free window; card charge failed.' },
  { id: 'RSV-9047', guest: 'Yuki Tanaka', guestId: 'G-1026', room: 'Deluxe · 210', roomNumber: '210', roomType: 'Deluxe', checkIn: 'Oct 07', checkOut: 'Oct 09', nights: 2, adults: 1, children: 0, status: 'No-show', total: 208, paid: 0, nightlyRate: 186, channel: 'Direct', ratePlan: 'Best available', specialRequests: '', notes: 'No-show fee posted to folio.' },
  { id: 'RSV-9048', guest: 'Elena Petrova', guestId: 'G-1028', room: 'Family · 305', roomNumber: '305', roomType: 'Family', checkIn: 'Oct 10', checkOut: 'Oct 16', nights: 6, adults: 2, children: 2, status: 'Checked-in', total: 1566, paid: 500, nightlyRate: 233, channel: 'Corporate', ratePlan: 'Corporate', specialRequests: 'Ground-floor preference, kids cutlery', notes: 'Long stay — mid-stay clean scheduled.' },
  { id: 'RSV-9049', guest: 'Tom Becker', guestId: 'G-1029', room: 'Standard', roomNumber: null, roomType: 'Standard', checkIn: 'Oct 10', checkOut: 'Oct 11', nights: 1, adults: 1, children: 0, status: 'Confirmed', total: 144, paid: 0, nightlyRate: 129, channel: 'Walk-in', ratePlan: 'Day rate', specialRequests: '', notes: 'Room to be assigned at check-in.' },
  { id: 'RSV-9050', guest: 'Aisha Khan', guestId: 'G-1030', room: 'Deluxe', roomNumber: null, roomType: 'Deluxe', checkIn: 'Oct 11', checkOut: 'Oct 13', nights: 2, adults: 2, children: 0, status: 'Confirmed', total: 416, paid: 0, nightlyRate: 186, channel: 'OTA', ratePlan: 'Best available', specialRequests: 'Vegetarian breakfast', notes: '' },
];

export const ROOMS: Room[] = [
  { number: '101', type: 'Standard', floor: 1, status: 'Available', hk: 'Clean', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 129 },
  { number: '104', type: 'Standard', floor: 1, status: 'Available', hk: 'Clean', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 129 },
  { number: '112', type: 'Standard', floor: 1, status: 'Occupied', hk: 'Clean', guest: 'Priya Nair', guestId: 'G-1023', reservationId: 'RSV-9043', checkIn: 'Oct 11', checkOut: 'Oct 14', rate: 129 },
  { number: '115', type: 'Standard', floor: 1, status: 'Dirty', hk: 'Dirty', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 129 },
  { number: '118', type: 'Standard', floor: 1, status: 'Available', hk: 'Inspected', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 129 },
  { number: '201', type: 'Deluxe', floor: 2, status: 'Occupied', hk: 'Clean', guest: 'Tom Becker', guestId: 'G-1029', reservationId: 'RSV-9049', checkIn: 'Oct 10', checkOut: 'Oct 11', rate: 186 },
  { number: '204', type: 'Deluxe', floor: 2, status: 'Inspected', hk: 'Inspected', guest: null, guestId: null, reservationId: 'RSV-9041', checkIn: 'Oct 10', checkOut: 'Oct 13', rate: 186 },
  { number: '207', type: 'Deluxe', floor: 2, status: 'Available', hk: 'Clean', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 186 },
  { number: '208', type: 'Deluxe', floor: 2, status: 'Cleaning', hk: 'Cleaning', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 186 },
  { number: '210', type: 'Deluxe', floor: 2, status: 'Available', hk: 'Clean', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 186 },
  { number: '302', type: 'Family', floor: 3, status: 'Available', hk: 'Clean', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 233 },
  { number: '305', type: 'Family', floor: 3, status: 'Occupied', hk: 'Clean', guest: 'Elena Petrova', guestId: 'G-1028', reservationId: 'RSV-9048', checkIn: 'Oct 10', checkOut: 'Oct 16', rate: 233 },
  { number: '307', type: 'Family', floor: 3, status: 'Dirty', hk: 'Dirty', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 233 },
  { number: '309', type: 'Family', floor: 3, status: 'Available', hk: 'Inspected', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 233 },
  { number: '401', type: 'Deluxe', floor: 4, status: 'Available', hk: 'Clean', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 186 },
  { number: '404', type: 'Deluxe', floor: 4, status: 'Cleaning', hk: 'Cleaning', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 186 },
  { number: '407', type: 'Deluxe', floor: 4, status: 'Occupied', hk: 'Clean', guest: 'Aisha Khan', guestId: 'G-1030', reservationId: 'RSV-9050', checkIn: 'Oct 11', checkOut: 'Oct 13', rate: 186 },
  { number: '501', type: 'Suite', floor: 5, status: 'Occupied', hk: 'Clean', guest: 'Jonas Weber', guestId: 'G-1022', reservationId: 'RSV-9042', checkIn: 'Oct 10', checkOut: 'Oct 12', rate: 360 },
  { number: '502', type: 'Suite', floor: 5, status: 'Available', hk: 'Inspected', guest: null, guestId: null, reservationId: 'RSV-9045', checkIn: 'Oct 12', checkOut: 'Oct 15', rate: 360 },
  { number: '503', type: 'Suite', floor: 5, status: 'Out-of-service', hk: 'Dirty', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 360 },
  { number: '505', type: 'Suite', floor: 5, status: 'Available', hk: 'Clean', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 360 },
  { number: '506', type: 'Penthouse', floor: 5, status: 'Inspected', hk: 'Inspected', guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null, rate: 520 },
];

export const GUESTS: Guest[] = [
  { id: 'G-1021', name: 'Amelia Hart', email: 'amelia.hart@mail.com', phone: '+1 415 555 0132', company: null, tier: 'VIP', category: 'Leisure', stays: 14, spent: 12480, balance: 624, lastVisit: 'Sep 28', preferences: ['High floor', 'Feather-free bedding', 'Still water'], notes: 'Prefers late checkout when available.' },
  { id: 'G-1022', name: 'Jonas Weber', email: 'jonas.weber@mail.de', phone: '+49 170 555 019', company: 'Weber Logistics', tier: 'Gold', category: 'Corporate', stays: 9, spent: 7210, balance: 406, lastVisit: 'Oct 09', preferences: ['Extra bed for child', 'Crib on request'], notes: 'Travelling with family.' },
  { id: 'G-1023', name: 'Priya Nair', email: 'priya.nair@mail.in', phone: '+91 98200 12345', company: null, tier: 'Regular', category: 'Leisure', stays: 4, spent: 1980, balance: 433, lastVisit: 'Aug 17', preferences: ['Early check-in'], notes: '' },
  { id: 'G-1024', name: 'Marco Rossi', email: 'marco.rossi@mail.it', phone: '+39 340 555 011', company: 'Rossi Foods', tier: 'Regular', category: 'Corporate', stays: 3, spent: 1420, balance: 0, lastVisit: 'Oct 09', preferences: ['Espresso before 7:00'], notes: '' },
  { id: 'G-1025', name: 'Sofia Lind', email: 'sofia.lind@mail.se', phone: '+46 70 555 014', company: null, tier: 'Gold', category: 'Leisure', stays: 7, spent: 5340, balance: 909, lastVisit: 'Sep 02', preferences: ['Anniversary setup', 'Flowers'], notes: 'Celebrating anniversary on Oct 13.' },
  { id: 'G-1026', name: 'Yuki Tanaka', email: 'yuki.t@mail.jp', phone: '+81 90 5555 012', company: null, tier: 'New', category: 'Leisure', stays: 1, spent: 372, balance: 208, lastVisit: 'Oct 07', preferences: [], notes: 'No-show on Oct 07; fee posted.' },
  { id: 'G-1027', name: 'Daniel Okafor', email: 'd.okafor@mail.com', phone: '+1 312 555 0177', company: null, tier: 'Regular', category: 'Leisure', stays: 2, spent: 860, balance: 258, lastVisit: 'Oct 08', preferences: [], notes: 'Card on file declined; front desk to call.' },
  { id: 'G-1028', name: 'Elena Petrova', email: 'elena.p@mail.bg', phone: '+359 88 555 014', company: 'Petrova & Co', tier: 'Gold', category: 'Corporate', stays: 6, spent: 6110, balance: 1066, lastVisit: 'Oct 10', preferences: ['Kids cutlery', 'Mid-stay clean'], notes: 'Family of four, 6-night stay.' },
  { id: 'G-1029', name: 'Tom Becker', email: 'tom.becker@mail.com', phone: '+1 212 555 0119', company: null, tier: 'New', category: 'Leisure', stays: 1, spent: 0, balance: 144, lastVisit: '—', preferences: [], notes: 'Walk-in arrival Oct 10.' },
  { id: 'G-1030', name: 'Aisha Khan', email: 'aisha.khan@mail.uk', phone: '+44 7700 900123', company: null, tier: 'Regular', category: 'Leisure', stays: 3, spent: 1540, balance: 416, lastVisit: 'Jul 22', preferences: ['Vegetarian breakfast'], notes: '' },
];

export const TASKS: HousekeepingTask[] = [
  { id: 'HK-201', room: '115', roomType: 'Standard', task: 'Full turnover clean', priority: 'High', status: 'Pending', assignee: 'Maria S.', startTime: '—', dueTime: '12:00', durationMin: 45, notes: 'Checkout clean; restock minibar.', updated: '09:12' },
  { id: 'HK-202', room: '208', roomType: 'Deluxe', task: 'Cleaning in progress', priority: 'High', status: 'In progress', assignee: 'James K.', startTime: '10:05', dueTime: '11:30', durationMin: 50, notes: 'Bathroom regrout check after clean.', updated: '10:20' },
  { id: 'HK-203', room: '307', roomType: 'Family', task: 'Linen change + restock', priority: 'Medium', status: 'Pending', assignee: 'Maria S.', startTime: '—', dueTime: '13:00', durationMin: 40, notes: 'Kids bunk linen set needed.', updated: '09:40' },
  { id: 'HK-204', room: '204', roomType: 'Deluxe', task: 'Inspection passed', priority: 'Low', status: 'Done', assignee: 'Ana R.', startTime: '08:30', dueTime: '09:30', durationMin: 20, notes: 'Ready for VIP arrival.', updated: '09:25' },
  { id: 'HK-205', room: '503', roomType: 'Suite', task: 'Maintenance required — faucet leak', priority: 'High', status: 'Pending', assignee: 'Ops team', startTime: '—', dueTime: '15:00', durationMin: 60, notes: 'Room blocked until work order WO-118 closes.', updated: '08:55' },
  { id: 'HK-206', room: '501', roomType: 'Suite', task: 'Evening turndown', priority: 'Low', status: 'Pending', assignee: 'James K.', startTime: '—', dueTime: '19:00', durationMin: 25, notes: 'Extra bed already placed.', updated: '09:02' },
  { id: 'HK-207', room: '404', roomType: 'Deluxe', task: 'Cleaning in progress', priority: 'Medium', status: 'In progress', assignee: 'Ana R.', startTime: '10:15', dueTime: '11:45', durationMin: 45, notes: '', updated: '10:28' },
  { id: 'HK-208', room: '307', roomType: 'Family', task: 'Inspection requested', priority: 'Medium', status: 'Pending', assignee: 'Supervisor', startTime: '—', dueTime: '14:00', durationMin: 15, notes: '', updated: '09:50' },
];

export const INVOICES: Invoice[] = [
  { id: 'INV-3301', guest: 'Jonas Weber', room: '501', amount: 720, status: 'Paid', due: 'Oct 10', method: 'Card' },
  { id: 'INV-3302', guest: 'Elena Petrova', room: '305', amount: 1398, status: 'Pending', due: 'Oct 16', method: 'Invoice' },
  { id: 'INV-3303', guest: 'Marco Rossi', room: '208', amount: 186, status: 'Paid', due: 'Oct 10', method: 'Cash' },
  { id: 'INV-3304', guest: 'Daniel Okafor', room: '115', amount: 258, status: 'Failed', due: 'Oct 08', method: 'Card' },
  { id: 'INV-3305', guest: 'Sofia Lind', room: '502', amount: 1080, status: 'Overdue', due: 'Oct 05', method: 'Transfer' },
  { id: 'INV-3306', guest: 'Amelia Hart', room: '204', amount: 558, status: 'Pending', due: 'Oct 13', method: 'Card' },
  { id: 'INV-3307', guest: 'Tom Becker', room: '201', amount: 144, status: 'Pending', due: 'Oct 11', method: 'Card' },
  { id: 'INV-3308', guest: 'Aisha Khan', room: '407', amount: 416, status: 'Pending', due: 'Oct 13', method: 'Card' },
];

export const FOLIOS: Folio[] = [
  {
    id: 'F-2201', reservationId: 'RSV-9042', guest: 'Jonas Weber', guestId: 'G-1022', room: '501', status: 'Open',
    charges: [
      { label: 'Room — Suite × 2 nights', detail: 'Oct 10 → Oct 12 @ $360', amount: 720 },
      { label: 'Extra bed', detail: 'Child bed, 2 nights', amount: 50 },
      { label: 'Breakfast × 3', detail: '2 adults + 1 child', amount: 36 },
    ],
    tax: 97, discount: 0,
    payments: [{ ref: 'PAY-7811', method: 'Card', amount: 400, date: 'Oct 10' }],
  },
  {
    id: 'F-2202', reservationId: 'RSV-9048', guest: 'Elena Petrova', guestId: 'G-1028', room: '305', status: 'Open',
    charges: [
      { label: 'Room — Family × 6 nights', detail: 'Oct 10 → Oct 16 @ $233', amount: 1398 },
      { label: 'Restaurant', detail: 'Dinner, Oct 10', amount: 118 },
      { label: 'Laundry', detail: 'Express, 4 items', amount: 32 },
    ],
    tax: 186, discount: 68,
    payments: [{ ref: 'PAY-7814', method: 'Transfer', amount: 500, date: 'Oct 10' }],
  },
  {
    id: 'F-2203', reservationId: 'RSV-9044', guest: 'Marco Rossi', guestId: 'G-1024', room: '208', status: 'Settled',
    charges: [{ label: 'Room — Deluxe × 1 night', detail: 'Oct 09 → Oct 10 @ $186', amount: 186 }],
    tax: 22, discount: 0,
    payments: [{ ref: 'PAY-7809', method: 'Cash', amount: 208, date: 'Oct 10' }],
  },
  {
    id: 'F-2204', reservationId: 'RSV-9041', guest: 'Amelia Hart', guestId: 'G-1021', room: '204', status: 'Open',
    charges: [{ label: 'Room — Deluxe × 3 nights', detail: 'Oct 10 → Oct 13 @ $186', amount: 558 }],
    tax: 66, discount: 0,
    payments: [],
  },
];

export const PAYMENTS: Payment[] = [
  { ref: 'PAY-7814', guest: 'Elena Petrova', bookingId: 'RSV-9048', date: 'Oct 10', amount: 500, method: 'Transfer', status: 'Paid', txn: 'TXN-88412' },
  { ref: 'PAY-7811', guest: 'Jonas Weber', bookingId: 'RSV-9042', date: 'Oct 10', amount: 400, method: 'Card', txn: 'TXN-88390', status: 'Paid' },
  { ref: 'PAY-7809', guest: 'Marco Rossi', bookingId: 'RSV-9044', date: 'Oct 10', amount: 208, method: 'Cash', txn: '—', status: 'Paid' },
  { ref: 'PAY-7804', guest: 'Daniel Okafor', bookingId: 'RSV-9046', date: 'Oct 08', amount: 258, method: 'Card', txn: 'TXN-88102', status: 'Failed' },
  { ref: 'PAY-7798', guest: 'Sofia Lind', bookingId: 'RSV-9045', date: 'Oct 05', amount: 1080, method: 'Transfer', txn: 'TXN-87955', status: 'Overdue' },
  { ref: 'PAY-7791', guest: 'Amelia Hart', bookingId: 'RSV-9041', date: 'Oct 09', amount: 200, method: 'Card', txn: 'TXN-87710', status: 'Pending' },
];

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

export const MAINTENANCE: MaintenanceRequest[] = [
  { id: 'WO-118', room: '503', category: 'Plumbing', description: 'Bathroom faucet leaking steadily; shutoff valve stiff.', priority: 'Urgent', reportedBy: 'Ana R. (HK)', assignee: 'FixRight Plumbing', created: 'Oct 09', due: 'Oct 11', status: 'In progress', notes: ['Room blocked as out-of-service.', 'Parts ordered Oct 09.'] },
  { id: 'WO-117', room: '208', category: 'Bathroom', description: 'Shower grout discoloured; reseal after deep clean.', priority: 'Medium', reportedBy: 'James K. (HK)', assignee: 'In-house team', created: 'Oct 10', due: 'Oct 12', status: 'Open', notes: [] },
  { id: 'WO-116', room: 'Lobby', category: 'Electrical', description: 'Two downlights flickering above reception desk.', priority: 'Low', reportedBy: 'Front desk', assignee: 'In-house team', created: 'Oct 08', due: 'Oct 14', status: 'Open', notes: [] },
  { id: 'WO-115', room: '307', category: 'Furniture', description: 'Bunk ladder bolt loose; tighten and verify.', priority: 'High', reportedBy: 'Maria S. (HK)', assignee: 'In-house team', created: 'Oct 10', due: 'Oct 11', status: 'Open', notes: [] },
  { id: 'WO-114', room: '101', category: 'HVAC', description: 'Thermostat unresponsive; replaced batteries, monitoring.', priority: 'Low', reportedBy: 'Guest report', assignee: 'In-house team', created: 'Oct 07', due: 'Oct 09', status: 'Resolved', notes: ['Resolved Oct 08 — sensor reset.'] },
];

export const NOTICES: Notice[] = [
  { id: 'N-1', title: 'Suite 503 out of service', detail: 'Faucet leak — work order WO-118 in progress.', tone: 'danger', time: '08:55', target: 'status-board' },
  { id: 'N-2', title: '6 VIP arrivals today', detail: 'Amelia Hart (204) expects high floor, quiet side.', tone: 'warning', time: '09:10', target: 'check-in' },
  { id: 'N-3', title: 'INV-3305 overdue', detail: 'Sofia Lind — $1,080 pending since Oct 05.', tone: 'warning', time: '09:30', target: 'invoices' },
  { id: 'N-4', title: 'Card declined on file', detail: 'Daniel Okafor (RSV-9046) — front desk to call.', tone: 'danger', time: '09:45', target: 'reservations' },
  { id: 'N-5', title: 'Room 204 inspected', detail: 'Ready for VIP arrival this afternoon.', tone: 'success', time: '09:25', target: 'room-overview' },
  { id: 'N-6', title: '2 late check-outs approved', detail: '501 until 14:00; 305 until 12:30.', tone: 'info', time: '10:02', target: 'check-out' },
];

export const TODAY = {
  arrivals: 24,
  departures: 18,
  inHouse: 124,
  occupancyPct: 78,
  revenue: 48200,
  outstanding: 3890,
  adr: 186,
  totalRooms: 159,
  available: 18,
  occupied: 124,
  dirty: 9,
  outOfService: 3,
} as const;

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
