import { store } from '../../data/store';
import { clearAccessToken, saveAccessToken } from './authToken';
import { ApiError, apiRequest } from './client';
import type { ThemeKey } from '../../types';

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
