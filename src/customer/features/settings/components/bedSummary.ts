import { roomListingApi, type RoomDetails } from '../../../../shared/services/roomListingApi';

const names = new Map(roomListingApi.bedTypeCatalog().map((bed) => [bed.code, bed.name]));

/** The room's beds in catalog order, e.g. "1 × King Size Bed, 2 × Bunk Bed". */
export function bedSummary(room: Pick<RoomDetails, 'bedTypes'>): string {
  const beds = [...names]
    .filter(([code]) => room.bedTypes[code] !== undefined)
    .map(([code, name]) => `${room.bedTypes[code]} × ${name}`);
  return beds.length > 0 ? beds.join(', ') : 'No bed type';
}
