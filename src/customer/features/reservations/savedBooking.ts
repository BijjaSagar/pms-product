/**
 * The booking just created, kept until the room calendar has scrolled to it. It is held here rather than
 * passed with navigation, so it works however the user gets back to the calendar.
 */
export interface SavedBooking {
  id: string;
  checkIn: string;
}

let pending: SavedBooking | null = null;

export function rememberSavedBooking(booking: SavedBooking): void {
  pending = booking;
}

export function peekSavedBooking(): SavedBooking | null {
  return pending;
}

export function forgetSavedBooking(): void {
  pending = null;
}
