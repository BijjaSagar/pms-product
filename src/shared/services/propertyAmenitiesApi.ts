import { request } from './http';
import { settingsFor } from './propertyAccess';
import { isServerProperty } from './serverProperty';
import { recordActivity } from './session';

/** One catalog amenity and whether the property offers it. */
export interface PropertyAmenity {
  /** The server's property_amenities id, or an upper-case name such as `FREE_INTERNET` for a demo property. */
  code: string;
  name: string;
  isActive: boolean;
}

/** The amenity catalog of one property. */
export interface PropertyAmenitiesDetails {
  amenities: PropertyAmenity[];
}

type ServerAmenity = { id: number; name: string; isActive: boolean };

const fromServer = ({ id, name, isActive }: ServerAmenity): PropertyAmenity => ({ code: String(id), name, isActive });

/** "FREE_INTERNET" -> "Free Internet". */
const nameOf = (code: string) =>
  code
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/** A server property's amenities come from the server's property_amenities table; */
const read = async (propertyId: string): Promise<PropertyAmenitiesDetails> => {
  const settings = settingsFor(propertyId);
  if (isServerProperty(propertyId)) {
    const rows = await request<ServerAmenity[]>(`/properties/${propertyId}/amenities`);
    return { amenities: rows.map(fromServer) };
  }
  return {
    amenities: Object.entries(settings.amenities).map(([code, isActive]) => ({ code, name: nameOf(code), isActive })),
  };
};

/** Saves the full set a server property offers: the current ones with `code` switched to `isActive`. */
const saveOnServer = async (propertyId: string, code: string, isActive: boolean): Promise<PropertyAmenitiesDetails> => {
  const current = await read(propertyId);
  const amenityIds = current.amenities
    .filter((a) => (a.code === code ? isActive : a.isActive))
    .map((a) => Number(a.code));
  const rows = await request<ServerAmenity[]>(`/properties/${propertyId}/amenities`, { amenityIds }, 'PUT');
  return { amenities: rows.map(fromServer) };
};

export const propertyAmenitiesApi = {
  get: read,
  setAmenity: async (propertyId: string, code: string, isActive: boolean) => {
    if (isServerProperty(propertyId)) return saveOnServer(propertyId, code, isActive);
    settingsFor(propertyId).amenities[code] = isActive;
    recordActivity('property-amenities', 'update', 'Changed a property amenity', { propertyId, details: { code, isActive } });
    return read(propertyId);
  },
};
