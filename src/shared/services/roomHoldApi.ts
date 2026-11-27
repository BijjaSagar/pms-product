import { store } from '../mocks/store';
import { request } from './http';
import { requireActivePropertyId } from './propertyAccess';
import { isServerProperty } from './serverProperty';

/** One night of one room taken off sale without a booking. */
export interface RoomHoldRow {
  roomNumber: string;
  /** YYYY-MM-DD */
  date: string;
  kind: 'HOLD' | 'BLOCK';
  note: string;
}

const path = (propertyId: string) => `/properties/${propertyId}/room-holds`;

/**
 * A server property's holds and blocks are kept in the room_holds table, so they survive a reload and are seen
 * by everyone. The store keeps a copy for the booking screens, refreshed each time the calendar reads them.
 */
export const roomHoldApi = {
  list: async (from: string, to: string) => {
    const propertyId = requireActivePropertyId();
    if (!isServerProperty(propertyId)) return store.roomHolds(from, to);
    const rows = await request<RoomHoldRow[]>(`${path(propertyId)}?${new URLSearchParams({ from, to })}`);
    store.replaceRoomHolds(from, to, rows);
    return rows;
  },
  create: async (body: RoomHoldRow) => {
    const propertyId = requireActivePropertyId();
    // A night that is already booked or held is refused here, before the copy is touched.
    if (isServerProperty(propertyId)) return request<RoomHoldRow>(path(propertyId), body);
    return store.addRoomHold(body);
  },
  /** Releases a hold or unblocks a room. */
  remove: async (roomNumber: string, date: string) => {
    const propertyId = requireActivePropertyId();
    if (isServerProperty(propertyId)) {
      await request<void>(`${path(propertyId)}?${new URLSearchParams({ roomNumber, date })}`, undefined, 'DELETE');
      return;
    }
    store.removeRoomHold(roomNumber, date);
  },
};
