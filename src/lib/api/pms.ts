import { store } from '../../data/store';
import type { ThemeKey } from '../../types';
import { ApiError, displayApiError } from './client';
import { roleLabel, toFrontendPermissions } from './backendPermissions';
import { setBusinessDate } from './businessDate';
import {
  guestRowFromBackend,
  reservationRowFromBackend,
  stayRowFromBackend,
  type BackendGuest as BackendGuestRow,
  type BackendReservation,
} from './bookingMapping';
import {
  folioDetailFromBackend,
  invoiceRowFromBackend,
  paymentRowFromBackend,
  type BackendFolio,
  type BackendInvoice,
  type BackendPayment,
  type BackendTransaction,
} from './billingMapping';
import { toast } from '../../utils/toast';
import { propertyPatchFromFields, propertyRowFromBackend, type BackendProperty } from './propertyMapping';

interface PropertyMembership {
  id: string;
  userId: string;
  propertyId: string;
  roleId: string;
  isActive: boolean;
  role: { id: string; key: string; name: string; description: string | null };
  property: { id: string; name: string; slug: string; timezone: string; currencyCode: string };
}

export interface AuthMe {
  user: {
    id: string;
    email: string;
    fullName: string;
    status: string;
    propertyMemberships: PropertyMembership[];
  };
  activePropertyId: string | null;
  permissions: string[];
}

export interface PageResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  today?: string;
}

export interface PropertyRow {
  id: string; code: string; name: string; legalName: string | null; slug: string; timezone: string; currencyCode: string; countryCode?: string;
  businessDate: string; checkInTime?: string; checkOutTime?: string; noShowCutoffTime: string | null; holdMinutes: number | null;
  overbookingEnabled: boolean; approvalThreshold: string | null;
  addressLine1: string | null; city: string | null; state: string | null; postalCode: string | null;
  gstin: string | null; stateCode: string | null;
}
export interface RoomTypeRow {
  id: string; code: string; name: string; description?: string | null; maxAdults: number; maxChildren: number;
  baseRate: string; amenities?: unknown; isActive: boolean;
}
export interface RoomRow {
  id: string; roomNumber: string; roomTypeId: string; roomTypeCode?: string | null; roomTypeName?: string | null;
  floor?: string | null; status: string; isActive: boolean; notes?: string | null; wing?: string | null; baseRate?: string;
  outOfOrderReason?: string | null; version: number;
}

/** One property day of room segments, as the backend derives them from stays, status history, tasks and blocks. */
export interface RoomTimelineApi {
  date: string;
  timeZone: string;
  rooms: Array<{
    id: string; version: number; roomNumber: string; floor: string | null; roomTypeName: string;
    segments: Array<{ kind: string; startHour: number; endHour: number; reservationId?: string; confirmationNumber?: string; guestName?: string }>;
  }>;
}
export interface GuestRow {
  id: string; firstName: string; lastName: string; email: string | null; phone: string | null;
  companyName?: string | null; city?: string | null; countryCode?: string | null; masked?: boolean;
  nationality?: string | null; dateOfBirth?: string | null; gender?: string | null; address?: string | null;
  state?: string | null; country?: string | null;
  preferences?: string | null; internalNotes?: string | null; stayCount?: number; lastStayAt?: string | null;
}
export interface ReservationRoomRow {
  id: string; roomTypeId: string; roomId?: string | null; roomNumber?: string | null;
  roomTypeName?: string | null; nightlyRate: string; ratePlanName?: string | null;
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
  discountAmount?: string; paid?: number;
  createdAt?: string;
}
export interface StayRow extends ReservationRow {
  guestId?: string | null;
  guestName: string | null; roomNumber: string | null; roomStatus?: string | null; roomReady?: boolean;
  folioId?: string | null; folioNo?: string | null; balance?: string;
}
export interface StayList { businessDate: string; data: StayRow[] }
/** The backend's price for a room over a stay. Amounts are totals for every night. */
interface RoomQuote {
  nights: number;
  available: boolean;
  roomAmount: string;
  taxAmount: string;
  totalAmount: string;
}
export interface AvailabilityRow { id: string; roomNumber: string; floor?: string | null; status: string }
export interface AvailabilityResult { nights: string[]; totalRooms: number; available: AvailabilityRow[] }
export interface FolioBalanceRow { charges: string; tax: string; total: string; paid: string; balance: string; currencyCode: string }
export interface FolioItemRow {
  id: string; type: string; description: string; quantity: string; unitAmount: string; taxAmount: string;
  totalAmount: string; isVoided: boolean; createdAt: string; billingRoute?: string | null; outletId?: string | null;
}
export interface PaymentRow {
  id: string; folioId: string; folioNo?: string | null; amount: string; currencyCode: string; method: string;
  status: string; reference?: string | null; refundedAmount?: string; recordedAt: string; guestName?: string | null;
}
export interface InvoiceRow {
  id: string; invoiceNo: string; folioId: string; status: string; currencyCode: string; subtotal: string;
  taxTotal: string; totalAmount: string; issuedAt?: string | null; folioNo?: string | null; bookingCode?: string | null; guestName?: string | null;
}
export interface FolioDetailRow {
  id: string; folioNo: string; status: string; currencyCode: string; reservationId: string; guestName?: string | null;
  balance: FolioBalanceRow; items: FolioItemRow[]; payments: PaymentRow[];
}
export interface HousekeepingTaskRow {
  id: string; type: string; status: string; priority: string; roomId: string; roomNumber: string | null;
  roomTypeName?: string | null; assignedToId?: string | null; assigneeName?: string | null;
  dueAt?: string | null; startedAt?: string | null; completedAt?: string | null; inspectedAt?: string | null;
  notes?: string | null; blockedReason?: string | null; createdAt: string;
}
export interface HousekeepingSummaryRow {
  rooms: { total: number; ready: number; dirty: number; occupied: number; outOfOrder: number };
}
export interface MaintenanceTicketRow {
  id: string; ticketNo?: string | null; title?: string | null; description: string; category: string; priority: string; status: string;
  roomId?: string | null; roomNumber?: string | null; assignedToId?: string | null; assigneeName?: string | null;
  reportedByName?: string | null; resolution?: string | null; createdAt: string;
}
export interface DailyFlashRow {
  businessDate: string; propertyName: string; arrivals: Array<{ id: string; bookingCode: string; guestName: string | null; checkOutDate: string; party: string }>;
  departures: Array<{ id: string; bookingCode: string; guestName: string | null; checkInDate: string }>;
  inHouseCount: number; rooms: { total: number; ready: number; dirty: number; occupied: number; outOfOrder: number };
  housekeeping: { open: number; blocked: number; dueToday: number }; maintenance: { open: number; critical: number };
}
export interface OccupancyReportRow {
  from: string; to: string; nights: number; rooms: number; availableRoomNights: number; soldRoomNights: number;
  unsoldRoomNights: number; occupancyPct: string; reconciliation: { overlappingReservations: number; reservationRoomLines: number; expectedRoomNights: number; claimedRoomNights: number; matches: boolean };
}
export interface RevenueReportRow {
  from: string; to: string; nights: number; currencyCode: string; roomRevenue: string; otherRevenue: string; taxTotal: string;
  grossRevenue: string; paymentsCollected: string; paymentsRefunded: string; paymentsNetCollected: string;
  soldRoomNights: number; availableRoomNights: number; adr: string; revpar: string;
}
export interface MovementReportRow {
  from: string; to: string; currencyCode: string; rows: Array<{ bookingCode: string; guestName: string | null; status: string; checkInDate: string; checkOutDate: string; nights: number; roomNumber: string | null; adults: number; children: number }>;
}
export interface HousekeepingReportRow {
  from: string; to: string; totalTasks: number; completed: number; blocked: number;
  inspected: number; completionRate: string; avgTurnaroundHours: string;
  roomsTouched: number; roomsTotal: number;
  byType: Array<{ type: string; total: number; completed: number; blocked: number }>;
}
export interface UserRow {
  userId: string; email: string; fullName: string; status: 'ACTIVE' | 'INVITED' | 'DISABLED'; lastLoginAt?: string | null;
  membershipActive: boolean; invitePending: boolean; inviteExpired: boolean; propertyId: string; roleKey: string; roleName: string;
}
export interface RoleRow { id: string; key: string; name: string; description?: string | null; isSystem: boolean; isActive: boolean; permissions: string[]; memberCount: number }
export interface TaxRuleRow { id: string; code: string; name: string; ratePercent: string; appliesTo: string; isInclusive: boolean; isActive: boolean }
export interface AuditEventRow {
  id: string; action: string; resourceType: string; resourceId: string | null; outcome: string;
  reason: string | null; actorName: string | null; createdAt: string;
}
export interface AuditEventsResult { total: number; returned: number; limit: number; rows: AuditEventRow[] }
export interface NightAuditRow {
  id?: string; businessDate: string; status: string | null; exists: boolean; today?: string;
  previewSummary?: { exceptionCount?: number; counts?: Record<string, number> } | null;
  finalSummary?: { exceptionCount?: number; counts?: Record<string, number> } | null;
  exceptionCount?: number; advisoryOnly?: boolean;
}

/*
 * Authentication is the one part of this app that talks to the real backend
 * (pms-backend). Everything else still reads the in-memory demo store.
 */
const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const ACCESS_TOKEN_KEY = 'pms.accessToken';
const REFRESH_TOKEN_KEY = 'pms.refreshToken';

interface BackendUser { id: string; email: string; fullName: string; status: string }
interface BackendLoginResult { accessToken: string; refreshToken: string; user: BackendUser }
interface BackendGrant { roles: string[]; permissions: string[] }
interface BackendMe {
  user: BackendUser;
  platform: BackendGrant | null;
  properties: Array<BackendGrant & { id: string; businessDate: string }>;
}
interface BackendErrorBody { error?: { code?: string; message?: string } }

/*
 * The backend's own id for the signed-in user's property, from /auth/me. The
 * demo store keeps its own property id, so room data is requested with this one.
 */
let backendPropertyId: string | null = null;

// sessionStorage can throw in private windows or when site data is blocked.
function readAccessToken(): string | null {
  try { return sessionStorage.getItem(ACCESS_TOKEN_KEY); } catch { return null; }
}

function saveTokens(accessToken: string, refreshToken: string): void {
  try {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch { /* the token still lives for this page; it just won't survive a reload */ }
}

function clearTokens(): void {
  backendPropertyId = null;
  setBusinessDate('');
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch { /* nothing stored, nothing to clear */ }
}

/** Calls the backend and turns its `{ error: { code, message } }` envelope into an ApiError. */
async function backendRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError('Cannot reach the server. Check that the backend is running.', 0, 'NETWORK_ERROR');
  }
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as BackendErrorBody | null)?.error;
    throw new ApiError(error?.message ?? `Request failed with status ${response.status}.`, response.status, error?.code);
  }
  return body as T;
}

/** Path prefix for the signed-in user's property on the backend. */
function propertyPath(): string {
  if (!backendPropertyId) throw new ApiError('You are not signed in.', 401, 'UNAUTHENTICATED');
  return `/properties/${backendPropertyId}`;
}

/** A backend request signed with the stored access token. */
function authedRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const token = readAccessToken();
  if (!token) throw new ApiError('You are not signed in.', 401, 'UNAUTHENTICATED');
  const hasBody = body !== undefined;
  return backendRequest<T>(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...extraHeaders,
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  });
}

export const authApi = {
  /** POST /auth/login with email and password; stores the returned tokens. */
  login: async (email: string, password: string): Promise<void> => {
    clearTokens();
    const result = await backendRequest<BackendLoginResult>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    saveTokens(result.accessToken, result.refreshToken);
  },

  /** True when a token is stored, so the session can be restored on load. */
  hasSession: (): boolean => readAccessToken() !== null,

  /**
   * GET /auth/me for the signed-in user. Identity, role and permissions come from
   * the backend. The property and its data still come from the demo store, whose
   * ids differ from the backend's, so the active property is the store's.
   */
  me: async (): Promise<AuthMe> => {
    const token = readAccessToken();
    if (!token) throw new ApiError('You are not signed in.', 401, 'UNAUTHENTICATED');
    let body: BackendMe;
    try {
      body = await backendRequest<BackendMe>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (cause) {
      // An expired or revoked token can never succeed again, so drop it.
      if (cause instanceof ApiError && cause.status === 401) clearTokens();
      throw cause;
    }
    const { user } = body;
    backendPropertyId = body.properties[0]?.id ?? null;
    setBusinessDate(body.properties[0]?.businessDate ?? '');
    const grant = body.properties[0] ?? body.platform;
    const role = grant?.roles[0];
    const demo = store.session();
    const membership = demo.user.propertyMemberships[0];
    return {
      user: {
        ...demo.user,
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        propertyMemberships: membership
          ? [{ ...membership, role: { ...membership.role, name: role ? roleLabel(role) : 'Staff' } }]
          : [],
      },
      activePropertyId: demo.activePropertyId,
      permissions: toFrontendPermissions(grant?.permissions ?? []),
    };
  },

  /** POST /auth/logout to end the session on the server, then forget the tokens. */
  logout: async (): Promise<void> => {
    const token = readAccessToken();
    try {
      if (token) await backendRequest<void>('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch {
      // Signing out must always work locally. If the server call fails (expired
      // token, server down), the server session simply expires on its own.
    } finally {
      clearTokens();
    }
  },

  switchProperty: async (propertyId: string) => store.switchProperty(propertyId),
};

export interface HoldResult {
  holdId: string;
  roomId: string;
  nights: string[];
  expiresAt: string;
  /** Milliseconds until the hold lapses, from server time. */
  remainingMs: number;
}

/**
 * Selection-time room holds.
 *
 * Acquiring a hold the moment a room is picked is what stops a second user from
 * choosing — and then losing — the same room-night. The hold expires on its own
 * after ten minutes and is consumed by the reservation that uses it.
 */
export interface DayEnquiryRow {
  id: string;
  date: string;
  guestName: string;
  phone: string;
  detail: string;
}

export interface DayLogSummaryRow {
  hasNote: boolean;
  enquiryCount: number;
}

/** Per-date notes and enquiries shown in the room calendar's date header. */
export const dayLogApi = {
  summary: async (dates: string[]) => store.dayLogSummary(dates),
  note: async (date: string) => store.dayNote(date),
  saveNote: async (date: string, text: string) => store.saveDayNote(date, text),
  enquiries: async (date: string) => store.dayEnquiries(date),
  addEnquiry: async (row: Omit<DayEnquiryRow, 'id'>) => store.addDayEnquiry(row),
  removeEnquiry: async (id: string) => store.removeDayEnquiry(id),
};

/** The nights from arrival up to, not including, departure. */
const nightsOf = (checkIn: string, checkOut: string): string[] => {
  const nights: string[] = [];
  for (let date = new Date(`${checkIn}T00:00:00Z`); date.toISOString().slice(0, 10) < checkOut; date.setUTCDate(date.getUTCDate() + 1)) {
    nights.push(date.toISOString().slice(0, 10));
  }
  return nights;
};

/** Room-night holds taken from the calendar. The backend lapses each hold after the property's hold time. */
export const holdApi = {
  acquire: async (roomId: string, checkIn: string, checkOut: string): Promise<HoldResult> => {
    const hold = await authedRequest<{ holdId: string; roomId: string; checkIn: string; checkOut: string; expiresAt: string; remainingMs: number }>(
      'POST',
      `${propertyPath()}/rooms/${roomId}/holds`,
      { checkIn, checkOut },
    );
    return { holdId: hold.holdId, roomId: hold.roomId, nights: nightsOf(checkIn, checkOut), expiresAt: hold.expiresAt, remainingMs: hold.remainingMs };
  },
};

/** The ETag the backend sends with a record, for If-Match on the next change to it. */
async function etagOf(path: string): Promise<string> {
  const token = readAccessToken();
  if (!token) throw new ApiError('You are not signed in.', 401, 'UNAUTHENTICATED');
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const etag = response.headers.get('ETag');
  if (!etag) throw new ApiError('The server did not send a version for this record.', 502, 'NO_ETAG');
  return etag;
}

/** The signed-in user's property: its details and the fields the settings screen edits. */
export const propertyApi = {
  current: async (): Promise<PropertyRow> =>
    propertyRowFromBackend(await authedRequest<BackendProperty>('GET', propertyPath())),
  update: async (fields: Record<string, unknown>): Promise<PropertyRow> => {
    const path = propertyPath();
    const current = await authedRequest<BackendProperty>('GET', path);
    return propertyRowFromBackend(
      await authedRequest<BackendProperty>('PATCH', path, propertyPatchFromFields(current, fields), { 'If-Match': await etagOf(path) }),
    );
  },
};

/*
 * Property settings the backend keeps as key and value pairs. The key is the setting's name,
 * for example "contact.phone". A setting that was never saved reads as the fallback.
 */
export const settingsApi = {
  get: async <T,>(key: string, fallback: T): Promise<T> => {
    try {
      return (await authedRequest<{ value: T }>('GET', `${propertyPath()}/settings/${key}`)).value;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return fallback;
      throw error;
    }
  },
  /** Saves a value, creating the setting on first save. The version guards against overwriting a newer save. */
  set: async (key: string, value: unknown): Promise<void> => {
    const path = `${propertyPath()}/settings/${key}`;
    let version = 0;
    try {
      version = (await authedRequest<{ version: number }>('GET', path)).version;
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
    await authedRequest('PUT', path, { value }, { 'If-Match': `"v${version}"` });
  },
};

/** Room inventory, read from and written to pms-backend for the signed-in property. */
export const inventoryApi = {
  rooms: async (): Promise<RoomRow[]> =>
    (await authedRequest<{ data: RoomRow[] }>('GET', `${propertyPath()}/rooms?limit=200`)).data,
  roomTypes: async (): Promise<RoomTypeRow[]> =>
    (await authedRequest<{ data: RoomTypeRow[] }>('GET', `${propertyPath()}/room-types`)).data,
  updateRoom: async (id: string, body: Record<string, unknown>): Promise<RoomRow> =>
    authedRequest('PATCH', `${propertyPath()}/rooms/${id}`, body),
  updateRoomType: async (id: string, body: Record<string, unknown>): Promise<RoomTypeRow> =>
    authedRequest('PATCH', `${propertyPath()}/room-types/${id}`, body),
  createRoom: async (body: Record<string, unknown>): Promise<RoomRow> =>
    authedRequest('POST', `${propertyPath()}/rooms`, body),
  createRoomType: async (body: Record<string, unknown>): Promise<RoomTypeRow> =>
    authedRequest('POST', `${propertyPath()}/room-types`, body),
  availability: async (checkIn: string, checkOut: string, roomTypeId: string): Promise<AvailabilityResult> =>
    authedRequest('GET', `${propertyPath()}/room-availability?checkIn=${checkIn}&checkOut=${checkOut}&roomTypeId=${roomTypeId}`),
  outOfOrder: async (id: string, reason: string): Promise<void> =>
    authedRequest('POST', `${propertyPath()}/rooms/${id}/out-of-order`, { reason }),
  backInService: async (id: string, reason: string): Promise<void> =>
    authedRequest('POST', `${propertyPath()}/rooms/${id}/back-in-service`, { reason }),
  /** Sets the housekeeping state; the backend rejects it when the room has changed since `expectedVersion`. */
  setHousekeepingStatus: async (
    id: string,
    housekeepingStatus: 'DIRTY' | 'CLEAN' | 'INSPECTED',
    expectedVersion: number,
    reason: string,
  ): Promise<void> =>
    authedRequest('POST', `${propertyPath()}/rooms/${id}/status`, { housekeepingStatus, expectedVersion, reason }),
};

/** The If-Match header for a change to a record the backend versions. */
async function versionHeader(path: string): Promise<Record<string, string>> {
  const current = await authedRequest<{ version: number }>('GET', path);
  return { 'If-Match': `"v${current.version}"` };
}

/** Only the guest fields the backend accepts. The guest form sends more than the backend stores. */
const guestFields = (body: Record<string, unknown>): Record<string, unknown> => {
  const picked: Record<string, unknown> = {};
  for (const key of ['title', 'firstName', 'lastName', 'email', 'phone', 'nationality', 'dateOfBirth', 'vipLevel', 'preferences']) {
    if (body[key] !== undefined) picked[key] = body[key];
  }
  return picked;
};

export const guestApi = {
  list: async (search = '', page = 1, pageSize = 100): Promise<PageResult<GuestRow>> => {
    const query = new URLSearchParams({ limit: String(Math.min(pageSize, 200)) });
    if (search.trim()) query.set('q', search.trim());
    const result = await authedRequest<{ data: BackendGuestRow[]; meta: { nextCursor?: string } }>('GET', `${propertyPath()}/guests?${query}`);
    return { data: result.data.map(guestRowFromBackend), page, pageSize, hasMore: Boolean(result.meta.nextCursor) };
  },
  get: async (id: string): Promise<GuestRow> =>
    guestRowFromBackend(await authedRequest<BackendGuestRow>('GET', `${propertyPath()}/guests/${id}`)),
  create: async (body: Record<string, unknown>): Promise<GuestRow> =>
    guestRowFromBackend(await authedRequest<BackendGuestRow>('POST', `${propertyPath()}/guests`, guestFields(body))),
  update: async (id: string, body: Record<string, unknown>): Promise<GuestRow> => {
    const path = `${propertyPath()}/guests/${id}`;
    return guestRowFromBackend(await authedRequest<BackendGuestRow>('PATCH', path, guestFields(body), await versionHeader(path)));
  },
};

/** The rate plan new bookings are priced on: the property's BAR (best available rate) plan. */
let barPlan: { propertyId: string; id: string } | null = null;
async function barRatePlanId(): Promise<string> {
  const propertyId = backendPropertyId;
  if (barPlan && barPlan.propertyId === propertyId) return barPlan.id;
  const plans = await authedRequest<{ data: Array<{ id: string; code: string; isActive: boolean }> }>('GET', `${propertyPath()}/rate-plans`);
  const plan = plans.data.find((item) => item.code === 'BAR' && item.isActive) ?? plans.data.find((item) => item.isActive);
  if (!plan || !propertyId) throw new ApiError('No rate plan is set up for this property.', 422, 'NO_RATE_PLAN');
  barPlan = { propertyId, id: plan.id };
  return plan.id;
}

/** Where a booking's room line came from: the calendar's hold, the room picked, or none. */
interface BookingLine {
  roomTypeId: string;
  roomId?: string | null;
  holdId?: string | null;
  adults?: number;
  children?: number;
}

const BOOKING_SOURCES = ['DIRECT', 'PHONE', 'EMAIL', 'WALK_IN', 'OTA', 'CORPORATE', 'WEB', 'GROUP'];

export const reservationApi = {
  list: async (search = '', status?: string, page = 1, pageSize = 100): Promise<PageResult<ReservationRow>> => {
    const result = await authedRequest<{ data: BackendReservation[]; meta: { nextCursor?: string } }>(
      'GET',
      `${propertyPath()}/reservations?limit=200`,
    );
    const needle = search.trim().toLowerCase();
    const rows = result.data
      .map(reservationRowFromBackend)
      .filter((row) => !status || row.status === status)
      .filter((row) => !needle || [row.bookingCode, row.guestName ?? ''].some((text) => text.toLowerCase().includes(needle)));
    return { data: rows.slice((page - 1) * pageSize, page * pageSize), page, pageSize, hasMore: rows.length > page * pageSize };
  },
  get: async (id: string): Promise<ReservationRow> =>
    reservationRowFromBackend(await authedRequest<BackendReservation>('GET', `${propertyPath()}/reservations/${id}`)),
  /** One booking per room line, sharing the guest and dates. The first booking's code is the one the screen shows. */
  create: async (body: Record<string, unknown>): Promise<ReservationRow> => {
    const lines = (body.roomLines as BookingLine[] | undefined) ?? [];
    if (lines.length === 0) throw new ApiError('Add at least one room to the booking.', 422, 'NO_ROOMS');
    const ratePlanId = await barRatePlanId();
    const source = BOOKING_SOURCES.includes(String(body.source)) ? body.source : 'DIRECT';
    const holdOnly = body.status === 'DRAFT' || undefined;
    let first: BackendReservation | null = null;
    for (const line of lines) {
      const created = await authedRequest<BackendReservation>(
        'POST',
        `${propertyPath()}/reservations`,
        {
          arrivalDate: body.checkInDate,
          departureDate: body.checkOutDate,
          roomTypeId: line.roomTypeId,
          ratePlanId,
          adults: line.adults ?? body.adults ?? 1,
          children: line.children ?? 0,
          source,
          primaryGuestId: body.primaryGuestId,
          roomId: line.roomId ?? undefined,
          holdId: line.holdId ?? undefined,
          specialRequests: body.specialRequests || undefined,
          holdOnly,
        },
        { 'Idempotency-Key': crypto.randomUUID() },
      );
      first ??= created;
    }
    const booked = first as BackendReservation;
    await postBookingExtras(booked.id, body);
    return reservationRowFromBackend(booked);
  },
  update: async (id: string, patch: Record<string, unknown>): Promise<ReservationRow> => {
    const path = `${propertyPath()}/reservations/${id}`;
    const body: Record<string, unknown> = {};
    if (patch.checkInDate !== undefined) body.arrivalDate = patch.checkInDate;
    if (patch.checkOutDate !== undefined) body.departureDate = patch.checkOutDate;
    if (patch.specialRequests !== undefined) body.specialRequests = patch.specialRequests;
    if (patch.adults !== undefined) body.adults = patch.adults;
    if (patch.children !== undefined) body.children = patch.children;
    return reservationRowFromBackend(await authedRequest<BackendReservation>('PATCH', path, body, await versionHeader(path)));
  },
  assignRoom: async (id: string, roomId: string): Promise<ReservationRow> => {
    const path = `${propertyPath()}/reservations/${id}/room`;
    await authedRequest('PUT', path, { roomId }, await versionHeader(`${propertyPath()}/reservations/${id}`));
    return reservationApi.get(id);
  },
  /** The backend's price for one room over a stay, at the BAR rate plan. */
  quote: async (params: { checkIn: string; checkOut: string; roomTypeId: string; adults: number; children: number }): Promise<RoomQuote> => {
    const ratePlanId = await barRatePlanId();
    const result = await authedRequest<{
      nights: Array<{ date: string; amount: string }>;
      available: boolean;
      totals: { roomAmount: string; taxAmount: string; totalAmount: string };
    }>('POST', `${propertyPath()}/reservations/quotes`, {
      arrivalDate: params.checkIn,
      departureDate: params.checkOut,
      roomTypeId: params.roomTypeId,
      ratePlanId,
      adults: params.adults,
      children: params.children,
    });
    return {
      nights: result.nights.length,
      available: result.available,
      roomAmount: result.totals.roomAmount,
      taxAmount: result.totals.taxAmount,
      totalAmount: result.totals.totalAmount,
    };
  },
  cancel: async (id: string, reason: string): Promise<void> => {
    const path = `${propertyPath()}/reservations/${id}/cancel`;
    await authedRequest('POST', path, { reasonCode: 'GUEST_REQUEST', note: reason.slice(0, 300) }, await versionHeader(`${propertyPath()}/reservations/${id}`));
  },
};

/** Arrivals, departures and guests in house for the business date. */
async function dayStays(kind: 'arrivals' | 'departures' | 'in-house'): Promise<StayList> {
  const [result, folios] = await Promise.all([
    authedRequest<{ data: BackendReservation[]; meta: { businessDate: string } }>('GET', `${propertyPath()}/${kind}?limit=200`),
    allFolios(),
  ]);
  const folioByReservation = new Map(folios.filter((folio) => folio.reservationId).map((folio) => [folio.reservationId as string, folio]));
  return {
    businessDate: result.meta.businessDate,
    data: result.data.map((reservation) => stayRowFromBackend(reservation, folioByReservation.get(reservation.id))),
  };
}

export const frontDeskApi = {
  arrivals: async (): Promise<StayList> => dayStays('arrivals'),
  departures: async (): Promise<StayList> => dayStays('departures'),
  inHouse: async (): Promise<StayList> => dayStays('in-house'),
  checkIn: async (id: string): Promise<void> => {
    const path = `${propertyPath()}/reservations/${id}/check-in`;
    await authedRequest('POST', path, {}, await versionHeader(`${propertyPath()}/reservations/${id}`));
  },
  checkOut: async (id: string): Promise<void> => {
    const path = `${propertyPath()}/reservations/${id}/check-out`;
    await authedRequest('POST', path, {}, await versionHeader(`${propertyPath()}/reservations/${id}`));
  },
  roomTimeline: async (date: string): Promise<RoomTimelineApi> =>
    (await authedRequest<{ data: RoomTimelineApi }>('GET', `${propertyPath()}/front-desk/room-timeline?date=${date}`)).data,
};

/*
 * Add-ons and payments entered on the booking form go to the booking's folio. A failed post is
 * reported, and the booking stands: staff can post the rest from billing.
 */
async function postBookingExtras(reservationId: string, body: Record<string, unknown>): Promise<void> {
  const charges = ((body.pendingCharges as Array<{ description: string; quantity: string; unitAmount: string; postToFolio: boolean }> | undefined) ?? [])
    .filter((charge) => charge.postToFolio);
  const payments = (body.pendingPayments as Array<{ amount: string; method: string; reference?: string | null }> | undefined) ?? [];
  if (charges.length === 0 && payments.length === 0) return;

  const [folio] = (await authedRequest<{ data: BackendFolio[] }>('GET', `${propertyPath()}/folios?reservationId=${reservationId}&limit=50`)).data;
  if (!folio) {
    toast.error('Add-ons and payments not posted', { detail: 'The booking has no folio to post them to.' });
    return;
  }
  const failures: string[] = [];
  for (const charge of charges) {
    try {
      await folioApi.postItem(folio.id, { description: charge.description, quantity: charge.quantity, unitAmount: charge.unitAmount });
    } catch (error) {
      failures.push(`${charge.description}: ${displayApiError(error)}`);
    }
  }
  for (const payment of payments) {
    try {
      await folioApi.payment(folio.id, { amount: payment.amount, method: methodKindOf(payment.method), reference: payment.reference ?? undefined });
    } catch (error) {
      failures.push(`${payment.method} ${payment.amount}: ${displayApiError(error)}`);
    }
  }
  if (failures.length > 0) {
    toast.error('Some add-ons or payments were not posted', { detail: failures.join(' ') });
  }
}

interface PaymentMethodRow { id: string; kind: string; name: string; isActive: boolean }
let methodCache: { propertyId: string; methods: PaymentMethodRow[] } | null = null;

/** The property's active payment methods, cached for the signed-in property. */
async function paymentMethods(): Promise<PaymentMethodRow[]> {
  const propertyId = backendPropertyId ?? '';
  if (methodCache?.propertyId === propertyId) return methodCache.methods;
  const result = await authedRequest<{ data: PaymentMethodRow[] }>('GET', `${propertyPath()}/payment-methods`);
  methodCache = { propertyId, methods: result.data.filter((method) => method.isActive) };
  return methodCache.methods;
}

async function paymentMethodIdOfKind(kind: string): Promise<string> {
  const method = (await paymentMethods()).find((item) => item.kind === kind);
  if (!method) throw new ApiError(`No ${kind.toLowerCase().replaceAll('_', ' ')} payment method is set up for this property.`, 422, 'NO_PAYMENT_METHOD');
  return method.id;
}

/** Payment kind for a method name the booking form offers. */
function methodKindOf(method: string): string {
  const text = method.toLowerCase();
  if (text.includes('cash')) return 'CASH';
  if (text.includes('upi')) return 'UPI';
  if (text.includes('bank')) return 'BANK_TRANSFER';
  if (text.includes('card')) return 'CARD_TERMINAL';
  throw new ApiError(`"${method}" is not a payment method the PMS accepts.`, 422, 'UNKNOWN_PAYMENT_METHOD');
}

async function methodKinds(): Promise<Map<string, string>> {
  return new Map((await paymentMethods()).map((method) => [method.id, method.kind]));
}

/** Every folio of the property. Each reservation has one guest folio. */
async function allFolios(): Promise<BackendFolio[]> {
  return (await authedRequest<{ data: BackendFolio[] }>('GET', `${propertyPath()}/folios?limit=200`)).data;
}

async function paymentsOfFolio(folio: BackendFolio, kinds: Map<string, string>): Promise<PaymentRow[]> {
  const result = await authedRequest<{ data: BackendPayment[] }>('GET', `${propertyPath()}/folios/${folio.id}/payments?limit=200`);
  return result.data.map((payment) => paymentRowFromBackend(payment, kinds, folio));
}

async function folioDetailOf(folioId: string): Promise<FolioDetailRow> {
  const [folio, transactions, kinds] = await Promise.all([
    authedRequest<BackendFolio>('GET', `${propertyPath()}/folios/${folioId}`),
    authedRequest<{ data: BackendTransaction[] }>('GET', `${propertyPath()}/folios/${folioId}/transactions?limit=200`),
    methodKinds(),
  ]);
  return folioDetailFromBackend(folio, transactions.data, await paymentsOfFolio(folio, kinds));
}

/** A fresh key for each write, so a retried request is not posted twice. */
const idempotency = (): Record<string, string> => ({ 'Idempotency-Key': crypto.randomUUID() });

export const folioApi = {
  listPayments: async (): Promise<PaymentRow[]> => {
    const [folios, kinds] = await Promise.all([allFolios(), methodKinds()]);
    return (await Promise.all(folios.map((folio) => paymentsOfFolio(folio, kinds)))).flat();
  },
  listInvoices: async (): Promise<InvoiceRow[]> => {
    const folios = await allFolios();
    const perFolio = await Promise.all(
      folios.map(async (folio) => {
        const result = await authedRequest<{ data: BackendInvoice[] }>('GET', `${propertyPath()}/folios/${folio.id}/invoices`);
        return result.data.map((invoice) => invoiceRowFromBackend(invoice, folio.folioNumber));
      }),
    );
    return perFolio.flat();
  },
  detail: async (id: string): Promise<FolioDetailRow> => folioDetailOf(id),
  /** Posts an extra charge. The billing screen sends its own description, quantity and unit amount. */
  postItem: async (folioId: string, body: { description: string; quantity: string; unitAmount: string }): Promise<void> => {
    await authedRequest(
      'POST',
      `${propertyPath()}/folios/${folioId}/transactions`,
      { category: 'OTHER', description: body.description, quantity: Number(body.quantity), unitPrice: body.unitAmount },
      idempotency(),
    );
  },
  /** Records a payment. `method` is a payment kind such as CARD_TERMINAL or CASH. */
  payment: async (folioId: string, body: { amount: string; method: string; reference?: string }): Promise<void> => {
    const paymentMethodId = await paymentMethodIdOfKind(body.method);
    await authedRequest(
      'POST',
      `${propertyPath()}/folios/${folioId}/payments`,
      { paymentMethodId, amount: body.amount, reference: body.reference },
      idempotency(),
    );
  },
  /** Requests a refund of a payment, then processes it. */
  refund: async (paymentId: string, amount: string, reason: string): Promise<void> => {
    const refund = await authedRequest<{ id: string }>('POST', `${propertyPath()}/payments/${paymentId}/refunds`, { amount, reason }, idempotency());
    await authedRequest(
      'POST',
      `${propertyPath()}/refunds/${refund.id}/process`,
      { reference: `RF-${refund.id.slice(0, 8).toUpperCase()}` },
      idempotency(),
    );
  },
  invoice: async (id: string) => {
    const invoice = await authedRequest<BackendInvoice>('GET', `${propertyPath()}/invoices/${id}`);
    return {
      ...invoiceRowFromBackend(invoice, null),
      property: {
        name: invoice.seller?.name ?? '',
        addressLine1: invoice.seller?.address?.line1 ?? null,
        city: invoice.seller?.address?.city ?? null,
        countryCode: invoice.seller?.address?.country ?? 'IN',
      },
      lines: invoice.lines.map((line, index) => ({ id: String(index), description: line.description, totalAmount: line.amount })),
    };
  },
  voidInvoice: async (invoiceId: string, reason: string): Promise<void> => {
    await authedRequest('POST', `${propertyPath()}/invoices/${invoiceId}/void`, { reason }, idempotency());
  },
};

/** Housekeeping and maintenance, read from pms-backend. Cancelled items are not listed. */
export const operationsApi = {
  housekeepingTasks: async (): Promise<HousekeepingTaskRow[]> =>
    (await authedRequest<{ data: HousekeepingTaskRow[] }>('GET', `${propertyPath()}/housekeeping/tasks?limit=200`)).data
      .filter((task) => task.status !== 'CANCELLED'),
  maintenanceTickets: async (): Promise<MaintenanceTicketRow[]> =>
    (await authedRequest<{ data: MaintenanceTicketRow[] }>('GET', `${propertyPath()}/maintenance-requests?limit=200`)).data
      .filter((ticket) => ticket.status !== 'CANCELLED'),
  /**
   * How many rooms are ready for guests, from the room list. A room is ready when it is in service
   * and clean or inspected, the same rule the backend uses when it checks a room in.
   */
  housekeepingSummary: async (): Promise<HousekeepingSummaryRow> => {
    const rooms = await inventoryApi.rooms();
    const count = (statuses: string[]) => rooms.filter((room) => statuses.includes(room.status)).length;
    return {
      rooms: {
        total: rooms.length,
        ready: count(['VACANT_CLEAN', 'INSPECTED', 'OCCUPIED_CLEAN']),
        dirty: count(['VACANT_DIRTY', 'OCCUPIED_DIRTY']),
        occupied: count(['OCCUPIED_CLEAN', 'OCCUPIED_DIRTY']),
        outOfOrder: count(['OUT_OF_ORDER']),
      },
    };
  },
};

export const reportsApi = {
  dailyFlash: async (date?: string) => store.dailyFlash(date),
  occupancy: async (from: string, to: string) => store.occupancyReport(from, to),
  revenue: async (from: string, to: string) => store.revenueReport(from, to),
  movement: async (from: string, to: string) => store.movementReport(from, to),
  housekeeping: async (from: string, to: string) => store.housekeepingReport(from, to),
  exportDailyFlash: (date: string) => `/reports/daily-flash/export.csv?${new URLSearchParams({ date })}`,
  exportOccupancy: (from: string, to: string) => `/reports/occupancy/export.csv?${new URLSearchParams({ from, to })}`,
  exportRevenue: (from: string, to: string) => `/reports/revenue/export.csv?${new URLSearchParams({ from, to })}`,
  exportMovement: (from: string, to: string) => `/reports/arrivals-departures/export.csv?${new URLSearchParams({ from, to })}`,
};

export const auditApi = {
  list: async (limit = 20) => store.auditEvents(limit),
  forGuest: async (guestId: string, limit = 15) => store.guestAuditEvents(guestId, limit),
  export: () => '/audit-log/export.csv',
};

export const nightAuditApi = {
  get: async (date: string) => store.nightAuditGet(date),
  preview: async (date: string) => store.nightAuditPreview(date),
  close: async (date: string, _idempotencyKey: string) => store.nightAuditClose(date),
  reopen: async (date: string, reason: string) => store.nightAuditReopen(date, reason),
};

export interface RoleMatrix {
  roles: Array<{ key: string; name: string }>;
  resources: Array<{ resource: string; permissions: Array<{ key: string; action: string; description: string; roles: string[] }> }>;
}

interface BackendUserSummary { id: string; email: string; fullName: string; status: string; lastLoginAt: string | null }
interface BackendUserDetail extends BackendUserSummary {
  propertyRoles: Array<{ propertyId: string; roleId: string; roleCode: string; roleName: string }>;
}
interface BackendRole { id: string; code: string; name: string; description: string | null; isEditable: boolean; permissions: Array<{ code: string }> }
interface BackendPermission { code: string; module: string; description: string }

/** The staff member as the staff screen lists them: their role at the signed-in property, or null if they have none there. */
function userRowOf(user: BackendUserDetail): UserRow | null {
  const propertyId = backendPropertyId ?? '';
  const role = user.propertyRoles.find((item) => item.propertyId === propertyId);
  if (!role) return null;
  const status: UserRow['status'] = user.status === 'DEACTIVATED' ? 'DISABLED' : user.status === 'INVITED' ? 'INVITED' : 'ACTIVE';
  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    status,
    lastLoginAt: user.lastLoginAt,
    membershipActive: status !== 'DISABLED',
    invitePending: status === 'INVITED',
    inviteExpired: false,
    propertyId,
    roleKey: role.roleCode,
    roleName: role.roleName,
  };
}

async function staffOfProperty(): Promise<UserRow[]> {
  const list = await authedRequest<{ data: BackendUserSummary[] }>('GET', '/users?limit=200');
  const details = await Promise.all(list.data.map((user) => authedRequest<BackendUserDetail>('GET', `/users/${user.id}`)));
  return details.map(userRowOf).filter((row): row is UserRow => row !== null);
}

async function rolesOfTenant(): Promise<BackendRole[]> {
  return (await authedRequest<{ data: BackendRole[] }>('GET', '/roles')).data;
}

/* Staff and roles, read from and written to pms-backend. Roles are keyed by their backend code. */
export const adminApi = {
  users: async (): Promise<UserRow[]> => staffOfProperty(),
  invite: async (body: { email: string; fullName: string; roleKey: string }): Promise<{ email: string }> => {
    const role = (await rolesOfTenant()).find((item) => item.code === body.roleKey);
    if (!role) throw new ApiError('That role does not exist.', 422, 'UNKNOWN_ROLE');
    const user = await authedRequest<BackendUserSummary>('POST', '/users', {
      email: body.email,
      fullName: body.fullName,
      propertyRoles: [{ propertyId: backendPropertyId, roleId: role.id }],
    });
    return { email: user.email };
  },
  /** The backend emails invitations and cannot resend them yet. */
  reissueInvite: async (_id: string): Promise<void> => {
    throw new ApiError('Resending an invitation is not available yet. Invite the person again instead.', 501, 'NOT_AVAILABLE');
  },
  /** Cancelling a pending invitation deactivates the account it created. */
  cancelInvite: async (id: string): Promise<void> => {
    await authedRequest('POST', `/users/${id}/deactivate`);
  },
  updateUser: async (id: string, body: { fullName?: string }): Promise<void> => {
    await authedRequest('PATCH', `/users/${id}`, body);
  },
  /** Gives the person one role at the property. Their roles at other properties are kept. */
  setRole: async (id: string, propertyId: string, roleKey: string): Promise<void> => {
    const [user, roles] = await Promise.all([authedRequest<BackendUserDetail>('GET', `/users/${id}`), rolesOfTenant()]);
    const role = roles.find((item) => item.code === roleKey);
    if (!role) throw new ApiError('That role does not exist.', 422, 'UNKNOWN_ROLE');
    const kept = user.propertyRoles
      .filter((item) => item.propertyId !== propertyId)
      .map((item) => ({ propertyId: item.propertyId, roleId: item.roleId }));
    await authedRequest('PUT', `/users/${id}/property-roles`, { assignments: [...kept, { propertyId, roleId: role.id }] });
  },
  setUserStatus: async (id: string, status: 'ACTIVE' | 'DISABLED'): Promise<void> => {
    await authedRequest('POST', `/users/${id}/${status === 'ACTIVE' ? 'reactivate' : 'deactivate'}`);
  },
  roles: async (): Promise<RoleRow[]> => {
    const [roles, staff] = await Promise.all([rolesOfTenant(), staffOfProperty()]);
    return roles.map((role) => ({
      id: role.id,
      key: role.code,
      name: role.name,
      description: role.description,
      isSystem: !role.isEditable,
      isActive: true,
      permissions: role.permissions.map((item) => item.code),
      memberCount: staff.filter((member) => member.roleKey === role.code).length,
    }));
  },
  /** Each permission, grouped by its module, with the roles that hold it. */
  matrix: async (): Promise<RoleMatrix> => {
    const [roles, catalog] = await Promise.all([rolesOfTenant(), authedRequest<{ data: BackendPermission[] }>('GET', '/permissions')]);
    const byModule = new Map<string, RoleMatrix['resources'][number]['permissions']>();
    for (const permission of catalog.data) {
      const holders = roles.filter((role) => role.permissions.some((item) => item.code === permission.code)).map((role) => role.code);
      const list = byModule.get(permission.module) ?? [];
      list.push({ key: permission.code, action: permission.code.split('.').slice(1).join('.'), description: permission.description, roles: holders });
      byModule.set(permission.module, list);
    }
    return {
      roles: roles.map((role) => ({ key: role.code, name: role.name })),
      resources: [...byModule].map(([resource, permissions]) => ({ resource, permissions })),
    };
  },
  taxRules: async () => store.taxRules(),
  createTaxRule: async (body: Record<string, unknown>) => store.createTaxRule(body),
  updateTaxRule: async (id: string, body: Record<string, unknown>) => store.updateTaxRule(id, body),
};

const THEME_STORAGE_KEY = 'pms.theme';

/*
 * The colour theme is a property setting, so it follows the property. Before sign-in, or when
 * the setting cannot be read, the last theme chosen on this browser is used.
 */
export const themeApi = {
  get: async (): Promise<{ themeKey: ThemeKey }> => {
    const local = (localStorage.getItem(THEME_STORAGE_KEY) ?? 'CRIMSON_RED') as ThemeKey;
    if (!backendPropertyId) return { themeKey: local };
    try {
      const themeKey = await settingsApi.get<ThemeKey>('appearance.theme', local);
      localStorage.setItem(THEME_STORAGE_KEY, themeKey);
      return { themeKey };
    } catch {
      return { themeKey: local };
    }
  },
  set: async (themeKey: ThemeKey) => {
    localStorage.setItem(THEME_STORAGE_KEY, themeKey);
    if (backendPropertyId) await settingsApi.set('appearance.theme', themeKey);
    return { themeKey, applied: true };
  },
};
