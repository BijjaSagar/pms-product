import type {
  Guest,
  HousekeepingTask,
  Invoice,
  MaintenanceRequest,
  Payment,
  Reservation,
  ReservationStatus,
  Room,
  RoomTimelineRow,
  RoomType,
  TimelineEvent,
  TimelineStatus,
} from '../../types';
import type {
  GuestRow,
  HousekeepingTaskRow,
  InvoiceRow,
  MaintenanceTicketRow,
  PaymentRow,
  ReservationRow,
  RoomRow,
  RoomTimelineApi,
  RoomTypeRow,
  StayRow,
} from './pms';

const shortDate = (value: unknown): string => {
  if (!value) return '—';
  const day = String(value).slice(0, 10);
  const parsed = new Date(`${day}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? day : parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
};

export const apiReservationStatus = (value: string): ReservationStatus => ({
  DRAFT: 'Pending', CONFIRMED: 'Confirmed', CHECKED_IN: 'Checked-in',
  CHECKED_OUT: 'Checked-out', CANCELLED: 'Cancelled', NO_SHOW: 'No-show',
}[value] ?? 'Pending') as ReservationStatus;

export function reservationFromApi(row: ReservationRow): Reservation {
  const guest = row.guest?.name ?? [row.guest?.firstName, row.guest?.lastName].filter(Boolean).join(' ') ?? row.guestName ?? 'Guest';
  const amount = Number(row.totalAmount ?? row.subtotal ?? 0);
  const roomLines = row.roomLines ?? [];
  const firstRoom = roomLines[0];
  const firstAssignedRoom = roomLines.find((line) => line.roomNumber);
  const roomSummary = row.roomSummary ?? roomLines.map((line) =>
    `${line.roomTypeName ?? 'Room'}${line.roomNumber ? ` · ${line.roomNumber}` : ' · Unassigned'}`,
  ).join(' + ');
  const roomTypeSummary = Array.from(new Set(roomLines.map((line) => line.roomTypeName).filter(Boolean))).join(' + ');
  return {
    id: String(row.bookingCode ?? row.id),
    backendId: String(row.id),
    createdAt: row.createdAt,
    bookingCode: String(row.bookingCode ?? row.id),
    currencyCode: row.currencyCode ?? 'INR',
    guest,
    guestId: String(row.guest?.id ?? row.primaryGuestId ?? ''),
    room: roomSummary || (row.roomNumber ? `${row.roomTypeName ?? 'Room'} · ${row.roomNumber}` : (firstRoom?.roomNumber ? `Room · ${firstRoom.roomNumber}` : 'Unassigned')),
    roomNumber: row.roomNumber ?? firstAssignedRoom?.roomNumber ?? null,
    roomSummary: roomSummary || undefined,
    roomLines: roomLines.map((line) => ({ ...line })),
    roomType: roomTypeSummary || row.roomTypeName || 'Room',
    roomTypeId: firstRoom?.roomTypeId ?? row.roomTypeId,
    checkIn: shortDate(row.checkInDate),
    checkOut: shortDate(row.checkOutDate),
    checkInIso: String(row.checkInDate).slice(0, 10),
    checkOutIso: String(row.checkOutDate).slice(0, 10),
    nights: Number(row.nights ?? 0),
    adults: Number(row.adults ?? 1),
    children: Number(row.children ?? 0),
    status: apiReservationStatus(String(row.status ?? '')),
    total: amount,
    taxAmount: Number(row.taxTotal ?? 0),
    paid: Number(row.paid ?? 0),
    nightlyRate: Number(firstRoom?.nightlyRate ?? row.nightlyRate ?? 0),
    channel: String(row.source ?? 'DIRECT').replaceAll('_', ' '),
    ratePlan: firstRoom?.ratePlanName ?? 'Standard rate',
    specialRequests: row.specialRequests ?? '',
    notes: row.internalNotes ?? '',
  };
}

export function roomFromApi(row: RoomRow, liveStays: StayRow[] = []): Room {
  const statusMap: Record<string, Room['status']> = {
    VACANT_CLEAN: 'Available', VACANT_DIRTY: 'Dirty', OCCUPIED_CLEAN: 'Occupied',
    OCCUPIED_DIRTY: 'Occupied', INSPECTED: 'Inspected', OUT_OF_ORDER: 'Out-of-service',
  };
  const status = statusMap[row.status] ?? 'Dirty';
  const hk: Room['hk'] = row.status === 'INSPECTED' ? 'Inspected'
    : row.status.endsWith('DIRTY') ? 'Dirty'
      : row.status === 'VACANT_CLEAN' || row.status === 'OCCUPIED_CLEAN' ? 'Clean'
        : 'Dirty';
  const stay = liveStays.find((item) => item.roomNumber === row.roomNumber);
  return {
    number: String(row.roomNumber),
    backendId: String(row.id),
    roomTypeId: String(row.roomTypeId),
    type: String(row.roomTypeName ?? row.roomTypeCode ?? 'Room'),
    floor: Number.parseInt(String(row.floor ?? '0').replace(/\D/g, ''), 10) || 0,
    status,
    hk,
    guest: stay?.guestName ?? null,
    guestId: stay?.guestId ?? null,
    reservationId: stay?.id ?? null,
    checkIn: stay ? shortDate(stay.checkInDate) : null,
    checkOut: stay ? shortDate(stay.checkOutDate) : null,
    rate: Number(row.baseRate ?? 0),
    active: row.isActive !== false,
    oosReason: row.outOfOrderReason ?? null,
  };
}

export function roomTypeFromApi(row: RoomTypeRow, rooms: RoomRow[]): RoomType {
  const roomCount = rooms.filter((room) => room.roomTypeId === row.id).length;
  const amenities = Array.isArray(row.amenities)
    ? row.amenities.filter((value: unknown): value is string => typeof value === 'string')
    : row.amenities && typeof row.amenities === 'object'
      ? Object.keys(row.amenities).filter((key) => Boolean((row.amenities as Record<string, unknown>)[key]))
      : [];
  const maxAdults = Number(row.maxAdults ?? 2);
  const maxChildren = Number(row.maxChildren ?? 0);
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    count: roomCount,
    maxOccupancy: maxAdults + maxChildren,
    maxAdults,
    maxChildren,
    beds: '—',
    baseRate: Number(row.baseRate ?? 0),
    amenities,
    active: Boolean(row.isActive),
  };
}

export function guestFromApi(row: GuestRow): Guest {
  const name = `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || 'Guest';
  return {
    id: row.id,
    name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    company: row.companyName ?? null,
    tier: 'Regular',
    category: 'Leisure',
    stays: Number(row.stayCount ?? 0),
    spent: 0,
    balance: 0,
    lastVisit: shortDate(row.lastStayAt),
    preferences: typeof row.preferences === 'string' ? row.preferences.split(',').map((item: string) => item.trim()).filter(Boolean) : [],
    notes: row.internalNotes ?? '',
  };
}

export function housekeepingTaskFromApi(row: HousekeepingTaskRow): HousekeepingTask {
  const status: HousekeepingTask['status'] = row.status === 'COMPLETED' ? 'Done'
    : row.status === 'IN_PROGRESS' ? 'In progress' : 'Pending';
  const priority: HousekeepingTask['priority'] = row.priority === 'URGENT' || row.priority === 'HIGH' ? 'High'
    : row.priority === 'LOW' ? 'Low' : 'Medium';
  return {
    id: row.id,
    backendStatus: row.status,
    type: row.type,
    dueAtIso: row.dueAt ?? null,
    roomId: row.roomId,
    assignedToId: row.assignedToId ?? null,
    room: String(row.roomNumber ?? '—'),
    roomType: String(row.roomTypeName ?? ''),
    task: String(row.type ?? 'OTHER').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char: string) => char.toUpperCase()),
    priority,
    status,
    assignee: row.assigneeName ?? 'Unassigned',
    startTime: row.startedAt ? shortDate(row.startedAt) : '—',
    dueTime: row.dueAt ? shortDate(row.dueAt) : '—',
    durationMin: 0,
    notes: row.notes ?? row.blockedReason ?? '',
    updated: shortDate(row.createdAt),
  };
}

export function maintenanceFromApi(row: MaintenanceTicketRow): MaintenanceRequest {
  const priority: MaintenanceRequest['priority'] = row.priority === 'URGENT' ? 'Urgent'
    : row.priority === 'HIGH' ? 'High' : row.priority === 'LOW' ? 'Low' : 'Medium';
  const status: MaintenanceRequest['status'] = row.status === 'RESOLVED' ? 'Resolved'
    : row.status === 'IN_PROGRESS' ? 'In progress' : 'Open';
  return {
    // The backend numbers tickets by id only, so the screen shows a short form of it.
    id: row.ticketNo ?? row.id.slice(0, 8).toUpperCase(),
    backendId: String(row.id),
    backendStatus: row.status,
    assignedToId: row.assignedToId ?? null,
    room: String(row.roomNumber ?? 'Property'),
    category: String(row.category ?? 'OTHER').replaceAll('_', ' '),
    description: row.description ?? row.title ?? '',
    priority,
    reportedBy: row.reportedByName ?? 'Staff',
    assignee: row.assigneeName ?? 'Unassigned',
    created: shortDate(row.createdAt),
    due: '—',
    status,
    notes: row.resolution ? [row.resolution] : [],
  };
}

function paymentMethodFromApi(value: string): string {
  return ({ CARD_TERMINAL: 'Card', CASH: 'Cash', BANK_TRANSFER: 'Transfer', UPI: 'UPI', PAYMENT_LINK: 'Payment link', CORPORATE_ACCOUNT: 'Invoice' } as Record<string, string>)[value] ?? value;
}

export function paymentFromApi(row: PaymentRow): Payment {
  const status = row.status === 'SUCCEEDED' ? 'Paid'
    : row.status === 'PENDING' ? 'Pending'
      : row.status === 'REFUNDED' ? 'Refunded'
        : row.status === 'PARTIALLY_REFUNDED' ? 'Partially refunded' : 'Failed';
  return {
    ref: row.id,
    backendId: row.id,
    guest: row.guestName ?? row.folioNo ?? 'Folio payment',
    bookingId: row.folioNo ?? row.folioId,
    date: shortDate(row.recordedAt),
    amount: Number(row.amount) - Number(row.refundedAmount ?? 0),
    currencyCode: row.currencyCode,
    method: paymentMethodFromApi(row.method),
    status,
    txn: row.reference ?? '—',
  };
}

export function invoiceFromApi(row: InvoiceRow): Invoice {
  const status = ({ DRAFT: 'Draft', ISSUED: 'Issued', VOID: 'Void', CREDITED: 'Credited' } as Record<string, Invoice['status']>)[row.status] ?? 'Draft';
  return {
    id: row.invoiceNo ?? row.id,
    backendId: row.id,
    folioId: row.folioId,
    currencyCode: row.currencyCode,
    guest: row.guestName ?? 'Guest',
    room: '—',
    amount: Number(row.totalAmount ?? 0),
    status,
    due: shortDate(row.issuedAt),
    method: '—',
  };
}

type TimelineSegmentApi = RoomTimelineApi['rooms'][number]['segments'][number];

/* Room-level segments: their label and colour family on the timeline. */
const ROOM_SEGMENT_EVENTS: Record<string, { status: TimelineStatus; label: string }> = {
  AVAILABLE: { status: 'Available', label: 'Available' },
  INSPECTED: { status: 'Inspected', label: 'Inspected' },
  DIRTY: { status: 'Dirty', label: 'Dirty' },
  CLEANING: { status: 'Cleaning', label: 'Cleaning' },
  OUT_OF_ORDER: { status: 'Out-of-service', label: 'Out of order' },
  OUT_OF_SERVICE: { status: 'Maintenance', label: 'Out of service' },
};

/* Stay segments carry the guest, so their label is the guest's name. */
const STAY_SEGMENT_EVENTS = {
  OCCUPIED: { status: 'Occupied', icon: 'user' },
  ARRIVING: { status: 'Arriving', icon: 'luggage' },
  DEPARTING: { status: 'Departing', icon: 'clock' },
} as const;

function timelineEventFromApi(roomNumber: string, index: number, segment: TimelineSegmentApi): TimelineEvent {
  const base = { id: `${roomNumber}-${index}`, startHour: segment.startHour, endHour: segment.endHour };
  const stay = STAY_SEGMENT_EVENTS[segment.kind as keyof typeof STAY_SEGMENT_EVENTS];
  if (stay) {
    const label = segment.guestName ?? stay.status;
    return {
      ...base,
      status: stay.status,
      label,
      subLabel: segment.confirmationNumber,
      guestName: segment.guestName,
      icon: stay.icon,
    };
  }
  const room = ROOM_SEGMENT_EVENTS[segment.kind];
  // An unknown kind means the backend and this screen disagree; failing here is clearer than a wrong bar.
  if (!room) throw new Error(`Unknown room timeline segment: ${segment.kind}`);
  return { ...base, status: room.status, label: room.label };
}

/** Timeline rows for one property day, with each segment as one bar. */
export function timelineRowsFromApi(response: RoomTimelineApi): RoomTimelineRow[] {
  return response.rooms.map((room) => ({
    backendId: room.id,
    version: room.version,
    number: room.roomNumber,
    type: room.roomTypeName,
    floor: Number.parseInt(String(room.floor ?? '0').replace(/\D/g, ''), 10) || 0,
    events: room.segments.map((segment, index) => timelineEventFromApi(room.roomNumber, index, segment)),
  }));
}
