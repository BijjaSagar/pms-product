import type { CalendarReservation, CalendarRoom, ValidationResult } from './types';
import { countNights } from './calendarData';
import { hotelTodayIso } from '../../../utils/date';
import { MAX_NIGHTS } from '../new-reservation/bookingRules';

/** Statuses the server lets you change: bookings that have not arrived yet. */
const EDITABLE_STATUSES: readonly CalendarReservation['status'][] = ['Confirmed', 'Tentative', 'Pending'];

/**
 * Validates a proposed reservation move (dates and/or room) against all operational constraints.
 * Uses half-open date intervals: [checkIn, checkOut).
 * Overlap formula: existingCheckIn < proposedCheckOut && proposedCheckIn < existingCheckOut
 */
export function validateReservationMove({
  reservation,
  targetRoom,
  proposedCheckIn,
  proposedCheckOut,
  allReservations,
}: {
  reservation: CalendarReservation;
  targetRoom: CalendarRoom;
  proposedCheckIn: string;
  proposedCheckOut: string;
  allReservations: CalendarReservation[];
}): ValidationResult {
  // 1. Date chronological validity
  if (proposedCheckIn >= proposedCheckOut) {
    return {
      isValid: false,
      reason: 'Check-in date must be strictly before check-out date (minimum 1 night).',
      proposedTotal: reservation.totalAmount,
      priceDifference: 0,
      proposedNights: reservation.nights,
    };
  }

  // 2. Minimum stay length
  const proposedNights = countNights(proposedCheckIn, proposedCheckOut);
  if (proposedNights < 1) {
    return {
      isValid: false,
      reason: 'Reservation must be at least 1 night.',
      proposedTotal: reservation.totalAmount,
      priceDifference: 0,
      proposedNights: 0,
    };
  }

  // 2a. Rules the server applies when the stay is saved again (see reservationApi.changeStay)
  const serverRule = (reason: string): ValidationResult => ({
    isValid: false,
    reason,
    proposedTotal: reservation.totalAmount,
    priceDifference: 0,
    proposedNights,
  });
  if (!EDITABLE_STATUSES.includes(reservation.status)) {
    return serverRule(
      reservation.status === 'Checked-in'
        ? 'A checked-in stay cannot be moved or have its dates changed yet.'
        : `A ${reservation.status.toLowerCase()} reservation cannot be changed.`,
    );
  }
  if (proposedNights > MAX_NIGHTS) {
    return serverRule(`A reservation can cover at most ${MAX_NIGHTS} nights.`);
  }
  const today = hotelTodayIso();
  if (proposedCheckIn !== reservation.checkInDate && proposedCheckIn < today) {
    return serverRule('Check-in cannot be in the past.');
  }
  if (proposedCheckOut <= today) {
    return serverRule('Check-out must be after today.');
  }

  // 3a. Rooms not linked to a sellable room cannot take bookings
  if (!targetRoom.bookable) {
    return {
      isValid: false,
      reason: `Room ${targetRoom.number} (${targetRoom.type}) cannot take bookings: it is not linked to an active room. Check Room Settings.`,
      proposedTotal: reservation.totalAmount,
      priceDifference: 0,
      proposedNights,
    };
  }

  // 3. Room Out-of-Order / Maintenance check
  if (targetRoom.status === 'Out-of-Order') {
    return {
      isValid: false,
      reason: `Room ${targetRoom.number} is Out-of-Order (${targetRoom.outOfOrderReason || 'Under Maintenance'}). No bookings permitted.`,
      proposedTotal: reservation.totalAmount,
      priceDifference: 0,
      proposedNights,
    };
  }

  // 4. Room Capacity / Occupancy check. A room without a configured capacity (0) is left to the server.
  const totalGuests = reservation.adults + reservation.children;
  if (targetRoom.maxOccupancy > 0 && totalGuests > targetRoom.maxOccupancy) {
    return {
      isValid: false,
      reason: `Capacity exceeded: Room ${targetRoom.number} (${targetRoom.type}) holds maximum ${targetRoom.maxOccupancy} guests, but booking has ${totalGuests} guests.`,
      proposedTotal: reservation.totalAmount,
      priceDifference: 0,
      proposedNights,
    };
  }

  // 5. Half-open interval overlap check with other active reservations in target room
  // Condition: existingCheckIn < proposedCheckOut && proposedCheckIn < existingCheckOut
  const conflicting = allReservations.find((other) => {
    // Exclude the current reservation being moved
    if (other.id === reservation.id) return false;
    // Cancelled, no-show and checked-out stays do not occupy rooms (check-out releases the room)
    if (other.status === 'Cancelled' || other.status === 'No-show' || other.status === 'Checked-out') return false;
    // Only check reservations in the target room
    if (other.roomId !== targetRoom.id) return false;

    // Check overlap
    const isOverlapping =
      other.checkInDate < proposedCheckOut && proposedCheckIn < other.checkOutDate;
    return isOverlapping;
  });

  if (conflicting) {
    return {
      isValid: false,
      reason: `Conflict: Room ${targetRoom.number} is already booked by ${conflicting.guestName} (${conflicting.id}) from ${conflicting.checkInDate} to ${conflicting.checkOutDate}.`,
      proposedTotal: reservation.totalAmount,
      priceDifference: 0,
      proposedNights,
    };
  }

  // 6. Pricing estimate (the server prices the saved stay). The same room type keeps the booking's
  // own nightly price, so a date change alone does not show a price change from tax or meals;
  // a different room type uses that room's base rate.
  const ratePerNight =
    targetRoom.type === reservation.roomType || !Number.isFinite(targetRoom.baseRate)
      ? reservation.nightlyRate
      : targetRoom.baseRate;
  const proposedTotal = Math.round(proposedNights * ratePerNight * 100) / 100;
  const priceDifference = Math.round((proposedTotal - reservation.totalAmount) * 100) / 100;

  return {
    isValid: true,
    proposedTotal,
    priceDifference,
    proposedNights,
  };
}
