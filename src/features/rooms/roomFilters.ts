import type { RoomStatus } from '../../types';

export interface RoomFilters {
  q: string;
  /* 'All' or one room status. */
  status: string;
  /* 'All' or one room type name. */
  type: string;
}

export const EMPTY_ROOM_FILTERS: RoomFilters = { q: '', status: 'All', type: 'All' };

export const ROOM_STATUS_FILTERS: readonly RoomStatus[] = [
  'Available',
  'Occupied',
  'Dirty',
  'Cleaning',
  'Inspected',
  'Out-of-service',
];

/* The fields the filters read, so the grid and the timeline share one set of rules. */
export interface RoomFilterSubject {
  number: string;
  type: string;
  status: string;
  guest: string | null;
}

export function matchesRoomFilters(room: RoomFilterSubject, filters: RoomFilters): boolean {
  const needle = filters.q.trim().toLowerCase();
  const matchSearch =
    !needle ||
    room.number.toLowerCase().includes(needle) ||
    room.type.toLowerCase().includes(needle) ||
    (room.guest ?? '').toLowerCase().includes(needle);
  const matchStatus = filters.status === 'All' || room.status === filters.status;
  const matchType = filters.type === 'All' || room.type === filters.type;
  return matchSearch && matchStatus && matchType;
}

export function filterRooms<T extends RoomFilterSubject>(rooms: T[], filters: RoomFilters): T[] {
  return rooms.filter((room) => matchesRoomFilters(room, filters));
}

export function countActiveRoomFilters(filters: RoomFilters): number {
  return [filters.q.trim() !== '', filters.status !== 'All', filters.type !== 'All'].filter(Boolean).length;
}
