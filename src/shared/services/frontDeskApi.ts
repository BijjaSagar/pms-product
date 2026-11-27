import { store } from '../mocks/store';
import { todayIso } from '../utils/date';
import { requireActivePropertyId } from './propertyAccess';
import { editableReservation, syncReservations, type ReservationRow } from './reservationApi';

export interface StayRow extends ReservationRow {
  guestId?: string | null;
  guestName: string | null; roomNumber: string | null; roomStatus?: string | null; roomReady?: boolean;
  folioId?: string | null; folioNo?: string | null; balance?: string;
}
export interface StayList { businessDate: string; data: StayRow[] }

/** The stays touching today, brought in from the database first, so the lists below see every booking and not only this session's. */
const syncToday = () => syncReservations(requireActivePropertyId(), { checkInTo: todayIso(), checkOutFrom: todayIso() });

export const frontDeskApi = {
  arrivals: async () => {
    await syncToday();
    return store.arrivals();
  },
  departures: async () => {
    await syncToday();
    return store.departures();
  },
  inHouse: async () => {
    await syncToday();
    return store.inHouse();
  },
  checkIn: async (id: string, version?: number): Promise<ReservationRow> => {
    editableReservation(id, version, ['CONFIRMED']);
    store.checkIn(id);
    store.touchReservation(id);
    return editableReservation(id, undefined);
  },
  checkOut: async (id: string, version?: number): Promise<ReservationRow> => {
    editableReservation(id, version, ['CHECKED_IN']);
    store.checkOut(id);
    store.touchReservation(id);
    return editableReservation(id, undefined);
  },
  extend: async (id: string, newCheckOutDate: string) => store.extend(id, newCheckOutDate),
};
