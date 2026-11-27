import { request } from './http';
import type { PropertyDetails, PropertyUpdate } from './propertyApi';

/**
 * Property Details of properties the server knows are read from and saved to it. The demo
 * properties are not on the server and stay in memory.
 */
const serverIds = new Set<string>();

const fetchDetails = (id: string) => request<Partial<PropertyDetails>>(`/properties/${id}`);

/** Fills a property copied from the server with its saved details, and remembers where it came from. */
export async function adoptServerProperty(property: PropertyDetails): Promise<void> {
  Object.assign(property, await fetchDetails(property.id));
  serverIds.add(property.id);
}

/** Whether this property's data is kept on the server. */
export const isServerProperty = (id: string): boolean => serverIds.has(id);

export async function loadPropertyDetails(property: PropertyDetails): Promise<void> {
  if (serverIds.has(property.id)) Object.assign(property, await fetchDetails(property.id));
}

/** Saves to the server and updates the copy; false when the property is not a server one. */
export async function savePropertyDetails(property: PropertyDetails, changes: PropertyUpdate): Promise<boolean> {
  if (!serverIds.has(property.id)) return false;
  Object.assign(property, await request<Partial<PropertyDetails>>(`/properties/${property.id}`, changes, 'PATCH'));
  return true;
}
