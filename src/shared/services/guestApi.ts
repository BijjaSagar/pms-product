import { store } from '../mocks/store';
import { request } from './http';
import { isServerProperty } from './serverProperty';
import { requireActivePropertyId, requireProperty } from './propertyAccess';
import { recordActivity } from './session';
import type { PageResult } from '../types/index';

export interface GuestRow {
  id: string; firstName: string; lastName: string; email: string | null; phone: string | null;
  companyName?: string | null; city?: string | null; countryCode?: string | null; masked?: boolean;
  nationality?: string | null; dateOfBirth?: string | null; gender?: string | null; address?: string | null;
  state?: string | null; country?: string | null;
  preferences?: string | null; internalNotes?: string | null; stayCount?: number; lastStayAt?: string | null;
}
/** A guest of the property as the data layer returns it, with the statistics the directory shows. */
export interface GuestDirectoryRow {
  id: string; firstName: string; lastName: string; name: string; email: string | null; phone: string | null;
  companyName: string | null; preferences: string | null; internalNotes: string | null;
  /** Reservations that are checked in or checked out. */
  stayCount: number;
  /** Reservations that still stand, whatever their stage. */
  bookingCount: number;
  /** Check-in date of the latest stay, "YYYY-MM-DD". */
  lastStayAt: string | null;
  lifetimeSpend: string; outstandingBalance: string;
  tier: 'VIP' | 'Gold' | 'Regular' | 'New';
  createdAt: string;
}
export interface GuestDirectoryPage { data: GuestDirectoryRow[]; total: number; page: number; pageSize: number }
export interface GuestDirectorySummary { total: number; byTier: Record<GuestDirectoryRow['tier'], number> }
export interface GuestStayRow {
  id: string; bookingCode: string; status: string; checkInDate: string; checkOutDate: string; nights: number;
  rooms: string | null; currencyCode: string; totalAmount: string; paidAmount: string;
}
export interface GuestPaymentRow {
  reservationId: string; bookingCode: string; amount: string; currencyCode: string; method: string;
  reference: string | null; recordedAt: string;
}
export interface GuestDirectoryQuery {
  search?: string;
  tier?: GuestDirectoryRow['tier'];
  sort?: 'name' | 'stays' | 'spent' | 'recent';
  page?: number;
  pageSize?: number;
}

const GUEST_FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'companyName', 'nationality', 'dateOfBirth', 'gender',
  'address', 'city', 'state', 'country', 'preferences', 'internalNotes',
] as const;

/** Only the fields a guest record has. */
const pickGuestFields = (body: Record<string, unknown>) =>
  Object.fromEntries(GUEST_FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

const toGuestRow = (guest: GuestDirectoryRow): GuestRow => ({
  id: guest.id, firstName: guest.firstName, lastName: guest.lastName, email: guest.email, phone: guest.phone,
  companyName: guest.companyName, preferences: guest.preferences, internalNotes: guest.internalNotes,
  stayCount: guest.stayCount, lastStayAt: guest.lastStayAt,
});

const STAYED = ['CHECKED_IN', 'CHECKED_OUT'];

/** A guest as the guests table returns it. */
interface ServerGuest {
  id: string; name: string; email: string | null; phone: string | null; nationality: string | null; dob: string | null;
  gender: string | null; address: string | null; country: string | null; state: string | null; city: string | null;
  companyName: string | null; preferences: string | null; internalNotes: string | null;
}

const guestsPath = (propertyId: string) => `/properties/${propertyId}/guests`;

const fromServerGuest = (guest: ServerGuest): GuestRow => {
  const [firstName, ...rest] = guest.name.split(/\s+/);
  return {
    id: guest.id, firstName: firstName ?? guest.name, lastName: rest.join(' '), email: guest.email, phone: guest.phone,
    companyName: guest.companyName, city: guest.city, nationality: guest.nationality, dateOfBirth: guest.dob,
    gender: guest.gender, address: guest.address, state: guest.state, country: guest.country,
    preferences: guest.preferences, internalNotes: guest.internalNotes, stayCount: 0, lastStayAt: null,
  };
};

/** The fields of a new guest, named as the guests table names them. */
const toServerGuest = (body: Record<string, unknown>) => ({
  name: `${String(body.firstName ?? '')} ${String(body.lastName ?? '')}`.trim(),
  email: body.email ?? null, phone: body.phone ?? null, nationality: body.nationality ?? null,
  dob: body.dateOfBirth ?? null, gender: body.gender ?? null, address: body.address ?? null,
  country: body.country ?? null, state: body.state ?? null, city: body.city ?? null,
  companyName: body.companyName ?? null, preferences: body.preferences ?? null, internalNotes: body.internalNotes ?? null,
});

/** Brings the guests the guests table holds (newest first, matching `search`) into this session's store. */
async function syncGuests(propertyId: string, search?: string): Promise<void> {
  if (!isServerProperty(propertyId)) return;
  const query = new URLSearchParams({ limit: '200', ...(search?.trim() ? { search: search.trim() } : {}) });
  store.hydrateGuests((await request<ServerGuest[]>(`${guestsPath(propertyId)}?${query}`)).map(fromServerGuest));
}

/** The guest with the statistics the directory shows, worked out from their reservations. */
function toDirectoryRow(guest: GuestRow): GuestDirectoryRow {
  const bookings = store.guestReservations(guest.id).filter((r) => r.status !== 'CANCELLED' && r.status !== 'NO_SHOW');
  const stays = bookings.filter((r) => STAYED.includes(r.status));
  const spent = stays.reduce((sum, r) => sum + Number(r.paid ?? 0), 0);
  const outstanding = bookings.reduce((sum, r) => sum + Math.max(0, Number(r.totalAmount ?? 0) - Number(r.paid ?? 0)), 0);
  return {
    id: guest.id,
    firstName: guest.firstName,
    lastName: guest.lastName,
    name: `${guest.firstName} ${guest.lastName}`.trim(),
    email: guest.email,
    phone: guest.phone,
    companyName: guest.companyName ?? null,
    preferences: guest.preferences ?? null,
    internalNotes: guest.internalNotes ?? null,
    stayCount: stays.length,
    bookingCount: bookings.length,
    lastStayAt: stays.map((r) => r.checkInDate).sort().at(-1) ?? null,
    lifetimeSpend: spent.toFixed(2),
    outstandingBalance: outstanding.toFixed(2),
    tier: spent >= 30000 ? 'VIP' : spent >= 15000 ? 'Gold' : stays.length > 0 ? 'Regular' : 'New',
    createdAt: '2026-01-15T09:00:00.000Z',
  };
}

const directory = (propertyId: string) => {
  requireProperty(propertyId);
  return store.guests().map(toDirectoryRow);
};

const SORTS: Record<NonNullable<GuestDirectoryQuery['sort']>, (a: GuestDirectoryRow, b: GuestDirectoryRow) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  stays: (a, b) => b.stayCount - a.stayCount,
  spent: (a, b) => Number(b.lifetimeSpend) - Number(a.lifetimeSpend),
  recent: (a, b) => (b.lastStayAt ?? '').localeCompare(a.lastStayAt ?? ''),
};

function requireGuest(propertyId: string, id: string): GuestDirectoryRow {
  const guest = directory(propertyId).find((item) => item.id === id);
  if (!guest) throw new Error('This guest no longer exists.');
  return guest;
}

/** The guest directory of one property. */
export const guestDirectoryApi = {
  list: async (propertyId: string, query: GuestDirectoryQuery = {}): Promise<GuestDirectoryPage> => {
    const { search, tier, sort = 'name', page = 1, pageSize = 25 } = query;
    await syncGuests(propertyId, search);
    const needle = search?.trim().toLowerCase();
    const rows = directory(propertyId)
      .filter((g) => !tier || g.tier === tier)
      .filter((g) => !needle || [g.name, g.email, g.phone, g.companyName].some((v) => v?.toLowerCase().includes(needle)))
      .sort(SORTS[sort]);
    return { data: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize };
  },
  summary: async (propertyId: string): Promise<GuestDirectorySummary> => {
    const rows = directory(propertyId);
    const byTier = { VIP: 0, Gold: 0, Regular: 0, New: 0 };
    rows.forEach((g) => { byTier[g.tier] += 1; });
    return { total: rows.length, byTier };
  },
  get: async (propertyId: string, id: string) => {
    await syncGuests(propertyId);
    return requireGuest(propertyId, id);
  },
  stays: async (propertyId: string, id: string): Promise<GuestStayRow[]> => {
    requireProperty(propertyId);
    return store.guestReservations(id)
      .map((r) => ({
        id: r.id, bookingCode: r.bookingCode, status: r.status, checkInDate: r.checkInDate, checkOutDate: r.checkOutDate,
        nights: r.nights ?? 1, rooms: r.roomNumber ?? null, currencyCode: r.currencyCode ?? 'INR',
        totalAmount: r.totalAmount ?? '0.00', paidAmount: Number(r.paid ?? 0).toFixed(2),
      }))
      .sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));
  },
  payments: async (propertyId: string, id: string): Promise<GuestPaymentRow[]> => {
    requireProperty(propertyId);
    return store.guestPayments(id);
  },
  create: async (propertyId: string, body: Record<string, unknown>) => {
    requireProperty(propertyId);
    // The guests table gives the guest an id first; the store keeps a copy under the same id for the other screens.
    const saved = isServerProperty(propertyId)
      ? await request<ServerGuest>(guestsPath(propertyId), toServerGuest(body))
      : null;
    const guest = store.createGuest({ ...pickGuestFields(body), ...(saved ? { id: saved.id } : {}) });
    recordActivity('guests', 'create', 'Added a guest', { propertyId, resourceId: guest.id });
    return toDirectoryRow(guest);
  },
  update: async (propertyId: string, id: string, body: Record<string, unknown>) => {
    requireProperty(propertyId);
    const guest = store.updateGuest(id, pickGuestFields(body));
    if (!guest) throw new Error('This guest no longer exists.');
    recordActivity('guests', 'update', 'Updated a guest', { propertyId, resourceId: id });
    return toDirectoryRow(guest);
  },
};

/** Guests of the active property. */
export const guestApi = {
  list: async (search = '', page = 1, pageSize = 100): Promise<PageResult<GuestRow>> => {
    const result = await guestDirectoryApi.list(requireActivePropertyId(), { search: search || undefined, page, pageSize });
    return {
      data: result.data.map(toGuestRow),
      page: result.page,
      pageSize: result.pageSize,
      hasMore: result.page * result.pageSize < result.total,
    };
  },
  get: async (id: string) => toGuestRow(await guestDirectoryApi.get(requireActivePropertyId(), id)),
  create: async (body: Record<string, unknown>) =>
    toGuestRow(await guestDirectoryApi.create(requireActivePropertyId(), body)),
  update: async (id: string, body: Record<string, unknown>) =>
    toGuestRow(await guestDirectoryApi.update(requireActivePropertyId(), id, body)),
};
