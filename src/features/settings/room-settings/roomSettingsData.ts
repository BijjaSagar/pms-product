import { propertyApi, settingsApi } from '../../../lib/api/pms';
import { loadRoomInventory } from '../../../lib/api/loaders';

/*
 * Room configuration the backend has no column for. All of it is one setting, so a screen load is one
 * read: the backend allows 300 requests a minute per user across every route. A part that was never saved
 * reads as its fallback below.
 */
const ROOM_CONFIGURATION_KEY = 'rooms.configuration';

/* A plain named option: classifications and out-of-order reasons. */
export interface CatalogItem {
  id: string;
  label: string;
}

export const LOCATION_KINDS = ['Building', 'Wing', 'Tower'] as const;
export type LocationKind = (typeof LOCATION_KINDS)[number];

export interface LocationItem {
  id: string;
  name: string;
  kind: LocationKind;
}

export interface FloorItem {
  id: string;
  name: string;
  number: string;
  locationId: string | null;
}

export const LINK_KINDS = ['Connecting', 'Adjoining', 'Interconnecting'] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

/* Rooms joined by a door or a shared suite. roomIds are the backend room ids. */
export interface LinkGroup {
  id: string;
  name: string;
  kind: LinkKind;
  roomIds: string[];
}

export const BED_UNITS = ['Inches', 'CM'] as const;
export type BedUnit = (typeof BED_UNITS)[number];

export interface BedType {
  id: string;
  code: string;
  name: string;
  width: number | null;
  length: number | null;
  unit: BedUnit;
  description: string;
  active: boolean;
}

export const AMENITY_CATEGORIES = ['Technology', 'Comfort', 'Bathroom', 'Food & Beverage', 'Other'] as const;
export type AmenityCategory = (typeof AMENITY_CATEGORIES)[number];

export interface AmenityDef {
  id: string;
  code: string;
  name: string;
  category: AmenityCategory;
  description: string;
  active: boolean;
}

export const ATTRIBUTE_TYPES = ['Dropdown', 'Text', 'Number', 'Yes-No'] as const;
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

export interface AttributeDef {
  id: string;
  code: string;
  name: string;
  type: AttributeType;
  /* Choices for a Dropdown. A Yes-No attribute always offers Yes and No. */
  options: string[];
  description: string;
  active: boolean;
}

/* What a room type carries beyond the backend's own room type columns. */
export interface TypeProfile {
  classificationIds: string[];
  amenityIds: string[];
  /* Attribute id to the value this room type has: an option, yes or no, a number or text. */
  attributeValues: Record<string, string>;
  defaultBedTypeId: string | null;
  defaultAdults: number;
  defaultChildren: number;
  extraBeds: number;
  roomSizeSqFt: number | null;
}

export const DEFAULT_TYPE_PROFILE: TypeProfile = {
  classificationIds: [],
  amenityIds: [],
  attributeValues: {},
  defaultBedTypeId: null,
  defaultAdults: 2,
  defaultChildren: 0,
  extraBeds: 0,
  roomSizeSqFt: null,
};

export interface RoomSettingValues {
  classifications: CatalogItem[];
  bedTypes: BedType[];
  amenities: AmenityDef[];
  attributes: AttributeDef[];
  outOfOrderReasons: CatalogItem[];
  locations: LocationItem[];
  floors: FloorItem[];
  links: LinkGroup[];
  typeProfiles: Record<string, TypeProfile>;
  turnaroundMinutes: number;
  turnaroundBufferMinutes: number;
  keycardsPerRoom: number;
}

const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const catalog = (labels: string[]): CatalogItem[] => labels.map((label) => ({ id: slug(label), label }));

const bedType = (code: string, name: string): BedType => ({
  id: slug(code), code, name, width: null, length: null, unit: 'Inches', description: '', active: true,
});

const amenity = (code: string, name: string, category: AmenityCategory): AmenityDef => ({
  id: slug(code), code, name, category, description: '', active: true,
});

const attribute = (code: string, name: string, type: AttributeType, options: string[] = []): AttributeDef => ({
  id: slug(code), code, name, type, options, description: '', active: true,
});

/* The standard master data a property starts from, shown until its own lists are saved. */
const ROOM_SETTING_FALLBACKS: RoomSettingValues = {
  classifications: catalog(['Single', 'Double', 'Twin', 'King', 'Connecting', 'Accessible']),
  bedTypes: [
    bedType('SGL', 'Single'), bedType('DBL', 'Double'), bedType('QUEEN', 'Queen'), bedType('KING', 'King'),
    bedType('TWIN', 'Twin'), bedType('SOFA', 'Sofa Bed'), bedType('BUNK', 'Bunk Bed'),
  ],
  amenities: [
    amenity('WIFI', 'Wi-Fi', 'Technology'), amenity('SMART_TV', 'Smart TV', 'Technology'),
    amenity('PHONE', 'Telephone', 'Technology'), amenity('BT_SPEAKER', 'Bluetooth Speaker', 'Technology'),
    amenity('USB', 'USB Charging', 'Technology'),
    amenity('AC', 'Air Conditioning', 'Comfort'), amenity('HEATING', 'Heating', 'Comfort'),
    amenity('WARDROBE', 'Wardrobe', 'Comfort'), amenity('WORK_DESK', 'Work Desk', 'Comfort'),
    amenity('SOFA', 'Sofa', 'Comfort'), amenity('BALCONY', 'Balcony', 'Comfort'),
    amenity('BATHTUB', 'Bathtub', 'Bathroom'), amenity('SHOWER', 'Shower', 'Bathroom'),
    amenity('HAIR_DRYER', 'Hair Dryer', 'Bathroom'), amenity('BATH_KIT', 'Bathroom Kit', 'Bathroom'),
    amenity('JACUZZI', 'Jacuzzi', 'Bathroom'),
    amenity('MINIBAR', 'Minibar', 'Food & Beverage'), amenity('FRIDGE', 'Refrigerator', 'Food & Beverage'),
    amenity('KETTLE', 'Electric Kettle', 'Food & Beverage'), amenity('TEA_COFFEE', 'Tea/Coffee Maker', 'Food & Beverage'),
    amenity('MICROWAVE', 'Microwave', 'Food & Beverage'),
  ],
  attributes: [
    attribute('ROOM_VIEW', 'Room View', 'Dropdown', ['City', 'Garden', 'Pool', 'Sea', 'Mountain', 'Courtyard']),
    attribute('SMOKING', 'Smoking Preference', 'Dropdown', ['Smoking', 'Non-Smoking']),
    attribute('LOCATION', 'Room Location', 'Dropdown', ['Corner', 'Central', 'Near Elevator']),
    attribute('ACCESSIBILITY', 'Accessibility', 'Dropdown', ['Wheelchair Accessible', 'Standard']),
    attribute('FLOOR_PREF', 'Floor Preference', 'Dropdown', ['Low', 'Middle', 'High']),
    attribute('BALCONY_ATTR', 'Balcony', 'Yes-No'),
    attribute('CONNECTING_ATTR', 'Connecting Room', 'Yes-No'),
  ],
  outOfOrderReasons: catalog(['Maintenance', 'Renovation', 'Plumbing issue', 'Electrical issue']),
  locations: [{ id: 'main-building', name: 'Main Building', kind: 'Building' }],
  floors: [],
  links: [],
  typeProfiles: {},
  turnaroundMinutes: 30,
  turnaroundBufferMinutes: 0,
  keycardsPerRoom: 2,
};

/* Masters saved before codes existed read as their fallback, so the screen never shows half-formed rows. */
const withCodes = <T extends { code: string }>(stored: T[] | undefined, fallback: T[]): T[] =>
  stored && stored.every((item) => typeof item.code === 'string') ? stored : fallback;

async function readRoomSettingValues(): Promise<RoomSettingValues> {
  const stored = await settingsApi.get<Partial<RoomSettingValues>>(ROOM_CONFIGURATION_KEY, {});
  return {
    ...ROOM_SETTING_FALLBACKS,
    ...stored,
    bedTypes: withCodes(stored.bedTypes, ROOM_SETTING_FALLBACKS.bedTypes),
    amenities: withCodes(stored.amenities, ROOM_SETTING_FALLBACKS.amenities),
    attributes: withCodes(stored.attributes, ROOM_SETTING_FALLBACKS.attributes),
  };
}

/* Rooms, room types, the room settings and the property's hold and check-in times. */
export async function loadRoomSettings(canReadSettings: boolean, canReadProperty: boolean) {
  const [inventory, settings, property] = await Promise.all([
    loadRoomInventory(),
    canReadSettings ? readRoomSettingValues() : Promise.resolve(ROOM_SETTING_FALLBACKS),
    canReadProperty ? propertyApi.current() : Promise.resolve(null),
  ]);
  return {
    ...inventory,
    settings,
    holdMinutes: property?.holdMinutes ?? null,
    checkInTime: property?.checkInTime ?? null,
    checkOutTime: property?.checkOutTime ?? null,
  };
}

export type RoomSettingsData = Awaited<ReturnType<typeof loadRoomSettings>>;

/* Reads the stored configuration again first, so a save never writes back a stale copy of the other fields. */
export async function saveRoomSetting<K extends keyof RoomSettingValues>(field: K, value: RoomSettingValues[K]): Promise<void> {
  const current = await readRoomSettingValues();
  await settingsApi.set(ROOM_CONFIGURATION_KEY, { ...current, [field]: value });
}

/* Codes are short, upper case and unique within their list. */
export const CODE_PATTERN = /^[A-Z0-9_-]{1,20}$/;

export const normalizeCode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '-');

export function codeInUse(items: Array<{ id: string; code: string }>, code: string, selfId: string | null): boolean {
  return items.some((item) => item.id !== selfId && item.code === code);
}
