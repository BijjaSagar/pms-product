import { accounts, blankProperty, properties, propertyCreatedAt, type Account } from '../mocks/platform';
import { blankSettings, newListing, propertySettings } from '../mocks/propertySettings';
import { request } from './http';
import { adoptServerProperty } from './serverProperty';

/**
 * The screens after sign-in still read the in-memory mocks, so the account and property the server
 * knows are copied into them. The copies are rebuilt after a reload.
 */

/** The server keeps no rates yet; rooms start with one so they can be booked. */
const STARTING_RATE = 3500;

interface ServerProperty {
  id: string;
  name: string;
  code: string;
  abbreviation: string;
  city: string;
  state: string;
  country: string;
  defaultCurrency: string;
  numberOfFloors: number;
  totalRooms: number;
  categories: Array<{ id: string; name: string }>;
  rooms: Array<{ id: string; floor: number; roomNumber: string; categoryId: string }>;
}

export function copyAccount(fields: Pick<Account, 'id' | 'email' | 'name' | 'role' | 'mustChangePassword' | 'approvalStatus' | 'propertyIds' | 'adminPropertyIds'>): Account {
  const now = new Date().toISOString();
  let account = accounts.find((item) => item.id === fields.id);
  if (!account) {
    account = { ...fields, password: '', isActive: true, createdAt: now, updatedAt: now };
    accounts.push(account);
  }
  return Object.assign(account, fields, { isActive: true });
}

/** Copies under way, so that two loads of the session at once do not add a property twice. */
const copying = new Map<string, Promise<void>>();

/** Copies the signed-in account's property, once, so edits made on screen are not overwritten. */
export function copyProperty(propertyId: string): Promise<void> {
  if (properties.some((p) => p.id === propertyId)) return Promise.resolve();
  let pending = copying.get(propertyId);
  if (!pending) {
    pending = readProperty().finally(() => copying.delete(propertyId));
    copying.set(propertyId, pending);
  }
  return pending;
}

async function readProperty(): Promise<void> {
  const server = await request<ServerProperty>('/onboarding/property');

  const { categories, rooms, abbreviation, ...details } = server;
  const settings = blankSettings(server.id);
  settings.listings = categories.map((category, index) =>
    newListing(server.id, { id: category.id, name: category.name, baseRate: STARTING_RATE, chartOrder: index + 1 }),
  );
  const floors = [...new Set(rooms.map((room) => room.floor))];
  settings.floorPlan = {
    numberOfFloors: server.numberOfFloors,
    floors: floors.map((floor) => {
      const onFloor = rooms.filter((room) => room.floor === floor);
      return { floor, roomCount: onFloor.length, assignments: onFloor.map((room, index) => ({ position: index + 1, roomId: room.categoryId })) };
    }),
  };

  // On screen the property's `code` is its abbreviation; the server's generated code is not shown.
  const property = blankProperty({ ...details, code: abbreviation, state: details.state || null });
  await adoptServerProperty(property);
  properties.push(property);
  propertySettings.set(server.id, settings);
  propertyCreatedAt.set(server.id, new Date().toISOString());
}
