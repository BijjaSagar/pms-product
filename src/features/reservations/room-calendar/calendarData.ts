import type { CalendarReservation, CalendarRoom, RoomOperationalStatus, RoomType, ReservationStatus } from './types';
import { BUSINESS_DATE, GUESTS } from '../../../data/catalog';
import { store } from '../../../data/store';

export { BUSINESS_DATE };

/* Room types and their display settings. Names must match the store's room type names. */
export const ROOM_TYPE_CONFIG: Record<
  RoomType,
  { baseRate: number; maxOccupancy: number; color: string; badgeBg: string }
> = {
  Standard: {
    baseRate: 3500,
    maxOccupancy: 2,
    color: 'var(--color-info-text)',
    badgeBg: 'bg-info-bg text-info-text border-info-border',
  },
  Deluxe: {
    baseRate: 4500,
    maxOccupancy: 3,
    color: 'var(--color-primary)',
    badgeBg: 'bg-primary/10 text-primary border-primary/30',
  },
  Superior: {
    baseRate: 5500,
    maxOccupancy: 3,
    color: 'var(--color-success-text)',
    badgeBg: 'bg-success-bg text-success-text border-success-border',
  },
  Executive: {
    baseRate: 6500,
    maxOccupancy: 4,
    color: 'var(--color-warning-text)',
    badgeBg: 'bg-warning-bg text-warning-text border-warning-border',
  },
  'Family Suite': {
    baseRate: 8000,
    maxOccupancy: 5,
    color: 'var(--color-dark-accent)',
    badgeBg: 'bg-muted-surface text-dark-accent border-soft',
  },
  'Panorama Suite': {
    baseRate: 12000,
    maxOccupancy: 4,
    color: 'var(--color-danger-text)',
    badgeBg: 'bg-danger-bg text-danger-text border-danger-border',
  },
};

/* Calendar date helpers */

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

/* ----------------------------------------------------------------- rooms */

const STORE_STATUS_TO_CALENDAR: Record<string, RoomOperationalStatus> = {
  VACANT_CLEAN: 'Clean',
  INSPECTED: 'Inspected',
  VACANT_DIRTY: 'Dirty',
  OCCUPIED_CLEAN: 'Occupied',
  OCCUPIED_DIRTY: 'Occupied',
  OUT_OF_ORDER: 'Out-of-Order',
};

/** Every room the calendar shows, read from the store (the single source of truth). */
export function loadCalendarRooms(): CalendarRoom[] {
  return store
    .rooms()
    .map((room) => {
      const type = room.roomTypeName as RoomType;
      const config = ROOM_TYPE_CONFIG[type];
      return {
        id: room.id,
        number: room.roomNumber,
        floor: Number(room.floor),
        type,
        maxOccupancy: config?.maxOccupancy ?? 2,
        baseRate: Number(room.baseRate),
        status: STORE_STATUS_TO_CALENDAR[room.status] ?? 'Available',
        outOfOrderReason: room.outOfOrderReason ?? undefined,
      } satisfies CalendarRoom;
    })
    .sort((a, b) => a.number.localeCompare(b.number));
}

/* ---------------------------------------------------------- reservations */

const STATUS_MAP: Record<string, ReservationStatus> = {
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked-in',
  CHECKED_OUT: 'Checked-out',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
  PENDING: 'Pending',
  DRAFT: 'Tentative',
};

/**
 * Store reservations placed on the calendar at the rooms and dates the store holds.
 * A room line without a room, or a room the calendar does not show, is left off the rack.
 */
export function loadSyncedReservations(): CalendarReservation[] {
  const rooms = loadCalendarRooms();
  const roomsByNumber = new Map(rooms.map((room) => [room.number, room]));
  const result = store.listReservations('', undefined, 1, 200);

  return result.data
    .filter((r) => r.status !== 'CANCELLED')
    .flatMap((r) => {
      const guestName =
        r.guestName ||
        r.guest?.name ||
        (r.guest?.firstName ? `${r.guest.firstName} ${r.guest.lastName ?? ''}`.trim() : null) ||
        'Guest';
      const guest = GUESTS.find((g) => g.id === (r.primaryGuestId || r.guest?.id));
      const checkInDate = String(r.checkInDate).slice(0, 10);
      const checkOutDate = String(r.checkOutDate).slice(0, 10);
      const nights = countNights(checkInDate, checkOutDate);
      const status: ReservationStatus = STATUS_MAP[r.status] || 'Confirmed';
      const lines = r.roomLines?.length
        ? r.roomLines.map((line) => ({
            id: line.id,
            roomNumber: line.roomNumber ?? null,
            nightlyRate: Number(line.nightlyRate),
            adults: Number(line.adults ?? 1),
            children: Number(line.children ?? 0),
          }))
        : [{
            id: `legacy-${r.id}`,
            roomNumber: r.roomNumber ?? null,
            nightlyRate: Number(r.nightlyRate ?? 0),
            adults: Number(r.adults ?? 1),
            children: Number(r.children ?? 0),
          }];
      const isGroup = lines.length > 1;

      return lines.flatMap((line) => {
        const room = line.roomNumber ? roomsByNumber.get(line.roomNumber) : undefined;
        if (!room) return [];
        const nightlyRate = line.nightlyRate || room.baseRate;
        const totalAmount = nights * nightlyRate;
        return [{
          id: isGroup ? `${r.id}::${line.id}` : r.id,
          backendId: r.id,
          roomLineId: line.id.startsWith('legacy-') ? undefined : line.id,
          guestName,
          guestEmail: guest?.email ?? '',
          guestPhone: guest?.phone ?? '',
          roomId: room.id,
          roomNumber: room.number,
          roomType: room.type,
          checkInDate,
          checkOutDate,
          nights,
          status,
          bookingSource:
            r.source === 'OTA' ? 'Booking.com' : r.source === 'CORPORATE' ? 'Corporate' : 'Direct',
          nightlyRate,
          totalAmount,
          paymentStatus:
            r.paid && Number(r.paid) >= totalAmount ? 'Paid' : Number(r.paid) > 0 ? 'Partial' : 'Pending',
          adults: line.adults,
          children: line.children,
          specialRequests: r.specialRequests || '',
          notes: r.internalNotes || '',
        }];
      });
    });
}
