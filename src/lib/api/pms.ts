import { store } from '../../data/store';
import { clearAccessToken, saveAccessToken } from './authToken';
import { ApiError, apiBlob, apiRequest, requireActivePropertyId } from './client';
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

export type UserRoleKey = 'SUPER_ADMIN' | 'STAFF';

export interface AuthMe {
  user: {
    id: string;
    email: string;
    fullName: string;
    status: string;
    role: UserRoleKey;
    /** True until the user replaces a password a super admin set for them; the API refuses everything else meanwhile. */
    mustChangePassword: boolean;
    /** Every property a SUPER_ADMIN can open; for STAFF, the ones assigned to them. */
    propertyMemberships: PropertyMembership[];
  };
  activePropertyId: string | null;
  permissions: string[];
}

/** What the demo store knows about the session; the real account fields are added by `authApi.me`. */
export interface DemoSession {
  user: Omit<AuthMe['user'], 'role' | 'mustChangePassword'>;
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
  roomTypeName?: string | null;
  /** What the API calls the room offering; the adapter copies them to roomTypeId / roomTypeName. */
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
export interface TaxCategoryRow { id: string; name: string; description: string }
export type TaxComponentCode = 'CGST' | 'SGST';
export type TaxAppliedOn = 'ROOM_TARIFF' | 'TOTAL_AMOUNT';
export type TaxValueType = 'PERCENTAGE' | 'FIXED';
/** One amount band of a tax component: amounts from `from` to `to` are taxed at `value`. */
export interface TaxSlab { id: string; from: string; to: string; valueType: TaxValueType; value: string }
export interface TaxComponent { code: TaxComponentCode; appliedOn: TaxAppliedOn; slabs: TaxSlab[] }
export interface TaxSetupRuleRow {
  id: string; name: string; description: string; startDate: string; endDate: string;
  categoryId: string; components: TaxComponent[];
}
/** A rule as it is saved: the slabs' ids belong to the server, so they are not sent. */
export type TaxSetupRuleInput = Omit<TaxSetupRuleRow, 'id'>;
/** How tax is worked out: recomputed here under the composite supply concept, or taken as the OTA sent it. */
export type TaxComputation = 'COMPOSITE_SUPPLY' | 'OTA_VOUCHER';
export interface TaxGeneralSettings {
  computation: TaxComputation;
  sacRoomCode: string;
  enableSacCodes: boolean;
  applyRoomSlabOnMeals: boolean;
  applyRoomSlabOnExtraBed: boolean;
  showPropertyGstNo: boolean;
}
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

interface BackendMe {
  id: string;
  email: string;
  name: string;
  role: UserRoleKey;
  /** The properties a STAFF user is assigned to; empty for SUPER_ADMIN, who can use every property. */
  propertyIds: string[];
  mustChangePassword: boolean;
}

/** What `GET /properties` returns: every property for SUPER_ADMIN, only the assigned ones for STAFF. */
interface BackendProperty {
  id: string;
  name: string;
  code: string;
  addressLine1: string | null;
  city: string;
  defaultCurrency: string;
  isActive: boolean;
}

const ROLE_LABELS: Record<UserRoleKey, { id: string; key: string; name: string; description: string }> = {
  SUPER_ADMIN: { id: 'role-super-admin', key: 'super_admin', name: 'Super Admin', description: 'Manages every property and user.' },
  STAFF: { id: 'role-staff', key: 'staff', name: 'Staff', description: 'Works at the properties assigned to them.' },
};

/** The property chosen for this browser tab. The server decides what the user may open; this only remembers the choice. */
const ACTIVE_PROPERTY_KEY = 'pms.activePropertyId';

/**
 * The property to open straight away, or null to show Choose a property. A choice already made in
 * this tab wins; otherwise a STAFF user with exactly one property goes straight in. A SUPER_ADMIN
 * always chooses, so they can add properties, and may open one that is inactive to fix or reactivate it.
 */
function pickActiveProperty(role: UserRoleKey, properties: BackendProperty[]): string | null {
  const usable = properties.filter((p) => role === 'SUPER_ADMIN' || p.isActive);
  const saved = sessionStorage.getItem(ACTIVE_PROPERTY_KEY);
  if (saved && usable.some((p) => p.id === saved)) return saved;
  return role === 'STAFF' && usable.length === 1 ? (usable[0]?.id ?? null) : null;
}

/**
 * Authentication and property access are real (backend `/auth/*` and
 * `/properties`): a STAFF user only ever sees the properties assigned to them,
 * a SUPER_ADMIN sees every property. Permissions and the demo-only screens are
 * not on the backend yet, so they still come from the demo store, which is
 * presented as the active property.
 */
export const authApi = {
  login: async (email: string, password: string) => {
    const { accessToken } = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    saveAccessToken(accessToken);
  },
  me: async (): Promise<AuthMe> => {
    const user = await apiRequest<BackendMe>('/auth/me');
    // Until the password is changed the API refuses every other route, so only the account is read.
    const properties = user.mustChangePassword ? [] : await apiRequest<BackendProperty[]>('/properties');
    const demo = store.session();
    const role = ROLE_LABELS[user.role];
    const demoProperty = demo.user.propertyMemberships[0]?.property;

    const activeId = pickActiveProperty(user.role, properties);
    const active = properties.find((p) => p.id === activeId);
    if (active) {
      store.adoptProperty({
        id: active.id,
        name: active.name,
        slug: active.code,
        currencyCode: active.defaultCurrency,
        addressLine1: active.addressLine1,
        city: active.city,
      });
    }

    return {
      ...demo,
      user: {
        ...demo.user,
        id: user.id,
        email: user.email,
        fullName: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        propertyMemberships: properties.map((p) => ({
          id: `membership-${p.id}`,
          userId: user.id,
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
  /** Replaces the signed-in user's password; the API signs out their other sessions. */
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<void>('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
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
  /** Opens a property, or (null) goes back to Choose a property. The API still limits what the user can open. */
  switchProperty: async (propertyId: string | null) => {
    if (propertyId) sessionStorage.setItem(ACTIVE_PROPERTY_KEY, propertyId);
    else sessionStorage.removeItem(ACTIVE_PROPERTY_KEY);
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

/** A property as the backend stores it (`GET /properties/:id`). */
export interface PropertyDetails {
  id: string;
  name: string;
  /** Shown as the "Abbreviation". */
  code: string;
  propertyGroup: string | null;
  locationCode: string | null;
  googleAnalyticsTag: string | null;
  metaPixel: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  country: string;
  state: string | null;
  city: string;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  /** ISO 4217 code. */
  defaultCurrency: string;
  ignoreDecimalInBillSettlement: boolean;
  /** In minutes. */
  checkoutToleranceValue: number | null;
  language: string | null;
  locationMapUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  propertySegment: string | null;
  starRating: number | null;
  taxType: string | null;
  gstn: string | null;
  tripAdvisorListingName: string | null;
  tripAdvisorPropertyId: string | null;
  googleListingName: string | null;
  trivagoListingName: string | null;
  propertyLegalName: string | null;
  corporateAddress: string | null;
  autoConfirmBookings: boolean;
  numberOfFloors: number | null;
  totalRooms: number | null;
  isActive: boolean;
}

/** Only the fields being changed; `null` clears an optional field. */
export type PropertyUpdate = Partial<Omit<PropertyDetails, 'id'>>;

/** What a new property needs; everything else is filled in later under Settings. */
export interface PropertyCreate {
  name: string;
  /** Abbreviation, 2-20 letters, digits, "-" or "_". */
  code: string;
  city: string;
  state?: string;
  country: string;
  defaultCurrency: string;
  numberOfFloors: number;
  totalRooms: number;
}

/** Real backend calls. Reading is open to the property's own staff; creating and updating is SUPER_ADMIN only. */
export const propertyApi = {
  /** Every property for a SUPER_ADMIN, only the assigned ones for STAFF. */
  list: async () => apiRequest<PropertyDetails[]>('/properties'),
  get: async (id: string) => apiRequest<PropertyDetails>(`/properties/${id}`),
  /** SUPER_ADMIN only. */
  create: async (body: PropertyCreate) => apiRequest<PropertyDetails>('/properties', { method: 'POST', body }),
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
  /** Bed type: the room category whose bed setup the room uses. */
  categoryId: string | null;
  category: { id: string; name: string; bedSetup: string } | null;
  name: string;
  description: string | null;
  /** Number of physical rooms of this category: the floor-plan rooms assigned to it (read-only). */
  roomCount: number;
  allowExtraBeds: boolean;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  bathrooms: number;
  /** 1-based position in the order of display on the smart chart; null until ordered. */
  chartOrder: number | null;
  /** 1-based position in the upsell order; null until ordered. */
  upsellOrder: number | null;
  abbreviation: string | null;
  /** The code the room goes by in integrations. */
  integrationCode: string | null;
  /** Complimentary inclusions, free text. */
  inclusions: string | null;
  /** Minimum occupancy at which the room sells. */
  baseOccupancy: number | null;
  /** Generally the total number of beds in the room. */
  idealOccupancy: number | null;
  defaultChildren: number;
  syncCategoryOnOta: boolean;
  excludeFromRevenue: boolean;
  excludeFromOccupancy: boolean;
  excludeFromUpgrade: boolean;
  mealPlans: MealPlanKey[];
  amenityIds: string[];
}

export type MealPlanKey = 'EP' | 'CP' | 'MAP' | 'AP' | 'MAPAI' | 'APAI';

export type RoomOrderList = 'chart' | 'upsell';

export interface RoomInput {
  name: string;
  /** Nightly base rate. */
  baseRate: number;
  /** Send null to clear. */
  description?: string | null;
  categoryId?: string | null;
  allowExtraBeds: boolean;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  bathrooms: number;
  amenityIds: string[];
  /** The fields below can be sent as null to clear them. */
  abbreviation?: string | null;
  integrationCode?: string | null;
  inclusions?: string | null;
  baseOccupancy?: number | null;
  idealOccupancy?: number | null;
  defaultChildren?: number;
  syncCategoryOnOta?: boolean;
  excludeFromRevenue?: boolean;
  excludeFromOccupancy?: boolean;
  excludeFromUpgrade?: boolean;
  mealPlans?: MealPlanKey[];
}

export const roomListingApi = {
  list: async (propertyId: string) => apiRequest<RoomDetails[]>(`/${propertyId}/room-listings`),
  create: async (propertyId: string, body: RoomInput) =>
    apiRequest<RoomDetails>(`/${propertyId}/room-listings`, { method: 'POST', body }),
  update: async (propertyId: string, id: string, body: Partial<RoomInput>) =>
    apiRequest<RoomDetails>(`/${propertyId}/room-listings/${id}`, { method: 'PATCH', body }),
  remove: async (propertyId: string, id: string) =>
    apiRequest<void>(`/${propertyId}/room-listings/${id}`, { method: 'DELETE' }),
  /** `roomIds` must hold every room of the property, first to last. */
  setOrder: async (propertyId: string, list: RoomOrderList, roomIds: string[]) =>
    apiRequest<RoomDetails[]>(`/${propertyId}/room-listings/order`, { method: 'PUT', body: { list, roomIds } }),
};

/** A photo of a room (`/:propertyId/room-listings/:roomId/images`); the bytes come from `roomImageApi.file`. */
export interface RoomImageDetails {
  id: string;
  roomId: string;
  fileName: string;
  mimeType: string;
  /** Bytes. */
  size: number;
  caption: string | null;
  createdAt: string;
}

export const roomImageApi = {
  list: async (propertyId: string, roomId: string) =>
    apiRequest<RoomImageDetails[]>(`/${propertyId}/room-listings/${roomId}/images`),
  upload: async (propertyId: string, roomId: string, file: File, caption?: string) => {
    const body = new FormData();
    body.append('file', file);
    if (caption) body.append('caption', caption);
    return apiRequest<RoomImageDetails>(`/${propertyId}/room-listings/${roomId}/images`, { method: 'POST', body });
  },
  /** Send null or blank to clear the caption. */
  update: async (propertyId: string, roomId: string, id: string, caption: string | null) =>
    apiRequest<RoomImageDetails>(`/${propertyId}/room-listings/${roomId}/images/${id}`, {
      method: 'PATCH',
      body: { caption },
    }),
  remove: async (propertyId: string, roomId: string, id: string) =>
    apiRequest<void>(`/${propertyId}/room-listings/${roomId}/images/${id}`, { method: 'DELETE' }),
  file: async (propertyId: string, roomId: string, id: string) =>
    apiBlob(`/${propertyId}/room-listings/${roomId}/images/${id}/file`),
};

export type SmokingPolicyKey = 'ALL_NON_SMOKING' | 'SMOKING_PERMITTED';

/** The smoking policy and amenity catalog of one property (`/:propertyId/property-amenities`). */
export interface PropertyAmenitiesDetails {
  /** Null until one is chosen. */
  smokingPolicy: SmokingPolicyKey | null;
  /** Every catalog amenity; `code` is an upper-case name such as `FREE_INTERNET`. */
  amenities: { code: string; isActive: boolean }[];
}

export const propertyAmenitiesApi = {
  get: async (propertyId: string) => apiRequest<PropertyAmenitiesDetails>(`/${propertyId}/property-amenities`),
  setSmokingPolicy: async (propertyId: string, smokingPolicy: SmokingPolicyKey | null) =>
    apiRequest<PropertyAmenitiesDetails>(`/${propertyId}/property-amenities/smoking-policy`, {
      method: 'PUT',
      body: { smokingPolicy },
    }),
  setAmenity: async (propertyId: string, code: string, isActive: boolean) =>
    apiRequest<PropertyAmenitiesDetails>(`/${propertyId}/property-amenities/${code}`, {
      method: 'PUT',
      body: { isActive },
    }),
};

/** The smoking policy and catalog amenities of one room (`/:propertyId/room-listings/:roomId/category-amenities`). */
export interface CategoryAmenitiesDetails {
  /** Null until one is chosen. */
  smokingPolicy: SmokingPolicyKey | null;
  /** Every catalog amenity, in display order. */
  amenities: { code: string; type: string; name: string; isActive: boolean }[];
}

export const categoryAmenitiesApi = {
  get: async (propertyId: string, roomId: string) =>
    apiRequest<CategoryAmenitiesDetails>(`/${propertyId}/room-listings/${roomId}/category-amenities`),
  setSmokingPolicy: async (propertyId: string, roomId: string, smokingPolicy: SmokingPolicyKey | null) =>
    apiRequest<{ smokingPolicy: SmokingPolicyKey | null }>(
      `/${propertyId}/room-listings/${roomId}/category-amenities/smoking-policy`,
      { method: 'PUT', body: { smokingPolicy } },
    ),
  setAmenity: async (propertyId: string, roomId: string, code: string, isActive: boolean) =>
    apiRequest<{ code: string; isActive: boolean }>(
      `/${propertyId}/room-listings/${roomId}/category-amenities/${code}`,
      { method: 'PUT', body: { isActive } },
    ),
};

/** One bed type of a room (`/:propertyId/room-listings/:roomId/bed-types`). */
export interface RoomBedTypeDetails {
  code: string;
  name: string;
  /** 1-based position in the catalog. */
  displayOrder: number;
  isActive: boolean;
  /** Number of beds of this type in the room. */
  beds: number;
}

export const roomBedTypeApi = {
  list: async (propertyId: string, roomId: string) =>
    apiRequest<RoomBedTypeDetails[]>(`/${propertyId}/room-listings/${roomId}/bed-types`),
  /** Only the fields sent change. */
  update: async (propertyId: string, roomId: string, code: string, body: { isActive?: boolean; beds?: number }) =>
    apiRequest<RoomBedTypeDetails>(`/${propertyId}/room-listings/${roomId}/bed-types/${code}`, { method: 'PUT', body }),
};

/** An extra bed type of a room (`/:propertyId/room-listings/:roomId/extra-bed-types`); same catalog as bed types. */
export interface RoomExtraBedTypeDetails {
  code: string;
  name: string;
  /** 1-based position in the catalog. */
  displayOrder: number;
  isActive: boolean;
}

export const roomExtraBedTypeApi = {
  list: async (propertyId: string, roomId: string) =>
    apiRequest<RoomExtraBedTypeDetails[]>(`/${propertyId}/room-listings/${roomId}/extra-bed-types`),
  update: async (propertyId: string, roomId: string, code: string, isActive: boolean) =>
    apiRequest<{ code: string; isActive: boolean }>(`/${propertyId}/room-listings/${roomId}/extra-bed-types/${code}`, {
      method: 'PUT',
      body: { isActive },
    }),
};

/** The branding of one property (`/:propertyId/branding`); the logo bytes come from `propertyBrandingApi.logo`. */
export interface PropertyBrandingDetails {
  websiteUrl: string | null;
  /** What a bookable unit is called, e.g. "Room". */
  accommodationNomenclature: string | null;
  phoneNumbers: string[];
  showPropertyNameOnBookingEngine: boolean;
  hasLogo: boolean;
  /** Changes with the logo; use it to refresh a cached picture. */
  logoUpdatedAt: string | null;
}

export type PropertyBrandingInput = Omit<PropertyBrandingDetails, 'hasLogo' | 'logoUpdatedAt'>;

export const propertyBrandingApi = {
  get: async (propertyId: string) => apiRequest<PropertyBrandingDetails>(`/${propertyId}/branding`),
  save: async (propertyId: string, body: PropertyBrandingInput) =>
    apiRequest<PropertyBrandingDetails>(`/${propertyId}/branding`, { method: 'PUT', body }),
  uploadLogo: async (propertyId: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest<PropertyBrandingDetails>(`/${propertyId}/branding/logo`, { method: 'PUT', body });
  },
  removeLogo: async (propertyId: string) => apiRequest<void>(`/${propertyId}/branding/logo`, { method: 'DELETE' }),
  logo: async (propertyId: string) => apiBlob(`/${propertyId}/branding/logo`),
};

/** A meal plan of a property (`/:propertyId/meal-plans`), with the property's own names where set. */
export interface MealPlanDetails {
  /** 1-based position in the list. */
  displayOrder: number;
  /** The constant name, e.g. `EP`. */
  code: string;
  displayName: string;
  shortDisplayName: string;
}

export const mealPlanApi = {
  list: async (propertyId: string) => apiRequest<MealPlanDetails[]>(`/${propertyId}/meal-plans`),
  /** Only the names sent change. */
  update: async (propertyId: string, code: string, body: { displayName?: string; shortDisplayName?: string }) =>
    apiRequest<MealPlanDetails>(`/${propertyId}/meal-plans/${code}`, { method: 'PUT', body }),
};

/** A field of the guest registration card (`/:propertyId/grc-settings/fields`). */
export interface GrcFieldDetails {
  code: string;
  name: string;
  isEnabled: boolean;
}

/** How a property numbers and titles its guest registration cards (`/:propertyId/grc-settings/print`). */
export interface GrcPrintDetails {
  prefix: string | null;
  inPrefixNo: string | null;
  /** How many digits the running number is padded to. */
  postfixDigits: number;
  /** The running number. */
  postfixNo: number;
  printHeader: string;
}

export const grcSettingsApi = {
  fields: async (propertyId: string) => apiRequest<GrcFieldDetails[]>(`/${propertyId}/grc-settings/fields`),
  setField: async (propertyId: string, code: string, isEnabled: boolean) =>
    apiRequest<GrcFieldDetails>(`/${propertyId}/grc-settings/fields/${code}`, { method: 'PUT', body: { isEnabled } }),
  print: async (propertyId: string) => apiRequest<GrcPrintDetails>(`/${propertyId}/grc-settings/print`),
  /** Only the fields sent change; null clears a prefix. */
  updatePrint: async (propertyId: string, body: Partial<GrcPrintDetails>) =>
    apiRequest<GrcPrintDetails>(`/${propertyId}/grc-settings/print`, { method: 'PATCH', body }),
};

/** Reservation numbering, guest ages and booking rules (`/:propertyId/reservation-settings`). */
export interface ReservationSettingsDetails {
  reservationPrefix: string | null;
  /** The last reservation number issued. */
  maxReservationNumber: number;
  /** How many infants a room can have. */
  infantCount: number;
  infantDisplayText: string;
  infantMinAge: number;
  infantMaxAge: number;
  chargeableChildMinAge: number;
  chargeableChildMaxAge: number;
  daysBetweenCheckInCheckOut: number;
  considerDirtyRoomForParkingLot: boolean;
  softBlockForDoNotMove: boolean;
  allowZeroRateBookings: boolean;
  moveCheckInCheckOutBooking: boolean;
}

export const reservationSettingsApi = {
  get: async (propertyId: string) => apiRequest<ReservationSettingsDetails>(`/${propertyId}/reservation-settings`),
  /** Only the fields sent change; null clears the prefix. */
  update: async (propertyId: string, body: Partial<ReservationSettingsDetails>) =>
    apiRequest<ReservationSettingsDetails>(`/${propertyId}/reservation-settings`, { method: 'PATCH', body }),
};

/** Limits on post master (PM) reservations (`/:propertyId/post-master-settings`). */
export interface PostMasterSettingsDetails {
  /** Most PM reservations that can be open at once. */
  maxOpenPmReservations: number;
  /** Most gross amount open across all PM reservations. */
  pmOpenTotalGrossAmount: number;
  maxRooms: number;
  maxNights: number;
  maxRoomNights: number;
  maxReservationGrossAmount: number;
}

export const postMasterSettingsApi = {
  get: async (propertyId: string) => apiRequest<PostMasterSettingsDetails>(`/${propertyId}/post-master-settings`),
  /** Only the fields sent change. */
  update: async (propertyId: string, body: Partial<PostMasterSettingsDetails>) =>
    apiRequest<PostMasterSettingsDetails>(`/${propertyId}/post-master-settings`, { method: 'PATCH', body }),
};

export type HousekeepingPermissionKey = 'NONE' | 'CLEAN' | 'DIRTY' | 'TO_BE_INSPECTED' | 'INSPECTED' | 'UNDER_MAINTENANCE';

/** A housekeeping status of one property (`/:propertyId/housekeeping-statuses`). */
export interface HousekeepingStatusDetails {
  id: string;
  propertyId: string;
  name: string;
  /** "#rrggbb". */
  color: string;
  displayOrder: number;
  abbreviation: string;
  description: string | null;
  /** Which users may set the status: NONE, or only users who may mark rooms with the named status. */
  permissionRequired: HousekeepingPermissionKey;
  /** The status a room gets on check-in; one status per property. */
  checkinDefault: boolean;
  checkoutDefault: boolean;
  roomChangeDefault: boolean;
  availableForParkingLot: boolean;
  allowCheckin: boolean;
  checkinHardStop: boolean;
}

export type HousekeepingStatusInput = Omit<HousekeepingStatusDetails, 'id' | 'propertyId' | 'displayOrder'>;

export const housekeepingStatusApi = {
  list: async (propertyId: string) => apiRequest<HousekeepingStatusDetails[]>(`/${propertyId}/housekeeping-statuses`),
  create: async (propertyId: string, body: HousekeepingStatusInput) =>
    apiRequest<HousekeepingStatusDetails>(`/${propertyId}/housekeeping-statuses`, { method: 'POST', body }),
  update: async (propertyId: string, id: string, body: Partial<HousekeepingStatusInput>) =>
    apiRequest<HousekeepingStatusDetails>(`/${propertyId}/housekeeping-statuses/${id}`, { method: 'PATCH', body }),
  remove: async (propertyId: string, id: string) =>
    apiRequest<void>(`/${propertyId}/housekeeping-statuses/${id}`, { method: 'DELETE' }),
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

/** The general terms and conditions of one property (`/:propertyId/terms-inclusions`). */
export interface PropertyTermsDetails {
  includeInclusions: boolean;
  inclusions: string | null;
  includeBookingTerms: boolean;
  bookingTerms: string | null;
  includeCheckInTerms: boolean;
  checkInTerms: string | null;
  /** Null until the terms have been saved once. */
  updatedAt: string | null;
}

export type PropertyTermsInput = Omit<PropertyTermsDetails, 'updatedAt'>;

export const propertyTermsApi = {
  get: async (propertyId: string) => apiRequest<PropertyTermsDetails>(`/${propertyId}/terms-inclusions`),
  save: async (propertyId: string, body: Partial<PropertyTermsInput>) =>
    apiRequest<PropertyTermsDetails>(`/${propertyId}/terms-inclusions`, { method: 'PUT', body }),
};

/** A cancellation rule of one property (`/:propertyId/cancellation-rules`). */
export interface CancellationRuleDetails {
  id: string;
  propertyId: string;
  /** First check-in date the rule applies to; the backend returns a date-time at midnight UTC. */
  startDate: string;
  /** Last check-in date the rule applies to. */
  endDate: string;
  /** The penalty applies to a cancellation made this many days or fewer before check-in. */
  daysFromCheckin: number;
  /** Decimal string, e.g. "50.00". */
  penaltyPercent: string;
}

export interface CancellationRuleInput {
  /** "YYYY-MM-DD". */
  startDate: string;
  /** "YYYY-MM-DD". */
  endDate: string;
  daysFromCheckin: number;
  penaltyPercent: number;
}

export const cancellationRuleApi = {
  list: async (propertyId: string) => apiRequest<CancellationRuleDetails[]>(`/${propertyId}/cancellation-rules`),
  create: async (propertyId: string, body: CancellationRuleInput) =>
    apiRequest<CancellationRuleDetails>(`/${propertyId}/cancellation-rules`, { method: 'POST', body }),
  update: async (propertyId: string, id: string, body: Partial<CancellationRuleInput>) =>
    apiRequest<CancellationRuleDetails>(`/${propertyId}/cancellation-rules/${id}`, { method: 'PATCH', body }),
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
  /** The rooms of one room offering (see `roomTypeId`) that are free for every night of a stay. */
  availability: async (checkIn: string, checkOut: string, roomTypeId: string) =>
    apiRequest<AvailabilityResult>(
      `/${requireActivePropertyId()}/room-availability${queryString({ checkIn, checkOut, roomListingId: roomTypeId })}`,
    ),
  outOfOrder: async (id: string, reason: string) => store.outOfOrder(id, reason),
  backInService: async (id: string, reason: string) => store.backInService(id, reason),
};

const toGuestRow = (guest: GuestDirectoryRow): GuestRow => ({
  id: guest.id, firstName: guest.firstName, lastName: guest.lastName, email: guest.email, phone: guest.phone,
  companyName: guest.companyName, preferences: guest.preferences, internalNotes: guest.internalNotes,
  stayCount: guest.stayCount, lastStayAt: guest.lastStayAt,
});

const GUEST_FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'companyName', 'nationality', 'dateOfBirth', 'gender',
  'address', 'city', 'state', 'country', 'preferences', 'internalNotes',
] as const;

/** Only the fields the backend accepts for a guest; it refuses any other. */
const pickGuestFields = (body: Record<string, unknown>) =>
  Object.fromEntries(GUEST_FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

/** Guests of the active property, read from and saved to the guest directory in the backend. */
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
    toGuestRow(await guestDirectoryApi.create(requireActivePropertyId(), pickGuestFields(body))),
  update: async (id: string, body: Record<string, unknown>) =>
    toGuestRow(await guestDirectoryApi.update(requireActivePropertyId(), id, pickGuestFields(body))),
};

/** A guest of the property as the backend returns it, with the statistics the directory shows. */
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

function queryString(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

/** The guest directory of one property, read from the backend. */
export const guestDirectoryApi = {
  list: async (propertyId: string, query: GuestDirectoryQuery = {}) =>
    apiRequest<GuestDirectoryPage>(`/${propertyId}/guests${queryString({ ...query })}`),
  summary: async (propertyId: string) => apiRequest<GuestDirectorySummary>(`/${propertyId}/guests/summary`),
  get: async (propertyId: string, id: string) => apiRequest<GuestDirectoryRow>(`/${propertyId}/guests/${id}`),
  stays: async (propertyId: string, id: string) => apiRequest<GuestStayRow[]>(`/${propertyId}/guests/${id}/stays`),
  payments: async (propertyId: string, id: string) => apiRequest<GuestPaymentRow[]>(`/${propertyId}/guests/${id}/payments`),
  create: async (propertyId: string, body: Record<string, unknown>) =>
    apiRequest<GuestDirectoryRow>(`/${propertyId}/guests`, { method: 'POST', body }),
  update: async (propertyId: string, id: string, body: Record<string, unknown>) =>
    apiRequest<GuestDirectoryRow>(`/${propertyId}/guests/${id}`, { method: 'PATCH', body }),
};

const RESERVATION_STATUSES = ['DRAFT', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'];
const BILLING_ROUTES = ['To Guest', 'To Company', 'To Travel Agent', 'Direct Settlement'];

const money = (value: unknown): string => (Number(value) || 0).toFixed(2);
const text = (value: unknown, max: number): string | undefined => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed ? trimmed.slice(0, max) : undefined;
};
const route = (value: unknown): string | undefined =>
  typeof value === 'string' && BILLING_ROUTES.includes(value) ? value : undefined;

/**
 * The reservation of the New Reservation screen as the backend takes it. The screen keeps its own names
 * (pendingCharges, pendingPayments) and extra fields; the backend refuses fields it does not know.
 */
function toBackendReservation(body: Record<string, unknown>): Record<string, unknown> {
  const lines = (body.roomLines as ReservationRoomRow[] | undefined) ?? [];
  const charges = (body.pendingCharges as ReservationChargeRow[] | undefined) ?? [];
  const payments = (body.pendingPayments as ReservationPendingPaymentRow[] | undefined) ?? [];
  const billing = body.billingPreferences as Record<string, unknown> | undefined;
  return {
    externalReferenceId: text(body.externalReferenceId, 120),
    status: body.status === 'DRAFT' ? 'DRAFT' : body.status === 'CONFIRMED' ? 'CONFIRMED' : undefined,
    source: text(body.source, 60) ?? 'Direct',
    sourceType: text(body.sourceType, 120),
    sourceContactNumber: text(body.sourceContactNumber, 40),
    bookingCategory: text(body.bookingCategory, 40),
    primaryGuestId: body.primaryGuestId,
    checkInDate: body.checkInDate,
    checkOutDate: body.checkOutDate,
    checkInTime: text(body.checkInTime, 5),
    checkOutTime: text(body.checkOutTime, 5),
    roomLines: lines.map((line) => ({
      roomListingId: line.roomTypeId ?? line.roomListingId,
      roomNumber: text(line.roomNumber, 20),
      adults: line.adults ?? 1,
      children: line.children ?? 0,
      infants: line.infants ?? 0,
      baseRate: money(line.baseRate ?? line.nightlyRate),
      nightlyRate: money(line.nightlyRate),
      ratePlanName: text(line.ratePlanName, 80),
      mealPlanName: text(line.mealPlanName, 40),
      billingRoute: route(line.billingRoute),
      occupants: (line.occupants ?? [])
        .filter((occupant) => occupant.name?.trim())
        .map((occupant) => ({ name: occupant.name.trim().slice(0, 120), role: (occupant.role || 'Guest').slice(0, 60) })),
    })),
    charges: charges.map((charge) => {
      const index = lines.findIndex((line) => line.id === charge.roomLineId);
      return {
        outletId: charge.outletId,
        outletName: charge.outletName,
        description: charge.description,
        quantity: String(Math.round((Number(charge.quantity) || 0) * 100) / 100),
        unitAmount: money(charge.unitAmount),
        billingRoute: route(charge.billingRoute),
        roomLineIndex: index >= 0 ? index : undefined,
        postToFolio: charge.postToFolio,
      };
    }),
    payments: payments.map((payment) => ({
      amount: money(payment.amount),
      method: text(payment.method, 40) ?? 'Cash',
      reference: text(payment.reference, 120),
    })),
    discountAmount: money(body.discountAmount),
    billingPreferences: billing
      ? {
          roomBillTo: route(billing.roomBillTo),
          extrasBillTo: route(billing.extrasBillTo),
          billToCompany: billing.billToCompany === true,
          noPost: billing.noPost === true,
          payAtHotel: billing.payAtHotel === true,
          companyName: text(billing.companyName, 160),
          companyGst: text(billing.companyGst, 40),
        }
      : undefined,
    specialRequests: text(body.specialRequests, 2000),
    internalNotes: text(body.internalNotes, 4000),
  };
}

/** The details of a reservation the backend lets a screen change after booking. */
const DETAIL_FIELDS = [
  'externalReferenceId', 'source', 'sourceType', 'sourceContactNumber', 'bookingCategory', 'checkInTime',
  'checkOutTime', 'specialRequests', 'internalNotes', 'billingPreferences',
] as const;

/** The settings a booking depends on (`GET /:propertyId/reservation-options`). */
export interface ReservationOptions {
  numbering: { reservationPrefix: string | null };
  bookingRules: { allowZeroRateBookings: boolean; daysBetweenCheckInCheckOut: number; moveCheckInCheckOutBooking: boolean };
  mealPlans: Array<{ displayOrder: number; code: string; displayName: string; shortDisplayName: string }>;
  cancellationRules: Array<{ id: string; startDate: string; endDate: string; daysFromCheckin: number; penaltyPercent: string }>;
  terms: { inclusions: string | null; bookingTerms: string | null; checkInTerms: string | null };
}

interface ReservationListResponse { data: ReservationRow[]; total: number; page: number; pageSize: number }

/** Reservations of the active property, read from and saved to the reservations table in the backend. */
export const reservationApi = {
  list: async (search = '', status?: string, page = 1, pageSize = 100): Promise<PageResult<ReservationRow>> => {
    const result = await apiRequest<ReservationListResponse>(
      `/${requireActivePropertyId()}/reservations${queryString({
        search: search || undefined,
        status: status && RESERVATION_STATUSES.includes(status) ? status : undefined,
        page,
        pageSize,
      })}`,
    );
    return { data: result.data, page: result.page, pageSize: result.pageSize, hasMore: result.page * result.pageSize < result.total };
  },
  get: async (id: string) => apiRequest<ReservationRow>(`/${requireActivePropertyId()}/reservations/${id}`),
  options: async () => apiRequest<ReservationOptions>(`/${requireActivePropertyId()}/reservation-options`),
  /** Books the reservation. Give the same `idempotencyKey` on a retry and it is booked only once. */
  create: async (body: Record<string, unknown>, idempotencyKey?: string) =>
    apiRequest<ReservationRow>(`/${requireActivePropertyId()}/reservations`, {
      method: 'POST',
      body: toBackendReservation(body),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    }),
  /**
   * New dates go to the stay action, which re-checks the rooms; the other details are edited in place.
   * Give the reservation's `version` so a change made by someone else in the meantime is refused, not overwritten.
   */
  update: async (id: string, patch: Record<string, unknown>) => {
    const base = `/${requireActivePropertyId()}/reservations/${id}`;
    const version = typeof patch.version === 'number' ? patch.version : undefined;
    let result: ReservationRow | null = null;
    if (typeof patch.checkInDate === 'string' && typeof patch.checkOutDate === 'string') {
      result = await apiRequest<ReservationRow>(`${base}/stay`, {
        method: 'PATCH',
        body: { checkInDate: patch.checkInDate, checkOutDate: patch.checkOutDate, version },
      });
    }
    const details = Object.fromEntries(DETAIL_FIELDS.filter((key) => patch[key] !== undefined).map((key) => [key, patch[key]]));
    if (Object.keys(details).length > 0) {
      result = await apiRequest<ReservationRow>(base, { method: 'PATCH', body: { ...details, version: result?.version ?? version } });
    }
    return result ?? apiRequest<ReservationRow>(base);
  },
  /** Moves one room line to another physical room, named by its room number. */
  assignRoom: async (id: string, roomNumber: string, roomLineId: string, version?: number) =>
    apiRequest<ReservationRow>(`/${requireActivePropertyId()}/reservations/${id}/rooms/${roomLineId}`, {
      method: 'PATCH',
      body: { roomNumber, version },
    }),
  cancel: async (id: string, reason: string, version?: number) =>
    apiRequest<ReservationRow>(`/${requireActivePropertyId()}/reservations/${id}/cancel`, { method: 'POST', body: { reason, version } }),
  confirm: async (id: string, version?: number) =>
    apiRequest<ReservationRow>(`/${requireActivePropertyId()}/reservations/${id}/confirm`, { method: 'POST', body: { version } }),
  noShow: async (id: string, version?: number) =>
    apiRequest<ReservationRow>(`/${requireActivePropertyId()}/reservations/${id}/no-show`, { method: 'POST', body: { version } }),
  addPayment: async (id: string, payment: { amount: string; method: string; reference?: string }, version?: number) =>
    apiRequest<ReservationRow>(`/${requireActivePropertyId()}/reservations/${id}/payments`, { method: 'POST', body: { ...payment, version } }),
};

export const frontDeskApi = {
  arrivals: async () => store.arrivals(),
  departures: async () => store.departures(),
  inHouse: async () => store.inHouse(),
  checkIn: async (id: string, version?: number) =>
    apiRequest<ReservationRow>(`/${requireActivePropertyId()}/reservations/${id}/check-in`, { method: 'POST', body: { version } }),
  checkOut: async (id: string, version?: number) =>
    apiRequest<ReservationRow>(`/${requireActivePropertyId()}/reservations/${id}/check-out`, { method: 'POST', body: { version } }),
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

/** A tax rule as the backend returns it: an open-ended rule has a null end date, the screens use ''. */
type BackendTaxRule = Omit<TaxSetupRuleRow, 'endDate'> & { endDate: string | null };

const toTaxRuleRow = (rule: BackendTaxRule): TaxSetupRuleRow => ({ ...rule, endDate: rule.endDate ?? '' });

/** The body the backend takes: no slab ids (it assigns them), amounts with two decimals, no end date as null. */
const toTaxRuleBody = (rule: TaxSetupRuleInput) => ({
  name: rule.name,
  description: rule.description,
  startDate: rule.startDate,
  endDate: rule.endDate || null,
  categoryId: rule.categoryId,
  components: rule.components.map((component) => ({
    code: component.code,
    appliedOn: component.appliedOn,
    slabs: component.slabs.map((slab) => ({
      from: money(slab.from),
      to: money(slab.to),
      valueType: slab.valueType,
      value: money(slab.value),
    })),
  })),
});

/** Tax categories, rules and general settings of the active property. Reading is open; changing is SUPER_ADMIN only. */
export const taxSetupApi = {
  categories: async () => apiRequest<TaxCategoryRow[]>(`/${requireActivePropertyId()}/tax-categories`),
  createCategory: async (body: { name: string; description: string }) =>
    apiRequest<TaxCategoryRow>(`/${requireActivePropertyId()}/tax-categories`, { method: 'POST', body }),
  updateCategory: async (id: string, body: { name: string; description: string }) =>
    apiRequest<TaxCategoryRow>(`/${requireActivePropertyId()}/tax-categories/${id}`, { method: 'PATCH', body }),
  deleteCategory: async (id: string) =>
    apiRequest<void>(`/${requireActivePropertyId()}/tax-categories/${id}`, { method: 'DELETE' }),
  rules: async () =>
    (await apiRequest<BackendTaxRule[]>(`/${requireActivePropertyId()}/tax-rules`)).map(toTaxRuleRow),
  createRule: async (body: TaxSetupRuleInput) =>
    toTaxRuleRow(
      await apiRequest<BackendTaxRule>(`/${requireActivePropertyId()}/tax-rules`, { method: 'POST', body: toTaxRuleBody(body) }),
    ),
  updateRule: async (id: string, body: TaxSetupRuleInput) =>
    toTaxRuleRow(
      await apiRequest<BackendTaxRule>(`/${requireActivePropertyId()}/tax-rules/${id}`, { method: 'PATCH', body: toTaxRuleBody(body) }),
    ),
  deleteRule: async (id: string) => apiRequest<void>(`/${requireActivePropertyId()}/tax-rules/${id}`, { method: 'DELETE' }),
  generalSettings: async () => apiRequest<TaxGeneralSettings>(`/${requireActivePropertyId()}/tax-settings`),
  saveGeneralSettings: async (body: TaxGeneralSettings) =>
    apiRequest<TaxGeneralSettings>(`/${requireActivePropertyId()}/tax-settings`, { method: 'PUT', body }),
};

/** A user as the backend returns them. The password hash never leaves the server. */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRoleKey;
  isActive: boolean;
  /** True until the user replaces the password a super admin set for them. */
  mustChangePassword: boolean;
  /** The properties a STAFF user is assigned to; empty for SUPER_ADMIN. */
  properties: Array<{ id: string; name: string; code: string; isActive: boolean }>;
  createdAt: string;
  updatedAt: string;
}
export interface AdminUserPage { data: AdminUser[]; total: number; page: number; pageSize: number }
export interface AdminUserQuery {
  search?: string;
  role?: UserRoleKey;
  isActive?: boolean;
  propertyId?: string;
  page?: number;
  pageSize?: number;
}
export interface AdminUserCreate {
  name: string;
  email: string;
  /** The first password, to be shared with the user; they must replace it at their first sign-in. */
  password: string;
  role?: UserRoleKey;
  propertyIds?: string[];
}

/** Accounts and property access (`/users`, `/properties/:id/users`). SUPER_ADMIN only. */
export const userAdminApi = {
  list: async (query: AdminUserQuery = {}) => apiRequest<AdminUserPage>(`/users${queryString({ ...query })}`),
  create: async (body: AdminUserCreate) => apiRequest<AdminUser>('/users', { method: 'POST', body }),
  update: async (id: string, body: { name?: string; role?: UserRoleKey; isActive?: boolean }) =>
    apiRequest<AdminUser>(`/users/${id}`, { method: 'PATCH', body }),
  /** Replaces the user's whole set of properties; an empty list removes all access. */
  setProperties: async (id: string, propertyIds: string[]) =>
    apiRequest<AdminUser>(`/users/${id}/properties`, { method: 'PUT', body: { propertyIds } }),
  /** Signs the user out everywhere; they must replace this password at their next sign-in. */
  resetPassword: async (id: string, password: string) =>
    apiRequest<void>(`/users/${id}/reset-password`, { method: 'POST', body: { password } }),
  forProperty: async (propertyId: string) => apiRequest<AdminUser[]>(`/properties/${propertyId}/users`),
  assign: async (propertyId: string, userId: string) =>
    apiRequest<void>(`/properties/${propertyId}/users/${userId}`, { method: 'PUT' }),
  unassign: async (propertyId: string, userId: string) =>
    apiRequest<void>(`/properties/${propertyId}/users/${userId}`, { method: 'DELETE' }),
};

/** Platform-wide figures for the super admin console (`GET /platform/overview`). */
export interface PlatformOverview {
  generatedAt: string;
  properties: { total: number; active: number; inactive: number; totalRooms: number; withoutStaff: number };
  users: {
    total: number;
    active: number;
    superAdmins: number;
    staff: number;
    pendingPasswordChange: number;
    staffWithoutProperty: number;
  };
  /** Login sessions that have not been signed out. */
  activeSessions: number;
  /** "Today" is the UTC day: properties carry no time zone. */
  reservations: { total: number; inHouse: number; arrivalsToday: number; departuresToday: number };
  guests: number;
  recentProperties: Array<{
    id: string;
    name: string;
    code: string;
    city: string;
    country: string;
    isActive: boolean;
    totalRooms: number | null;
    staffCount: number;
    createdAt: string;
  }>;
  recentSignIns: Array<{
    sessionId: string;
    userId: string;
    name: string;
    email: string;
    role: UserRoleKey;
    ipAddress: string | null;
    userAgent: string | null;
    signedInAt: string;
  }>;
}

/** SUPER_ADMIN only. */
export const platformApi = {
  overview: async () => apiRequest<PlatformOverview>('/platform/overview'),
};

/** One change made through the API, as the activity log shows it (`GET /activity-log`). */
export interface ActivityEntry {
  id: string;
  createdAt: string;
  /** Null for platform-level changes such as sign-ins and user accounts. */
  property: { id: string; name: string; code: string } | null;
  /** Copied when the change was made, so it still reads the same after the account is renamed or removed. */
  actor: { id: string | null; name: string | null; email: string | null; role: UserRoleKey | null };
  /** Dotted name, e.g. `reservations.cancel`. */
  action: string;
  resource: string;
  resourceId: string | null;
  summary: string;
  method: string;
  path: string;
  statusCode: number;
  /** The request body, query and file, with secrets removed and long values cut. */
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}
export interface ActivityPage { data: ActivityEntry[]; total: number; page: number; pageSize: number }
export interface ActivityQuery {
  propertyId?: string;
  /** Only changes that belong to no property. Ignored when `propertyId` is set. */
  platformOnly?: boolean;
  actorId?: string;
  resource?: string;
  search?: string;
  /** ISO instants. */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/** SUPER_ADMIN only. */
export const activityApi = {
  list: async (query: ActivityQuery = {}) => apiRequest<ActivityPage>(`/activity-log${queryString({ ...query })}`),
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
