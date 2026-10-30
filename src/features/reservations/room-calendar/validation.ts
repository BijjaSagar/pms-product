import type { CalendarReservation, CalendarRoom, ValidationResult } from './types';
import { countNights } from './calendarData';

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

  // 4. Room Capacity / Occupancy check
  const totalGuests = reservation.adults + reservation.children;
  if (totalGuests > targetRoom.maxOccupancy) {
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
    // Exclude cancelled bookings (they do not occupy rooms)
    if (other.status === 'Cancelled') return false;
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

  // 6. Pricing calculation
  // If moving to a different room type, use the new room's base rate
  const ratePerNight = targetRoom.baseRate;
  const proposedTotal = proposedNights * ratePerNight;
  const priceDifference = proposedTotal - reservation.totalAmount;

  return {
    isValid: true,
    proposedTotal,
    priceDifference,
    proposedNights,
  };
}
