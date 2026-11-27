import { store } from '../mocks/store';
import { request } from './http';
import { requireActivePropertyId, settingsFor } from './propertyAccess';
import { isServerProperty } from './serverProperty';
import { recordActivity } from './session';
import type { PageResult } from '../types/index';

export interface ReservationRoomRow {
  id: string; roomTypeId: string; roomId?: string | null; roomNumber?: string | null;
  roomTypeName?: string | null;
  /** What the data layer calls the room offering; the adapter copies them to roomTypeId / roomTypeName. */
  roomListingId?: string; roomListingName?: string | null; nightlyRate: string; ratePlanName?: string | null;
  baseRate?: string; subtotal?: string; taxAmount?: string;
  adults?: number; children?: number; infants?: number; mealPlanName?: string | null; billingRoute?: string | null;
  occupants?: Array<{ id: string; name: string; role: string }>;
}
export interface ReservationChargeRow {
  id: string; outletId: string; outletName: string; description: string; quantity: string;
  unitAmount: string; taxAmount: string; totalAmount: string; billingRoute: string;
  roomLineId?: string | null; roomNumber?: string | null; postToFolio: boolean;
}
export interface ReservationBillingPreferencesRow {
  roomBillTo: string; extrasBillTo: string; billToCompany: boolean; noPost: boolean;
  companyName?: string | null; companyGst?: string | null; payAtHotel?: boolean;
}
export interface ReservationPendingPaymentRow {
  amount: string; method: string; reference?: string | null; recordedAt?: string;
}
export interface ReservationRow {
  id: string; bookingCode: string; externalReferenceId?: string | null; status: string; source?: string; checkInDate: string; checkOutDate: string;
  nights?: number; adults: number; children: number; infants?: number; currencyCode?: string; totalAmount?: string; primaryGuestId?: string;
  nightlyRate?: string; internalNotes?: string | null;
  subtotal?: string; taxTotal?: string; specialRequests?: string | null; guest?: { id: string; name?: string; firstName?: string; lastName?: string } | null;
  guestName?: string | null; roomNumber?: string | null; roomSummary?: string | null; roomTypeName?: string | null; roomTypeId?: string;
  roomLines?: ReservationRoomRow[]; pendingCharges?: ReservationChargeRow[]; pendingPayments?: ReservationPendingPaymentRow[]; billingPreferences?: ReservationBillingPreferencesRow;
  discountAmount?: string; paid?: number; paidAmount?: string;
  sourceType?: string | null; sourceContactNumber?: string | null; bookingCategory?: string | null;
  checkInTime?: string | null; checkOutTime?: string | null;
  version?: number; createdAt?: string; cancellationPenaltyAmount?: string | null;
}
/** The settings a booking depends on. */
export interface ReservationOptions {
  numbering: { reservationPrefix: string | null };
  bookingRules: { allowZeroRateBookings: boolean; daysBetweenCheckInCheckOut: number; moveCheckInCheckOutBooking: boolean };
  mealPlans: Array<{ displayOrder: number; code: string; displayName: string; shortDisplayName: string }>;
  cancellationRules: Array<{ id: string; startDate: string; endDate: string; daysFromCheckin: number; penaltyPercent: string }>;
  terms: { inclusions: string | null; bookingTerms: string | null; checkInTerms: string | null };
}
/** Narrow a reservation list to stays arriving or leaving in a date range (YYYY-MM-DD, both ends included). */
export interface ReservationDateFilters { checkInFrom?: string; checkInTo?: string; checkOutFrom?: string; checkOutTo?: string }

/** The details of a reservation a screen may change after booking, apart from its dates. */
const DETAIL_FIELDS = [
  'externalReferenceId', 'source', 'sourceType', 'sourceContactNumber', 'bookingCategory', 'checkInTime',
  'checkOutTime', 'specialRequests', 'internalNotes', 'billingPreferences',
] as const;

/** A booking as the reservations table returns it. */
interface ServerReservation {
  id: string; bookingCode: string; guestId: string; guestName: string; reservationType: string; bookingSource: string;
  bookingMode: string | null; status: string; referenceId: string | null; sourceContactNumber: string | null;
  checkIn: string; checkOut: string; checkInTime: string | null; checkOutTime: string | null;
  adults: number; children: number; infants: number; roomTotal: string; extrasTotal: string; discountAmount: string;
  totalAmount: string; roomBillTo: string; extrasBillTo: string; billToCompany: boolean; noPost: boolean;
  companyName: string | null; companyGst: string | null; specialRequests: string | null; internalNotes: string | null;
  advancePayments: Array<{ amount: number; method: string; reference: string | null }>; createdAt: string;
  rooms: Array<{
    id: string; roomCategoryId: string | null; roomCategory: string | null; roomNumber: string | null; adults: number;
    children: number; infants: number; nightlyRate: string; ratePlan: string | null; mealPlan: string | null;
    billingRoute: string; occupants: Array<{ name: string; role: string }>;
  }>;
}

const nightsOf = (checkIn: string, checkOut: string) =>
  Math.max(1, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000));

/** The booking as the screens read it. Tax is not stored on the server, so the totals carry none. */
function fromServerReservation(row: ServerReservation): ReservationRow {
  const [firstName, ...rest] = row.guestName.split(/\s+/);
  const lines = row.rooms.map((room): ReservationRoomRow => ({
    id: `rl-${row.id}-${room.id}`,
    roomTypeId: room.roomCategoryId ?? '',
    roomId: room.roomNumber ? `room-${room.roomNumber}` : null,
    roomNumber: room.roomNumber,
    roomTypeName: room.roomCategory,
    baseRate: room.nightlyRate,
    nightlyRate: room.nightlyRate,
    ratePlanName: room.ratePlan,
    adults: room.adults,
    children: room.children,
    infants: room.infants,
    mealPlanName: room.mealPlan,
    billingRoute: room.billingRoute,
    occupants: room.occupants.map((occupant, index) => ({ id: `${room.id}-${index}`, ...occupant })),
  }));
  const assigned = lines.filter((line) => line.roomNumber);
  return {
    id: row.id,
    bookingCode: row.bookingCode,
    externalReferenceId: row.referenceId,
    status: row.status,
    source: row.bookingSource,
    checkInDate: row.checkIn,
    checkOutDate: row.checkOut,
    nights: nightsOf(row.checkIn, row.checkOut),
    adults: row.adults,
    children: row.children,
    infants: row.infants,
    version: 0,
    createdAt: row.createdAt,
    sourceType: row.bookingMode,
    sourceContactNumber: row.sourceContactNumber,
    bookingCategory: row.reservationType,
    checkInTime: row.checkInTime,
    checkOutTime: row.checkOutTime,
    totalAmount: row.totalAmount,
    subtotal: row.totalAmount,
    taxTotal: '0.00',
    primaryGuestId: row.guestId,
    nightlyRate: lines[0]?.nightlyRate,
    internalNotes: row.internalNotes,
    specialRequests: row.specialRequests,
    guest: { id: row.guestId, name: row.guestName, firstName: firstName ?? row.guestName, lastName: rest.join(' ') },
    guestName: row.guestName,
    roomNumber: assigned[0]?.roomNumber ?? null,
    roomSummary: lines.map((line) => `${line.roomTypeName ?? 'Room'}${line.roomNumber ? ` · ${line.roomNumber}` : ' · Unassigned'}`).join(' + '),
    roomTypeId: lines[0]?.roomTypeId,
    roomTypeName: Array.from(new Set(lines.map((line) => line.roomTypeName ?? 'Room'))).join(' + '),
    roomLines: lines,
    pendingCharges: [],
    pendingPayments: row.advancePayments.map((payment) => ({ amount: Number(payment.amount).toFixed(2), method: payment.method, reference: payment.reference })),
    billingPreferences: {
      roomBillTo: row.roomBillTo, extrasBillTo: row.extrasBillTo, billToCompany: row.billToCompany, noPost: row.noPost,
      companyName: row.companyName, companyGst: row.companyGst,
    },
    discountAmount: row.discountAmount,
    paid: row.advancePayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
  };
}

/** The form's detail fields, named as the reservations table names them. */
const SERVER_DETAIL_FIELDS: Record<string, string> = {
  checkInDate: 'checkIn', checkOutDate: 'checkOut', source: 'bookingSource', sourceType: 'bookingMode',
  sourceContactNumber: 'sourceContactNumber', externalReferenceId: 'referenceId', bookingCategory: 'reservationType',
  checkInTime: 'checkInTime', checkOutTime: 'checkOutTime', specialRequests: 'specialRequests',
  internalNotes: 'internalNotes', billingPreferences: 'billing',
};

const reservationPath = (propertyId: string, id: string) => `/properties/${propertyId}/reservations/${id}`;

/** Saves a change to a server property's booking in the reservations table; the store's copy follows. */
async function saveOnServer(id: string, changes: Record<string, unknown>): Promise<void> {
  const propertyId = requireActivePropertyId();
  if (!isServerProperty(propertyId) || Object.keys(changes).length === 0) return;
  await request<ServerReservation>(reservationPath(propertyId, id), changes, 'PATCH');
}

/** Brings the property's bookings from the reservations table into this session's store, once per call. */
export async function syncReservations(propertyId: string, filters: ReservationDateFilters): Promise<void> {
  if (!isServerProperty(propertyId)) return;
  const query = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const rows = await request<ServerReservation[]>(`/properties/${propertyId}/reservations?${query}`);
  store.hydrateReservations(rows.map(fromServerReservation));
}

/**
 * The booking form's fields, named as the reservations and reservation_rooms tables name them. The form
 * sends the same body to both the table and the in-memory store, so this only renames and converts.
 */
function toServerReservation(body: Record<string, unknown>, idempotencyKey?: string) {
  const lines = (Array.isArray(body.roomLines) ? body.roomLines : []) as Array<Record<string, unknown>>;
  const charges = (Array.isArray(body.pendingCharges) ? body.pendingCharges : []) as Array<Record<string, unknown>>;
  const preferences = (body.billingPreferences ?? {}) as Record<string, unknown>;
  return {
    guestId: body.primaryGuestId,
    reservationType: body.bookingCategory,
    bookingSource: body.source,
    bookingMode: body.sourceType,
    bookingType: body.bookingType,
    referenceId: body.externalReferenceId,
    sourceContactNumber: body.sourceContactNumber,
    checkIn: body.checkInDate,
    checkOut: body.checkOutDate,
    checkInTime: body.checkInTime,
    checkOutTime: body.checkOutTime,
    samePlan: body.samePlan,
    ratePlan: body.ratePlan,
    mealPlan: body.mealPlan,
    rooms: lines.map((line) => ({
      roomCategoryId: line.roomTypeId || null,
      roomNumber: line.roomNumber || null,
      adults: line.adults,
      children: line.children,
      infants: line.infants,
      nightlyRate: Number(line.nightlyRate),
      ratePlan: line.ratePlanName,
      mealPlan: line.mealPlanName,
      billingRoute: line.billingRoute,
      occupants: line.occupants,
    })),
    discountAmount: Number(body.discountAmount ?? 0),
    billing: preferences,
    specialRequests: body.specialRequests,
    paymentNotes: body.paymentNotes,
    internalNotes: body.internalNotes,
    extras: charges.map((charge) => ({
      outletId: charge.outletId,
      outletName: charge.outletName,
      description: charge.description,
      quantity: Number(charge.quantity),
      unitAmount: Number(charge.unitAmount),
      billingRoute: charge.billingRoute,
      roomIndex: Math.max(1, lines.findIndex((line) => line.id === charge.roomLineId) + 1),
    })),
    advancePayments: body.pendingPayments,
    tasks: body.tasks,
    idempotencyKey,
  };
}

/** Bookings already made for an idempotency key, so a retry does not book twice. */
const booked = new Map<string, string>();

const within = (date: string, from?: string, to?: string) => (!from || date >= from) && (!to || date <= to);

function requireReservation(id: string): ReservationRow {
  const reservation = store.getReservation(id);
  if (!reservation) throw new Error('This reservation no longer exists.');
  return reservation;
}

/** Records the change and returns the reservation as it now stands. */
function saved(id: string, verb: string, summary: string): ReservationRow {
  store.touchReservation(id);
  recordActivity('reservations', verb, summary, { propertyId: requireActivePropertyId(), resourceId: id });
  return requireReservation(id);
}

/**
 * A reservation that may be changed: refused when it has moved on since the screen read it (`version`),
 * or when its status is not one the action accepts.
 */
export function editableReservation(id: string, version: number | undefined, from?: string[]): ReservationRow {
  const reservation = requireReservation(id);
  if (version !== undefined && reservation.version !== version) {
    throw new Error('This reservation was changed in the meantime. Reload it and try again.');
  }
  if (from && !from.includes(reservation.status)) {
    throw new Error(`This is not possible for a ${reservation.status.toLowerCase().replace('_', '-')} reservation.`);
  }
  return reservation;
}

/** Reservations of the active property. */
export const reservationApi = {
  list: async (search = '', status?: string, page = 1, pageSize = 100, filters: ReservationDateFilters = {}): Promise<PageResult<ReservationRow> & { total: number }> => {
    await syncReservations(requireActivePropertyId(), filters);
    const needle = search.trim().toLowerCase();
    const rows = store.reservations().filter(
      (r) =>
        (!status || r.status === status) &&
        (!needle || [r.bookingCode, r.guestName, r.roomNumber].some((v) => v?.toLowerCase().includes(needle))) &&
        within(r.checkInDate, filters.checkInFrom, filters.checkInTo) &&
        within(r.checkOutDate, filters.checkOutFrom, filters.checkOutTo),
    );
    return { data: rows.slice((page - 1) * pageSize, page * pageSize), page, pageSize, hasMore: page * pageSize < rows.length, total: rows.length };
  },
  get: async (id: string) => requireReservation(id),
  options: async (): Promise<ReservationOptions> => {
    const settings = structuredClone(settingsFor(requireActivePropertyId()));
    const { reservationSettings: rules, terms } = settings;
    return {
      numbering: { reservationPrefix: rules.reservationPrefix },
      bookingRules: {
        allowZeroRateBookings: rules.allowZeroRateBookings,
        daysBetweenCheckInCheckOut: rules.daysBetweenCheckInCheckOut,
        moveCheckInCheckOutBooking: rules.moveCheckInCheckOutBooking,
      },
      mealPlans: settings.mealPlans,
      cancellationRules: settings.cancellationRules,
      terms: { inclusions: terms.inclusions, bookingTerms: terms.bookingTerms, checkInTerms: terms.checkInTerms },
    };
  },
  /** Books the reservation. Give the same `idempotencyKey` on a retry and it is booked only once. */
  create: async (body: Record<string, unknown>, idempotencyKey?: string) => {
    requireActivePropertyId();
    const earlier = idempotencyKey ? booked.get(idempotencyKey) : undefined;
    if (earlier) return requireReservation(earlier);
    // A server property's booking goes into the reservations table first; the store keeps a copy under the same id
    // and booking code, so the other screens show it. A room taken in the meantime is refused here.
    const propertyId = requireActivePropertyId();
    const server = isServerProperty(propertyId)
      ? await request<ServerReservation>(`/properties/${propertyId}/reservations`, toServerReservation(body, idempotencyKey))
      : null;
    const { id } = store.createReservation(server ? { ...body, id: server.id, bookingCode: server.bookingCode } : body);
    if (idempotencyKey) booked.set(idempotencyKey, id);
    return saved(id, 'create', 'Created a reservation');
  },
  /**
   * New dates re-check the rooms; the other details are edited in place.
   * Give the reservation's `version` so a change made in the meantime is refused, not overwritten.
   */
  update: async (id: string, patch: Record<string, unknown>) => {
    editableReservation(id, typeof patch.version === 'number' ? patch.version : undefined);
    // A server property's booking is saved in the reservations table first, so a room taken in the meantime is refused here.
    await saveOnServer(id, Object.fromEntries(Object.entries(SERVER_DETAIL_FIELDS).filter(([key]) => patch[key] !== undefined).map(([key, name]) => [name, patch[key]])));
    if (typeof patch.checkInDate === 'string' && typeof patch.checkOutDate === 'string') {
      store.changeStay(id, patch.checkInDate, patch.checkOutDate);
    }
    const details = Object.fromEntries(DETAIL_FIELDS.filter((key) => patch[key] !== undefined).map((key) => [key, patch[key]]));
    store.updateReservationDetails(id, details);
    return saved(id, 'update', 'Updated a reservation');
  },
  /** Moves one room line to another physical room, named by its room number. */
  assignRoom: async (id: string, roomNumber: string, roomLineId: string, version?: number) => {
    editableReservation(id, version, ['DRAFT', 'CONFIRMED', 'CHECKED_IN']);
    const propertyId = requireActivePropertyId();
    if (isServerProperty(propertyId)) {
      // The room lines were copied from the table as `rl-<booking id>-<line id>`.
      const lineId = roomLineId.startsWith(`rl-${id}-`) ? roomLineId.slice(`rl-${id}-`.length) : roomLineId;
      await request<ServerReservation>(`${reservationPath(propertyId, id)}/rooms/${lineId}`, { roomNumber }, 'PUT');
    }
    store.moveRoom(id, roomNumber, roomLineId);
    return saved(id, 'update', `Moved a reservation to room ${roomNumber}`);
  },
  cancel: async (id: string, reason: string, version?: number) => {
    editableReservation(id, version, ['DRAFT', 'CONFIRMED']);
    await saveOnServer(id, { status: 'CANCELLED', internalNotes: reason });
    store.cancelReservation(id, reason);
    return saved(id, 'cancel', 'Cancelled a reservation');
  },
  confirm: async (id: string, version?: number) => {
    editableReservation(id, version, ['DRAFT']);
    await saveOnServer(id, { status: 'CONFIRMED' });
    store.setReservationStatus(id, 'CONFIRMED');
    return saved(id, 'update', 'Confirmed a reservation');
  },
  noShow: async (id: string, version?: number) => {
    editableReservation(id, version, ['CONFIRMED']);
    await saveOnServer(id, { status: 'NO_SHOW' });
    store.setReservationStatus(id, 'NO_SHOW');
    return saved(id, 'update', 'Marked a reservation as a no-show');
  },
  addPayment: async (id: string, payment: { amount: string; method: string; reference?: string }, version?: number) => {
    editableReservation(id, version);
    if (!(Number(payment.amount) > 0)) throw new Error('Enter an amount above zero.');
    store.addReservationPayment(id, payment);
    return saved(id, 'update', 'Recorded a reservation payment');
  },
};
