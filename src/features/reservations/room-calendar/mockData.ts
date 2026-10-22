import type { CalendarReservation, CalendarRoom, RoomType, ReservationStatus } from './types';
import {
  BUSINESS_DATE,
  GUESTS,
} from '../../../data/catalog';
import { store } from '../../../data/store';

export { BUSINESS_DATE };

export const ROOM_TYPE_CONFIG: Record<
  RoomType,
  { baseRate: number; maxOccupancy: number; color: string; badgeBg: string }
> = {
  Standard: {
    baseRate: 3500,
    maxOccupancy: 2,
    color: '#0284c7',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  Deluxe: {
    baseRate: 4500,
    maxOccupancy: 3,
    color: '#4f46e5',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  Superior: {
    baseRate: 5500,
    maxOccupancy: 3,
    color: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  Executive: {
    baseRate: 6500,
    maxOccupancy: 4,
    color: '#d97706',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  'Family Suite': {
    baseRate: 8000,
    maxOccupancy: 5,
    color: '#9333ea',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  'Panorama Suite': {
    baseRate: 12000,
    maxOccupancy: 4,
    color: '#e11d48',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

/** Exactly 3 floors with 5 rooms each (15 rooms total) */
export const MOCK_ROOMS: CalendarRoom[] = [
  // Floor 1 (Rooms 101 - 105)
  {
    id: 'room-101',
    number: '101',
    floor: 1,
    type: 'Standard',
    maxOccupancy: 2,
    baseRate: 3500,
    status: 'Available',
  },
  {
    id: 'room-102',
    number: '102',
    floor: 1,
    type: 'Standard',
    maxOccupancy: 2,
    baseRate: 3500,
    status: 'Occupied',
  },
  {
    id: 'room-103',
    number: '103',
    floor: 1,
    type: 'Standard',
    maxOccupancy: 2,
    baseRate: 3500,
    status: 'Available',
  },
  {
    id: 'room-104',
    number: '104',
    floor: 1,
    type: 'Deluxe',
    maxOccupancy: 3,
    baseRate: 4500,
    status: 'Dirty',
  },
  {
    id: 'room-105',
    number: '105',
    floor: 1,
    type: 'Deluxe',
    maxOccupancy: 3,
    baseRate: 4500,
    status: 'Inspected',
  },

  // Floor 2 (Rooms 201 - 205)
  {
    id: 'room-201',
    number: '201',
    floor: 2,
    type: 'Deluxe',
    maxOccupancy: 3,
    baseRate: 4500,
    status: 'Available',
  },
  {
    id: 'room-202',
    number: '202',
    floor: 2,
    type: 'Deluxe',
    maxOccupancy: 3,
    baseRate: 4500,
    status: 'Occupied',
  },
  {
    id: 'room-203',
    number: '203',
    floor: 2,
    type: 'Superior',
    maxOccupancy: 3,
    baseRate: 5500,
    status: 'Inspected',
  },
  {
    id: 'room-204',
    number: '204',
    floor: 2,
    type: 'Superior',
    maxOccupancy: 3,
    baseRate: 5500,
    status: 'Occupied',
  },
  {
    id: 'room-205',
    number: '205',
    floor: 2,
    type: 'Superior',
    maxOccupancy: 3,
    baseRate: 5500,
    status: 'Out-of-Order',
    outOfOrderReason: 'HVAC repair & ceiling repaint',
  },

  // Floor 3 (Rooms 301 - 305)
  {
    id: 'room-301',
    number: '301',
    floor: 3,
    type: 'Executive',
    maxOccupancy: 4,
    baseRate: 6500,
    status: 'Occupied',
  },
  {
    id: 'room-302',
    number: '302',
    floor: 3,
    type: 'Executive',
    maxOccupancy: 4,
    baseRate: 6500,
    status: 'Available',
  },
  {
    id: 'room-303',
    number: '303',
    floor: 3,
    type: 'Family Suite',
    maxOccupancy: 5,
    baseRate: 8000,
    status: 'Occupied',
  },
  {
    id: 'room-304',
    number: '304',
    floor: 3,
    type: 'Family Suite',
    maxOccupancy: 5,
    baseRate: 8000,
    status: 'Available',
  },
  {
    id: 'room-305',
    number: '305',
    floor: 3,
    type: 'Panorama Suite',
    maxOccupancy: 4,
    baseRate: 12000,
    status: 'Occupied',
  },
];

/** Utility to add days to ISO date string (YYYY-MM-DD) */
export function addDaysToIso(isoDate: string, days: number): string {
  const parts = isoDate.split('-').map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Compute nights between two ISO dates */
export function countNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(`${checkIn}T00:00:00Z`).getTime();
  const d2 = new Date(`${checkOut}T00:00:00Z`).getTime();
  const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  return Math.max(1, isNaN(diff) ? 1 : diff);
}

/** Formats an ISO string to short day format e.g. "Mon, Oct 17" */
export function formatCalendarDate(isoDate: string): {
  dayNum: string;
  weekday: string;
  month: string;
  year: string;
  isWeekend: boolean;
} {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const dayNum = String(date.getUTCDate()).padStart(2, '0');
  const dayOfWeek = date.getUTCDay();
  return {
    dayNum,
    weekday,
    month,
    year: String(y),
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
  };
}

/** Mapping to canonical 15 rooms for higher floor rooms */
const CANONICAL_ROOM_ROUTING: Record<string, string> = {
  '101': '101',
  '102': '102',
  '103': '103',
  '104': '104',
  '105': '105',
  '201': '201',
  '202': '202',
  '203': '203',
  '204': '204',
  '205': '205',
  '301': '301',
  '302': '302',
  '303': '303',
  '304': '304',
  '305': '305',
  // Distribute other rooms into 15 rooms
  '207': '101',
  '305-b': '305',
  '310': '104',
  '401': '201',
  '402': '203',
  '403': '204',
  '405': '102',
  '501': '301',
  '502': '302',
  '503': '103',
  '505': '304',
  '601': '303',
  '602': '105',
  '603': '304',
  '701': '305',
  '702': '305',
};

/** Map store reservation rows into CalendarReservation objects */
export function loadSyncedReservations(): CalendarReservation[] {
  const result = store.listReservations('', undefined, 1, 200);
  const roomsMap = new Map(MOCK_ROOMS.map((r) => [r.number, r]));

  // Curated clean allocation mapping for the 15 rooms
  const resCodeToRoom: Record<string, { room: string; checkIn: string; checkOut: string }> = {
    'RSV-9008': { room: '103', checkIn: '2026-10-16', checkOut: '2026-10-17' },
    'RSV-9014': { room: '102', checkIn: '2026-10-15', checkOut: '2026-10-18' },
    'RSV-9022': { room: '104', checkIn: '2026-10-17', checkOut: '2026-10-19' },
    'RSV-9009': { room: '101', checkIn: '2026-10-18', checkOut: '2026-10-21' },
    'RSV-9023': { room: '105', checkIn: '2026-10-19', checkOut: '2026-10-22' },
    'RSV-9018': { room: '201', checkIn: '2026-10-17', checkOut: '2026-10-19' },
    'RSV-9027': { room: '201', checkIn: '2026-10-20', checkOut: '2026-10-23' },
    'RSV-9015': { room: '202', checkIn: '2026-10-17', checkOut: '2026-10-19' },
    'RSV-9028': { room: '202', checkIn: '2026-10-19', checkOut: '2026-10-22' },
    'RSV-9003': { room: '203', checkIn: '2026-10-14', checkOut: '2026-10-18' },
    'RSV-9001': { room: '204', checkIn: '2026-10-15', checkOut: '2026-10-18' },
    'RSV-9024': { room: '204', checkIn: '2026-10-19', checkOut: '2026-10-22' },
    'RSV-9017': { room: '301', checkIn: '2026-10-17', checkOut: '2026-10-20' },
    'RSV-9004': { room: '302', checkIn: '2026-10-17', checkOut: '2026-10-20' },
    'RSV-9007': { room: '303', checkIn: '2026-10-16', checkOut: '2026-10-19' },
    'RSV-9025': { room: '304', checkIn: '2026-10-20', checkOut: '2026-10-23' },
    'RSV-9002': { room: '305', checkIn: '2026-10-16', checkOut: '2026-10-19' },
    'RSV-9026': { room: '305', checkIn: '2026-10-20', checkOut: '2026-10-23' },
  };

  return result.data
    .filter((r) => r.status !== 'CANCELLED')
    .map((r) => {
      const guestId = r.primaryGuestId || r.guest?.id;
      const guest = GUESTS.find((g) => g.id === guestId);
      const guestName =
        r.guestName ||
        r.guest?.name ||
        (r.guest?.firstName ? `${r.guest.firstName} ${r.guest.lastName ?? ''}`.trim() : null) ||
        (guest ? `${guest.firstName} ${guest.lastName}` : 'Guest');
      const guestEmail = guest?.email || 'guest@example.com';
      const guestPhone = guest?.phone || '+91 98765 43210';

      const curated = resCodeToRoom[r.bookingCode || r.id];

      // Prefer live store room if it's one of the 15 rooms, otherwise use curated/routed room
      let rawRoom = r.roomNumber || (r.roomLines && r.roomLines[0]?.roomNumber);
      if (!rawRoom || !roomsMap.has(rawRoom)) {
        rawRoom = curated?.room || CANONICAL_ROOM_ROUTING[rawRoom || ''] || '101';
      }

      const matchedRoom = roomsMap.get(rawRoom) || MOCK_ROOMS[0];
      const roomNumber = matchedRoom.number;
      const roomId = matchedRoom.id;
      const roomType = matchedRoom.type;

      // Dates
      const checkInDate = curated?.checkIn || String(r.checkInDate).slice(0, 10);
      const checkOutDate = curated?.checkOut || String(r.checkOutDate).slice(0, 10);
      const nights = countNights(checkInDate, checkOutDate);

      const statusMap: Record<string, ReservationStatus> = {
        CONFIRMED: 'Confirmed',
        CHECKED_IN: 'Checked-in',
        CHECKED_OUT: 'Checked-out',
        CANCELLED: 'Cancelled',
        NO_SHOW: 'No-show',
        PENDING: 'Pending',
        DRAFT: 'Tentative',
      };
      const status: ReservationStatus = statusMap[r.status] || 'Confirmed';

      const nightlyRate = matchedRoom.baseRate;
      const totalAmount = nights * nightlyRate;

      return {
        id: r.id,
        backendId: r.id,
        guestName,
        guestEmail,
        guestPhone,
        roomId,
        roomNumber,
        roomType,
        checkInDate,
        checkOutDate,
        nights,
        status,
        bookingSource:
          r.source === 'OTA'
            ? 'Booking.com'
            : r.source === 'CORPORATE'
            ? 'Corporate'
            : 'Direct',
        nightlyRate,
        totalAmount,
        paymentStatus:
          r.paid && Number(r.paid) >= totalAmount
            ? 'Paid'
            : Number(r.paid) > 0
            ? 'Partial'
            : 'Pending',
        adults: Number(r.adults ?? 1),
        children: Number(r.children ?? 0),
        specialRequests: r.specialRequests || '',
        notes: r.internalNotes || '',
      };
    });
}
