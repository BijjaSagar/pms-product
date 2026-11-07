import type { CalendarReservation, CalendarRoom, RoomOperationalStatus, ReservationStatus } from './types';
import { store, UNASSIGNED_TYPE_NAME } from '../../../data/store';
import { reservationApi } from '../../../lib/api/pms';

/** Today's date (YYYY-MM-DD) in the user's local time zone. Call it when rendering, so it stays right past midnight. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/* Display colours for room types. Types are configured per property, so a type's colours come from its name. */
const TYPE_STYLES = [
  { color: 'var(--color-info-text)', badgeBg: 'bg-info-bg text-info-text border-info-border' },
  { color: 'var(--color-primary)', badgeBg: 'bg-primary/10 text-primary border-primary/30' },
  { color: 'var(--color-success-text)', badgeBg: 'bg-success-bg text-success-text border-success-border' },
  { color: 'var(--color-warning-text)', badgeBg: 'bg-warning-bg text-warning-text border-warning-border' },
  { color: 'var(--color-dark-accent)', badgeBg: 'bg-muted-surface text-dark-accent border-soft' },
  { color: 'var(--color-danger-text)', badgeBg: 'bg-danger-bg text-danger-text border-danger-border' },
] as const;

const UNASSIGNED_STYLE = {
  color: 'var(--color-ink-muted)',
  badgeBg: 'bg-muted-surface text-ink-secondary border-soft',
} as const;

/** Colours for a room type; the same name always gets the same colour. */
export function roomTypeStyle(typeName: string): { color: string; badgeBg: string } {
  if (typeName === UNASSIGNED_TYPE_NAME) return UNASSIGNED_STYLE;
  let hash = 0;
  for (const char of typeName) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return TYPE_STYLES[hash % TYPE_STYLES.length];
}

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

/** Signed whole days from `from` to `to`. Unlike countNights this is not clamped, so a same-day offset is 0. */
export function daysBetween(from: string, to: string): number {
  const ms = new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
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
    .map(
      (room) =>
        ({
          id: room.id,
          number: room.roomNumber,
          floor: Number(room.floor),
          type: room.roomTypeName ?? UNASSIGNED_TYPE_NAME,
          maxOccupancy: room.maxOccupancy ?? 0,
          baseRate: Number(room.baseRate),
          status: STORE_STATUS_TO_CALENDAR[room.status] ?? 'Available',
          outOfOrderReason: room.outOfOrderReason ?? undefined,
          bookable: room.isActive,
        }) satisfies CalendarRoom,
    )
    .sort((a, b) => a.number.localeCompare(b.number));
}

/* ---------------------------------------------------------- reservations */

const STATUS_MAP: Record<string, ReservationStatus> = {
  CONFIRMED: 'Confirmed',
  GUARANTEED: 'Confirmed',
  TENTATIVE: 'Tentative',
  WAITLIST: 'Tentative',
  CHECKED_IN: 'Checked-in',
  CHECKED_OUT: 'Checked-out',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
};

/**
 * Backend reservations overlapping [from, to), placed on the calendar at their room numbers.
 * A room line without a room number, or a room the calendar does not show, is left off the rack.
 */
export async function loadSyncedReservations(from: string, to: string): Promise<CalendarReservation[]> {
  const rooms = loadCalendarRooms();
  const roomsByNumber = new Map(rooms.map((room) => [room.number, room]));
  const rows = await reservationApi.listRange(from, to);

  return rows
    .filter((r) => r.status !== 'CANCELLED' && r.status !== 'WAITLIST')
    .flatMap((r) => {
      const checkInDate = String(r.checkInDate).slice(0, 10);
      const checkOutDate = String(r.checkOutDate).slice(0, 10);
      const nights = countNights(checkInDate, checkOutDate);
      const status: ReservationStatus = STATUS_MAP[r.status] || 'Confirmed';
      const lines = r.roomLines ?? [];
      const isGroup = lines.length > 1;
      const stayTotal = Number(r.totalAmount ?? 0);
      const paid = Number(r.paid ?? 0);
      const guest = r.guest as { email?: string | null; phone?: string | null } | null | undefined;

      return lines.flatMap((line) => {
        const room = line.roomNumber ? roomsByNumber.get(line.roomNumber) : undefined;
        if (!room) return [];
        const totalAmount = stayTotal / Math.max(1, lines.length);
        return [{
          id: isGroup ? `${r.id}::${line.id}` : r.id,
          backendId: r.id,
          roomLineId: line.id,
          guestName: r.guestName || 'Guest',
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
          nightlyRate: nights > 0 ? totalAmount / nights : room.baseRate,
          totalAmount,
          paymentStatus: paid >= stayTotal && stayTotal > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending',
          adults: Number(r.adults ?? 1),
          children: Number(r.children ?? 0),
          specialRequests: r.specialRequests || '',
          notes: r.internalNotes || '',
        }];
      });
    });
}
