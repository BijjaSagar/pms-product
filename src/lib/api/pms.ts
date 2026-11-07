import { store } from '../../data/store';
import { clearAccessToken, saveAccessToken } from './authToken';
import { ApiError, apiRequest } from './client';
import type { ThemeKey } from '../../types';
import { hotelTodayIso, shiftDate } from '../../utils/date';

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
  /** Most guests the room sleeps; set for rooms loaded from the real inventory. */
  maxOccupancy?: number;
  /** Bed setup of the room's bed type, e.g. "1 King Bed (180x200 cm)". */
  bedSetup?: string | null;
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
  discountAmount?: string; paid?: number; createdAt?: string;
  /** 24-hour "HH:mm". */
  checkInTime?: string; checkOutTime?: string;
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

interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
}

type BackendRole = 'ADMIN' | 'STAFF';

interface BackendMe {
  id: string;
  email: string;
  name: string;
  role: BackendRole;
  /** The one property a STAFF user belongs to; null for ADMIN. */
  propertyId: string | null;
}

/** What `GET /properties` returns: every property for ADMIN, only their own for STAFF. */
interface BackendProperty {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string;
  defaultCurrency: string;
  checkInTime: string;
  checkOutTime: string;
  isActive: boolean;
}

const ROLE_LABELS: Record<BackendRole, { id: string; key: string; name: string; description: string }> = {
  ADMIN: { id: 'role-admin', key: 'admin', name: 'Administrator', description: 'Manages every property.' },
  STAFF: { id: 'role-staff', key: 'staff', name: 'Staff', description: 'Works at one property.' },
};

/** An ADMIN's choice of property for this browser tab; STAFF never use it. */
const ACTIVE_PROPERTY_KEY = 'pms.activePropertyId';

/**
 * Authentication and property access are real (backend `/auth/*` and
 * `/properties`): a STAFF user only ever sees their own property, an ADMIN
 * picks one. Permissions and all other data are not on the backend yet, so they
 * still come from the demo store, which is presented as the active property.
 */
export const authApi = {
  login: async (email: string, password: string, remember: boolean) => {
    const { accessToken } = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    saveAccessToken(accessToken, remember);
  },
  me: async (): Promise<AuthMe> => {
    const [user, properties] = await Promise.all([
      apiRequest<BackendMe>('/auth/me'),
      apiRequest<BackendProperty[]>('/properties'),
    ]);
    const demo = store.session();
    const role = ROLE_LABELS[user.role];
    const demoProperty = demo.user.propertyMemberships[0]?.property;

    const propertyIds = properties.filter((p) => p.isActive).map((p) => p.id);
    const saved = sessionStorage.getItem(ACTIVE_PROPERTY_KEY);
    const activeId =
      user.role === 'STAFF'
        ? user.propertyId
        : saved && propertyIds.includes(saved)
          ? saved
          : propertyIds.length === 1
            ? (propertyIds[0] ?? null)
            : null;

    const active = properties.find((p) => p.id === activeId);
    backendPropertyId = active?.id ?? null;
    if (active) {
      store.adoptProperty({
        id: active.id,
        name: active.name,
        slug: active.code,
        currencyCode: active.defaultCurrency,
        checkInTime: active.checkInTime,
        checkOutTime: active.checkOutTime,
        addressLine1: active.address,
        city: active.city,
      });
    }

    return {
      ...demo,
      user: {
        ...demo.user,
        email: user.email,
        fullName: user.name,
        propertyMemberships: properties.map((p) => ({
          id: `membership-${p.id}`,
          userId: demo.user.id,
          propertyId: p.id,
          roleId: role.id,
          isActive: p.isActive,
          role,
          property: {
            id: p.id,
            name: p.name,
            slug: p.code,
            timezone: demoProperty?.timezone ?? 'UTC',
            currencyCode: p.defaultCurrency,
          },
        })),
      },
      activePropertyId: active?.id ?? null,
    };
  },
  /** Always forgets the token locally, even if the server could not be reached. */
  logout: async () => {
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Already signed out server-side; nothing left to revoke.
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    } finally {
      clearAccessToken();
      sessionStorage.removeItem(ACTIVE_PROPERTY_KEY);
      backendPropertyId = null;
    }
  },
  /** Only meaningful for ADMIN; a STAFF user's property comes from the backend. */
  switchProperty: async (propertyId: string) => {
    sessionStorage.setItem(ACTIVE_PROPERTY_KEY, propertyId);
  },
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
  /** Holiday and event names falling on the date. */
  events: string[];
}

/** Per-date notes and enquiries shown in the room calendar's date header. */
export const dayLogApi = {
  summary: async (dates: string[]) => store.dayLogSummary(dates),
  note: async (date: string) => store.dayNote(date),
  saveNote: async (date: string, text: string) => store.saveDayNote(date, text),
  enquiries: async (date: string) => store.dayEnquiries(date),
  removeEnquiry: async (id: string) => store.removeDayEnquiry(id),
};

export type PropertyTypeKey = 'HOTEL' | 'RESORT' | 'VILLA' | 'MOTEL' | 'APARTMENT';

/** A property as the backend stores it (`GET /properties/:id`). */
export interface PropertyDetails {
  id: string;
  name: string;
  code: string;
  type: PropertyTypeKey;
  description: string | null;
  address: string | null;
  city: string;
  state: string | null;
  country: string;
  postalCode: string | null;
  phone: string | null;
  frontDeskPhone: string | null;
  emergencyContact: string | null;
  email: string | null;
  generalEmail: string | null;
  reservationsEmail: string | null;
  website: string | null;
  /** 24-hour "HH:mm". */
  checkInTime: string;
  /** 24-hour "HH:mm". */
  checkOutTime: string;
  /** ISO 4217 code. */
  defaultCurrency: string;
  numberOfFloors: number | null;
  totalRooms: number | null;
  isActive: boolean;
}

/** Only the fields being changed; `null` clears an optional field. */
export type PropertyUpdate = Partial<Omit<PropertyDetails, 'id' | 'isActive'>>;

/** Real backend calls. Reading is open to the property's own staff; updating is ADMIN only. */
export const propertyApi = {
  get: async (id: string) => apiRequest<PropertyDetails>(`/properties/${id}`),
  update: async (id: string, body: PropertyUpdate) =>
    apiRequest<PropertyDetails>(`/properties/${id}`, { method: 'PATCH', body }),
};

export type RoomTypeStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

/** A room type of one property as the backend stores it (`/:propertyId/rooms`). */
export interface RoomTypeDetails {
  id: string;
  propertyId: string;
  name: string;
  /** Number of physical rooms of this type. */
  roomCount: number;
  /** Maximum guests per room. */
  capacity: number;
  /** Per night; the backend returns the decimal as a string. */
  baseRate: string;
  status: RoomTypeStatus;
  /** Bed classification (a room category of the same property), if set. */
  categoryId: string | null;
  category: { id: string; name: string; bedSetup: string } | null;
}

export interface RoomTypeInput {
  name: string;
  roomCount: number;
  capacity: number;
  baseRate: number;
  status: RoomTypeStatus;
  /** Send null to clear the bed classification. */
  categoryId?: string | null;
}

/** Real backend calls, always scoped to one property. */
export const roomTypeApi = {
  list: async (propertyId: string) => apiRequest<RoomTypeDetails[]>(`/${propertyId}/rooms`),
  create: async (propertyId: string, body: RoomTypeInput) =>
    apiRequest<RoomTypeDetails>(`/${propertyId}/rooms`, { method: 'POST', body }),
  update: async (propertyId: string, id: string, body: Partial<RoomTypeInput>) =>
    apiRequest<RoomTypeDetails>(`/${propertyId}/rooms/${id}`, { method: 'PATCH', body }),
};

/** A room category of one property as the backend stores it (`/:propertyId/room-categories`). */
export interface RoomCategoryDetails {
  id: string;
  propertyId: string;
  name: string;
  description: string | null;
  bedSetup: string;
  isActive: boolean;
}

export interface RoomCategoryInput {
  name: string;
  description?: string;
  bedSetup: string;
  isActive: boolean;
}

export const roomCategoryApi = {
  list: async (propertyId: string) => apiRequest<RoomCategoryDetails[]>(`/${propertyId}/room-categories`),
  create: async (propertyId: string, body: RoomCategoryInput) =>
    apiRequest<RoomCategoryDetails>(`/${propertyId}/room-categories`, { method: 'POST', body }),
  update: async (propertyId: string, id: string, body: Partial<RoomCategoryInput>) =>
    apiRequest<RoomCategoryDetails>(`/${propertyId}/room-categories/${id}`, { method: 'PATCH', body }),
  remove: async (propertyId: string, id: string) =>
    apiRequest<void>(`/${propertyId}/room-categories/${id}`, { method: 'DELETE' }),
};

/** An amenity of one property as the backend stores it (`/:propertyId/amenities`). */
export interface AmenityDetails {
  id: string;
  propertyId: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface AmenityInput {
  name: string;
  description?: string;
  isActive: boolean;
}

export const amenityApi = {
  list: async (propertyId: string) => apiRequest<AmenityDetails[]>(`/${propertyId}/amenities`),
  create: async (propertyId: string, body: AmenityInput) =>
    apiRequest<AmenityDetails>(`/${propertyId}/amenities`, { method: 'POST', body }),
  update: async (propertyId: string, id: string, body: Partial<AmenityInput>) =>
    apiRequest<AmenityDetails>(`/${propertyId}/amenities/${id}`, { method: 'PATCH', body }),
  remove: async (propertyId: string, id: string) =>
    apiRequest<void>(`/${propertyId}/amenities/${id}`, { method: 'DELETE' }),
};

export type MaintenanceTradeCategory =
  | 'HVAC' | 'PLUMBING' | 'RENOVATION' | 'ELECTRICAL' | 'HOUSEKEEPING' | 'SECURITY' | 'GENERAL';
export type MaintenanceReasonPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type MaintenanceReasonStatus = 'ACTIVE' | 'INACTIVE';

/** A maintenance reason of one property as the backend stores it (`/:propertyId/maintenance-reasons`). */
export interface MaintenanceReasonDetails {
  id: string;
  propertyId: string;
  reasonName: string;
  tradeCategory: MaintenanceTradeCategory;
  priority: MaintenanceReasonPriority;
  status: MaintenanceReasonStatus;
}

export interface MaintenanceReasonInput {
  reasonName: string;
  tradeCategory: MaintenanceTradeCategory;
  priority: MaintenanceReasonPriority;
  status: MaintenanceReasonStatus;
}

export const maintenanceReasonApi = {
  list: async (propertyId: string) =>
    apiRequest<MaintenanceReasonDetails[]>(`/${propertyId}/maintenance-reasons`),
  create: async (propertyId: string, body: MaintenanceReasonInput) =>
    apiRequest<MaintenanceReasonDetails>(`/${propertyId}/maintenance-reasons`, { method: 'POST', body }),
  update: async (propertyId: string, id: string, body: Partial<MaintenanceReasonInput>) =>
    apiRequest<MaintenanceReasonDetails>(`/${propertyId}/maintenance-reasons/${id}`, { method: 'PATCH', body }),
  remove: async (propertyId: string, id: string) =>
    apiRequest<void>(`/${propertyId}/maintenance-reasons/${id}`, { method: 'DELETE' }),
};

/** A room offering of one property as the backend stores it (`/:propertyId/room-listings`). */
export interface RoomDetails {
  id: string;
  propertyId: string;
  roomTypeId: string;
  roomType: { id: string; name: string };
  /** Bed type: the room category whose bed setup the room uses. */
  categoryId: string | null;
  category: { id: string; name: string; bedSetup: string } | null;
  name: string;
  description: string | null;
  /** Number of physical rooms of this offering. */
  roomCount: number;
  allowExtraBeds: boolean;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  bathrooms: number;
  amenityIds: string[];
}

export interface RoomInput {
  roomTypeId: string;
  name: string;
  description?: string;
  roomCount: number;
  categoryId?: string | null;
  allowExtraBeds: boolean;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  bathrooms: number;
  amenityIds: string[];
}

export const roomListingApi = {
  list: async (propertyId: string) => apiRequest<RoomDetails[]>(`/${propertyId}/room-listings`),
  create: async (propertyId: string, body: RoomInput) =>
    apiRequest<RoomDetails>(`/${propertyId}/room-listings`, { method: 'POST', body }),
  update: async (propertyId: string, id: string, body: Partial<RoomInput>) =>
    apiRequest<RoomDetails>(`/${propertyId}/room-listings/${id}`, { method: 'PATCH', body }),
  remove: async (propertyId: string, id: string) =>
    apiRequest<void>(`/${propertyId}/room-listings/${id}`, { method: 'DELETE' }),
};

/** A property's floor plan (`/:propertyId/floor-plan`): floors that have rooms, with their boxes. */
export interface FloorPlanDetails {
  numberOfFloors: number | null;
  floors: {
    floor: number;
    roomCount: number;
    units: { position: number; roomNumber: string; roomId: string | null }[];
  }[];
}

export interface FloorPlanInput {
  numberOfFloors: number;
  floors: { floor: number; roomCount: number; assignments: { position: number; roomId: string }[] }[];
}

export const floorPlanApi = {
  get: async (propertyId: string) => apiRequest<FloorPlanDetails>(`/${propertyId}/floor-plan`),
  save: async (propertyId: string, body: FloorPlanInput) =>
    apiRequest<FloorPlanDetails>(`/${propertyId}/floor-plan`, { method: 'PUT', body }),
};

/** The bookable room inventory of one property (`/:propertyId/room-inventory`), read from its floor plan. */
export interface InventoryListing {
  /** Id of the room (Rooms table). */
  id: string;
  name: string;
  roomTypeName: string;
  /** The room type's nightly base rate. */
  baseRate: string;
  /** Status of the room's room type; only ACTIVE rooms can be booked. */
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  bedSetup: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
}

export interface InventoryRoom {
  roomNumber: string;
  floor: number;
  roomId: string | null;
  roomName: string | null;
  roomTypeId: string | null;
  roomTypeName: string | null;
  bedSetup: string | null;
  maxAdults: number | null;
  maxChildren: number | null;
  maxOccupancy: number | null;
  allowExtraBeds: boolean;
  baseRate: string | null;
  /** Linked to a room whose room type is active; only sellable rooms can be booked. */
  sellable: boolean;
}

export interface RoomInventory {
  /** The property's rooms (Rooms table), by name. */
  listings: InventoryListing[];
  /** Every physical room (floor-plan box). */
  rooms: InventoryRoom[];
}

export const roomInventoryApi = {
  get: async (propertyId: string) => apiRequest<RoomInventory>(`/${propertyId}/room-inventory`),
};

/* ---------- Guests and reservations on the backend (New Reservation screen) ---------- */

export type BackendGuestGender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

/** A guest as the backend stores it (`/:propertyId/guests`). */
export interface BackendGuest {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  nationality: string | null;
  dateOfBirth: string | null;
  gender: BackendGuestGender | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface BackendGuestInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  nationality?: string;
  dateOfBirth?: string;
  gender?: BackendGuestGender;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface BackendPage<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
}

export const guestDirectoryApi = {
  search: async (propertyId: string, search: string, pageSize = 6) =>
    apiRequest<BackendPage<BackendGuest>>(
      `/${propertyId}/guests?${new URLSearchParams({ search, pageSize: String(pageSize) })}`,
    ),
  create: async (propertyId: string, body: BackendGuestInput) =>
    apiRequest<BackendGuest>(`/${propertyId}/guests`, { method: 'POST', body }),
};

/** One room offering's availability for a stay (`/:propertyId/availability`). */
export interface RoomAvailability {
  roomId: string;
  roomName: string;
  roomTypeName: string;
  baseRate: string;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  sellable: boolean;
  totalUnits: number;
  /** How many more can be sold on every night of the stay. */
  available: number;
  /** Room numbers free for the whole stay. */
  freeUnits: { floorUnitId: string; roomNumber: string; floor: number }[];
}

export interface StayAvailability {
  checkIn: string;
  checkOut: string;
  nights: number;
  taxPercent: string;
  rooms: RoomAvailability[];
}

export type BookingStatusCode = 'CONFIRMED' | 'GUARANTEED' | 'TENTATIVE' | 'WAITLIST';
export type BookingSourceCode = 'DIRECT' | 'OTA' | 'AGENT' | 'GDS' | 'CORPORATE' | 'BOOKING_ENGINE' | 'META';
export type BookingCategoryCode = 'FIT' | 'GROUP' | 'MICE' | 'SERIES';
export type MealPlanCode = 'EP' | 'CP' | 'MAP' | 'AP';
export type BillingRouteCode = 'TO_GUEST' | 'TO_COMPANY' | 'TO_TRAVEL_AGENT' | 'DIRECT_SETTLEMENT';
export type PaymentMethodCode = 'UPI_QR' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'BANK_TRANSFER';

/** The New Reservation form as the backend accepts it. The server prices it. */
export interface BookingInput {
  status: BookingStatusCode;
  source: BookingSourceCode;
  sourceDetail?: string;
  sourceContactNumber?: string;
  externalReferenceId?: string;
  bookingCategory: BookingCategoryCode;
  primaryGuestId: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  rooms: {
    roomId: string;
    adults: number;
    children: number;
    infants: number;
    ratePlanName: string;
    mealPlan: MealPlanCode;
    floorUnitId?: string;
  }[];
  overridePrice: boolean;
  roomTotalOverride?: number;
  discountAmount: number;
  charges: {
    outletId: string;
    outletName: string;
    description: string;
    quantity: number;
    unitAmount: number;
    billingRoute?: BillingRouteCode;
    roomIndex: number;
  }[];
  payments: { amount: number; method: PaymentMethodCode; reference?: string }[];
  tasks: { text: string; isDone: boolean }[];
  specialRequests?: string;
  roomBillTo: 'TO_GUEST' | 'TO_COMPANY';
  extrasBillTo: 'TO_GUEST' | 'TO_COMPANY';
  noPost: boolean;
  companyName?: string;
  companyGst?: string;
  payAtHotel: boolean;
  paymentNotes?: string;
  /** The total the user saw; the server refuses the save if its own differs. */
  expectedTotal: number;
}

/** The saved reservation, as returned by the backend. */
export interface BookingResult {
  id: string;
  bookingCode: string;
  status: string;
  total: string;
  paid: string;
  balance: string;
  rooms: { roomIndex: number; roomNumber: string | null }[];
}

export const bookingApi = {
  availability: async (propertyId: string, checkIn: string, checkOut: string) =>
    apiRequest<StayAvailability>(
      `/${propertyId}/availability?${new URLSearchParams({ checkIn, checkOut })}`,
    ),
  /**
   * Saves a booking. `idempotencyKey` must stay the same for every attempt at
   * the same booking: the server then returns the booking already made instead
   * of a duplicate. A dropped connection is retried once with the same key.
   */
  create: async (propertyId: string, body: BookingInput, idempotencyKey: string) => {
    const send = () =>
      apiRequest<BookingResult>(`/${propertyId}/reservations`, {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
      });
    try {
      return await send();
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 0)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return send();
    }
  },
};

export const inventoryApi = {
  rooms: async () => store.rooms(),
  roomTypes: async () => store.roomTypes(),
  updateRoom: async (id: string, body: Record<string, unknown>) => store.updateRoom(id, body),
  createRoom: async (body: Record<string, unknown>) => store.createRoom(body),
  availability: async (checkIn: string, checkOut: string, roomTypeId: string) =>
    store.availability(checkIn, checkOut, roomTypeId),
  outOfOrder: async (id: string, reason: string) => store.outOfOrder(id, reason),
  backInService: async (id: string, reason: string) => store.backInService(id, reason),
};

/* ---------- Guests, reservations and the front desk: the real backend ---------- */

/** The property this tab works on; set when the session loads (authApi.me). */
let backendPropertyId: string | null = null;

function propertyPath(): string {
  if (!backendPropertyId) throw new ApiError('Choose a property first.', 0);
  return `/${backendPropertyId}`;
}

interface BackendReservationGuest {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

interface BackendReservationSummary {
  id: string;
  bookingCode: string;
  status: string;
  source: string;
  externalReferenceId: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  checkInTime: string;
  checkOutTime: string;
  guest: BackendReservationGuest;
  roomNumbers: string[];
  roomNames: string[];
  rooms: { id: string; roomIndex: number; roomName: string; roomNumber: string | null }[];
  adults: number;
  children: number;
  total: string;
  paid: string;
  balance: string;
  createdAt: string;
}

interface BackendReservationLine {
  id: string;
  roomIndex: number;
  roomId: string;
  roomName: string;
  roomTypeName: string;
  floorUnitId: string | null;
  roomNumber: string | null;
  adults: number;
  children: number;
  infants: number;
  ratePlanName: string;
  mealPlan: MealPlanCode;
  ratePerNight: string;
  released: boolean;
}

interface BackendReservationDetail {
  id: string;
  bookingCode: string;
  status: string;
  source: BookingSourceCode;
  sourceDetail: string | null;
  sourceContactNumber: string | null;
  externalReferenceId: string | null;
  bookingCategory: BookingCategoryCode;
  checkIn: string;
  checkOut: string;
  nights: number;
  checkInTime: string;
  checkOutTime: string;
  guest: BackendReservationGuest;
  rooms: BackendReservationLine[];
  charges: {
    roomIndex: number | null;
    outletId: string;
    outletName: string;
    description: string;
    quantity: number;
    unitAmount: string;
    billingRoute: BillingRouteCode;
  }[];
  overridePrice: boolean;
  roomCharges: string;
  discountAmount: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  paid: string;
  balance: string;
  specialRequests: string | null;
  roomBillTo: 'TO_GUEST' | 'TO_COMPANY';
  extrasBillTo: 'TO_GUEST' | 'TO_COMPANY';
  noPost: boolean;
  companyName: string | null;
  companyGst: string | null;
  payAtHotel: boolean;
  paymentNotes: string | null;
  createdAt: string;
}

const MAX_PAGE = 100;

function guestRowFromBackend(guest: BackendGuest): GuestRow {
  return { ...guest, companyName: null, stayCount: 0 };
}

function reservationRowFromSummary(r: BackendReservationSummary): ReservationRow {
  return {
    id: r.id,
    bookingCode: r.bookingCode,
    externalReferenceId: r.externalReferenceId,
    status: r.status,
    source: r.source,
    checkInDate: r.checkIn,
    checkOutDate: r.checkOut,
    nights: r.nights,
    adults: r.adults,
    children: r.children,
    currencyCode: 'INR',
    totalAmount: r.total,
    primaryGuestId: r.guest.id,
    guest: r.guest,
    guestName: `${r.guest.firstName} ${r.guest.lastName}`.trim(),
    roomNumber: r.roomNumbers[0] ?? null,
    roomSummary: r.rooms
      .map((line) => `${line.roomName} · ${line.roomNumber ?? 'Unassigned'}`)
      .join(' + '),
    roomTypeName: [...new Set(r.roomNames)].join(' + '),
    paid: Number(r.paid),
    createdAt: r.createdAt,
    checkInTime: r.checkInTime,
    checkOutTime: r.checkOutTime,
    roomLines: r.rooms.map((line) => ({
      id: line.id,
      roomTypeId: '',
      roomNumber: line.roomNumber,
      roomTypeName: line.roomName,
      nightlyRate: '0',
    })),
  };
}

function reservationRowFromDetail(r: BackendReservationDetail): ReservationRow {
  return {
    id: r.id,
    bookingCode: r.bookingCode,
    externalReferenceId: r.externalReferenceId,
    status: r.status,
    source: r.source,
    checkInDate: r.checkIn,
    checkOutDate: r.checkOut,
    nights: r.nights,
    adults: r.rooms.reduce((sum, line) => sum + line.adults, 0),
    children: r.rooms.reduce((sum, line) => sum + line.children, 0),
    infants: r.rooms.reduce((sum, line) => sum + line.infants, 0),
    currencyCode: 'INR',
    totalAmount: r.total,
    subtotal: r.subtotal,
    taxTotal: r.taxTotal,
    discountAmount: r.discountAmount,
    primaryGuestId: r.guest.id,
    guest: r.guest,
    guestName: `${r.guest.firstName} ${r.guest.lastName}`.trim(),
    roomNumber: r.rooms.find((line) => line.roomNumber)?.roomNumber ?? null,
    roomTypeName: [...new Set(r.rooms.map((line) => line.roomName))].join(' + '),
    nightlyRate: r.rooms[0]?.ratePerNight,
    specialRequests: r.specialRequests,
    internalNotes: r.paymentNotes,
    paid: Number(r.paid),
    createdAt: r.createdAt,
    roomLines: r.rooms.map((line) => ({
      id: line.id,
      roomTypeId: line.roomId,
      roomId: line.floorUnitId,
      roomNumber: line.roomNumber,
      roomTypeName: line.roomName,
      nightlyRate: line.ratePerNight,
      baseRate: line.ratePerNight,
      ratePlanName: line.ratePlanName,
      adults: line.adults,
      children: line.children,
      infants: line.infants,
      mealPlanName: line.mealPlan,
    })),
  };
}

function stayRowFrom(row: ReservationRow): StayRow {
  const room = row.roomNumber ? store.rooms().find((r) => r.roomNumber === row.roomNumber) : undefined;
  return {
    ...row,
    guestId: row.primaryGuestId ?? null,
    guestName: row.guestName ?? null,
    roomNumber: row.roomNumber ?? null,
    roomStatus: room?.status ?? null,
    roomReady: room ? room.status === 'VACANT_CLEAN' || room.status === 'INSPECTED' : false,
    folioId: null,
    folioNo: null,
    balance: String(Math.max(0, Number(row.totalAmount ?? 0) - Number(row.paid ?? 0))),
  };
}

/** Every reservation matching the filters, page by page (at most 1,000). */
async function listAllReservations(filters: Record<string, string>): Promise<ReservationRow[]> {
  const rows: ReservationRow[] = [];
  for (let page = 1; page <= 10; page++) {
    const query = new URLSearchParams({ ...filters, page: String(page), pageSize: String(MAX_PAGE) });
    const result = await apiRequest<BackendPage<BackendReservationSummary>>(
      `${propertyPath()}/reservations?${query}`,
    );
    rows.push(...result.data.map(reservationRowFromSummary));
    if (page * MAX_PAGE >= result.meta.total) break;
  }
  return rows;
}

/** Statuses the server lets you edit: bookings that have not arrived yet. */
const EDITABLE = ['CONFIRMED', 'GUARANTEED', 'TENTATIVE', 'WAITLIST'];

const getDetail = (id: string) =>
  apiRequest<BackendReservationDetail>(`${propertyPath()}/reservations/${id}`);

type BookingUpdate = Omit<BookingInput, 'payments' | 'tasks' | 'expectedTotal'>;

/** The saved reservation as an edit body, so a change keeps everything else as it is. */
function updateBodyFrom(r: BackendReservationDetail): BookingUpdate {
  const optional = (value: string | null) => value ?? undefined;
  return {
    status: r.status as BookingStatusCode,
    source: r.source,
    sourceDetail: optional(r.sourceDetail),
    sourceContactNumber: optional(r.sourceContactNumber),
    externalReferenceId: optional(r.externalReferenceId),
    bookingCategory: r.bookingCategory,
    primaryGuestId: r.guest.id,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    checkInTime: r.checkInTime,
    checkOutTime: r.checkOutTime,
    rooms: r.rooms.map((line) => ({
      roomId: line.roomId,
      adults: line.adults,
      children: line.children,
      infants: line.infants,
      ratePlanName: line.ratePlanName,
      mealPlan: line.mealPlan,
      floorUnitId: line.floorUnitId ?? undefined,
    })),
    overridePrice: r.overridePrice,
    roomTotalOverride: r.overridePrice ? Number(r.roomCharges) : undefined,
    discountAmount: Number(r.discountAmount),
    charges: r.charges.map((charge) => ({
      outletId: charge.outletId,
      outletName: charge.outletName,
      description: charge.description,
      quantity: charge.quantity,
      unitAmount: Number(charge.unitAmount),
      billingRoute: charge.billingRoute,
      roomIndex: charge.roomIndex ?? 1,
    })),
    specialRequests: optional(r.specialRequests),
    roomBillTo: r.roomBillTo,
    extrasBillTo: r.extrasBillTo,
    noPost: r.noPost,
    companyName: optional(r.companyName),
    companyGst: optional(r.companyGst),
    payAtHotel: r.payAtHotel,
    paymentNotes: optional(r.paymentNotes),
  };
}

export interface StayChange {
  checkIn?: string;
  checkOut?: string;
  /** Move one room line to another room number. */
  roomLineId?: string;
  roomNumber?: string;
}

/**
 * Changes the dates and/or the room number of a reservation. The server checks
 * the new stay is free (the reservation does not clash with itself) and
 * prices it again.
 */
async function changeStay(id: string, change: StayChange): Promise<ReservationRow> {
  const detail = await getDetail(id);
  if (!EDITABLE.includes(detail.status)) {
    const label = detail.status.toLowerCase().replace('_', '-');
    throw new ApiError(
      detail.status === 'CHECKED_IN'
        ? 'A checked-in stay cannot be moved or have its dates changed yet.'
        : `A ${label} reservation cannot be changed.`,
      409,
    );
  }
  const body = updateBodyFrom(detail);
  body.checkIn = change.checkIn ?? body.checkIn;
  body.checkOut = change.checkOut ?? body.checkOut;
  if (change.roomNumber) {
    const lineIndex = Math.max(
      0,
      detail.rooms.findIndex((line) => line.id === change.roomLineId),
    );
    const query = new URLSearchParams({
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      excludeReservationId: id,
    });
    const availability = await apiRequest<StayAvailability>(`${propertyPath()}/availability?${query}`);
    const target = availability.rooms
      .flatMap((room) => room.freeUnits.map((unit) => ({ ...unit, roomId: room.roomId })))
      .find((unit) => unit.roomNumber === change.roomNumber);
    if (!target) {
      throw new ApiError(`Room ${change.roomNumber} is not free for these dates.`, 409);
    }
    const line = body.rooms[lineIndex];
    if (line) body.rooms[lineIndex] = { ...line, roomId: target.roomId, floorUnitId: target.floorUnitId };
  }
  const saved = await apiRequest<BackendReservationDetail>(`${propertyPath()}/reservations/${id}`, {
    method: 'PUT',
    body,
  });
  return reservationRowFromDetail(saved);
}

/** Only the fields the backend Guest accepts. */
function guestBody(body: Record<string, unknown>): Record<string, unknown> {
  const allowed = [
    'firstName', 'lastName', 'email', 'phone', 'nationality', 'dateOfBirth',
    'gender', 'address', 'city', 'state', 'country',
  ];
  return Object.fromEntries(
    Object.entries(body).filter(([key, value]) => allowed.includes(key) && value !== undefined),
  );
}

export const guestApi = {
  list: async (search = '', page = 1, pageSize = 100): Promise<PageResult<GuestRow>> => {
    const query = new URLSearchParams({
      ...(search.trim() ? { search: search.trim().slice(0, 100) } : {}),
      page: String(page),
      pageSize: String(Math.min(pageSize, MAX_PAGE)),
    });
    const result = await apiRequest<BackendPage<BackendGuest>>(`${propertyPath()}/guests?${query}`);
    return {
      data: result.data.map(guestRowFromBackend),
      page: result.meta.page,
      pageSize: result.meta.pageSize,
      hasMore: result.meta.page * result.meta.pageSize < result.meta.total,
    };
  },
  get: async (id: string) =>
    guestRowFromBackend(await apiRequest<BackendGuest>(`${propertyPath()}/guests/${id}`)),
  create: async (body: Record<string, unknown>) =>
    guestRowFromBackend(
      await apiRequest<BackendGuest>(`${propertyPath()}/guests`, { method: 'POST', body: guestBody(body) }),
    ),
  update: async (id: string, body: Record<string, unknown>) =>
    guestRowFromBackend(
      await apiRequest<BackendGuest>(`${propertyPath()}/guests/${id}`, { method: 'PATCH', body: guestBody(body) }),
    ),
};

export const reservationApi = {
  list: async (search = '', status?: string, page = 1, pageSize = 100): Promise<PageResult<ReservationRow>> => {
    const query = new URLSearchParams({
      ...(search.trim() ? { search: search.trim().slice(0, 100) } : {}),
      ...(status ? { status } : {}),
      page: String(page),
      pageSize: String(Math.min(pageSize, MAX_PAGE)),
    });
    const result = await apiRequest<BackendPage<BackendReservationSummary>>(
      `${propertyPath()}/reservations?${query}`,
    );
    return {
      data: result.data.map(reservationRowFromSummary),
      page: result.meta.page,
      pageSize: result.meta.pageSize,
      hasMore: result.meta.page * result.meta.pageSize < result.meta.total,
    };
  },
  /** Every reservation of the property overlapping [from, to), for the calendar. */
  listRange: (from: string, to: string) => listAllReservations({ from, to }),
  get: async (id: string) => reservationRowFromDetail(await getDetail(id)),
  /** Date changes from the reservation drawer. */
  update: async (id: string, patch: { checkInDate?: string; checkOutDate?: string }) =>
    changeStay(id, { checkIn: patch.checkInDate, checkOut: patch.checkOutDate }),
  /** Drag and drop on the room calendar: new dates and/or room number. */
  changeStay,
  cancel: async (id: string, reason: string) =>
    reservationRowFromDetail(
      await apiRequest<BackendReservationDetail>(`${propertyPath()}/reservations/${id}/cancel`, {
        method: 'POST',
        body: { reason: reason.trim().slice(0, 500) || 'Cancelled' },
      }),
    ),
};

const ARRIVING = ['CONFIRMED', 'GUARANTEED', 'TENTATIVE'];

export const frontDeskApi = {
  arrivals: async (): Promise<StayList> => {
    const today = hotelTodayIso();
    const rows = await listAllReservations({ from: today, to: shiftDate(today, 1) });
    return {
      businessDate: today,
      data: rows
        .filter((row) => row.checkInDate === today && ARRIVING.includes(row.status))
        .map(stayRowFrom),
    };
  },
  /** In-house guests due out today, plus any still here after their check-out date. */
  departures: async (): Promise<StayList> => {
    const today = hotelTodayIso();
    const rows = await listAllReservations({ status: 'CHECKED_IN' });
    return {
      businessDate: today,
      data: rows
        .filter((row) => row.checkOutDate <= today)
        .sort((a, b) => a.checkOutDate.localeCompare(b.checkOutDate))
        .map(stayRowFrom),
    };
  },
  inHouse: async (): Promise<StayList> => ({
    businessDate: hotelTodayIso(),
    data: (await listAllReservations({ status: 'CHECKED_IN' })).map(stayRowFrom),
  }),
  checkIn: async (id: string) =>
    reservationRowFromDetail(
      await apiRequest<BackendReservationDetail>(`${propertyPath()}/reservations/${id}/check-in`, { method: 'POST' }),
    ),
  checkOut: async (id: string) =>
    reservationRowFromDetail(
      await apiRequest<BackendReservationDetail>(`${propertyPath()}/reservations/${id}/check-out`, { method: 'POST' }),
    ),
  extend: async (id: string, newCheckOutDate: string) => changeStay(id, { checkOut: newCheckOutDate }),
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
