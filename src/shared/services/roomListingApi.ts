import { BED_TYPES, EXTRA_BED_TYPES, newListing, type ListingRecord, type PropertySettings } from '../mocks/propertySettings';
import { request } from './http';
import { settingsFor } from './propertyAccess';
import { isServerProperty } from './serverProperty';
import { recordActivity } from './session';

/** A room offering of one property as the data layer stores it. */
export interface RoomDetails {
  id: string;
  propertyId: string;
  /** Bed type: the room category whose bed setup the room uses. */
  categoryId: string | null;
  category: { id: string; name: string; bedSetup: string } | null;
  name: string;
  description: string | null;
  /** Number of physical rooms of this category: the floor-plan rooms assigned to it (read-only). */
  roomCount: number;
  allowExtraBeds: boolean;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  bathrooms: number;
  /** 1-based position in the order of display on the smart chart; null until ordered. */
  chartOrder: number | null;
  abbreviation: string | null;
  /** Complimentary inclusions, free text. */
  inclusions: string | null;
  /** Minimum occupancy at which the room sells. */
  baseOccupancy: number | null;
  /** Generally the total number of beds in the room. */
  idealOccupancy: number | null;
  /** Bed type code -> number of beds. */
  bedTypes: Record<string, number>;
  /** Codes of the extra bed types the room accepts. */
  extraBedTypes: string[];
  syncCategoryOnOta: boolean;
  excludeFromRevenue: boolean;
  excludeFromOccupancy: boolean;
  excludeFromUpgrade: boolean;
  /** Codes from the meal plan catalog (mealPlanApi). */
  mealPlans: string[];
  amenityIds: string[];
}
export interface RoomInput {
  name: string;
  /** Nightly base rate. */
  baseRate: number;
  /** Send null to clear. */
  description?: string | null;
  categoryId?: string | null;
  allowExtraBeds: boolean;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  bathrooms: number;
  amenityIds: string[];
  /** The fields below can be sent as null to clear them. */
  abbreviation?: string | null;
  inclusions?: string | null;
  baseOccupancy?: number | null;
  idealOccupancy?: number | null;
  bedTypes?: Record<string, number>;
  extraBedTypes?: string[];
  syncCategoryOnOta?: boolean;
  excludeFromRevenue?: boolean;
  excludeFromOccupancy?: boolean;
  excludeFromUpgrade?: boolean;
  mealPlans?: string[];
}
/** A bed type of one of the fixed catalogs. */
export interface BedTypeOption {
  code: string;
  name: string;
}

/**
 * The fields pms-backend keeps in room_categories, named as here. A server property's rooms are its
 * room categories, so they share ids.
 */
const SERVER_FIELDS = [
  'name', 'abbreviation', 'description', 'inclusions', 'baseOccupancy', 'idealOccupancy', 'maxAdults', 'maxChildren',
  'maxOccupancy', 'bedTypes', 'extraBedTypes', 'syncCategoryOnOta', 'excludeFromRevenue', 'excludeFromOccupancy',
  'excludeFromUpgrade', 'mealPlans',
] as const;
type ServerField = (typeof SERVER_FIELDS)[number];
/** The server leaves guest numbers blank until they are set; the room keeps its defaults meanwhile. */
type ServerCategory = { id: string } & { [K in ServerField]: K extends 'maxAdults' | 'maxChildren' | 'maxOccupancy' ? number | null : RoomDetails[K] };

/** The server's copy of a category, laid over the room it is shown as. */
function adopt(listing: ListingRecord, category: ServerCategory) {
  for (const key of SERVER_FIELDS) {
    const value = category[key];
    if (value !== null || !['maxAdults', 'maxChildren', 'maxOccupancy'].includes(key)) Object.assign(listing, { [key]: value });
  }
}

const serverPath = (propertyId: string) => `/properties/${propertyId}/room-categories`;

export type SmokingPolicyKey = 'ALL_NON_SMOKING' | 'SMOKING_PERMITTED';

function toDetails(settings: PropertySettings, record: ListingRecord): RoomDetails {
  const { baseRate: _baseRate, ...fields } = record;
  return structuredClone({
    ...fields,
    category: settings.categories.find((c) => c.id === record.categoryId) ?? null,
    roomCount: settings.floorPlan.floors.flatMap((f) => f.assignments).filter((a) => a.roomId === record.id).length,
  });
}

function requireListing(settings: PropertySettings, id: string): ListingRecord {
  const listing = settings.listings.find((item) => item.id === id);
  if (!listing) throw new Error('This room no longer exists.');
  return listing;
}

function assertNameFree(settings: PropertySettings, name: string, exceptId?: string) {
  const wanted = name.trim().toLowerCase();
  if (settings.listings.some((item) => item.id !== exceptId && item.name.toLowerCase() === wanted)) {
    throw new Error('Another room already has this name.');
  }
}

const list = (propertyId: string) => {
  const settings = settingsFor(propertyId);
  return settings.listings.map((item) => toDetails(settings, item));
};

export const roomListingApi = {
  /** The bed types a room can have; the same for every room. */
  bedTypeCatalog: (): BedTypeOption[] => BED_TYPES.map((bed) => ({ ...bed })),
  /** The extra beds a room can offer; the same for every room. */
  extraBedTypeCatalog: (): BedTypeOption[] => EXTRA_BED_TYPES.map((bed) => ({ ...bed })),
  list: async (propertyId: string) => {
    if (isServerProperty(propertyId)) {
      const settings = settingsFor(propertyId);
      for (const category of await request<ServerCategory[]>(serverPath(propertyId))) {
        const listing = settings.listings.find((item) => item.id === category.id);
        if (listing) adopt(listing, category);
      }
    }
    return list(propertyId);
  },
  create: async (propertyId: string, body: RoomInput) => {
    const settings = settingsFor(propertyId);
    assertNameFree(settings, body.name);
    const listing = newListing(propertyId, { ...structuredClone(body), id: globalThis.crypto.randomUUID() });
    settings.listings.push(listing);
    recordActivity('room-listings', 'create', `Added the room ${listing.name}`, { propertyId, resourceId: listing.id });
    return toDetails(settings, listing);
  },
  update: async (propertyId: string, id: string, body: Partial<RoomInput>) => {
    const settings = settingsFor(propertyId);
    const listing = requireListing(settings, id);
    if (body.name !== undefined) assertNameFree(settings, body.name, id);
    if (isServerProperty(propertyId)) {
      const sent = Object.fromEntries(Object.entries(body).filter(([key]) => (SERVER_FIELDS as readonly string[]).includes(key)));
      if (Object.keys(sent).length > 0) adopt(listing, await request<ServerCategory>(`${serverPath(propertyId)}/${id}`, sent, 'PATCH'));
      // Fields the server does not keep, such as the rate, stay in memory.
      const rest = Object.fromEntries(Object.entries(body).filter(([key]) => !(SERVER_FIELDS as readonly string[]).includes(key)));
      Object.assign(listing, structuredClone(rest));
    } else {
      Object.assign(listing, structuredClone(body));
    }
    recordActivity('room-listings', 'update', `Updated the room ${listing.name}`, { propertyId, resourceId: id });
    return toDetails(settings, listing);
  },
  remove: async (propertyId: string, id: string) => {
    const settings = settingsFor(propertyId);
    const listing = requireListing(settings, id);
    settings.listings.splice(settings.listings.indexOf(listing), 1);
    for (const floor of settings.floorPlan.floors) floor.assignments = floor.assignments.filter((a) => a.roomId !== id);
    settings.images = settings.images.filter((image) => image.roomId !== id);
    recordActivity('room-listings', 'delete', `Deleted the room ${listing.name}`, { propertyId, resourceId: id });
  },
  /** `roomIds` must hold every room of the property, first to last. */
  setChartOrder: async (propertyId: string, roomIds: string[]) => {
    const settings = settingsFor(propertyId);
    roomIds.forEach((id, index) => {
      requireListing(settings, id).chartOrder = index + 1;
    });
    recordActivity('room-listings', 'update', 'Changed the order of rooms', { propertyId });
    return list(propertyId);
  },
};
