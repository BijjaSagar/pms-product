export type RoomSettingsSectionId =
  | 'rooms'
  | 'floors'
  | 'room-types'
  | 'categories'
  | 'amenities'
  | 'maintenance-reasons';

/** The sitemap: how many rooms each floor has, and which room offering each box stands for. */
export interface FloorPlan {
  /** Floor number to its number of rooms. */
  roomsPerFloor: Record<number, number>;
  /** Box key (`floor-index`) to a room offering id. */
  assigned: Record<string, string>;
}

export type RoomMediaKind = 'image' | 'video';

export interface RoomMedia {
  id: string;
  name: string;
  kind: RoomMediaKind;
  /** Object URL of the picked file; lives only for this session. */
  url: string;
}

/** A sellable room offering: a room type plus its name, bedding, occupancy and media. */
export interface RoomListing {
  id: string;
  roomTypeId: string;
  name: string;
  description: string;
  noOfRooms: number;
  /** Room category (bed classification) of the property; empty when none. */
  categoryId: string;
  allowExtraBeds: boolean;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  noOfBathrooms: number;
  amenityIds: string[];
  media: RoomMedia[];
}
