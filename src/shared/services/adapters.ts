import type { Guest, Invoice, Payment, Reservation, ReservationStatus } from '../types/index';
import type { GuestRow } from './guestApi';
import type { InvoiceRow, PaymentRow } from './folioApi';
import type { ReservationRow } from './reservationApi';

/** "Oct 14" for a day this year, "Oct 14, 2027" for any other year, so two years never look alike. */
const shortDate = (value: unknown): string => {
  if (!value) return '—';
  const day = String(value).slice(0, 10);
  const parsed = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return day;
  const sameYear = parsed.getUTCFullYear() === new Date().getFullYear();
  return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'UTC' });
};

export const apiReservationStatus = (value: string): ReservationStatus => ({
  DRAFT: 'Pending', CONFIRMED: 'Confirmed', CHECKED_IN: 'Checked-in',
  CHECKED_OUT: 'Checked-out', CANCELLED: 'Cancelled', NO_SHOW: 'No-show',
}[value] ?? 'Pending') as ReservationStatus;

export function reservationFromApi(row: ReservationRow): Reservation {
  const guest = row.guest?.name ?? [row.guest?.firstName, row.guest?.lastName].filter(Boolean).join(' ') ?? row.guestName ?? 'Guest';
  const amount = Number(row.totalAmount ?? row.subtotal ?? 0);
  // The data layer calls the room offering roomListing*; the screens call it roomType*.
  const roomLines = (row.roomLines ?? []).map((line) => ({
    ...line,
    roomTypeId: line.roomTypeId ?? line.roomListingId ?? '',
    roomTypeName: line.roomTypeName ?? line.roomListingName ?? null,
  }));
  const firstRoom = roomLines[0];
  const firstAssignedRoom = roomLines.find((line) => line.roomNumber);
  const roomSummary = row.roomSummary ?? roomLines.map((line) =>
    `${line.roomTypeName ?? 'Room'}${line.roomNumber ? ` · ${line.roomNumber}` : ' · Unassigned'}`,
  ).join(' + ');
  const roomTypeSummary = Array.from(new Set(roomLines.map((line) => line.roomTypeName).filter(Boolean))).join(' + ');
  return {
    id: String(row.bookingCode ?? row.id),
    recordId: String(row.id),
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
    paid: Number(row.paidAmount ?? row.paid ?? 0),
    version: row.version,
    createdAt: row.createdAt,
    nightlyRate: Number(firstRoom?.nightlyRate ?? row.nightlyRate ?? 0),
    channel: String(row.source ?? 'DIRECT').replaceAll('_', ' '),
    ratePlan: firstRoom?.ratePlanName ?? '—',
    specialRequests: row.specialRequests ?? '',
    notes: row.internalNotes ?? '',
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
    recordId: row.id,
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
    recordId: row.id,
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
