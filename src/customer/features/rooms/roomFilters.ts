export interface RoomFilters {
  q: string;
  /* 'All' or one room category name. */
  type: string;
}

export const EMPTY_ROOM_FILTERS: RoomFilters = { q: '', type: 'All' };

export interface RoomFilterSubject {
  number: string;
  type: string;
}

export function filterRooms<T extends RoomFilterSubject>(rooms: T[], filters: RoomFilters): T[] {
  const needle = filters.q.trim().toLowerCase();
  return rooms.filter(
    (room) =>
      (!needle || room.number.toLowerCase().includes(needle) || room.type.toLowerCase().includes(needle)) &&
      (filters.type === 'All' || room.type === filters.type),
  );
}

export function countActiveRoomFilters(filters: RoomFilters): number {
  return [filters.q.trim() !== '', filters.type !== 'All'].filter(Boolean).length;
}
