import type { GuestRow, ReservationRow, StayRow } from './pms';

/* The reservation and guest shapes pms-backend returns, and their conversion to the rows the screens read. */

interface BackendStay {
  id: string;
  roomId: string;
  roomNumber: string;
  startDate: string;
  endDate: string;
  status: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
}

export interface BackendReservation {
  id: string;
  confirmationNumber: string;
  status: string;
  source: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  adults: number;
  children: number;
  roomType: { id: string; code: string; name: string };
  ratePlan: { id: string; code: string; name: string };
  stays: BackendStay[];
  nightlyRates: Array<{ date: string; baseRate: string; amount: string }>;
  totals: { roomAmount: string; taxAmount: string; totalAmount: string; currency: string };
  primaryGuestId: string;
  primaryGuest: { firstName: string; lastName: string };
  specialRequests: string | null;
  /** What has been paid so far, net of refunds, as a decimal string. */
  paid: string;
  sourceDetail: string | null;
  externalReferenceId: string | null;
  internalNotes: string | null;
  version: number;
  holdExpiresAt: string | null;
  createdAt: string;
}

export interface BackendGuest {
  id: string;
  title: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  vipLevel: string | null;
  preferences: string | null;
  companyName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  gender: string | null;
  internalNotes: string | null;
  stayCount: number;
  lastStayAt: string | null;
  version: number;
}

/** The stay that holds the room tonight, if the reservation has one. */
const activeStay = (reservation: BackendReservation): BackendStay | undefined =>
  reservation.stays.find((stay) => stay.status === 'ACTIVE' || stay.checkedInAt !== null) ?? reservation.stays[0];

export function reservationRowFromBackend(reservation: BackendReservation): ReservationRow {
  const stay = activeStay(reservation);
  const guestName = `${reservation.primaryGuest.firstName} ${reservation.primaryGuest.lastName}`.trim();
  const nightlyRate = reservation.nightlyRates[0]?.amount ?? '0';
  return {
    id: reservation.id,
    bookingCode: reservation.confirmationNumber,
    status: reservation.status,
    source: reservation.source,
    checkInDate: reservation.arrivalDate,
    checkOutDate: reservation.departureDate,
    nights: reservation.nights,
    adults: reservation.adults,
    children: reservation.children,
    currencyCode: reservation.totals.currency,
    totalAmount: reservation.totals.totalAmount,
    subtotal: reservation.totals.roomAmount,
    taxTotal: reservation.totals.taxAmount,
    nightlyRate,
    primaryGuestId: reservation.primaryGuestId,
    guest: { id: reservation.primaryGuestId, name: guestName },
    guestName,
    roomNumber: stay?.roomNumber ?? null,
    roomTypeId: reservation.roomType.id,
    roomTypeName: reservation.roomType.name,
    roomLines: [
      {
        id: reservation.id,
        roomTypeId: reservation.roomType.id,
        roomId: stay?.roomId ?? null,
        roomNumber: stay?.roomNumber ?? null,
        roomTypeName: reservation.roomType.name,
        nightlyRate,
        ratePlanName: reservation.ratePlan.name,
        adults: reservation.adults,
        children: reservation.children,
      },
    ],
    specialRequests: reservation.specialRequests,
    externalReferenceId: reservation.externalReferenceId,
    internalNotes: reservation.internalNotes,
    paid: Number(reservation.paid),
    createdAt: reservation.createdAt,
  };
}

export function stayRowFromBackend(
  reservation: BackendReservation,
  folio?: { id: string; folioNumber: string; balance: string },
): StayRow {
  const row = reservationRowFromBackend(reservation);
  return {
    ...row,
    guestId: reservation.primaryGuestId,
    guestName: row.guestName ?? null,
    roomNumber: row.roomNumber ?? null,
    roomStatus: null,
    roomReady: undefined,
    folioId: folio?.id ?? null,
    folioNo: folio?.folioNumber ?? null,
    balance: folio?.balance,
  };
}

export function guestRowFromBackend(guest: BackendGuest): GuestRow {
  return {
    id: guest.id,
    firstName: guest.firstName,
    lastName: guest.lastName,
    email: guest.email,
    phone: guest.phone,
    nationality: guest.nationality,
    dateOfBirth: guest.dateOfBirth,
    preferences: guest.preferences,
    vipLevel: guest.vipLevel,
    companyName: guest.companyName,
    address: guest.address,
    city: guest.city,
    state: guest.state,
    country: guest.country,
    gender: guest.gender,
    internalNotes: guest.internalNotes,
    stayCount: guest.stayCount,
    lastStayAt: guest.lastStayAt,
  };
}
