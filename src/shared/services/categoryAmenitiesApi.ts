import { ROOM_AMENITIES } from '../mocks/propertySettings';
import { request } from './http';
import { settingsFor } from './propertyAccess';
import { isServerProperty } from './serverProperty';
import { recordActivity } from './session';

/** The catalog amenities of one room. */
export interface CategoryAmenitiesDetails {
  /** Every catalog amenity, in display order. */
  amenities: { code: string; type: string; name: string; isActive: boolean }[];
}

type ServerAmenity = { id: number; category: string; amenity: string; isActive: boolean };

const serverPath = (propertyId: string, roomId: string) => `/properties/${propertyId}/room-categories/${roomId}/amenities`;

/** A server property's rooms are its room categories; their amenities come from the category_amenities table. */
const fromServer = (rows: ServerAmenity[]): CategoryAmenitiesDetails => ({
  amenities: rows.map(({ id, category, amenity, isActive }) => ({ code: String(id), type: category, name: amenity, isActive })),
});

const roomRecord = (propertyId: string, roomId: string) =>
  (settingsFor(propertyId).roomAmenities[roomId] ??= { active: {} });

const read = async (propertyId: string, roomId: string): Promise<CategoryAmenitiesDetails> => {
  if (isServerProperty(propertyId)) return fromServer(await request<ServerAmenity[]>(serverPath(propertyId, roomId)));
  const record = roomRecord(propertyId, roomId);
  return {
    amenities: ROOM_AMENITIES.map((amenity) => ({ ...amenity, isActive: record.active[amenity.code] ?? false })),
  };
};

export const categoryAmenitiesApi = {
  get: read,
  setAmenity: async (propertyId: string, roomId: string, code: string, isActive: boolean) => {
    if (isServerProperty(propertyId)) {
      // The server keeps the full set, so send the current one with `code` switched.
      const current = await read(propertyId, roomId);
      const amenityIds = current.amenities.filter((a) => (a.code === code ? isActive : a.isActive)).map((a) => Number(a.code));
      await request<ServerAmenity[]>(serverPath(propertyId, roomId), { amenityIds }, 'PUT');
      return { code, isActive };
    }
    roomRecord(propertyId, roomId).active[code] = isActive;
    recordActivity('amenities', 'update', 'Changed a room amenity', { propertyId, resourceId: roomId });
    return { code, isActive };
  },
};
