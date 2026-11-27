import { store } from '../mocks/store';
import { request } from './http';
import { requireActivePropertyId, settingsFor } from './propertyAccess';
import { isServerProperty } from './serverProperty';
import { roomNumber } from '../utils/floorPlan';

export interface RoomTypeRow {
  id: string; code: string; name: string; description?: string | null; maxAdults: number; maxChildren: number;
  baseRate: string; amenities?: unknown; isActive: boolean;
}
export interface RoomRow {
  id: string; roomNumber: string; roomTypeId: string; roomTypeCode?: string | null; roomTypeName?: string | null;
  floor?: string | null; status: string; isActive: boolean; notes?: string | null; wing?: string | null; baseRate?: string;
  outOfOrderReason?: string | null;
  /** Most guests the room sleeps; set for rooms loaded from the inventory. */
  maxOccupancy?: number;
  /** Bed setup of the room's bed type, e.g. "1 King Bed (180x200 cm)". */
  bedSetup?: string | null;
}
export interface AvailabilityRow { id: string; roomNumber: string; floor?: string | null; status: string }
export interface AvailabilityResult { nights: string[]; totalRooms: number; available: AvailabilityRow[] }
/** The bookable room inventory of one property, read from its floor plan. */
export interface InventoryListing {
  /** Id of the room (Rooms table). */
  id: string;
  name: string;
  roomTypeName: string;
  /** The room type's nightly base rate. */
  baseRate: string;
  /** Status of the room's room type; only ACTIVE rooms can be booked. */
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  bedSetup: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
}
export interface InventoryRoom {
  roomNumber: string;
  floor: number;
  roomId: string | null;
  roomName: string | null;
  roomTypeId: string | null;
  roomTypeName: string | null;
  bedSetup: string | null;
  maxAdults: number | null;
  maxChildren: number | null;
  maxOccupancy: number | null;
  allowExtraBeds: boolean;
  baseRate: string | null;
  /** Linked to a room whose room type is active; only sellable rooms can be booked. */
  sellable: boolean;
}
export interface RoomInventory {
  /** The property's rooms (Rooms table), by name. */
  listings: InventoryListing[];
  /** Every physical room (floor-plan box). */
  rooms: InventoryRoom[];
}

/** A room of a server property, as its rooms table holds it. */
interface ServerRoom {
  id: string;
  roomNumber: string;
  floor: number;
  categoryId: string;
  category: string;
}

/** The bookable room inventory of one property: a server property's from its rooms table, a demo one's from its floor plan. */
export const roomInventoryApi = {
  get: async (propertyId: string): Promise<RoomInventory> => {
    const settings = settingsFor(propertyId);
    const categoryOf = (id: string | null) => settings.categories.find((c) => c.id === id);
    const listings = settings.listings.map((room) => ({
      id: room.id,
      name: room.name,
      roomTypeName: categoryOf(room.categoryId)?.name ?? room.name,
      baseRate: room.baseRate.toFixed(2),
      status: 'ACTIVE' as const,
      bedSetup: categoryOf(room.categoryId)?.bedSetup ?? null,
      maxAdults: room.maxAdults,
      maxChildren: room.maxChildren,
      maxOccupancy: room.maxOccupancy,
    }));
    if (isServerProperty(propertyId)) {
      // The rooms table is the truth: real room numbers and floors, each in its own category.
      const serverRooms = await request<ServerRoom[]>(`/properties/${propertyId}/rooms`);
      const rooms = serverRooms.map((row): InventoryRoom => {
        const listing = listings.find((item) => item.id === row.categoryId);
        return {
          roomNumber: row.roomNumber,
          floor: row.floor,
          roomId: listing?.id ?? null,
          roomName: listing?.name ?? row.category,
          roomTypeId: listing?.id ?? null,
          roomTypeName: listing?.roomTypeName ?? row.category,
          bedSetup: listing?.bedSetup ?? null,
          maxAdults: listing?.maxAdults ?? null,
          maxChildren: listing?.maxChildren ?? null,
          maxOccupancy: listing?.maxOccupancy ?? null,
          allowExtraBeds: settings.listings.find((item) => item.id === row.categoryId)?.allowExtraBeds ?? false,
          baseRate: listing?.baseRate ?? null,
          sellable: Boolean(listing),
        };
      });
      return { listings, rooms };
    }
    const rooms = settings.floorPlan.floors.flatMap((floor) =>
      Array.from({ length: floor.roomCount }, (_, index): InventoryRoom => {
        const roomId = floor.assignments.find((a) => a.position === index + 1)?.roomId;
        const listing = listings.find((item) => item.id === roomId);
        return {
          roomNumber: roomNumber(floor.floor, index + 1),
          floor: floor.floor,
          roomId: listing?.id ?? null,
          roomName: listing?.name ?? null,
          roomTypeId: listing?.id ?? null,
          roomTypeName: listing?.roomTypeName ?? null,
          bedSetup: listing?.bedSetup ?? null,
          maxAdults: listing?.maxAdults ?? null,
          maxChildren: listing?.maxChildren ?? null,
          maxOccupancy: listing?.maxOccupancy ?? null,
          allowExtraBeds: settings.listings.find((item) => item.id === roomId)?.allowExtraBeds ?? false,
          baseRate: listing?.baseRate ?? null,
          sellable: Boolean(listing),
        };
      }),
    );
    return { listings, rooms };
  },
};

export const inventoryApi = {
  rooms: async () => store.rooms(),
  roomTypes: async () => store.roomTypes(),
  updateRoom: async (id: string, body: Record<string, unknown>) => store.updateRoom(id, body),
  createRoom: async (body: Record<string, unknown>) => store.createRoom(body),
  /** The rooms of one room offering (see `roomTypeId`) that are free for every night of a stay. */
  availability: async (checkIn: string, checkOut: string, roomTypeId: string) => {
    requireActivePropertyId();
    return store.availability(checkIn, checkOut, roomTypeId);
  },
};
