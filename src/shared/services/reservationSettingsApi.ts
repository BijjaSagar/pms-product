import { settingsFor } from './propertyAccess';
import { recordActivity } from './session';

/** Reservation numbering, guest ages and booking rules. */
export interface ReservationSettingsDetails {
  reservationPrefix: string | null;
  /** The last reservation number issued. */
  maxReservationNumber: number;
  /** How many infants a room can have. */
  infantCount: number;
  infantDisplayText: string;
  infantMinAge: number;
  infantMaxAge: number;
  chargeableChildMinAge: number;
  chargeableChildMaxAge: number;
  daysBetweenCheckInCheckOut: number;
  considerDirtyRoomForParkingLot: boolean;
  softBlockForDoNotMove: boolean;
  allowZeroRateBookings: boolean;
  moveCheckInCheckOutBooking: boolean;
}

export const reservationSettingsApi = {
  get: async (propertyId: string) => ({ ...settingsFor(propertyId).reservationSettings }),
  /** Only the fields sent change; null clears the prefix. */
  update: async (propertyId: string, body: Partial<ReservationSettingsDetails>) => {
    const settings = Object.assign(settingsFor(propertyId).reservationSettings, body);
    recordActivity('reservation-settings', 'update', 'Changed the reservation settings', { propertyId });
    return { ...settings };
  },
};
