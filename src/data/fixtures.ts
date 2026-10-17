import {
  BUSINESS_DATE,
  FLOOR_PLAN,
  GUESTS,
  OUT_OF_ORDER_ROOM,
  ROOM_TYPES,
  TAX_RATE,
} from './catalog';
import { addDays, money, nightsBetween, round2, type FolioRec } from './model';
import type { FolioItemRow, PaymentRow, ReservationRow, RoomRow } from '../lib/api/pms';

/* ------------------------------------------------------------------ rooms */

function buildRooms(): RoomRow[] {
  const rooms: RoomRow[] = [];
  for (const plan of FLOOR_PLAN) {
    const type = ROOM_TYPES.find((t) => t.id === plan.typeId);
    if (!type) continue;
    for (let i = 0; i < plan.count; i += 1) {
      const roomNumber = String(plan.start + i);
      rooms.push({
        id: `room-${roomNumber}`,
        roomNumber,
        roomTypeId: type.id,
        roomTypeCode: type.code,
        roomTypeName: type.name,
        floor: plan.floor,
        wing: plan.wing,
        status: 'VACANT_CLEAN',
        isActive: true,
        notes: null,
        baseRate: type.baseRate,
        outOfOrderReason: null,
      });
    }
  }
  return rooms;
}

/* ----------------------------------------------------------- reservations */

type ResStatus = 'DRAFT' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW';

interface ExtraSeed {
  type: string;
  description: string;
  qty: number;
  amount: number;
}

interface ResSeed {
  code: string;
  guestId: string;
  typeId: string;
  room: string | null;
  start: number;
  end: number;
  status: ResStatus;
  adults: number;
  children: number;
  source: string;
  ratePlan: string;
  note?: string;
  extras?: ExtraSeed[];
}

const SEEDS: ResSeed[] = [
  // In-house guests
  { code: 'RSV-9001', guestId: 'g-1023', typeId: 'deluxe', room: '204', start: -2, end: 1, status: 'CHECKED_IN', adults: 1, children: 0, source: 'CORPORATE', ratePlan: 'Corporate Rate', note: 'Quiet room away from the lift.', extras: [{ type: 'MINIBAR', description: 'Minibar consumption', qty: 2, amount: 450 }, { type: 'LAUNDRY', description: 'Laundry service', qty: 1, amount: 600 }] },
  { code: 'RSV-9002', guestId: 'g-1001', typeId: 'deluxe', room: '305', start: -1, end: 2, status: 'CHECKED_IN', adults: 2, children: 0, source: 'OTA', ratePlan: 'Best Available' },
  { code: 'RSV-9003', guestId: 'g-1004', typeId: 'superior', room: '401', start: -3, end: 1, status: 'CHECKED_IN', adults: 2, children: 0, source: 'CORPORATE', ratePlan: 'Corporate Rate', note: 'Vegetarian meals only.' },
  { code: 'RSV-9004', guestId: 'g-1008', typeId: 'superior', room: '402', start: 0, end: 3, status: 'CHECKED_IN', adults: 1, children: 0, source: 'DIRECT', ratePlan: 'Best Available' },
  { code: 'RSV-9005', guestId: 'g-1013', typeId: 'executive', room: '502', start: -1, end: 4, status: 'CHECKED_IN', adults: 2, children: 1, source: 'DIRECT', ratePlan: 'Executive Package', extras: [{ type: 'RESTAURANT', description: 'Room service dinner', qty: 1, amount: 1250 }] },
  { code: 'RSV-9006', guestId: 'g-1002', typeId: 'executive', room: '503', start: -2, end: 0, status: 'CHECKED_IN', adults: 1, children: 0, source: 'OTA', ratePlan: 'Best Available' },
  { code: 'RSV-9007', guestId: 'g-1011', typeId: 'family', room: '601', start: -1, end: 2, status: 'CHECKED_IN', adults: 2, children: 2, source: 'DIRECT', ratePlan: 'Family Package' },
  { code: 'RSV-9008', guestId: 'g-1005', typeId: 'standard', room: '103', start: -1, end: 0, status: 'CHECKED_IN', adults: 1, children: 0, source: 'OTA', ratePlan: 'Saver Rate' },
  { code: 'RSV-9009', guestId: 'g-1007', typeId: 'deluxe', room: '207', start: -4, end: 2, status: 'CHECKED_IN', adults: 2, children: 0, source: 'DIRECT', ratePlan: 'Best Available', note: 'VIP — welcome amenity set up.', extras: [{ type: 'SPA', description: 'Spa treatment', qty: 1, amount: 2800 }] },
  { code: 'RSV-9010', guestId: 'g-1014', typeId: 'deluxe', room: '310', start: -3, end: 0, status: 'CHECKED_IN', adults: 1, children: 0, source: 'CORPORATE', ratePlan: 'Corporate Rate' },
  { code: 'RSV-9011', guestId: 'g-1015', typeId: 'executive', room: '505', start: 0, end: 5, status: 'CHECKED_IN', adults: 2, children: 0, source: 'DIRECT', ratePlan: 'Executive Package' },
  { code: 'RSV-9012', guestId: 'g-1017', typeId: 'family', room: '602', start: -2, end: 0, status: 'CHECKED_IN', adults: 2, children: 1, source: 'OTA', ratePlan: 'Family Package' },
  { code: 'RSV-9013', guestId: 'g-1019', typeId: 'suite', room: '701', start: -1, end: 3, status: 'CHECKED_IN', adults: 2, children: 0, source: 'DIRECT', ratePlan: 'Suite Rate', extras: [{ type: 'RESTAURANT', description: 'Lunch buffet', qty: 2, amount: 1100 }] },
  { code: 'RSV-9014', guestId: 'g-1021', typeId: 'superior', room: '405', start: -2, end: 4, status: 'CHECKED_IN', adults: 1, children: 0, source: 'CORPORATE', ratePlan: 'Corporate Rate' },

  // Today's arrivals
  { code: 'RSV-9015', guestId: 'g-1016', typeId: 'deluxe', room: '202', start: 0, end: 2, status: 'CONFIRMED', adults: 2, children: 0, source: 'OTA', ratePlan: 'Best Available' },
  { code: 'RSV-9016', guestId: 'g-1018', typeId: 'deluxe', room: '205', start: 0, end: 1, status: 'CONFIRMED', adults: 1, children: 0, source: 'DIRECT', ratePlan: 'Saver Rate' },
  { code: 'RSV-9017', guestId: 'g-1003', typeId: 'deluxe', room: '301', start: 0, end: 3, status: 'CONFIRMED', adults: 1, children: 0, source: 'OTA', ratePlan: 'Best Available' },
  { code: 'RSV-9018', guestId: 'g-1006', typeId: 'superior', room: '403', start: 0, end: 2, status: 'CONFIRMED', adults: 2, children: 1, source: 'DIRECT', ratePlan: 'Best Available' },
  { code: 'RSV-9019', guestId: 'g-1009', typeId: 'executive', room: '501', start: 0, end: 4, status: 'CONFIRMED', adults: 1, children: 0, source: 'CORPORATE', ratePlan: 'Corporate Rate' },
  { code: 'RSV-9020', guestId: 'g-1012', typeId: 'family', room: '603', start: 0, end: 2, status: 'CONFIRMED', adults: 2, children: 2, source: 'DIRECT', ratePlan: 'Family Package', note: 'Airport pickup requested.' },
  { code: 'RSV-9021', guestId: 'g-1020', typeId: 'suite', room: '702', start: 0, end: 3, status: 'CONFIRMED', adults: 2, children: 0, source: 'DIRECT', ratePlan: 'Suite Rate' },
  { code: 'RSV-9022', guestId: 'g-1010', typeId: 'standard', room: '104', start: 0, end: 1, status: 'CONFIRMED', adults: 1, children: 0, source: 'OTA', ratePlan: 'Saver Rate' },

  // Future bookings
  { code: 'RSV-9023', guestId: 'g-1022', typeId: 'deluxe', room: null, start: 1, end: 4, status: 'CONFIRMED', adults: 2, children: 0, source: 'OTA', ratePlan: 'Best Available' },
  { code: 'RSV-9024', guestId: 'g-1013', typeId: 'superior', room: null, start: 2, end: 5, status: 'CONFIRMED', adults: 1, children: 0, source: 'DIRECT', ratePlan: 'Best Available' },
  { code: 'RSV-9025', guestId: 'g-1004', typeId: 'executive', room: null, start: 3, end: 6, status: 'CONFIRMED', adults: 2, children: 0, source: 'CORPORATE', ratePlan: 'Corporate Rate' },
  { code: 'RSV-9026', guestId: 'g-1023', typeId: 'suite', room: null, start: 5, end: 8, status: 'CONFIRMED', adults: 2, children: 0, source: 'DIRECT', ratePlan: 'Suite Rate' },
  { code: 'RSV-9027', guestId: 'g-1015', typeId: 'deluxe', room: null, start: 7, end: 10, status: 'CONFIRMED', adults: 2, children: 1, source: 'OTA', ratePlan: 'Best Available' },
  { code: 'RSV-9028', guestId: 'g-1001', typeId: 'family', room: null, start: 10, end: 14, status: 'CONFIRMED', adults: 2, children: 2, source: 'DIRECT', ratePlan: 'Family Package' },
  { code: 'RSV-9029', guestId: 'g-1016', typeId: 'standard', room: null, start: 1, end: 3, status: 'DRAFT', adults: 1, children: 0, source: 'DIRECT', ratePlan: 'Saver Rate' },
  { code: 'RSV-9030', guestId: 'g-1018', typeId: 'deluxe', room: null, start: 12, end: 15, status: 'CONFIRMED', adults: 2, children: 0, source: 'OTA', ratePlan: 'Best Available' },
  { code: 'RSV-9031', guestId: 'g-1019', typeId: 'executive', room: null, start: 15, end: 18, status: 'CONFIRMED', adults: 1, children: 0, source: 'CORPORATE', ratePlan: 'Corporate Rate' },
  { code: 'RSV-9032', guestId: 'g-1005', typeId: 'superior', room: null, start: 20, end: 24, status: 'CONFIRMED', adults: 2, children: 1, source: 'DIRECT', ratePlan: 'Best Available' },

  // Recently checked out
  { code: 'RSV-9033', guestId: 'g-1002', typeId: 'standard', room: '101', start: -3, end: -1, status: 'CHECKED_OUT', adults: 1, children: 0, source: 'OTA', ratePlan: 'Saver Rate' },
  { code: 'RSV-9034', guestId: 'g-1010', typeId: 'deluxe', room: '206', start: -4, end: -2, status: 'CHECKED_OUT', adults: 2, children: 0, source: 'DIRECT', ratePlan: 'Best Available' },
  { code: 'RSV-9035', guestId: 'g-1017', typeId: 'deluxe', room: '302', start: -5, end: -2, status: 'CHECKED_OUT', adults: 2, children: 1, source: 'OTA', ratePlan: 'Family Package' },
  { code: 'RSV-9036', guestId: 'g-1020', typeId: 'superior', room: '404', start: -4, end: -1, status: 'CHECKED_OUT', adults: 1, children: 0, source: 'DIRECT', ratePlan: 'Best Available' },
  { code: 'RSV-9037', guestId: 'g-1011', typeId: 'executive', room: '504', start: -6, end: -3, status: 'CHECKED_OUT', adults: 2, children: 0, source: 'CORPORATE', ratePlan: 'Corporate Rate' },
  { code: 'RSV-9038', guestId: 'g-1006', typeId: 'family', room: '604', start: -5, end: -2, status: 'CHECKED_OUT', adults: 2, children: 2, source: 'DIRECT', ratePlan: 'Family Package' },
  { code: 'RSV-9039', guestId: 'g-1014', typeId: 'suite', room: '703', start: -7, end: -1, status: 'CHECKED_OUT', adults: 1, children: 0, source: 'DIRECT', ratePlan: 'Suite Rate' },
  { code: 'RSV-9040', guestId: 'g-1003', typeId: 'standard', room: '105', start: -2, end: -1, status: 'CHECKED_OUT', adults: 1, children: 0, source: 'OTA', ratePlan: 'Saver Rate' },

  // Cancellations & no-shows
  { code: 'RSV-9041', guestId: 'g-1007', typeId: 'deluxe', room: null, start: 4, end: 6, status: 'CANCELLED', adults: 1, children: 0, source: 'OTA', ratePlan: 'Best Available', note: 'Cancelled by guest — travel plans changed.' },
  { code: 'RSV-9042', guestId: 'g-1012', typeId: 'superior', room: null, start: -1, end: 2, status: 'NO_SHOW', adults: 1, children: 0, source: 'DIRECT', ratePlan: 'Best Available' },
  { code: 'RSV-9043', guestId: 'g-1013', typeId: 'executive', room: null, start: 8, end: 10, status: 'CANCELLED', adults: 2, children: 0, source: 'CORPORATE', ratePlan: 'Corporate Rate' },
];

interface BuiltReservation {
  reservation: ReservationRow;
  folio: FolioRec | null;
}

function itemId(resId: string, n: number): string {
  return `itm-${resId.replace('res-', '')}-${n}`;
}

function buildFolio(
  reservation: ReservationRow,
  nightlyRate: number,
  nights: number,
  extras: ExtraSeed[],
  settled: boolean,
): FolioRec {
  const subtotal = round2(nightlyRate * nights);
  const items: FolioItemRow[] = [
    {
      id: itemId(reservation.id, 1),
      type: 'ROOM',
      description: `Room charge · ${reservation.roomTypeName ?? 'Room'}`,
      quantity: String(nights),
      unitAmount: money(nightlyRate),
      taxAmount: money(round2(subtotal * TAX_RATE)),
      totalAmount: money(subtotal),
      isVoided: false,
      createdAt: `${reservation.checkInDate}T14:10:00Z`,
    },
  ];
  extras.forEach((extra, index) => {
    const amount = round2(extra.amount * extra.qty);
    items.push({
      id: itemId(reservation.id, index + 2),
      type: extra.type,
      description: extra.description,
      quantity: String(extra.qty),
      unitAmount: money(extra.amount),
      taxAmount: money(round2(amount * TAX_RATE)),
      totalAmount: money(amount),
      isVoided: false,
      createdAt: `${addDays(reservation.checkInDate, index + 1)}T19:30:00Z`,
    });
  });

  const total = round2(items.reduce((sum, item) => sum + Number(item.totalAmount) + Number(item.taxAmount), 0));
  const folio: FolioRec = {
    id: `folio-${reservation.id.replace('res-', '')}`,
    folioNo: `F-${reservation.bookingCode.replace('RSV-', '')}`,
    reservationId: reservation.id,
    status: settled ? 'CLOSED' : 'OPEN',
    currencyCode: reservation.currencyCode ?? 'INR',
    guestName: reservation.guestName ?? 'Guest',
    items,
    payments: [],
  };

  const payment = (amount: number, dateIso: string, status: string): PaymentRow => ({
    id: `pay-${reservation.id.replace('res-', '')}-${folio.payments.length + 1}`,
    folioId: folio.id,
    folioNo: folio.folioNo,
    amount: money(amount),
    currencyCode: folio.currencyCode,
    method: 'CARD_TERMINAL',
    status,
    reference: `TXN-${reservation.bookingCode.replace('RSV-', '')}${folio.payments.length + 1}`,
    refundedAmount: '0.00',
    recordedAt: `${dateIso}T11:30:00Z`,
    guestName: folio.guestName,
  });

  if (settled) {
    folio.payments.push(payment(total, reservation.checkOutDate, 'SUCCEEDED'));
  } else {
    // An in-house guest has settled half of the bill as a deposit.
    folio.payments.push(payment(round2(total * 0.5), reservation.checkInDate, 'SUCCEEDED'));
  }
  return folio;
}

function buildReservation(seed: ResSeed, index: number, rooms: RoomRow[]): BuiltReservation {
  const type = ROOM_TYPES.find((t) => t.id === seed.typeId) ?? ROOM_TYPES[0];
  const rate = Number(type.baseRate);
  const checkInDate = addDays(BUSINESS_DATE, seed.start);
  const checkOutDate = addDays(BUSINESS_DATE, seed.end);
  const nights = nightsBetween(checkInDate, checkOutDate);
  const room = seed.room ? rooms.find((r) => r.roomNumber === seed.room) : undefined;
  const guest = GUESTS.find((g) => g.id === seed.guestId);
  const guestName = guest ? `${guest.firstName} ${guest.lastName}` : 'Guest';

  const subtotal = round2(rate * nights);
  const taxTotal = round2(subtotal * TAX_RATE);
  const id = `res-${1000 + index + 1}`;

  const reservation: ReservationRow = {
    id,
    bookingCode: seed.code,
    status: seed.status,
    source: seed.source,
    checkInDate,
    checkOutDate,
    nights,
    adults: seed.adults,
    children: seed.children,
    currencyCode: 'INR',
    totalAmount: money(subtotal + taxTotal),
    subtotal: money(subtotal),
    taxTotal: money(taxTotal),
    primaryGuestId: seed.guestId,
    nightlyRate: money(rate),
    internalNotes: seed.note ?? null,
    specialRequests: seed.note ?? null,
    guest: guest
      ? { id: guest.id, name: guestName, firstName: guest.firstName, lastName: guest.lastName }
      : null,
    guestName,
    roomNumber: seed.room,
    roomTypeId: type.id,
    roomTypeName: type.name,
    roomLines: [
      {
        id: `rl-${id}`,
        roomTypeId: type.id,
        roomId: room?.id ?? null,
        roomNumber: seed.room,
        roomTypeName: type.name,
        nightlyRate: money(rate),
        ratePlanName: seed.ratePlan,
      },
    ],
    paid: 0,
  };

  let folio: FolioRec | null = null;
  if (seed.status === 'CHECKED_IN' || seed.status === 'CHECKED_OUT') {
    folio = buildFolio(reservation, rate, nights, seed.extras ?? [], seed.status === 'CHECKED_OUT');
    reservation.paid = round2(
      folio.payments.reduce((sum, p) => sum + Number(p.amount) - Number(p.refundedAmount ?? 0), 0),
    );
  }

  return { reservation, folio };
}

export interface SeedState {
  rooms: RoomRow[];
  reservations: ReservationRow[];
  folios: FolioRec[];
}

export function buildSeedState(): SeedState {
  const rooms = buildRooms();
  const reservations: ReservationRow[] = [];
  const folios: FolioRec[] = [];

  SEEDS.forEach((seed, index) => {
    const built = buildReservation(seed, index, rooms);
    reservations.push(built.reservation);
    if (built.folio) folios.push(built.folio);
  });

  const occupied = new Set(
    reservations.filter((r) => r.status === 'CHECKED_IN' && r.roomNumber).map((r) => r.roomNumber as string),
  );
  const justCheckedOut = new Set(
    reservations
      .filter((r) => r.status === 'CHECKED_OUT' && r.roomNumber)
      .map((r) => r.roomNumber as string),
  );

  rooms.forEach((room, index) => {
    if (occupied.has(room.roomNumber)) {
      room.status = 'OCCUPIED_CLEAN';
    } else if (room.roomNumber === OUT_OF_ORDER_ROOM) {
      room.status = 'OUT_OF_ORDER';
      room.outOfOrderReason = 'Bathroom faucet leak — work order WO-118';
    } else if (justCheckedOut.has(room.roomNumber)) {
      room.status = 'VACANT_DIRTY';
    } else {
      const bucket = index % 3;
      room.status = bucket === 0 ? 'VACANT_DIRTY' : bucket === 1 ? 'VACANT_CLEAN' : 'INSPECTED';
    }
  });

  // A couple of invoices for recently settled folios.
  return { rooms, reservations, folios };
}
