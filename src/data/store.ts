import { ALL_PERMISSIONS, BUSINESS_DATE, CURRENT_USER_ID, GUESTS, PERMISSION_CATALOG, PROPERTY, ROLE_DEFS, ROOM_TYPES, TAX_RATE, TAX_RULES, USERS, type InternalUser } from './catalog';
import { buildSeedState } from './fixtures';
import {
  addDays,
  diffDays,
  money,
  nextId,
  nightDates,
  nightsBetween,
  num,
  overlaps,
  paymentTotal,
  round2,
  stamp,
  type FolioRec,
} from './model';
import type {
  AuditEventRow,
  AuditEventsResult,
  AuthMe,
  AvailabilityResult,
  DailyFlashRow,
  FolioBalanceRow,
  FolioDetailRow,
  FolioItemRow,
  GuestRow,
  HoldResult,
  HousekeepingReportRow,
  HousekeepingTaskRow,
  InvoiceRow,
  MaintenanceTicketRow,
  MovementReportRow,
  NightAuditRow,
  OccupancyReportRow,
  PageResult,
  PaymentRow,
  PropertyRow,
  ReservationBillingPreferencesRow,
  ReservationChargeRow,
  ReservationPendingPaymentRow,
  ReservationRoomRow,
  ReservationRow,
  RevenueReportRow,
  RoleMatrix,
  RoleRow,
  RoomRow,
  RoomTypeRow,
  StayList,
  StayRow,
  TaxRuleRow,
  UserRow,
} from '../lib/api/pms';

/* ------------------------------------------------------------------- state */

const seed = buildSeedState();
const rooms: RoomRow[] = seed.rooms;
const reservations: ReservationRow[] = seed.reservations;
const folios: FolioRec[] = seed.folios;
const guests: GuestRow[] = [...GUESTS];
const users: InternalUser[] = [...USERS];
const taxRules: TaxRuleRow[] = [...TAX_RULES];
const invoices: InvoiceRow[] = [];

let activePropertyId = PROPERTY.id;
let guestSeq = 1023;
let bookingSeq = 9100;
let ticketSeq = 118;
let invoiceSeq = 4000;

interface Hold {
  holdId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  expiresAtMs: number;
}
const holds = new Map<string, Hold>();
const HOLD_MS = 10 * 60 * 1000;

interface NightAuditState {
  status: string | null;
  previewSummary?: NightAuditRow['previewSummary'];
  finalSummary?: NightAuditRow['finalSummary'];
}
const nightAudits = new Map<string, NightAuditState>();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const byRoomNumber = (roomNumber: string | null | undefined): RoomRow | undefined =>
  roomNumber ? rooms.find((r) => r.roomNumber === roomNumber) : undefined;
const folioForReservation = (reservationId: string): FolioRec | undefined =>
  folios.find((f) => f.reservationId === reservationId);
const roleName = (key: string): string => ROLE_DEFS.find((r) => r.key === key)?.name ?? key;

/* -------------------------------------------------------------------- auth */

function currentMembership() {
  return {
    id: 'mem-1',
    userId: CURRENT_USER_ID,
    propertyId: activePropertyId,
    roleId: 'role-owner',
    isActive: true,
    role: { id: 'role-owner', key: 'owner', name: 'Owner', description: 'Full access to every module.' },
    property: {
      id: PROPERTY.id,
      name: PROPERTY.name,
      slug: PROPERTY.slug,
      timezone: PROPERTY.timezone,
      currencyCode: PROPERTY.currencyCode,
    },
  };
}

function session(): AuthMe {
  const user = users.find((u) => u.userId === CURRENT_USER_ID) ?? users[0];
  return {
    user: {
      id: user.userId,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      propertyMemberships: [currentMembership()],
    },
    activePropertyId,
    permissions: ALL_PERMISSIONS,
  };
}

/* ------------------------------------------------------------------ folios */

function folioBalance(folio: FolioRec): FolioBalanceRow {
  const active = folio.items.filter((i) => !i.isVoided);
  const charges = active
    .filter((i) => i.type !== 'TAX' && i.type !== 'REVERSAL')
    .reduce((sum, i) => sum + Number(i.totalAmount), 0);
  const tax = active.reduce((sum, i) => sum + Number(i.taxAmount), 0);
  const total = round2(charges + tax);
  const paid = round2(paymentTotal(folio.payments));
  return {
    charges: money(charges),
    tax: money(tax),
    total: money(total),
    paid: money(paid),
    balance: money(total - paid),
    currencyCode: folio.currencyCode,
  };
}

function folioDetail(folio: FolioRec): FolioDetailRow {
  return {
    id: folio.id,
    folioNo: folio.folioNo,
    status: folio.status,
    currencyCode: folio.currencyCode,
    reservationId: folio.reservationId,
    guestName: folio.guestName,
    balance: folioBalance(folio),
    items: clone(folio.items),
    payments: clone(folio.payments),
  };
}

function allPayments(): PaymentRow[] {
  return folios.flatMap((f) => f.payments);
}

/* ------------------------------------------------------------------- stays */

function roomReady(roomNumber: string | null | undefined): boolean {
  const room = byRoomNumber(roomNumber);
  if (!room) return true;
  return room.status === 'VACANT_CLEAN' || room.status === 'INSPECTED';
}

function toStay(reservation: ReservationRow): StayRow {
  const folio = folioForReservation(reservation.id);
  const room = byRoomNumber(reservation.roomNumber);
  return {
    ...clone(reservation),
    guestId: reservation.primaryGuestId ?? null,
    guestName: reservation.guestName ?? null,
    roomNumber: reservation.roomNumber ?? null,
    roomStatus: room?.status ?? null,
    roomReady: roomReady(reservation.roomNumber),
    folioId: folio?.id ?? null,
    folioNo: folio?.folioNo ?? null,
    balance: folio ? folioBalance(folio).balance : undefined,
  };
}

function stayList(rows: ReservationRow[]): StayList {
  return { businessDate: BUSINESS_DATE, data: rows.map(toStay) };
}

/* ------------------------------------------------------------------ reports */

function roomsSummary(): DailyFlashRow['rooms'] {
  const total = rooms.filter((r) => r.isActive).length;
  const outOfOrder = rooms.filter((r) => r.status === 'OUT_OF_ORDER').length;
  const occupied = rooms.filter((r) => r.status.startsWith('OCCUPIED')).length;
  const dirty = rooms.filter((r) => r.status === 'VACANT_DIRTY' || r.status === 'OCCUPIED_DIRTY').length;
  const ready = rooms.filter((r) => r.status === 'VACANT_CLEAN' || r.status === 'INSPECTED').length;
  return { total, ready, dirty, occupied, outOfOrder };
}

function partyLabel(adults: number, children: number): string {
  const adultText = `${adults} Adult${adults === 1 ? '' : 's'}`;
  if (!children) return adultText;
  return `${adultText} · ${children} Child${children === 1 ? '' : 'ren'}`;
}

/** Reservations occupying the night that starts on `date`. */
function staysOnNight(date: string): number {
  return reservations.filter(
    (r) =>
      (r.status === 'CONFIRMED' || r.status === 'CHECKED_IN' || r.status === 'CHECKED_OUT') &&
      r.checkInDate <= date &&
      date < r.checkOutDate,
  ).length;
}

function soldRoomNights(from: string, to: string): number {
  const nights = Math.max(1, diffDays(from, to));
  let sold = 0;
  for (let i = 0; i < nights; i += 1) sold += staysOnNight(addDays(from, i));
  return sold;
}

function dailyFlash(date: string): DailyFlashRow {
  const arrivals = reservations
    .filter((r) => r.status === 'CONFIRMED' && r.checkInDate === date)
    .map((r) => ({
      id: r.id,
      bookingCode: r.bookingCode,
      guestName: r.guestName ?? null,
      checkOutDate: r.checkOutDate,
      party: partyLabel(r.adults, r.children),
    }));
  const departures = reservations
    .filter((r) => r.status === 'CHECKED_IN' && r.checkOutDate === date)
    .map((r) => ({
      id: r.id,
      bookingCode: r.bookingCode,
      guestName: r.guestName ?? null,
      checkInDate: r.checkInDate,
    }));
  const inHouseCount = reservations.filter(
    (r) => r.status === 'CHECKED_IN' && r.checkInDate <= date && date <= r.checkOutDate,
  ).length;
  const hkOpen = tasks.filter((t) => !['READY', 'CANCELLED'].includes(t.status)).length;
  const hkBlocked = tasks.filter((t) => t.status === 'BLOCKED').length;
  const hkDueToday = tasks.filter((t) => (t.dueAt ?? '').slice(0, 10) === date).length;
  const mxOpen = tickets.filter((t) => !['RESOLVED', 'CLOSED'].includes(t.status)).length;
  const mxCritical = tickets.filter(
    (t) => t.priority === 'CRITICAL' && !['RESOLVED', 'CLOSED'].includes(t.status),
  ).length;
  return {
    businessDate: date,
    propertyName: PROPERTY.name,
    arrivals,
    departures,
    inHouseCount,
    rooms: roomsSummary(),
    housekeeping: { open: hkOpen, blocked: hkBlocked, dueToday: hkDueToday },
    maintenance: { open: mxOpen, critical: mxCritical },
  };
}

function occupancyReport(from: string, to: string): OccupancyReportRow {
  const nights = Math.max(1, diffDays(from, to));
  const totalRooms = rooms.filter((r) => r.isActive).length;
  const availableRoomNights = totalRooms * nights;
  const sold = soldRoomNights(from, to);
  const overlapping = reservations.filter(
    (r) =>
      (r.status === 'CONFIRMED' || r.status === 'CHECKED_IN' || r.status === 'CHECKED_OUT') &&
      overlaps(r.checkInDate, r.checkOutDate, from, addDays(to, 1)),
  ).length;
  const roomLines = reservations.reduce((sum, r) => sum + (r.roomLines?.length ?? 0), 0);
  const occupancyPct = availableRoomNights ? ((sold / availableRoomNights) * 100).toFixed(1) : '0.0';
  return {
    from,
    to,
    nights,
    rooms: totalRooms,
    availableRoomNights,
    soldRoomNights: sold,
    unsoldRoomNights: Math.max(0, availableRoomNights - sold),
    occupancyPct,
    reconciliation: {
      overlappingReservations: overlapping,
      reservationRoomLines: roomLines,
      expectedRoomNights: availableRoomNights,
      claimedRoomNights: sold,
      matches: true,
    },
  };
}

function revenueReport(from: string, to: string): RevenueReportRow {
  const nights = Math.max(1, diffDays(from, to));
  const totalRooms = rooms.filter((r) => r.isActive).length;
  const availableRoomNights = totalRooms * nights;
  const sold = soldRoomNights(from, to);

  let roomRevenue = 0;
  let otherRevenue = 0;
  let taxTotal = 0;

  folios.forEach((folio) => {
    const reservation = reservations.find((r) => r.id === folio.reservationId);
    if (!reservation) return;
    if (!overlaps(reservation.checkInDate, reservation.checkOutDate, from, addDays(to, 1))) return;
    const overlapNights = Math.max(
      0,
      Math.min(diffDays(from, reservation.checkOutDate), diffDays(reservation.checkInDate, addDays(to, 1))),
    );
    const rate = Number(reservation.nightlyRate ?? 0);
    folio.items
      .filter((i) => !i.isVoided)
      .forEach((item) => {
        if (item.type === 'ROOM') {
          const revenue = round2(rate * overlapNights);
          roomRevenue += revenue;
          taxTotal += round2(revenue * TAX_RATE);
        } else if (item.type !== 'TAX' && item.type !== 'REVERSAL') {
          otherRevenue += Number(item.totalAmount);
          taxTotal += Number(item.taxAmount);
        }
      });
  });

  roomRevenue = round2(roomRevenue);
  const paymentsCollected = round2(
    allPayments()
      .filter((p) => p.status === 'SUCCEEDED' && (p.recordedAt ?? '').slice(0, 10) >= from && (p.recordedAt ?? '').slice(0, 10) <= to)
      .reduce((sum, p) => sum + Number(p.amount), 0),
  );
  const paymentsRefunded = round2(
    allPayments().reduce((sum, p) => sum + Number(p.refundedAmount ?? 0), 0),
  );
  const grossRevenue = round2(roomRevenue + otherRevenue + taxTotal);
  return {
    from,
    to,
    nights,
    currencyCode: PROPERTY.currencyCode,
    roomRevenue: money(roomRevenue),
    otherRevenue: money(otherRevenue),
    taxTotal: money(taxTotal),
    grossRevenue: money(grossRevenue),
    paymentsCollected: money(paymentsCollected),
    paymentsRefunded: money(paymentsRefunded),
    paymentsNetCollected: money(paymentsCollected - paymentsRefunded),
    soldRoomNights: sold,
    availableRoomNights,
    adr: money(sold ? roomRevenue / sold : 0),
    revpar: money(availableRoomNights ? roomRevenue / availableRoomNights : 0),
  };
}

function movementReport(from: string, to: string): MovementReportRow {
  const inWindow = (date: string) => date >= from && date <= to;
  return {
    from,
    to,
    currencyCode: PROPERTY.currencyCode,
    rows: reservations
      .filter((r) => inWindow(r.checkInDate) || inWindow(r.checkOutDate))
      .map((r) => ({
        bookingCode: r.bookingCode,
        guestName: r.guestName ?? null,
        status: r.status,
        checkInDate: r.checkInDate,
        checkOutDate: r.checkOutDate,
        nights: r.nights ?? nightsBetween(r.checkInDate, r.checkOutDate),
        roomNumber: r.roomNumber ?? null,
        adults: r.adults,
        children: r.children,
      })),
  };
}

function housekeepingReport(from: string, to: string): HousekeepingReportRow {
  const inWindow = tasks.filter((t) => {
    const day = (t.createdAt ?? '').slice(0, 10);
    return day >= from && day <= to;
  });
  const scope = inWindow.length ? inWindow : tasks;
  const completed = scope.filter((t) => ['READY', 'CLEANED', 'INSPECTION_REQUIRED'].includes(t.status)).length;
  const blocked = scope.filter((t) => t.status === 'BLOCKED').length;
  const inspected = scope.filter((t) => Boolean(t.inspectedAt)).length;
  const types = Array.from(new Set(scope.map((t) => t.type)));
  return {
    from,
    to,
    totalTasks: scope.length,
    completed,
    blocked,
    inspected,
    completionRate: scope.length ? ((completed / scope.length) * 100).toFixed(1) : '0.0',
    avgTurnaroundHours: '1.4',
    roomsTouched: new Set(scope.map((t) => t.roomNumber)).size,
    roomsTotal: rooms.length,
    byType: types.map((type) => {
      const group = scope.filter((t) => t.type === type);
      return {
        type,
        total: group.length,
        completed: group.filter((t) => ['READY', 'CLEANED', 'INSPECTION_REQUIRED'].includes(t.status)).length,
        blocked: group.filter((t) => t.status === 'BLOCKED').length,
      };
    }),
  };
}

/* ------------------------------------------------- housekeeping & maintenance */

const hkStaff = () => users.filter((u) => u.baseRoleKey === 'housekeeping');
const mxStaff = () => users.filter((u) => u.baseRoleKey === 'maintenance');

const tasks: HousekeepingTaskRow[] = (() => {
  const dirty = rooms.filter((r) => r.status === 'VACANT_DIRTY' || r.status === 'OCCUPIED_DIRTY');
  const staff = hkStaff();
  const statuses = ['TODO', 'IN_PROGRESS', 'CLEANED', 'INSPECTION_REQUIRED'];
  const priorities = ['NORMAL', 'HIGH', 'URGENT', 'LOW'];
  const list: HousekeepingTaskRow[] = dirty.map((room, index) => {
    const type = room.status === 'OCCUPIED_DIRTY' ? 'STAYOVER_CLEAN' : 'CHECKOUT_CLEAN';
    const status = statuses[index % statuses.length];
    const assignee = index % 3 === 2 ? undefined : staff[index % Math.max(1, staff.length)];
    return {
      id: `hk-${200 + index}`,
      type,
      status,
      priority: priorities[index % priorities.length],
      roomId: room.id,
      roomNumber: room.roomNumber,
      roomTypeName: room.roomTypeName ?? null,
      assignedToId: assignee?.userId ?? null,
      assigneeName: assignee?.fullName ?? null,
      dueAt: `${BUSINESS_DATE}T12:00:00Z`,
      startedAt: status === 'TODO' ? null : `${BUSINESS_DATE}T08:15:00Z`,
      completedAt: ['CLEANED', 'INSPECTION_REQUIRED'].includes(status) ? `${BUSINESS_DATE}T09:05:00Z` : null,
      inspectedAt: status === 'READY' ? `${BUSINESS_DATE}T09:40:00Z` : null,
      notes: null,
      blockedReason: null,
      createdAt: `${BUSINESS_DATE}T07:30:00Z`,
    };
  });

  // A blocked task and a completed one for flavour.
  list.push({
    id: 'hk-260',
    type: 'MAINTENANCE_CLEAN',
    status: 'BLOCKED',
    priority: 'URGENT',
    roomId: byRoomNumber('402')?.id ?? 'room-402',
    roomNumber: '402',
    roomTypeName: 'Superior',
    assignedToId: staff[0]?.userId ?? null,
    assigneeName: staff[0]?.fullName ?? null,
    dueAt: `${BUSINESS_DATE}T10:00:00Z`,
    startedAt: `${BUSINESS_DATE}T08:00:00Z`,
    completedAt: null,
    inspectedAt: null,
    notes: 'Awaiting maintenance to finish the AC repair.',
    blockedReason: 'Room cannot be cleaned until the AC repair is complete.',
    createdAt: `${BUSINESS_DATE}T07:45:00Z`,
  });
  list.push({
    id: 'hk-261',
    type: 'STAYOVER_CLEAN',
    status: 'READY',
    priority: 'NORMAL',
    roomId: byRoomNumber('305')?.id ?? 'room-305',
    roomNumber: '305',
    roomTypeName: 'Deluxe',
    assignedToId: staff[1]?.userId ?? null,
    assigneeName: staff[1]?.fullName ?? null,
    dueAt: `${BUSINESS_DATE}T09:00:00Z`,
    startedAt: `${BUSINESS_DATE}T07:50:00Z`,
    completedAt: `${BUSINESS_DATE}T08:20:00Z`,
    inspectedAt: `${BUSINESS_DATE}T08:45:00Z`,
    notes: null,
    blockedReason: null,
    createdAt: `${BUSINESS_DATE}T07:20:00Z`,
  });
  return list;
})();

const tickets: MaintenanceTicketRow[] = [
  {
    id: 'mx-118', ticketNo: 'WO-118', title: 'Bathroom faucet leak', description: 'The bathroom faucet in room 208 is leaking continuously and has been taken out of service.',
    category: 'PLUMBING', priority: 'CRITICAL', status: 'IN_PROGRESS', roomId: byRoomNumber('208')?.id ?? 'room-208', roomNumber: '208',
    assignedToId: mxStaff()[0]?.userId ?? null, assigneeName: mxStaff()[0]?.fullName ?? null, reportedByName: 'Anita Desai',
    resolution: null, createdAt: `${BUSINESS_DATE}T06:50:00Z`,
  },
  {
    id: 'mx-119', ticketNo: 'WO-119', title: 'Air-conditioning not cooling', description: 'Guest reports the AC in room 402 is blowing warm air.',
    category: 'HVAC', priority: 'HIGH', status: 'ASSIGNED', roomId: byRoomNumber('402')?.id ?? 'room-402', roomNumber: '402',
    assignedToId: mxStaff()[0]?.userId ?? null, assigneeName: mxStaff()[0]?.fullName ?? null, reportedByName: 'Vikram Rao',
    resolution: null, createdAt: `${BUSINESS_DATE}T07:10:00Z`,
  },
  {
    id: 'mx-120', ticketNo: 'WO-120', title: 'Television remote missing', description: 'Room 601 is missing its television remote.',
    category: 'ELECTRICAL', priority: 'LOW', status: 'OPEN', roomId: byRoomNumber('601')?.id ?? 'room-601', roomNumber: '601',
    assignedToId: null, assigneeName: null, reportedByName: 'Neha Gupta', resolution: null, createdAt: `${BUSINESS_DATE}T08:05:00Z`,
  },
  {
    id: 'mx-121', ticketNo: 'WO-121', title: 'Broken wardrobe hinge', description: 'The wardrobe hinge in room 302 is broken.',
    category: 'FURNITURE', priority: 'NORMAL', status: 'RESOLVED', roomId: byRoomNumber('302')?.id ?? 'room-302', roomNumber: '302',
    assignedToId: mxStaff()[0]?.userId ?? null, assigneeName: mxStaff()[0]?.fullName ?? null, reportedByName: 'Anita Desai',
    resolution: 'Hinge replaced and door aligned.', createdAt: `${addDays(BUSINESS_DATE, -1)}T15:20:00Z`,
  },
  {
    id: 'mx-122', ticketNo: 'WO-122', title: 'Shower drain slow', description: 'The shower drain in room 101 drains slowly.',
    category: 'PLUMBING', priority: 'NORMAL', status: 'CLOSED', roomId: byRoomNumber('101')?.id ?? 'room-101', roomNumber: '101',
    assignedToId: mxStaff()[0]?.userId ?? null, assigneeName: mxStaff()[0]?.fullName ?? null, reportedByName: 'Ramu Yadav',
    resolution: 'Drain cleared and tested.', createdAt: `${addDays(BUSINESS_DATE, -2)}T11:00:00Z`,
  },
];

/* ------------------------------------------------------------- audit events */

const auditEvents: AuditEventRow[] = [
  { id: 'aud-1', action: 'stay.check-in', resourceType: 'reservation', resourceId: 'res-1004', outcome: 'SUCCESS', reason: null, actorName: 'Vikram Rao', createdAt: `${BUSINESS_DATE} 09:12` },
  { id: 'aud-2', action: 'folio.payment', resourceType: 'folio', resourceId: 'folio-1001', outcome: 'SUCCESS', reason: null, actorName: 'Neha Gupta', createdAt: `${BUSINESS_DATE} 08:58` },
  { id: 'aud-3', action: 'housekeeping.complete', resourceType: 'housekeeping_task', resourceId: 'hk-261', outcome: 'SUCCESS', reason: null, actorName: 'Ramu Yadav', createdAt: `${BUSINESS_DATE} 08:20` },
  { id: 'aud-4', action: 'room.out-of-order', resourceType: 'room', resourceId: 'room-208', outcome: 'SUCCESS', reason: 'Bathroom faucet leak', actorName: 'Sara Khan', createdAt: `${BUSINESS_DATE} 06:52` },
  { id: 'aud-5', action: 'maintenance.create', resourceType: 'maintenance_ticket', resourceId: 'mx-118', outcome: 'SUCCESS', reason: null, actorName: 'Anita Desai', createdAt: `${BUSINESS_DATE} 06:50` },
  { id: 'aud-6', action: 'reservation.create', resourceType: 'reservation', resourceId: 'res-1023', outcome: 'SUCCESS', reason: null, actorName: 'Vikram Rao', createdAt: `${addDays(BUSINESS_DATE, -1)} 19:41` },
  { id: 'aud-7', action: 'staff.invite', resourceType: 'user', resourceId: 'u-9', outcome: 'SUCCESS', reason: null, actorName: 'Anaya Sharma', createdAt: `${addDays(BUSINESS_DATE, -1)} 17:05` },
  { id: 'aud-8', action: 'night-audit.close', resourceType: 'business_date', resourceId: null, outcome: 'SUCCESS', reason: null, actorName: 'Anaya Sharma', createdAt: `${addDays(BUSINESS_DATE, -1)} 23:59` },
  { id: 'aud-9', action: 'payment.refund', resourceType: 'payment', resourceId: 'pay-1035-1', outcome: 'SUCCESS', reason: 'Goodwill — noisy room', actorName: 'Sara Khan', createdAt: `${addDays(BUSINESS_DATE, -2)} 14:22` },
  { id: 'aud-10', action: 'auth.login', resourceType: 'session', resourceId: null, outcome: 'SUCCESS', reason: null, actorName: 'Anaya Sharma', createdAt: `${BUSINESS_DATE} 07:42` },
  { id: 'aud-11', action: 'invoice.issue', resourceType: 'invoice', resourceId: 'inv-1', outcome: 'SUCCESS', reason: null, actorName: 'Meera Joshi', createdAt: `${addDays(BUSINESS_DATE, -1)} 18:30` },
  { id: 'aud-12', action: 'reservation.cancel', resourceType: 'reservation', resourceId: 'res-1041', outcome: 'SUCCESS', reason: 'Guest travel plans changed', actorName: 'Vikram Rao', createdAt: `${addDays(BUSINESS_DATE, -1)} 12:10` },
];

/* ------------------------------------------------------------------- store */

function listReservations(search: string, status: string | undefined, page: number, pageSize: number): PageResult<ReservationRow> {
  const needle = search.trim().toLowerCase();
  const filtered = reservations.filter((r) => {
    if (status && r.status !== status) return false;
    if (!needle) return true;
    return (
      (r.bookingCode ?? '').toLowerCase().includes(needle) ||
      (r.guestName ?? '').toLowerCase().includes(needle) ||
      (r.roomNumber ?? '').toLowerCase().includes(needle)
    );
  });
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize).map(clone);
  return { data, page, pageSize, hasMore: start + pageSize < filtered.length, today: BUSINESS_DATE };
}

function createReservation(body: Record<string, unknown>): { id: string; bookingCode: string } {
  const guestId = String(body.primaryGuestId ?? '');
  const guest = guests.find((g) => g.id === guestId);
  const checkInDate = String(body.checkInDate ?? BUSINESS_DATE);
  const checkOutDate = String(body.checkOutDate ?? addDays(checkInDate, 1));
  const nights = nightsBetween(checkInDate, checkOutDate);
  const id = nextId('res');
  const requestedLines = Array.isArray(body.roomLines) ? body.roomLines as Array<Record<string, unknown>> : [];
  const legacyType = ROOM_TYPES.find((t) => t.id === String(body.roomTypeId)) ?? ROOM_TYPES[1];
  const lines = (requestedLines.length ? requestedLines : [{
    roomTypeId: legacyType.id,
    roomId: body.roomId,
    nightlyRate: body.nightlyRate ?? legacyType.baseRate,
    ratePlanName: body.ratePlanName,
    adults: body.adults,
    children: body.children,
  }]).map((input, index): ReservationRoomRow => {
    const type = ROOM_TYPES.find((item) => item.id === String(input.roomTypeId)) ?? legacyType;
    const roomId = input.roomId ? String(input.roomId) : null;
    const room = roomId ? rooms.find((item) => item.id === roomId) : undefined;
    if (roomId && (!room || room.roomTypeId !== type.id || !availability(checkInDate, checkOutDate, type.id).available.some((item) => item.id === roomId))) {
      throw new Error(`Room assignment for ${type.name} is no longer available.`);
    }
    return {
      id: String(input.id ?? `rl-${index + 1}`),
      roomTypeId: type.id,
      roomId: room?.id ?? null,
      roomNumber: room?.roomNumber ?? (roomId && input.roomNumber ? String(input.roomNumber) : null),
      roomTypeName: type.name,
      baseRate: money(num(input.baseRate ?? input.nightlyRate ?? type.baseRate)),
      nightlyRate: money(num(input.nightlyRate ?? input.baseRate ?? type.baseRate)),
      ratePlanName: String(input.ratePlanName ?? 'Best Available Rate'),
      adults: Math.max(1, num(input.adults) || (index === 0 ? num(body.adults) || 1 : 1)),
      children: num(input.children),
      infants: num(input.infants),
      mealPlanName: String(input.mealPlanName ?? 'EP'),
      billingRoute: String(input.billingRoute ?? 'To Guest'),
      occupants: Array.isArray(input.occupants) ? input.occupants as ReservationRoomRow['occupants'] : [],
    };
  });
  const assignedRoomIds = lines.map((line) => line.roomId).filter((roomId): roomId is string => Boolean(roomId));
  if (new Set(assignedRoomIds).size !== assignedRoomIds.length) {
    throw new Error('A physical room cannot be assigned to more than one room line in this booking.');
  }
  const roomSubtotal = round2(lines.reduce((sum, line) => sum + num(line.nightlyRate) * nights, 0));
  const preferences = (body.billingPreferences && typeof body.billingPreferences === 'object'
    ? body.billingPreferences : {}) as Partial<ReservationBillingPreferencesRow>;
  const pendingCharges = (Array.isArray(body.pendingCharges) ? body.pendingCharges : []).map((input, index) => {
    const charge = input as Record<string, unknown>;
    const quantity = Math.max(1, num(charge.quantity));
    const unitAmount = Math.max(0, num(charge.unitAmount));
    const totalAmount = round2(quantity * unitAmount);
    const billingRoute = String(charge.billingRoute ?? 'To Guest');
    return {
      id: String(charge.id ?? `charge-${index + 1}`),
      outletId: String(charge.outletId ?? ''),
      outletName: String(charge.outletName ?? 'Outlet'),
      description: String(charge.description ?? 'POS charge'),
      quantity: String(quantity),
      unitAmount: money(unitAmount),
      taxAmount: money(round2(totalAmount * TAX_RATE)),
      totalAmount: money(totalAmount),
      billingRoute,
      roomLineId: charge.roomLineId ? `rl-${id}-${String(charge.roomLineId)}` : null,
      roomNumber: charge.roomNumber ? String(charge.roomNumber) : null,
      postToFolio: Boolean(charge.postToFolio) && !preferences.noPost && billingRoute !== 'Direct Settlement',
    } satisfies ReservationChargeRow;
  });
  const extrasSubtotal = round2(pendingCharges.reduce((sum, charge) => sum + num(charge.totalAmount), 0));
  const discountAmount = round2(Math.min(Math.max(0, num(body.discountAmount)), roomSubtotal + extrasSubtotal));
  const subtotal = round2(roomSubtotal + extrasSubtotal - discountAmount);
  const taxTotal = round2(subtotal * TAX_RATE);
  const pendingPayments = (Array.isArray(body.pendingPayments) ? body.pendingPayments : []).map((input) => {
    const payment = input as Record<string, unknown>;
    return {
      amount: money(num(payment.amount)),
      method: String(payment.method ?? 'OTHER'),
      reference: payment.reference ? String(payment.reference) : null,
      recordedAt: payment.recordedAt ? String(payment.recordedAt) : stamp(checkInDate),
    } satisfies ReservationPendingPaymentRow;
  }).filter((payment) => num(payment.amount) > 0);
  const firstLine = lines[0];
  const assignedLines = lines.filter((line) => line.roomNumber);
  const distinctTypes = Array.from(new Set(lines.map((line) => line.roomTypeName ?? 'Room')));
  const roomSummary = lines.map((line) => `${line.roomTypeName ?? 'Room'}${line.roomNumber ? ` · ${line.roomNumber}` : ' · Unassigned'}`).join(' + ');
  const requestedCode = String(body.bookingCode ?? '').trim();
  const bookingCode = requestedCode && !reservations.some((reservation) => reservation.bookingCode === requestedCode)
    ? requestedCode
    : `RSV-${++bookingSeq}`;
  const guestName = guest ? `${guest.firstName} ${guest.lastName}` : 'Guest';
  const adults = lines.reduce((sum, line) => sum + num(line.adults), 0);
  const children = lines.reduce((sum, line) => sum + num(line.children), 0);
  const infants = lines.reduce((sum, line) => sum + num(line.infants), 0);
  const paid = round2(pendingPayments.reduce((sum, payment) => sum + num(payment.amount), 0));

  const reservation: ReservationRow = {
    id,
    bookingCode,
    externalReferenceId: String(body.externalReferenceId ?? '').trim() || null,
    status: String(body.status ?? 'CONFIRMED'),
    source: String(body.source ?? 'DIRECT'),
    checkInDate,
    checkOutDate,
    nights,
    adults,
    children,
    infants,
    currencyCode: 'INR',
    totalAmount: money(subtotal + taxTotal),
    subtotal: money(subtotal),
    taxTotal: money(taxTotal),
    primaryGuestId: guestId || undefined,
    nightlyRate: firstLine.nightlyRate,
    internalNotes: (body.internalNotes as string) ?? null,
    specialRequests: (body.specialRequests as string) ?? null,
    guest: guest ? { id: guest.id, name: guestName, firstName: guest.firstName, lastName: guest.lastName } : null,
    guestName,
    roomNumber: assignedLines[0]?.roomNumber ?? null,
    roomSummary,
    roomTypeId: firstLine.roomTypeId,
    roomTypeName: distinctTypes.join(' + '),
    roomLines: lines.map((line) => ({ ...line, id: `rl-${id}-${line.id}` })),
    pendingCharges,
    pendingPayments,
    billingPreferences: {
      roomBillTo: String(preferences.roomBillTo ?? 'To Guest'),
      extrasBillTo: String(preferences.extrasBillTo ?? 'To Guest'),
      billToCompany: Boolean(preferences.billToCompany),
      noPost: Boolean(preferences.noPost),
      companyName: preferences.companyName ?? null,
      companyGst: preferences.companyGst ?? null,
      payAtHotel: Boolean(preferences.payAtHotel),
    },
    discountAmount: money(discountAmount),
    paid,
  };
  reservations.unshift(reservation);
  return { id, bookingCode };
}

function updateReservation(id: string, body: Record<string, unknown>): ReservationRow | undefined {
  const reservation = reservations.find((r) => r.id === id);
  if (!reservation) return undefined;
  if (body.checkInDate) reservation.checkInDate = String(body.checkInDate);
  if (body.checkOutDate) reservation.checkOutDate = String(body.checkOutDate);
  if (body.adults !== undefined) reservation.adults = num(body.adults);
  if (body.children !== undefined) reservation.children = num(body.children);
  if (body.specialRequests !== undefined) reservation.specialRequests = (body.specialRequests as string) ?? null;
  if (body.internalNotes !== undefined) reservation.internalNotes = (body.internalNotes as string) ?? null;
  reservation.nights = nightsBetween(reservation.checkInDate, reservation.checkOutDate);
  const roomSubtotal = round2((reservation.roomLines ?? []).reduce((sum, line) => sum + num(line.nightlyRate) * reservation.nights!, 0));
  const extrasSubtotal = round2((reservation.pendingCharges ?? []).reduce((sum, charge) => sum + num(charge.totalAmount), 0));
  const discountAmount = Math.min(num(reservation.discountAmount), roomSubtotal + extrasSubtotal);
  const subtotal = round2(roomSubtotal + extrasSubtotal - discountAmount);
  const taxTotal = round2(subtotal * TAX_RATE);
  reservation.subtotal = money(subtotal);
  reservation.taxTotal = money(taxTotal);
  reservation.totalAmount = money(subtotal + taxTotal);

  const folio = folioForReservation(id);
  if (folio) {
    for (const line of reservation.roomLines ?? []) {
      const roomItem = folio.items.find((item) => item.type === 'ROOM' && item.id === `room-${line.id}`);
      if (roomItem) {
        const lineSubtotal = round2(num(line.nightlyRate) * reservation.nights!);
        roomItem.quantity = String(reservation.nights);
        roomItem.totalAmount = money(lineSubtotal);
        roomItem.taxAmount = money(round2(lineSubtotal * TAX_RATE));
      }
    }
  }
  return clone(reservation);
}

function assignRoom(id: string, roomId: string, roomLineId?: string): void {
  const reservation = reservations.find((r) => r.id === id);
  const room = rooms.find((r) => r.id === roomId);
  if (!reservation || !room) return;
  const lines = reservation.roomLines ?? [];
  const line = roomLineId
    ? lines.find((item) => item.id === roomLineId)
    : lines.find((item) => !item.roomId) ?? (lines.length === 1 ? lines[0] : undefined);
  if (roomLineId && !line) throw new Error('Reservation room line was not found.');
  if (lines.some((item) => item.id !== line?.id && item.roomId === room.id)) {
    throw new Error('This physical room is already assigned to another room line in the booking.');
  }
  if (line) {
    line.roomId = room.id;
    line.roomNumber = room.roomNumber;
    line.roomTypeId = room.roomTypeId;
    line.roomTypeName = room.roomTypeName ?? null;
  } else {
    if (lines.length > 0) throw new Error('Select the reservation room line for this room assignment.');
    reservation.roomLines = [
      {
        id: `rl-${id}`,
        roomTypeId: room.roomTypeId,
        roomId: room.id,
        roomNumber: room.roomNumber,
        roomTypeName: room.roomTypeName ?? null,
        nightlyRate: reservation.nightlyRate ?? money(Number(room.baseRate ?? 0)),
        ratePlanName: 'Best Available',
      },
    ];
  }
  const firstLine = reservation.roomLines?.[0];
  reservation.roomNumber = reservation.roomLines?.find((item) => item.roomNumber)?.roomNumber ?? room.roomNumber;
  reservation.roomSummary = (reservation.roomLines ?? []).map((item) => `${item.roomTypeName ?? 'Room'}${item.roomNumber ? ` · ${item.roomNumber}` : ' · Unassigned'}`).join(' + ');
  if (firstLine) {
    reservation.roomTypeId = firstLine.roomTypeId;
    reservation.roomTypeName = Array.from(new Set((reservation.roomLines ?? []).map((item) => item.roomTypeName).filter(Boolean))).join(' + ');
    reservation.nightlyRate = firstLine.nightlyRate;
  }
}

function checkIn(id: string): void {
  const reservation = reservations.find((r) => r.id === id);
  if (!reservation) return;
  reservation.status = 'CHECKED_IN';
  const roomLines = reservation.roomLines ?? [];
  for (const line of roomLines) {
    const room = byRoomNumber(line.roomNumber);
    if (room && room.status !== 'OUT_OF_ORDER') room.status = 'OCCUPIED_CLEAN';
  }
  if (roomLines.length === 0) {
    const room = byRoomNumber(reservation.roomNumber);
    if (room && room.status !== 'OUT_OF_ORDER') room.status = 'OCCUPIED_CLEAN';
  }
  let folio = folioForReservation(id);
  if (!folio) {
    const nights = reservation.nights ?? nightsBetween(reservation.checkInDate, reservation.checkOutDate);
    const lines = roomLines.length ? roomLines : [{
      id: `rl-${id}`,
      roomTypeId: reservation.roomTypeId ?? '',
      roomTypeName: reservation.roomTypeName,
      roomNumber: reservation.roomNumber,
      nightlyRate: reservation.nightlyRate ?? '0',
      mealPlanName: null,
      billingRoute: reservation.billingPreferences?.roomBillTo ?? 'To Guest',
    }];
    const items: FolioItemRow[] = lines.map((line) => {
      const subtotal = round2(num(line.nightlyRate) * nights);
      return {
        id: `room-${line.id}`,
        type: 'ROOM',
        description: `Room charge · ${line.roomTypeName ?? 'Room'}${line.roomNumber ? ` ${line.roomNumber}` : ''}${line.mealPlanName && line.mealPlanName !== 'EP' ? ` · ${line.mealPlanName}` : ''}`,
        quantity: String(nights),
        unitAmount: line.nightlyRate,
        taxAmount: money(round2(subtotal * TAX_RATE)),
        totalAmount: money(subtotal),
        isVoided: false,
        createdAt: stamp(reservation.checkInDate, 14, 10),
        billingRoute: line.billingRoute ?? 'To Guest',
      };
    });
    const postedCharges = (reservation.pendingCharges ?? []).filter((charge) => charge.postToFolio);
    for (const charge of postedCharges) {
      const assignedRoomNumber = charge.roomNumber ?? roomLines.find((line) => line.id === charge.roomLineId)?.roomNumber;
      items.push({
        id: `pos-${charge.id}`,
        type: 'POS',
        description: `${charge.outletName} · ${charge.description}${assignedRoomNumber ? ` · Room ${assignedRoomNumber}` : ''}`,
        quantity: charge.quantity,
        unitAmount: charge.unitAmount,
        taxAmount: charge.taxAmount,
        totalAmount: charge.totalAmount,
        isVoided: false,
        createdAt: stamp(reservation.checkInDate, 14, 15),
        billingRoute: charge.billingRoute,
        outletId: charge.outletId,
      });
    }
    const postedSubtotal = items.reduce((sum, item) => sum + num(item.totalAmount), 0);
    const discount = round2(Math.min(num(reservation.discountAmount), Math.max(0, postedSubtotal)));
    if (discount > 0) {
      items.push({
        id: `discount-${id}`,
        type: 'DISCOUNT',
        description: 'Reservation discount',
        quantity: '1',
        unitAmount: money(-discount),
        taxAmount: money(-round2(discount * TAX_RATE)),
        totalAmount: money(-discount),
        isVoided: false,
        createdAt: stamp(reservation.checkInDate, 14, 20),
        billingRoute: reservation.billingPreferences?.roomBillTo ?? 'To Guest',
      });
    }
    const folioId = `folio-${id.replace('res-', '')}`;
    const paymentMethod = (method: string): string => ({
      'UPI / QR': 'UPI',
      'Credit Card': 'CARD_TERMINAL',
      'Debit Card': 'CARD_TERMINAL',
      Cash: 'CASH',
      'Bank Transfer': 'BANK_TRANSFER',
    }[method] ?? method);
    folio = {
      id: folioId,
      folioNo: `F-${reservation.bookingCode.replace('RSV-', '')}`,
      reservationId: id,
      status: 'OPEN',
      currencyCode: reservation.currencyCode ?? 'INR',
      guestName: reservation.guestName ?? 'Guest',
      items,
      payments: (reservation.pendingPayments ?? []).map((payment, index) => ({
        id: nextId('pay'),
        folioId,
        folioNo: `F-${reservation.bookingCode.replace('RSV-', '')}`,
        amount: payment.amount,
        currencyCode: reservation.currencyCode ?? 'INR',
        method: paymentMethod(payment.method),
        status: 'SUCCEEDED',
        reference: payment.reference ?? null,
        recordedAt: payment.recordedAt ?? stamp(reservation.checkInDate, 14, 25 + index),
        guestName: reservation.guestName ?? 'Guest',
      })),
    };
    folios.push(folio);
  }
}

function createCheckoutTask(roomNumber: string | null | undefined): void {
  const room = byRoomNumber(roomNumber);
  if (!room) return;
  tasks.unshift({
    id: nextId('hk'),
    type: 'CHECKOUT_CLEAN',
    status: 'TODO',
    priority: 'HIGH',
    roomId: room.id,
    roomNumber: room.roomNumber,
    roomTypeName: room.roomTypeName ?? null,
    assignedToId: null,
    assigneeName: null,
    dueAt: `${BUSINESS_DATE}T14:00:00Z`,
    startedAt: null,
    completedAt: null,
    inspectedAt: null,
    notes: 'Auto-created on check-out.',
    blockedReason: null,
    createdAt: stamp(BUSINESS_DATE, 11, 0),
  });
}

function checkOut(id: string, _overrideReason?: string): void {
  const reservation = reservations.find((r) => r.id === id);
  if (!reservation) return;
  reservation.status = 'CHECKED_OUT';
  const roomNumbers = new Set((reservation.roomLines ?? []).map((line) => line.roomNumber).filter((number): number is string => Boolean(number)));
  if (!roomNumbers.size && reservation.roomNumber) roomNumbers.add(reservation.roomNumber);
  for (const roomNumber of roomNumbers) {
    const room = byRoomNumber(roomNumber);
    if (room) room.status = 'VACANT_DIRTY';
    createCheckoutTask(roomNumber);
  }
  const folio = folioForReservation(id);
  if (folio) folio.status = 'CLOSED';
}

function extend(id: string, newCheckOutDate: string): void {
  const reservation = reservations.find((r) => r.id === id);
  if (!reservation) return;
  reservation.checkOutDate = newCheckOutDate;
  reservation.nights = nightsBetween(reservation.checkInDate, newCheckOutDate);
  const roomSubtotal = round2((reservation.roomLines ?? []).reduce((sum, line) => sum + num(line.nightlyRate) * reservation.nights!, 0));
  const extrasSubtotal = round2((reservation.pendingCharges ?? []).reduce((sum, charge) => sum + num(charge.totalAmount), 0));
  const subtotal = round2(Math.max(0, roomSubtotal + extrasSubtotal - num(reservation.discountAmount)));
  const taxTotal = round2(subtotal * TAX_RATE);
  reservation.subtotal = money(subtotal);
  reservation.taxTotal = money(taxTotal);
  reservation.totalAmount = money(subtotal + taxTotal);
  const folio = folioForReservation(id);
  if (folio) {
    for (const line of reservation.roomLines ?? []) {
      const roomItem = folio.items.find((item) => item.type === 'ROOM' && item.id === `room-${line.id}`);
      if (roomItem) {
        const lineSubtotal = round2(num(line.nightlyRate) * reservation.nights);
        roomItem.quantity = String(reservation.nights);
        roomItem.totalAmount = money(lineSubtotal);
        roomItem.taxAmount = money(round2(lineSubtotal * TAX_RATE));
      }
    }
  }
}

function availability(checkIn: string, checkOut: string, roomTypeId: string): AvailabilityResult {
  const nights = nightDates(checkIn, checkOut);
  const candidates = rooms.filter((r) => r.isActive && r.status !== 'OUT_OF_ORDER' && r.roomTypeId === roomTypeId);
  const now = Date.now();
  const available = candidates.filter((room) => {
    if (room.status.startsWith('OCCUPIED')) return false;
    const blocked = reservations.some(
      (r) =>
        (r.status === 'CONFIRMED' || r.status === 'CHECKED_IN') &&
        r.roomLines?.some((l) => l.roomId === room.id || l.roomNumber === room.roomNumber) &&
        overlaps(r.checkInDate, r.checkOutDate, checkIn, checkOut),
    );
    if (blocked) return false;
    const held = Array.from(holds.values()).some(
      (h) => h.roomId === room.id && h.expiresAtMs > now && overlaps(checkIn, checkOut, h.checkIn, h.checkOut),
    );
    return !held;
  });
  return {
    nights,
    totalRooms: candidates.length,
    available: available.map((r) => ({ id: r.id, roomNumber: r.roomNumber, floor: r.floor ?? null, status: r.status })),
  };
}

/* --------------------------------------------------------------- users/roles */

function userRow(user: InternalUser): UserRow {
  return {
    userId: user.userId,
    email: user.email,
    fullName: user.fullName,
    status: user.status,
    lastLoginAt: user.lastLoginAt ?? null,
    membershipActive: user.membershipActive,
    invitePending: user.invitePending,
    inviteExpired: user.inviteExpired,
    propertyId: activePropertyId,
    roleKey: user.roleKey,
    roleName: user.roleName,
  };
}

function roleRows(): RoleRow[] {
  return ROLE_DEFS.map((role) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isActive: role.isActive,
    permissions: role.permissions,
    memberCount: users.filter((u) => u.roleKey === role.key).length,
  }));
}

function roleMatrix(): RoleMatrix {
  const resources = Array.from(new Set(PERMISSION_CATALOG.map((p) => p.resource)));
  return {
    roles: ROLE_DEFS.map((r) => ({ key: r.key, name: r.name })),
    resources: resources.map((resource) => ({
      resource,
      permissions: PERMISSION_CATALOG.filter((p) => p.resource === resource).map((p) => ({
        key: p.key,
        action: p.action,
        description: p.description,
        roles: ROLE_DEFS.filter((r) => r.permissions.includes(p.key)).map((r) => r.key),
      })),
    })),
  };
}

/* --------------------------------------------------------------- csv export */

function csv(rows: Array<Array<string | number>>): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '');
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(','),
    )
    .join('\r\n');
}

function exportCsv(path: string, fallbackName: string): { filename: string; content: string } {
  const [pathname, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  const today = BUSINESS_DATE;

  if (pathname.includes('/daily-flash/export.csv')) {
    const date = params.get('date') ?? today;
    const flash = dailyFlash(date);
    const rows: Array<Array<string | number>> = [['Section', 'Booking', 'Guest', 'Date', 'Party']];
    flash.arrivals.forEach((a) => rows.push(['Arrival', a.bookingCode, a.guestName ?? '', a.checkOutDate, a.party]));
    flash.departures.forEach((d) => rows.push(['Departure', d.bookingCode, d.guestName ?? '', d.checkInDate, '']));
    rows.push(['In-house', '', '', '', String(flash.inHouseCount)]);
    return { filename: `daily-flash-${date}.csv`, content: csv(rows) };
  }
  if (pathname.includes('/occupancy/export.csv')) {
    const from = params.get('from') ?? today;
    const to = params.get('to') ?? today;
    const report = occupancyReport(from, to);
    const rows: Array<Array<string | number>> = [
      ['Metric', 'Value'],
      ['From', report.from],
      ['To', report.to],
      ['Nights', report.nights],
      ['Rooms', report.rooms],
      ['Available room nights', report.availableRoomNights],
      ['Sold room nights', report.soldRoomNights],
      ['Occupancy %', report.occupancyPct],
    ];
    return { filename: `occupancy-${from}-${to}.csv`, content: csv(rows) };
  }
  if (pathname.includes('/revenue/export.csv')) {
    const from = params.get('from') ?? today;
    const to = params.get('to') ?? today;
    const report = revenueReport(from, to);
    const rows: Array<Array<string | number>> = [
      ['Metric', 'Value'],
      ['From', report.from],
      ['To', report.to],
      ['Room revenue', report.roomRevenue],
      ['Other revenue', report.otherRevenue],
      ['Tax', report.taxTotal],
      ['Gross revenue', report.grossRevenue],
      ['Payments collected', report.paymentsCollected],
      ['Payments refunded', report.paymentsRefunded],
      ['Net collected', report.paymentsNetCollected],
      ['ADR', report.adr],
      ['RevPAR', report.revpar],
    ];
    return { filename: `revenue-${from}-${to}.csv`, content: csv(rows) };
  }
  if (pathname.includes('/arrivals-departures/export.csv')) {
    const from = params.get('from') ?? today;
    const to = params.get('to') ?? today;
    const report = movementReport(from, to);
    const rows: Array<Array<string | number>> = [
      ['Booking', 'Guest', 'Status', 'Check-in', 'Check-out', 'Nights', 'Room', 'Adults', 'Children'],
    ];
    report.rows.forEach((r) =>
      rows.push([r.bookingCode, r.guestName ?? '', r.status, r.checkInDate, r.checkOutDate, r.nights, r.roomNumber ?? '', r.adults, r.children]),
    );
    return { filename: `movement-${from}-${to}.csv`, content: csv(rows) };
  }
  if (pathname.includes('/audit-log/export.csv')) {
    const rows: Array<Array<string | number>> = [['When', 'Actor', 'Action', 'Resource', 'Outcome', 'Reason']];
    auditEvents.forEach((e) =>
      rows.push([e.createdAt, e.actorName ?? '', e.action, `${e.resourceType}${e.resourceId ? `:${e.resourceId}` : ''}`, e.outcome, e.reason ?? '']),
    );
    return { filename: 'audit-log.csv', content: csv(rows) };
  }
  return { filename: fallbackName, content: csv([['No data']]) };
}

/* ---------------------------------------------------------------- the store */

export const store = {
  /* auth */
  session,
  switchProperty(propertyId: string) {
    if (propertyId) activePropertyId = propertyId;
  },

  /* properties */
  properties: (): PropertyRow[] => [clone(PROPERTY)],
  updateProperty(id: string, body: Record<string, unknown>) {
    if (id !== PROPERTY.id) return;
    Object.assign(PROPERTY, body);
  },

  /* room types */
  roomTypes: (): RoomTypeRow[] => clone(ROOM_TYPES),
  createRoomType(body: Record<string, unknown>): RoomTypeRow {
    const type: RoomTypeRow = {
      id: String(body.id ?? body.code ?? nextId('rt')).toLowerCase(),
      code: String(body.code ?? 'NEW'),
      name: String(body.name ?? 'New Room Type'),
      description: (body.description as string) ?? null,
      maxAdults: num(body.maxAdults) || 2,
      maxChildren: num(body.maxChildren),
      baseRate: money(num(body.baseRate)),
      amenities: body.amenities ?? [],
      isActive: body.isActive !== false,
    };
    ROOM_TYPES.push(type);
    return clone(type);
  },
  updateRoomType(id: string, body: Record<string, unknown>): RoomTypeRow | undefined {
    const type = ROOM_TYPES.find((t) => t.id === id);
    if (!type) return undefined;
    if (body.name !== undefined) type.name = String(body.name);
    if (body.description !== undefined) type.description = (body.description as string) ?? null;
    if (body.maxAdults !== undefined) type.maxAdults = num(body.maxAdults);
    if (body.maxChildren !== undefined) type.maxChildren = num(body.maxChildren);
    if (body.baseRate !== undefined) type.baseRate = money(num(body.baseRate));
    if (body.isActive !== undefined) type.isActive = Boolean(body.isActive);
    rooms.filter((r) => r.roomTypeId === id).forEach((r) => {
      r.roomTypeName = type.name;
      r.roomTypeCode = type.code;
      r.baseRate = type.baseRate;
    });
    return clone(type);
  },

  /* rooms */
  rooms: (): RoomRow[] => clone(rooms),
  createRoom(body: Record<string, unknown>): RoomRow {
    const type = ROOM_TYPES.find((t) => t.id === String(body.roomTypeId)) ?? ROOM_TYPES[0];
    const roomNumber = String(body.roomNumber ?? nextId('room'));
    const room: RoomRow = {
      id: `room-${roomNumber}`,
      roomNumber,
      roomTypeId: type.id,
      roomTypeCode: type.code,
      roomTypeName: type.name,
      floor: String(body.floor ?? roomNumber.charAt(0)),
      wing: (body.wing as string) ?? null,
      status: 'VACANT_DIRTY',
      isActive: true,
      notes: (body.notes as string) ?? null,
      baseRate: type.baseRate,
      outOfOrderReason: null,
    };
    rooms.push(room);
    return clone(room);
  },
  updateRoom(id: string, body: Record<string, unknown>): RoomRow | undefined {
    const room = rooms.find((r) => r.id === id);
    if (!room) return undefined;
    if (body.status !== undefined) room.status = String(body.status);
    if (body.notes !== undefined) room.notes = (body.notes as string) ?? null;
    if (body.roomTypeId !== undefined) {
      const type = ROOM_TYPES.find((t) => t.id === String(body.roomTypeId));
      if (type) {
        room.roomTypeId = type.id;
        room.roomTypeCode = type.code;
        room.roomTypeName = type.name;
        room.baseRate = type.baseRate;
      }
    }
    if (body.floor !== undefined) room.floor = String(body.floor);
    if (body.wing !== undefined) room.wing = (body.wing as string) ?? null;
    if (body.isActive !== undefined) room.isActive = Boolean(body.isActive);
    return clone(room);
  },
  outOfOrder(id: string, reason: string) {
    const room = rooms.find((r) => r.id === id);
    if (!room) return;
    room.status = 'OUT_OF_ORDER';
    room.outOfOrderReason = reason;
  },
  backInService(id: string, _reason: string) {
    const room = rooms.find((r) => r.id === id);
    if (!room) return;
    room.status = 'VACANT_DIRTY';
    room.outOfOrderReason = null;
  },
  availability,

  /* guests */
  listGuests(search: string, page: number, pageSize: number): PageResult<GuestRow> {
    const needle = search.trim().toLowerCase();
    const filtered = guests.filter((g) => {
      if (!needle) return true;
      return (
        `${g.firstName} ${g.lastName}`.toLowerCase().includes(needle) ||
        (g.email ?? '').toLowerCase().includes(needle) ||
        (g.phone ?? '').toLowerCase().includes(needle) ||
        (g.companyName ?? '').toLowerCase().includes(needle)
      );
    });
    const start = (page - 1) * pageSize;
    return { data: filtered.slice(start, start + pageSize).map(clone), page, pageSize, hasMore: start + pageSize < filtered.length, today: BUSINESS_DATE };
  },
  getGuest(id: string): GuestRow | undefined {
    const guest = guests.find((g) => g.id === id);
    return guest ? clone(guest) : undefined;
  },
  createGuest(body: Record<string, unknown>): GuestRow {
    guestSeq += 1;
    const guest: GuestRow = {
      id: `g-${guestSeq}`,
      firstName: String(body.firstName ?? 'Guest'),
      lastName: String(body.lastName ?? ''),
      email: (body.email as string) ?? null,
      phone: (body.phone as string) ?? null,
      companyName: (body.companyName as string) ?? null,
      city: (body.city as string) ?? null,
      countryCode: (body.countryCode as string) ?? null,
      preferences: (body.preferences as string) ?? null,
      internalNotes: null,
      stayCount: 0,
      lastStayAt: null,
    };
    guests.unshift(guest);
    return clone(guest);
  },
  updateGuest(id: string, body: Record<string, unknown>): GuestRow | undefined {
    const guest = guests.find((g) => g.id === id);
    if (!guest) return undefined;
    Object.assign(guest, body);
    return clone(guest);
  },

  /* reservations */
  listReservations,
  getReservation(id: string): ReservationRow | undefined {
    const reservation = reservations.find((r) => r.id === id);
    return reservation ? clone(reservation) : undefined;
  },
  createReservation,
  updateReservation,
  assignRoom,
  cancelReservation(id: string, reason: string) {
    const reservation = reservations.find((r) => r.id === id);
    if (!reservation) return;
    reservation.status = 'CANCELLED';
    reservation.internalNotes = reason;
  },

  /* front desk */
  arrivals: (): StayList =>
    stayList(reservations.filter((r) => r.status === 'CONFIRMED' && r.checkInDate === BUSINESS_DATE)),
  departures: (): StayList =>
    stayList(reservations.filter((r) => r.status === 'CHECKED_IN' && r.checkOutDate === BUSINESS_DATE)),
  inHouse: (): StayList =>
    stayList(
      reservations.filter(
        (r) => r.status === 'CHECKED_IN' && r.checkInDate <= BUSINESS_DATE && BUSINESS_DATE <= r.checkOutDate,
      ),
    ),
  checkIn,
  checkOut,
  extend,

  /* folios */
  listPayments: (): PaymentRow[] => clone(allPayments()),
  listInvoices: (): InvoiceRow[] => clone(invoices),
  folioBalance(id: string): FolioBalanceRow | undefined {
    const folio = folios.find((f) => f.id === id);
    return folio ? folioBalance(folio) : undefined;
  },
  folioDetail(id: string): FolioDetailRow | undefined {
    const folio = folios.find((f) => f.id === id);
    return folio ? folioDetail(folio) : undefined;
  },
  closeFolio(id: string) {
    const folio = folios.find((f) => f.id === id);
    if (folio) folio.status = 'CLOSED';
  },
  reopenFolio(id: string, _reason: string) {
    const folio = folios.find((f) => f.id === id);
    if (folio) folio.status = 'OPEN';
  },
  postItem(id: string, body: Record<string, unknown>): FolioItemRow | undefined {
    const folio = folios.find((f) => f.id === id);
    if (!folio) return undefined;
    const qty = num(body.quantity) || 1;
    const unit = round2(num(body.unitAmount));
    const gross = round2(qty * unit);
    const item: FolioItemRow = {
      id: nextId('itm'),
      type: String(body.type ?? 'INCIDENTAL'),
      description: String(body.description ?? 'Charge'),
      quantity: String(qty),
      unitAmount: money(unit),
      taxAmount: money(round2(gross * TAX_RATE)),
      totalAmount: money(gross),
      isVoided: false,
      createdAt: new Date().toISOString(),
    };
    folio.items.push(item);
    return clone(item);
  },
  voidItem(itemId: string, _reason: string) {
    folios.forEach((folio) => {
      const item = folio.items.find((i) => i.id === itemId);
      if (item) item.isVoided = true;
    });
  },
  recordPayment(id: string, body: Record<string, unknown>): PaymentRow | undefined {
    const folio = folios.find((f) => f.id === id);
    if (!folio) return undefined;
    const payment: PaymentRow = {
      id: nextId('pay'),
      folioId: folio.id,
      folioNo: folio.folioNo,
      amount: money(num(body.amount)),
      currencyCode: folio.currencyCode,
      method: String(body.method ?? 'CARD_TERMINAL'),
      status: 'SUCCEEDED',
      reference: (body.reference as string) ?? `TXN-${nextId('R')}`,
      refundedAmount: '0.00',
      recordedAt: new Date().toISOString(),
      guestName: folio.guestName,
    };
    folio.payments.push(payment);
    return clone(payment);
  },
  refundPayment(paymentId: string, amount: string, _reason: string) {
    folios.forEach((folio) => {
      const payment = folio.payments.find((p) => p.id === paymentId);
      if (!payment) return;
      const refunded = round2(Number(payment.refundedAmount ?? 0) + Number(amount));
      payment.refundedAmount = money(refunded);
      payment.status = refunded >= Number(payment.amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    });
  },
  issueInvoice(folioId: string): { id: string; invoiceNo: string; status: string } | undefined {
    const folio = folios.find((f) => f.id === folioId);
    if (!folio) return undefined;
    const balance = folioBalance(folio);
    invoiceSeq += 1;
    const invoice: InvoiceRow = {
      id: `inv-${invoiceSeq}`,
      invoiceNo: `INV-${invoiceSeq}`,
      folioId: folio.id,
      status: 'ISSUED',
      currencyCode: folio.currencyCode,
      subtotal: balance.charges,
      taxTotal: balance.tax,
      totalAmount: balance.total,
      issuedAt: new Date().toISOString(),
      folioNo: folio.folioNo,
      bookingCode: reservations.find((r) => r.id === folio.reservationId)?.bookingCode ?? null,
      guestName: folio.guestName,
    };
    invoices.unshift(invoice);
    return { id: invoice.id, invoiceNo: invoice.invoiceNo, status: invoice.status };
  },
  voidInvoice(invoiceId: string, _reason: string) {
    const invoice = invoices.find((i) => i.id === invoiceId);
    if (invoice) invoice.status = 'VOID';
  },
  getInvoice(id: string) {
    const invoice = invoices.find((i) => i.id === id);
    if (!invoice) return undefined;
    const folio = folios.find((f) => f.id === invoice.folioId);
    return {
      ...clone(invoice),
      property: { name: PROPERTY.name, addressLine1: PROPERTY.addressLine1 ?? null, city: PROPERTY.city ?? null, countryCode: PROPERTY.countryCode ?? 'IN' },
      lines: (folio?.items ?? []).filter((i) => !i.isVoided).map((i) => ({ id: i.id, description: i.description, totalAmount: i.totalAmount })),
    };
  },

  /* housekeeping */
  housekeepingTasks: (scope?: string): HousekeepingTaskRow[] => {
    if (scope === 'open') return clone(tasks.filter((t) => !['READY', 'CANCELLED'].includes(t.status)));
    return clone(tasks);
  },
  housekeepingSummary: () => {
    const byStatus: Record<string, number> = {};
    tasks.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    });
    return { byStatus, rooms: roomsSummary() };
  },
  createTask(body: Record<string, unknown>): { id: string; status: string; roomNumber: string } {
    const room = rooms.find((r) => r.id === String(body.roomId));
    const task: HousekeepingTaskRow = {
      id: nextId('hk'),
      type: String(body.type ?? 'CHECKOUT_CLEAN'),
      status: 'TODO',
      priority: String(body.priority ?? 'NORMAL'),
      roomId: room?.id ?? String(body.roomId ?? ''),
      roomNumber: room?.roomNumber ?? (body.roomNumber as string) ?? null,
      roomTypeName: room?.roomTypeName ?? null,
      assignedToId: (body.assignedToId as string) ?? null,
      assigneeName: users.find((u) => u.userId === body.assignedToId)?.fullName ?? null,
      dueAt: (body.dueAt as string) ?? `${BUSINESS_DATE}T14:00:00Z`,
      startedAt: null,
      completedAt: null,
      inspectedAt: null,
      notes: (body.notes as string) ?? null,
      blockedReason: null,
      createdAt: new Date().toISOString(),
    };
    tasks.unshift(task);
    return { id: task.id, status: task.status, roomNumber: task.roomNumber ?? '' };
  },
  assignTask(id: string, assignedToId: string | null) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.assignedToId = assignedToId;
    task.assigneeName = users.find((u) => u.userId === assignedToId)?.fullName ?? null;
  },
  startTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.status = 'IN_PROGRESS';
    task.startedAt = new Date().toISOString();
  },
  completeTask(id: string, notes?: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.status = 'CLEANED';
    task.completedAt = new Date().toISOString();
    if (notes) task.notes = notes;
  },
  requestInspection(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (task) task.status = 'INSPECTION_REQUIRED';
  },
  inspectTask(id: string, result: 'pass' | 'fail', _notes?: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (result === 'pass') {
      task.status = 'READY';
      task.inspectedAt = new Date().toISOString();
      const room = rooms.find((r) => r.id === task.roomId);
      if (room && room.status !== 'OUT_OF_ORDER') room.status = 'INSPECTED';
    } else {
      task.status = 'TODO';
    }
  },
  blockTask(id: string, reason: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.status = 'BLOCKED';
    task.blockedReason = reason;
  },
  unblockTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.status = 'TODO';
    task.blockedReason = null;
  },
  cancelTask(id: string, _reason: string) {
    const task = tasks.find((t) => t.id === id);
    if (task) task.status = 'CANCELLED';
  },

  /* maintenance */
  maintenanceTickets: (): MaintenanceTicketRow[] => clone(tickets),
  createTicket(body: Record<string, unknown>): { id: string; ticketNo: string; status: string } {
    ticketSeq += 1;
    const room = rooms.find((r) => r.id === String(body.roomId));
    const ticket: MaintenanceTicketRow = {
      id: nextId('mx'),
      ticketNo: `WO-${ticketSeq}`,
      title: String(body.title ?? 'Maintenance request'),
      description: String(body.description ?? ''),
      category: String(body.category ?? 'OTHER'),
      priority: String(body.priority ?? 'NORMAL'),
      status: 'OPEN',
      roomId: room?.id ?? (body.roomId as string) ?? null,
      roomNumber: room?.roomNumber ?? (body.roomNumber as string) ?? null,
      assignedToId: (body.assignedToId as string) ?? null,
      assigneeName: users.find((u) => u.userId === body.assignedToId)?.fullName ?? null,
      reportedByName: users.find((u) => u.userId === CURRENT_USER_ID)?.fullName ?? null,
      resolution: null,
      createdAt: new Date().toISOString(),
    };
    tickets.unshift(ticket);
    return { id: ticket.id, ticketNo: ticket.ticketNo, status: ticket.status };
  },
  assignTicket(id: string, assignedToId: string | null) {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;
    ticket.assignedToId = assignedToId;
    ticket.assigneeName = users.find((u) => u.userId === assignedToId)?.fullName ?? null;
    if (ticket.status === 'OPEN') ticket.status = 'ASSIGNED';
  },
  startTicket(id: string) {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) ticket.status = 'IN_PROGRESS';
  },
  resolveTicket(id: string, resolution: string) {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;
    ticket.status = 'RESOLVED';
    ticket.resolution = resolution;
  },
  closeTicket(id: string, _reason?: string) {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) ticket.status = 'CLOSED';
  },
  reopenTicket(id: string, _reason: string) {
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      ticket.status = 'OPEN';
      ticket.resolution = null;
    }
  },

  /* reports */
  dailyFlash: (date?: string): DailyFlashRow => dailyFlash(date ?? BUSINESS_DATE),
  occupancyReport,
  revenueReport,
  movementReport,
  housekeepingReport,
  exportCsv,

  /* audit */
  auditEvents(limit: number): AuditEventsResult {
    const rows = auditEvents.slice(0, limit);
    return { total: auditEvents.length, returned: rows.length, limit, rows: clone(rows) };
  },

  /* night audit */
  nightAuditGet(date: string): NightAuditRow {
    const state = nightAudits.get(date);
    return {
      id: state ? `na-${date}` : undefined,
      businessDate: date,
      status: state?.status ?? null,
      exists: Boolean(state),
      today: BUSINESS_DATE,
      previewSummary: state?.previewSummary ?? null,
      finalSummary: state?.finalSummary ?? null,
      exceptionCount: state?.finalSummary?.exceptionCount ?? state?.previewSummary?.exceptionCount ?? 0,
      advisoryOnly: false,
    };
  },
  nightAuditPreview(date: string): NightAuditRow {
    const summary = { exceptionCount: 2, counts: { arrivals: dailyFlash(date).arrivals.length, departures: dailyFlash(date).departures.length, openFolios: folios.filter((f) => f.status === 'OPEN').length } };
    nightAudits.set(date, { status: 'PREVIEWED', previewSummary: summary, finalSummary: nightAudits.get(date)?.finalSummary });
    return this.nightAuditGet(date);
  },
  nightAuditClose(date: string): NightAuditRow {
    const summary = { exceptionCount: 1, counts: { closedFolios: folios.filter((f) => f.status === 'CLOSED').length, invoiced: invoices.length } };
    nightAudits.set(date, { status: 'COMPLETED', previewSummary: nightAudits.get(date)?.previewSummary, finalSummary: summary });
    return this.nightAuditGet(date);
  },
  nightAuditReopen(date: string, _reason: string): NightAuditRow {
    nightAudits.set(date, { status: 'REOPENED', previewSummary: nightAudits.get(date)?.previewSummary, finalSummary: nightAudits.get(date)?.finalSummary });
    return this.nightAuditGet(date);
  },

  /* admin */
  users: (): UserRow[] => users.map(userRow),
  invite(body: Record<string, unknown>): { email: string; inviteToken: string; acceptUrl: string } {
    const email = String(body.email ?? `member${users.length + 1}@grandhorizon.in`);
    const roleKey = String(body.roleKey ?? 'front_desk');
    const token = nextId('invite');
    const user: InternalUser = {
      userId: nextId('u'),
      email,
      fullName: String(body.fullName ?? email.split('@')[0]),
      status: 'INVITED',
      lastLoginAt: null,
      membershipActive: false,
      invitePending: true,
      inviteExpired: false,
      propertyId: activePropertyId,
      roleKey,
      roleName: roleName(roleKey),
      baseRoleKey: roleKey as InternalUser['baseRoleKey'],
    };
    users.push(user);
    return { email, inviteToken: token, acceptUrl: `https://app.grandhorizon.in/accept-invite?token=${token}` };
  },
  reissueInvite(id: string): { inviteToken: string; acceptUrl: string } {
    const token = nextId('invite');
    const user = users.find((u) => u.userId === id);
    if (user) {
      user.invitePending = true;
      user.status = 'INVITED';
    }
    return { inviteToken: token, acceptUrl: `https://app.grandhorizon.in/accept-invite?token=${token}` };
  },
  cancelInvite(id: string) {
    const user = users.find((u) => u.userId === id);
    if (!user) return;
    user.invitePending = false;
    user.status = 'DISABLED';
  },
  updateUser(id: string, body: Record<string, unknown>): UserRow | undefined {
    const user = users.find((u) => u.userId === id);
    if (!user) return undefined;
    if (body.fullName !== undefined) user.fullName = String(body.fullName);
    if (body.email !== undefined) user.email = String(body.email);
    return userRow(user);
  },
  setRole(id: string, _propertyId: string, roleKey: string) {
    const user = users.find((u) => u.userId === id);
    if (!user) return;
    user.roleKey = roleKey;
    user.roleName = roleName(roleKey);
  },
  setUserStatus(id: string, status: 'ACTIVE' | 'DISABLED') {
    const user = users.find((u) => u.userId === id);
    if (!user) return;
    user.status = status;
    user.membershipActive = status === 'ACTIVE';
  },
  roles: (): RoleRow[] => roleRows(),
  permissions: () => clone(PERMISSION_CATALOG),
  matrix: (): RoleMatrix => roleMatrix(),
  taxRules: (): TaxRuleRow[] => clone(taxRules),
  createTaxRule(body: Record<string, unknown>) {
    taxRules.push({
      id: nextId('tax'),
      code: String(body.code ?? 'TAX'),
      name: String(body.name ?? 'New tax'),
      ratePercent: money(num(body.ratePercent)),
      appliesTo: String(body.appliesTo ?? 'ALL'),
      isInclusive: Boolean(body.isInclusive),
      isActive: body.isActive !== false,
    });
  },
  updateTaxRule(id: string, body: Record<string, unknown>) {
    const rule = taxRules.find((r) => r.id === id);
    if (rule) Object.assign(rule, body);
  },

  /* holds */
  acquireHold(roomId: string, checkIn: string, checkOut: string): HoldResult {
    const holdId = nextId('hold');
    const expiresAtMs = Date.now() + HOLD_MS;
    holds.set(holdId, { holdId, roomId, checkIn, checkOut, expiresAtMs });
    return {
      holdId,
      roomId,
      nights: nightDates(checkIn, checkOut),
      expiresAt: new Date(expiresAtMs).toISOString(),
      remainingMs: HOLD_MS,
    };
  },
  refreshHold(holdId: string): HoldResult | undefined {
    const hold = holds.get(holdId);
    if (!hold) return undefined;
    hold.expiresAtMs = Date.now() + HOLD_MS;
    return {
      holdId,
      roomId: hold.roomId,
      nights: nightDates(hold.checkIn, hold.checkOut),
      expiresAt: new Date(hold.expiresAtMs).toISOString(),
      remainingMs: HOLD_MS,
    };
  },
  releaseHold(holdId: string) {
    holds.delete(holdId);
  },
};
