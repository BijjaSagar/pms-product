import type { RoomDetails } from '../../../../shared/services/roomListingApi';

/** Ordered categories first, in their saved order; categories never ordered follow by name. */
export function sortByChartOrder(rooms: RoomDetails[]): RoomDetails[] {
  return [...rooms].sort((a, b) => {
    const left = a.chartOrder ?? Number.MAX_SAFE_INTEGER;
    const right = b.chartOrder ?? Number.MAX_SAFE_INTEGER;
    return left - right || a.name.localeCompare(b.name);
  });
}
