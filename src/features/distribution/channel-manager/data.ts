import type { Channel, ChannelBooking, ChannelLog, ChannelPerformance, InventoryDate, InventoryRow, RateMapping, SyncSettings } from './types';

export const BUSINESS_DATE = '2026-10-17';
export const INITIAL_RANGE_START = '2026-10-14';

export const ROOM_TYPES = ['Standard', 'Deluxe', 'Superior', 'Suite', 'Family', 'Executive'];

export const ADDABLE_PROVIDERS = [
  { id: 'trip', name: 'Trip.com / Ctrip', abbreviation: 'T', color: '#287DFA', logoColor: '#ffffff' },
  { id: 'vrbo', name: 'Vrbo / HomeAway', abbreviation: 'V', color: '#3A5CCC', logoColor: '#ffffff' },
  { id: 'hostelworld', name: 'Hostelworld', abbreviation: 'H', color: '#F35B4F', logoColor: '#ffffff' },
  { id: 'despegar', name: 'Despegar', abbreviation: 'D', color: '#7C3AED', logoColor: '#ffffff' },
  { id: 'google', name: 'Google Hotels', abbreviation: 'G', color: '#ffffff', logoColor: '#4285F4' },
];

export const INITIAL_CHANNELS: Channel[] = [
  { id: 'booking', name: 'Booking.com', code: 'booking', logoBg: '#003580', logoText: 'B.', logoColor: '#ffffff', status: 'connected', lastSync: '2 mins ago', activeRooms: 42, bookingsMtd: 12, syncSuccess: 98 },
  { id: 'expedia', name: 'Expedia', code: 'expedia', logoBg: '#FFCC00', logoText: '↗', logoColor: '#111827', status: 'connected', lastSync: '5 mins ago', activeRooms: 38, bookingsMtd: 10, syncSuccess: 100 },
  { id: 'airbnb', name: 'Airbnb', code: 'airbnb', logoBg: '#FF5A5F', logoText: 'A', logoColor: '#ffffff', status: 'connected', lastSync: '3 mins ago', activeRooms: 25, bookingsMtd: 8, syncSuccess: 100 },
  { id: 'agoda', name: 'Agoda', code: 'agoda', logoBg: '#ffffff', logoText: 'a', logoColor: '#e11d48', status: 'connected', lastSync: '4 mins ago', activeRooms: 30, bookingsMtd: 6, syncSuccess: 99 },
  { id: 'makemytrip', name: 'MakeMyTrip', code: 'makemytrip', logoBg: '#e41d24', logoText: 'my', logoColor: '#ffffff', status: 'connected', lastSync: '6 mins ago', activeRooms: 20, bookingsMtd: 4, syncSuccess: 100 },
  { id: 'goibibo', name: 'Goibibo', code: 'goibibo', logoBg: '#f36b21', logoText: 'go', logoColor: '#ffffff', status: 'error', lastSync: 'Failed · 10:15 AM', activeRooms: 18, bookingsMtd: 0, syncSuccess: 0, errorDetail: 'API token expired. Reconnect this channel to resume synchronization.' },
];

export const INITIAL_LOGS: ChannelLog[] = [
  { id: 'log-1', time: '10:48:12 AM', channelId: 'booking', event: 'Inventory & rate push', status: 'Success', detail: '42 rooms synchronized. No errors.' },
  { id: 'log-2', time: '10:45:00 AM', channelId: 'expedia', event: 'Restrictions push', status: 'Success', detail: 'Minimum-stay rule applied for weekend dates.' },
  { id: 'log-3', time: '10:42:33 AM', channelId: 'airbnb', event: 'Reservation import', status: 'Success', detail: 'Booking AB9876543 imported.' },
  { id: 'log-4', time: '10:38:15 AM', channelId: 'agoda', event: 'Rate parity check', status: 'Success', detail: 'Mapped room categories match target rates.' },
  { id: 'log-5', time: '10:35:50 AM', channelId: 'makemytrip', event: 'Inventory push', status: 'Success', detail: 'Family room inventory updated.' },
  { id: 'log-6', time: '10:15:02 AM', channelId: 'goibibo', event: 'Authentication handshake', status: 'Failed', detail: 'Gateway timeout while contacting the channel endpoint.' },
];

export const RECENT_BOOKINGS: ChannelBooking[] = [
  { id: 'BK1234567', channelId: 'booking', guestName: 'Rahul Mehta', roomType: 'Deluxe', checkIn: '2026-10-14', checkOut: '2026-10-16', status: 'Confirmed' },
  { id: 'AB9876543', channelId: 'airbnb', guestName: 'Sarah Wilson', roomType: 'Standard', checkIn: '2026-10-15', checkOut: '2026-10-17', status: 'Confirmed' },
  { id: 'EX5678901', channelId: 'expedia', guestName: 'John Smith', roomType: 'Suite', checkIn: '2026-10-16', checkOut: '2026-10-20', status: 'Confirmed' },
  { id: 'AG2345678', channelId: 'agoda', guestName: 'Priya Sharma', roomType: 'Superior', checkIn: '2026-10-14', checkOut: '2026-10-15', status: 'Confirmed' },
  { id: 'MM1122334', channelId: 'makemytrip', guestName: 'Amit Kumar', roomType: 'Family', checkIn: '2026-10-18', checkOut: '2026-10-20', status: 'Pending' },
];

export const INITIAL_PERFORMANCE: ChannelPerformance[] = [
  { channelId: 'booking', bookings: 28, roomNights: 112, revenue: 124560 },
  { channelId: 'expedia', bookings: 18, roomNights: 76, revenue: 82340 },
  { channelId: 'airbnb', bookings: 14, roomNights: 54, revenue: 62780 },
  { channelId: 'agoda', bookings: 10, roomNights: 40, revenue: 38900 },
  { channelId: 'makemytrip', bookings: 8, roomNights: 32, revenue: 24500 },
  { channelId: 'goibibo', bookings: 4, roomNights: 16, revenue: 12800 },
];

export const INITIAL_MAPPINGS: RateMapping[] = [
  { id: 'map-1', channelId: 'booking', roomType: 'Standard', ratePlan: 'Room Only', externalCode: 'STD-EP-BK01', status: 'Mapped' },
  { id: 'map-2', channelId: 'booking', roomType: 'Deluxe', ratePlan: 'Breakfast Included', externalCode: 'DLX-CP-BK02', status: 'Mapped' },
  { id: 'map-3', channelId: 'expedia', roomType: 'Standard', ratePlan: 'Room Only', externalCode: 'EXP-STD-RO', status: 'Mapped' },
  { id: 'map-4', channelId: 'expedia', roomType: 'Deluxe', ratePlan: 'Breakfast Included', externalCode: 'EXP-DLX-BB', status: 'Mapped' },
  { id: 'map-5', channelId: 'airbnb', roomType: 'Family', ratePlan: 'Member Discount', externalCode: 'ABB-FAM-MEM', status: 'Needs review' },
  { id: 'map-6', channelId: 'agoda', roomType: 'Superior', ratePlan: 'Half Board', externalCode: 'AGO-SUP-MAP', status: 'Mapped' },
  { id: 'map-7', channelId: 'makemytrip', roomType: 'Executive', ratePlan: 'Corporate Rate', externalCode: 'MMT-EXE-CORP', status: 'Mapped' },
  { id: 'map-8', channelId: 'goibibo', roomType: 'Suite', ratePlan: 'Best Available Rate', externalCode: 'GIB-STE-BAR', status: 'Needs review' },
];

export const INITIAL_INVENTORY: InventoryRow[] = [
  { roomType: 'Standard', totalRooms: 20, availability: [12, 10, 8, 6, 8, 10, 12, 14, 16, 16, 14, 12, 10, 10, 12] },
  { roomType: 'Deluxe', totalRooms: 15, availability: [8, 8, 6, 5, 6, 8, 10, 12, 12, 12, 10, 8, 8, 8, 10] },
  { roomType: 'Superior', totalRooms: 10, availability: [6, 6, 4, 3, 4, 6, 8, 8, 10, 10, 6, 6, 4, 4, 8] },
  { roomType: 'Suite', totalRooms: 8, availability: [4, 4, 3, 2, 2, 4, 4, 6, 6, 6, 4, 4, 4, 4, 4] },
  { roomType: 'Family', totalRooms: 5, availability: [3, 3, 2, 1, 2, 3, 4, 4, 4, 4, 3, 3, 2, 2, 3] },
  { roomType: 'Executive', totalRooms: 4, availability: [2, 2, 1, 1, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2] },
];

export const INITIAL_SYNC_SETTINGS: SyncSettings = {
  availability: true,
  rates: true,
  restrictions: true,
  minStay: true,
  stopSell: true,
  autoSync: true,
  timeZone: 'Asia/Kolkata',
  defaultMarkup: '0',
};

export function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildInventoryDates(startDate: string, count = 15): InventoryDate[] {
  return Array.from({ length: count }, (_, index) => {
    const iso = shiftDate(startDate, index);
    const date = new Date(`${iso}T12:00:00Z`);
    return {
      iso,
      day: String(date.getUTCDate()).padStart(2, '0'),
      month: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      isWeekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
    };
  });
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  const first = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const last = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return `${first} – ${last}`;
}

export function formatStayDates(checkIn: string, checkOut: string): string {
  const format = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${format(checkIn)} – ${format(checkOut)}`;
}
