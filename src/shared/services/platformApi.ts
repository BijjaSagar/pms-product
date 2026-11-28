import { request } from './http';
import type { PropertySummary } from './ownerApi';

/** Platform-wide counts for the Super Super Admin's dashboard. */
export interface PlatformOverview {
  relationshipManagers: number;
  owners: number;
  /** Active owners nobody looks after yet; the platform owner sees them directly. */
  unassignedOwners: number;
  properties: number;
  rooms: number;
  staff: number;
  /** Sign-ins that have not been signed out. */
  signedIn: number;
}

/** Super Super Admin only (the server refuses everyone else). */
export const platformApi = {
  overview: () => request<PlatformOverview>('/platform/overview'),
};

/** Every property the caller can reach: all of them, their owners', their company's, or their own. */
export const propertyDirectoryApi = {
  list: () => request<PropertySummary[]>('/properties'),
};
