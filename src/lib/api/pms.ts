import { api } from './client';

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
  preferences?: string | null; internalNotes?: string | null; stayCount?: number; lastStayAt?: string | null;
}
export interface ReservationRoomRow {
  id: string; roomTypeId: string; roomId?: string | null; roomNumber?: string | null;
  roomTypeName?: string | null; nightlyRate: string; ratePlanName?: string | null;
}
export interface ReservationRow {
  id: string; bookingCode: string; status: string; source?: string; checkInDate: string; checkOutDate: string;
  nights?: number; adults: number; children: number; currencyCode?: string; totalAmount?: string; primaryGuestId?: string;
  nightlyRate?: string; internalNotes?: string | null;
  subtotal?: string; taxTotal?: string; specialRequests?: string | null; guest?: { id: string; name?: string; firstName?: string; lastName?: string } | null;
  guestName?: string | null; roomNumber?: string | null; roomTypeName?: string | null; roomTypeId?: string;
  roomLines?: ReservationRoomRow[]; paid?: number;
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
  totalAmount: string; isVoided: boolean; createdAt: string;
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

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get<AuthMe>('/auth/me'),
  logout: () => api.post<void>('/auth/logout'),
  switchProperty: (propertyId: string) => api.post<void>('/auth/switch-property', { propertyId }),
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
export const holdApi = {
  acquire: (roomId: string, checkIn: string, checkOut: string) =>
    api.post<HoldResult>('/availability/hold', { roomId, checkIn, checkOut }),
  refresh: (holdId: string) => api.post<HoldResult>(`/availability/holds/${holdId}/refresh`),
  release: (holdId: string) => api.del<void>(`/availability/holds/${holdId}`),
};

export const propertyApi = {
  list: () => api.get<PropertyRow[]>('/properties'),
  update: (id: string, body: Record<string, unknown>) => api.patch(`/properties/${id}`, body),
};

export const inventoryApi = {
  rooms: () => api.get<RoomRow[]>('/rooms'),
  roomTypes: () => api.get<RoomTypeRow[]>('/room-types'),
  updateRoom: (id: string, body: Record<string, unknown>) => api.patch(`/rooms/${id}`, body),
  updateRoomType: (id: string, body: Record<string, unknown>) => api.patch(`/room-types/${id}`, body),
  createRoom: (body: Record<string, unknown>) => api.post('/rooms', body),
  createRoomType: (body: Record<string, unknown>) => api.post('/room-types', body),
  availability: (checkIn: string, checkOut: string, roomTypeId: string) =>
    api.get<AvailabilityResult>(`/availability?${new URLSearchParams({ checkIn, checkOut, roomTypeId })}`),
  outOfOrder: (id: string, reason: string) => api.post(`/rooms/${id}/out-of-order`, { reason }),
  backInService: (id: string, reason: string) => api.post(`/rooms/${id}/back-in-service`, { reason }),
};

export const guestApi = {
  list: (search = '', page = 1, pageSize = 100) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('search', search);
    return api.get<PageResult<GuestRow>>(`/guests?${params}`);
  },
  get: (id: string) => api.get<GuestRow>(`/guests/${id}`),
  create: (body: Record<string, unknown>) => api.post<GuestRow>('/guests', body),
  update: (id: string, body: Record<string, unknown>) => api.patch<GuestRow>(`/guests/${id}`, body),
};

export const reservationApi = {
  list: (search = '', status?: string, page = 1, pageSize = 100) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return api.get<PageResult<ReservationRow>>(`/reservations?${params}`);
  },
  get: (id: string) => api.get<ReservationRow>(`/reservations/${id}`),
  create: (body: Record<string, unknown>) => api.post<{id:string; bookingCode:string}>('/reservations', body),
  update: (id: string, body: Record<string, unknown>) => api.patch<ReservationRow>(`/reservations/${id}`, body),
  assignRoom: (id: string, roomId: string) => api.post(`/reservations/${id}/assign-room`, { roomId }),
  cancel: (id: string, reason: string) => api.post(`/reservations/${id}/cancel`, { reason }),
};

export const frontDeskApi = {
  arrivals: () => api.get<StayList>('/front-desk/arrivals'),
  departures: () => api.get<StayList>('/front-desk/departures'),
  inHouse: () => api.get<StayList>('/front-desk/in-house'),
  checkIn: (id: string, overrideReason?: string) => api.post(`/reservations/${id}/check-in`, overrideReason ? { overrideReason } : {}),
  checkOut: (id: string, overrideReason?: string) => api.post(`/reservations/${id}/check-out`, overrideReason ? { overrideReason } : {}),
  extend: (id: string, newCheckOutDate: string) => api.post(`/reservations/${id}/extend`, { newCheckOutDate }),
};

export const folioApi = {
  listPayments: () => api.get<PaymentRow[]>('/payments'),
  listInvoices: () => api.get<InvoiceRow[]>('/invoices'),
  balance: (id: string) => api.get<FolioBalanceRow>(`/folios/${id}/balance`),
  detail: (id: string) => api.get<FolioDetailRow>(`/folios/${id}`),
  close: (id: string) => api.post(`/folios/${id}/close`),
  reopen: (id: string, reason: string) => api.post(`/folios/${id}/reopen`, { reason }),
  postItem: (id: string, body: Record<string, unknown>) => api.post(`/folios/${id}/items`, body),
  voidItem: (itemId: string, reason: string) => api.post(`/folio-items/${itemId}/void`, { reason }),
  payment: (id: string, body: Record<string, unknown>) => api.post(`/folios/${id}/payments`, body),
  refund: (id: string, amount: string, reason: string) => api.post(`/payments/${id}/refund`, { amount, reason }),
  issueInvoice: (folioId: string) => api.post<{ id: string; invoiceNo: string; status?: string }>(`/folios/${folioId}/invoices`),
  voidInvoice: (invoiceId: string, reason: string) => api.post(`/invoices/${invoiceId}/void`, { reason }),
  invoice: (id: string) => api.get<InvoiceRow & { property: { name: string; addressLine1: string | null; city: string | null; countryCode: string } | null; lines: Array<{ id: string; description: string; totalAmount: string }> }>(`/invoices/${id}`),
};

export const operationsApi = {
  housekeepingTasks: (scope?: string) => api.get<HousekeepingTaskRow[]>(`/housekeeping/tasks${scope ? `?scope=${encodeURIComponent(scope)}` : ''}`),
  housekeepingSummary: () => api.get<{ byStatus: Record<string, number>; rooms: DailyFlashRow['rooms'] }>('/housekeeping/summary'),
  createTask: (body: Record<string, unknown>) => api.post<{ id: string; status: string; roomNumber: string }>('/housekeeping/tasks', body),
  assignTask: (id: string, assignedToId: string | null) => api.patch(`/housekeeping/tasks/${id}/assign`, { assignedToId }),
  startTask: (id: string) => api.post(`/housekeeping/tasks/${id}/start`),
  completeTask: (id: string, notes?: string) => api.post(`/housekeeping/tasks/${id}/complete`, notes ? { notes } : {}),
  requestInspection: (id: string) => api.post(`/housekeeping/tasks/${id}/request-inspection`),
  inspectTask: (id: string, result: 'pass' | 'fail', notes?: string) => api.post(`/housekeeping/tasks/${id}/inspect`, { result, notes }),
  blockTask: (id: string, reason: string) => api.post(`/housekeeping/tasks/${id}/block`, { reason }),
  unblockTask: (id: string) => api.post(`/housekeeping/tasks/${id}/unblock`),
  cancelTask: (id: string, reason: string) => api.post(`/housekeeping/tasks/${id}/cancel`, { reason }),
  maintenanceTickets: () => api.get<MaintenanceTicketRow[]>('/maintenance/tickets'),
  createTicket: (body: Record<string, unknown>) => api.post<{ id: string; ticketNo: string; status: string }>('/maintenance/tickets', body),
  assignTicket: (id: string, assignedToId: string | null) => api.patch(`/maintenance/tickets/${id}/assign`, { assignedToId }),
  startTicket: (id: string) => api.post(`/maintenance/tickets/${id}/start`),
  resolveTicket: (id: string, resolution: string) => api.post(`/maintenance/tickets/${id}/resolve`, { resolution }),
  closeTicket: (id: string, reason?: string) => api.post(`/maintenance/tickets/${id}/close`, reason ? { reason } : {}),
  reopenTicket: (id: string, reason: string) => api.post(`/maintenance/tickets/${id}/reopen`, { reason }),
};

export const reportsApi = {
  dailyFlash: (date?: string) => api.get<DailyFlashRow>(`/reports/daily-flash${date ? `?date=${date}` : ''}`),
  occupancy: (from: string, to: string) => api.get<OccupancyReportRow>(`/reports/occupancy?${new URLSearchParams({ from, to })}`),
  revenue: (from: string, to: string) => api.get<RevenueReportRow>(`/reports/revenue?${new URLSearchParams({ from, to })}`),
  movement: (from: string, to: string) => api.get<MovementReportRow>(`/reports/arrivals-departures?${new URLSearchParams({ from, to })}`),
  housekeeping: (from: string, to: string) => api.get<HousekeepingReportRow>(`/reports/housekeeping?${new URLSearchParams({ from, to })}`),
  exportDailyFlash: (date: string) => `/reports/daily-flash/export.csv?${new URLSearchParams({ date })}`,
  exportOccupancy: (from: string, to: string) => `/reports/occupancy/export.csv?${new URLSearchParams({ from, to })}`,
  exportRevenue: (from: string, to: string) => `/reports/revenue/export.csv?${new URLSearchParams({ from, to })}`,
  exportMovement: (from: string, to: string) => `/reports/arrivals-departures/export.csv?${new URLSearchParams({ from, to })}`,
};

export const auditApi = {
  list: (limit = 20) => api.get<AuditEventsResult>(`/audit-log?limit=${limit}`),
  export: () => '/audit-log/export.csv',
};

export const nightAuditApi = {
  get: (date: string) => api.get<NightAuditRow>(`/night-audit/${date}`),
  preview: (date: string) => api.post<NightAuditRow>(`/night-audit/${date}/preview`),
  close: (date: string, idempotencyKey: string) => api.post<NightAuditRow>(`/night-audit/${date}/close`, { idempotencyKey }),
  reopen: (date: string, reason: string) => api.post<NightAuditRow>(`/night-audit/${date}/reopen`, { reason }),
};

export interface RoleMatrix {
  roles: Array<{ key: string; name: string }>;
  resources: Array<{ resource: string; permissions: Array<{ key: string; action: string; description: string; roles: string[] }> }>;
}

export const adminApi = {
  users: () => api.get<UserRow[]>('/users'),
  acceptInvite: (token: string, password: string) => api.post<{ email: string; status: string }>('/users/accept-invite', { token, password }),
  invite: (body: Record<string, unknown>) => api.post<{ email: string; inviteToken: string; acceptUrl: string }>('/users/invite', body),
  reissueInvite: (id: string) => api.post<{ inviteToken: string; acceptUrl: string }>(`/users/${id}/reissue-invite`),
  cancelInvite: (id: string) => api.post(`/users/${id}/cancel-invite`),
  updateUser: (id: string, body: Record<string, unknown>) => api.patch<UserRow>(`/users/${id}`, body),
  setRole: (id: string, propertyId: string, roleKey: string) => api.patch(`/users/${id}/role`, { propertyId, roleKey }),
  setUserStatus: (id: string, status: 'ACTIVE' | 'DISABLED') => api.patch(`/users/${id}/status`, { status }),
  roles: () => api.get<RoleRow[]>('/roles'),
  permissions: () => api.get<Array<{ key: string; resource: string; action: string; description: string }>>('/permissions'),
  matrix: () => api.get<RoleMatrix>('/roles/matrix'),
  taxRules: () => api.get<TaxRuleRow[]>('/tax-rules'),
  createTaxRule: (body: Record<string, unknown>) => api.post('/tax-rules', body),
  updateTaxRule: (id: string, body: Record<string, unknown>) => api.patch(`/tax-rules/${id}`, body),
};

export const themeApi = {
  get: () => api.get<{ themeKey: string }>('/preferences/theme'),
  set: (themeKey: string) => api.put<{ themeKey: string; applied: boolean }>('/preferences/theme', { themeKey }),
};
