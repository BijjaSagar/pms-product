import { store } from '../../data/store';
import type { ThemeKey } from '../../types';
import { ApiError } from './client';

export interface PropertyMembership {
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
  id: string; name: string; slug: string; timezone: string; currencyCode: string; countryCode?: string;
  checkInTime?: string; checkOutTime?: string; addressLine1?: string | null; city?: string | null;
}
export interface RoomTypeRow {
  id: string; code: string; name: string; description?: string | null; maxAdults: number; maxChildren: number;
  baseRate: string; amenities?: unknown; isActive: boolean;
}
export interface RoomRow {
  id: string; roomNumber: string; roomTypeId: string; roomTypeCode?: string | null; roomTypeName?: string | null;
  floor?: string | null; status: string; isActive: boolean; notes?: string | null; wing?: string | null; baseRate?: string;
  outOfOrderReason?: string | null;
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
}
export interface StayRow extends ReservationRow {
  guestId?: string | null;
  guestName: string | null; roomNumber: string | null; roomStatus?: string | null; roomReady?: boolean;
  folioId?: string | null; folioNo?: string | null; balance?: string;
}
export interface StayList { businessDate: string; data: StayRow[] }
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
export interface MaintenanceTicketRow {
  id: string; ticketNo: string; title: string; description: string; category: string; priority: string; status: string;
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
interface BackendErrorBody { error?: { code?: string; message?: string } }

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

  /**
   * GET /auth/me for the signed-in user's identity. Property memberships and
   * permissions still come from the demo store, because the rest of the app
   * runs on demo data whose property ids and permission names differ from the backend's.
   */
  me: async (): Promise<AuthMe> => {
    const token = readAccessToken();
    if (!token) throw new ApiError('You are not signed in.', 401, 'UNAUTHENTICATED');
    const { user } = await backendRequest<{ user: BackendUser }>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const demo = store.session();
    return {
      ...demo,
      user: { ...demo.user, id: user.id, email: user.email, fullName: user.fullName, status: user.status },
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

/** Room-night holds taken from the calendar; the store lapses each hold after its timeout. */
export const holdApi = {
  acquire: async (roomId: string, checkIn: string, checkOut: string): Promise<HoldResult> =>
    store.acquireHold(roomId, checkIn, checkOut),
};

export const propertyApi = {
  list: async () => store.properties(),
  update: async (id: string, body: Record<string, unknown>) => store.updateProperty(id, body),
};

export const inventoryApi = {
  rooms: async () => store.rooms(),
  roomTypes: async () => store.roomTypes(),
  updateRoom: async (id: string, body: Record<string, unknown>) => store.updateRoom(id, body),
  updateRoomType: async (id: string, body: Record<string, unknown>) => store.updateRoomType(id, body),
  createRoom: async (body: Record<string, unknown>) => store.createRoom(body),
  createRoomType: async (body: Record<string, unknown>) => store.createRoomType(body),
  availability: async (checkIn: string, checkOut: string, roomTypeId: string) =>
    store.availability(checkIn, checkOut, roomTypeId),
  outOfOrder: async (id: string, reason: string) => store.outOfOrder(id, reason),
  backInService: async (id: string, reason: string) => store.backInService(id, reason),
};

export const guestApi = {
  list: async (search = '', page = 1, pageSize = 100) => store.listGuests(search, page, pageSize),
  get: async (id: string) => store.getGuest(id) as GuestRow,
  create: async (body: Record<string, unknown>) => store.createGuest(body),
  update: async (id: string, body: Record<string, unknown>) => store.updateGuest(id, body) as GuestRow,
};

export const reservationApi = {
  list: async (search = '', status?: string, page = 1, pageSize = 100) =>
    store.listReservations(search, status, page, pageSize),
  get: async (id: string) => store.getReservation(id) as ReservationRow,
  create: async (body: Record<string, unknown>) => store.createReservation(body),
  update: async (id: string, body: Record<string, unknown>) => store.updateReservation(id, body) as ReservationRow,
  assignRoom: async (id: string, roomId: string, roomLineId?: string) => store.assignRoom(id, roomId, roomLineId),
  cancel: async (id: string, reason: string) => store.cancelReservation(id, reason),
};

export const frontDeskApi = {
  arrivals: async () => store.arrivals(),
  departures: async () => store.departures(),
  inHouse: async () => store.inHouse(),
  checkIn: async (id: string, _overrideReason?: string) => store.checkIn(id),
  checkOut: async (id: string, overrideReason?: string) => store.checkOut(id, overrideReason),
  extend: async (id: string, newCheckOutDate: string) => store.extend(id, newCheckOutDate),
};

export const folioApi = {
  listPayments: async () => store.listPayments(),
  listInvoices: async () => store.listInvoices(),
  balance: async (id: string) => store.folioBalance(id) as FolioBalanceRow,
  detail: async (id: string) => store.folioDetail(id) as FolioDetailRow,
  close: async (id: string) => store.closeFolio(id),
  reopen: async (id: string, reason: string) => store.reopenFolio(id, reason),
  postItem: async (id: string, body: Record<string, unknown>) => store.postItem(id, body),
  voidItem: async (itemId: string, reason: string) => store.voidItem(itemId, reason),
  payment: async (id: string, body: Record<string, unknown>) => store.recordPayment(id, body),
  refund: async (id: string, amount: string, reason: string) => store.refundPayment(id, amount, reason),
  issueInvoice: async (folioId: string) => store.issueInvoice(folioId) as { id: string; invoiceNo: string; status?: string },
  voidInvoice: async (invoiceId: string, reason: string) => store.voidInvoice(invoiceId, reason),
  invoice: async (id: string) => store.getInvoice(id) as InvoiceRow & { property: { name: string; addressLine1: string | null; city: string | null; countryCode: string } | null; lines: Array<{ id: string; description: string; totalAmount: string }> },
};

export const operationsApi = {
  housekeepingTasks: async (scope?: string) => store.housekeepingTasks(scope),
  housekeepingSummary: async () => store.housekeepingSummary(),
  createTask: async (body: Record<string, unknown>) => store.createTask(body),
  assignTask: async (id: string, assignedToId: string | null) => store.assignTask(id, assignedToId),
  startTask: async (id: string) => store.startTask(id),
  completeTask: async (id: string, notes?: string) => store.completeTask(id, notes),
  requestInspection: async (id: string) => store.requestInspection(id),
  inspectTask: async (id: string, result: 'pass' | 'fail', notes?: string) => store.inspectTask(id, result, notes),
  blockTask: async (id: string, reason: string) => store.blockTask(id, reason),
  unblockTask: async (id: string) => store.unblockTask(id),
  cancelTask: async (id: string, reason: string) => store.cancelTask(id, reason),
  maintenanceTickets: async () => store.maintenanceTickets(),
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

export const adminApi = {
  users: async () => store.users(),
  acceptInvite: async (token: string, _password: string) => ({ email: token, status: 'ACTIVE' }),
  invite: async (body: Record<string, unknown>) => store.invite(body),
  reissueInvite: async (id: string) => store.reissueInvite(id),
  cancelInvite: async (id: string) => store.cancelInvite(id),
  updateUser: async (id: string, body: Record<string, unknown>) => store.updateUser(id, body) as UserRow,
  setRole: async (id: string, propertyId: string, roleKey: string) => store.setRole(id, propertyId, roleKey),
  setUserStatus: async (id: string, status: 'ACTIVE' | 'DISABLED') => store.setUserStatus(id, status),
  roles: async () => store.roles(),
  permissions: async () => store.permissions(),
  matrix: async () => store.matrix(),
  taxRules: async () => store.taxRules(),
  createTaxRule: async (body: Record<string, unknown>) => store.createTaxRule(body),
  updateTaxRule: async (id: string, body: Record<string, unknown>) => store.updateTaxRule(id, body),
};

const THEME_STORAGE_KEY = 'pms.theme';

export const themeApi = {
  get: async (): Promise<{ themeKey: ThemeKey }> => ({
    themeKey: (localStorage.getItem(THEME_STORAGE_KEY) ?? 'CRIMSON_RED') as ThemeKey,
  }),
  set: async (themeKey: ThemeKey) => {
    localStorage.setItem(THEME_STORAGE_KEY, themeKey);
    return { themeKey, applied: true };
  },
};
