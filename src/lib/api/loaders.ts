import { frontDeskApi, inventoryApi } from './pms';
import { roomFromApi, roomTypeFromApi } from './adapters';

export async function loadRoomInventory() {
  const [roomRows, typeRows, inHouse] = await Promise.all([
    inventoryApi.rooms(),
    inventoryApi.roomTypes(),
    frontDeskApi.inHouse().catch(() => ({ data: [] })),
  ]);
  const types = typeRows.map((row) => roomTypeFromApi(row, roomRows));
  const stays = inHouse.data ?? [];
  const rooms = roomRows.map((row) => {
    const type = types.find((item) => item.id === row.roomTypeId);
    return roomFromApi({ ...row, baseRate: type ? String(type.baseRate) : undefined }, stays);
  });
  return { rooms, roomTypes: types };
}
