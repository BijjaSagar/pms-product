import type {
  BillingRouteCode,
  BookingCategoryCode,
  BookingSourceCode,
  BookingStatusCode,
  PaymentMethodCode,
} from '../../../lib/api/pms';
import { hotelTodayIso } from '../../../utils/date';
import { formatINR } from '../../../utils/currency';
import type { BillingRoute, RoomCategoryOption, RoomRequirement } from './types';

/**
 * Checks and code mappings for saving the New Reservation form. The backend
 * checks all of this again; these checks only give a clear message sooner.
 * Limits must match pms-backend/src/reservations.
 */

export const MAX_NIGHTS = 90;
const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GSTIN_PATTERN = /^[0-9]{2}[A-Z0-9]{13}$/;

export const STATUS_CODES: Record<string, BookingStatusCode> = {
  Confirmed: 'CONFIRMED',
  Guaranteed: 'GUARANTEED',
  Tentative: 'TENTATIVE',
  Waitlist: 'WAITLIST',
};

export const SOURCE_CODES: Record<string, BookingSourceCode> = {
  Direct: 'DIRECT',
  OTA: 'OTA',
  Agent: 'AGENT',
  GDS: 'GDS',
  Corp: 'CORPORATE',
  Corporate: 'CORPORATE',
  'Booking Engine': 'BOOKING_ENGINE',
  Meta: 'META',
};

export const CATEGORY_CODES: Record<string, BookingCategoryCode> = {
  FIT: 'FIT',
  Group: 'GROUP',
  MICE: 'MICE',
  SERIES: 'SERIES',
};

export const ROUTE_CODES: Record<Exclude<BillingRoute, 'Default'>, BillingRouteCode> = {
  'To Guest': 'TO_GUEST',
  'To Company': 'TO_COMPANY',
  'To Travel Agent': 'TO_TRAVEL_AGENT',
  'Direct Settlement': 'DIRECT_SETTLEMENT',
};

export const PAYMENT_CODES: Record<string, PaymentMethodCode> = {
  'UPI / QR': 'UPI_QR',
  'Credit Card': 'CREDIT_CARD',
  'Debit Card': 'DEBIT_CARD',
  Cash: 'CASH',
  'Bank Transfer': 'BANK_TRANSFER',
};

/** True for a real calendar date written as YYYY-MM-DD. */
export function isRealDate(iso: string): boolean {
  if (!DATE_PATTERN.test(iso)) return false;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round(
    (new Date(`${checkOut}T00:00:00Z`).getTime() - new Date(`${checkIn}T00:00:00Z`).getTime()) / 86_400_000,
  );
}

export const isValidPhone = (value: string) => PHONE_PATTERN.test(value.trim());
export const isValidGstin = (value: string) => GSTIN_PATTERN.test(value.trim().toUpperCase());

export interface FormProblem {
  title: string;
  detail: string;
}

export interface BookingFormState {
  guestId: string | null;
  status: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  bookingSource: string;
  sourceContactNumber: string;
  requirements: RoomRequirement[];
  roomOptions: RoomCategoryOption[];
  overridePrice: boolean;
  overrideRoomTotal: number | null;
  companyGst: string;
  /** True when the room bill, extras or an add-on goes to the company. */
  billsCompany: boolean;
  companyName: string;
  /** Discount typed on the bill, and the bill it comes off (rooms + meals + add-ons, before tax). */
  discount: number;
  grossTotal: number;
  paid: number;
  total: number;
}

/** The first problem that would stop the save, or null when the form is ready. */
export function findFormProblem(form: BookingFormState): FormProblem | null {
  if (!form.guestId) {
    return {
      title: 'Guest Required',
      detail: 'Find the Guest or add them with + before saving.',
    };
  }
  if (!STATUS_CODES[form.status]) {
    return { title: 'Check the Status', detail: 'Pick a booking status.' };
  }
  if (!isRealDate(form.checkIn) || !isRealDate(form.checkOut)) {
    return { title: 'Invalid Stay Dates', detail: 'Enter real check-in and check-out dates.' };
  }
  const nights = nightsBetween(form.checkIn, form.checkOut);
  if (nights < 1) {
    return { title: 'Invalid Stay Dates', detail: 'Check-out must be after check-in.' };
  }
  if (nights > MAX_NIGHTS) {
    return { title: 'Stay Too Long', detail: `A reservation can cover at most ${MAX_NIGHTS} nights.` };
  }
  if (form.checkIn < hotelTodayIso()) {
    return { title: 'Invalid Stay Dates', detail: 'Check-in cannot be in the past.' };
  }
  if (!TIME_PATTERN.test(form.checkInTime) || !TIME_PATTERN.test(form.checkOutTime)) {
    return { title: 'Invalid Times', detail: 'Enter check-in and check-out times as HH:mm.' };
  }
  const needsContact = ['Agent', 'GDS', 'Corp', 'Corporate'].includes(form.bookingSource);
  if (needsContact && form.sourceContactNumber.trim() && !isValidPhone(form.sourceContactNumber)) {
    return { title: 'Invalid Contact Number', detail: 'Enter a valid contact number for the booking source.' };
  }
  if (form.requirements.length === 0) {
    return { title: 'Room Required', detail: 'Add at least one room.' };
  }
  for (const room of form.requirements) {
    const option = form.roomOptions.find((item) => item.id === room.roomTypeId);
    const label = `Room ${room.roomIndex}`;
    if (!option || !room.roomTypeId) {
      return { title: 'Room Not Available', detail: `${label}: pick a room that is open for these dates.` };
    }
    if (room.adults < 1) {
      return { title: 'Check the Guests', detail: `${label}: at least one adult is required.` };
    }
    if (room.adults > option.maxAdults) {
      return { title: 'Too Many Adults', detail: `${label}: ${option.name} takes at most ${option.maxAdults} adults.` };
    }
    if (room.children > option.maxChildren) {
      return {
        title: 'Too Many Children',
        detail: `${label}: ${option.name} takes at most ${option.maxChildren} children.`,
      };
    }
  }
  if (form.overridePrice && (form.overrideRoomTotal === null || form.overrideRoomTotal < 0)) {
    return { title: 'Check the Override Price', detail: 'Enter the room total, or turn Override Price off.' };
  }
  if (form.billsCompany && !form.companyName.trim()) {
    return { title: 'Company Name Required', detail: 'Enter the company name when a bill goes to the company.' };
  }
  if (form.companyGst.trim() && !isValidGstin(form.companyGst)) {
    return { title: 'Invalid GSTIN', detail: 'A GSTIN has 15 characters, e.g. 36ABCDE1234F1Z5.' };
  }
  if (form.discount > form.grossTotal) {
    return {
      title: 'Check the Discount',
      detail: `The discount of ${formatINR(form.discount)} is more than the bill of ${formatINR(form.grossTotal)} before tax.`,
    };
  }
  if (form.paid > form.total) {
    return {
      title: 'Payments Too High',
      detail: `Payments of ${formatINR(form.paid)} are more than the total of ${formatINR(form.total)}.`,
    };
  }
  return null;
}
