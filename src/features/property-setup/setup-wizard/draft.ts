import { evenRoomsPerFloor } from '../../settings/room-settings/floorPlan';
import { statesOf } from './locations';

export const MAX_ROOMS = 5000;
export const MAX_CODE_LENGTH = 8;
const PLATFORM_STEPS = ['Property details', 'Room categories', 'Floors & rooms'];
const REGISTRATION_STEPS = [...PLATFORM_STEPS, 'Subscription', 'OTA channels', 'Approval'];

/** A super admin adds a live property in three steps; a new account also picks a plan and channels, then waits for approval. */
export const setupSteps = (mode: 'platform' | 'registration'): string[] => (mode === 'registration' ? REGISTRATION_STEPS : PLATFORM_STEPS);

export interface PropertyDraft {
  name: string;
  code: string;
  country: string;
  state: string;
  city: string;
  currency: string;
  floors: number;
  rooms: number;
}

export interface CategoryDraft {
  /** Local id until the category is saved; the saved room's id replaces it. */
  id: string;
  name: string;
}

export interface RoomDraft {
  id: string;
  /** A CategoryDraft id, or '' while the room has no category. */
  categoryId: string;
}

/** Floor number to the rooms drawn on it, in position order. */
export type FloorRooms = Record<number, RoomDraft[]>;

export const newId = (): string => globalThis.crypto.randomUUID();

export const emptyProperty = (): PropertyDraft => ({
  name: '',
  code: '',
  country: '',
  state: '',
  city: '',
  currency: '',
  floors: 1,
  rooms: 10,
});

export const newCategory = (patch: Partial<CategoryDraft> = {}): CategoryDraft => ({ id: newId(), name: '', ...patch });

export type PropertyErrors = Partial<Record<'name' | 'code' | 'country' | 'state' | 'city' | 'currency', string>>;

export function propertyErrors(p: PropertyDraft): PropertyErrors {
  const errors: PropertyErrors = {};
  if (!p.name.trim()) errors.name = 'Add the property name';
  if (p.code.length < 2) errors.code = 'Add a short code';
  if (!p.country) errors.country = 'Choose a country';
  // Countries the data has no states for need none.
  if (!p.state.trim() && statesOf(p.country).length > 0) errors.state = 'Choose a state';
  if (!p.city.trim()) errors.city = p.country && (statesOf(p.country).length === 0 || p.state) ? 'Choose or add the city' : 'Add the city';
  if (!p.currency) errors.currency = 'Choose a currency';
  return errors;
}

export interface CategoryIssues {
  /** One message per category row, empty when the row is fine. */
  rows: string[];
  valid: boolean;
}

/** A category needs a unique name. How many rooms it has is decided on the floors, not here. */
export function categoryIssues(categories: CategoryDraft[]): CategoryIssues {
  const names = categories.map((c) => c.name.trim().toLowerCase());
  const rows = categories.map((c, i) => {
    if (c.name.trim().length < 2) return 'Add a name';
    if (names.indexOf(names[i] as string) !== i) return 'Names must be unique';
    return '';
  });
  return { rows, valid: categories.length > 0 && rows.every((r) => !r) };
}

export const roomsOnFloors = (floors: FloorRooms, floorCount: number): RoomDraft[] =>
  Array.from({ length: floorCount }, (_, i) => floors[i + 1] ?? []).flat();

/** How many rooms on the floors are linked to each category. */
export function placedByCategory(floors: FloorRooms, floorCount: number): Record<string, number> {
  const placed: Record<string, number> = {};
  for (const room of roomsOnFloors(floors, floorCount)) {
    if (room.categoryId) placed[room.categoryId] = (placed[room.categoryId] ?? 0) + 1;
  }
  return placed;
}

/**
 * Spreads the property's rooms over its floors and links them to the categories: the first share of rooms
 * to the first category, the next to the second, and so on, as evenly as the total allows.
 */
export function autoFillFloors(floorCount: number, totalRooms: number, categories: CategoryDraft[]): FloorRooms {
  const perFloor = evenRoomsPerFloor(floorCount, totalRooms);
  const share = Math.max(categories.length, 1);
  let next = 0;
  const floors: FloorRooms = {};
  for (let floor = 1; floor <= floorCount; floor++) {
    floors[floor] = Array.from({ length: perFloor[floor] ?? 0 }, () => {
      const category = categories[Math.min(Math.floor((next++ * share) / Math.max(totalRooms, 1)), share - 1)];
      return { id: newId(), categoryId: category?.id ?? '' };
    });
  }
  return floors;
}

/** Drops floors that no longer exist and unlinks rooms whose category was removed. */
export function pruneFloors(floors: FloorRooms, floorCount: number, categories: CategoryDraft[]): FloorRooms {
  const known = new Set(categories.map((c) => c.id));
  const pruned: FloorRooms = {};
  for (let floor = 1; floor <= floorCount; floor++) {
    pruned[floor] = (floors[floor] ?? []).map((r) => (r.categoryId && !known.has(r.categoryId) ? { ...r, categoryId: '' } : r));
  }
  return pruned;
}

/** The first reason the floors cannot be saved yet, or null when they hold exactly the property's rooms, each in a category. */
export function floorsProblem(floors: FloorRooms, floorCount: number, totalRooms: number): string | null {
  const rooms = roomsOnFloors(floors, floorCount);
  if (rooms.length !== totalRooms) return `Place exactly ${totalRooms} rooms. ${rooms.length} are on the floors.`;
  if (rooms.some((r) => !r.categoryId)) return 'Choose a category for every room.';
  return null;
}
