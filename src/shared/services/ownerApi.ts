import { request } from './http';

/** An owner company (the SaaS tenant). Several people sign in for it. */
export interface OwnerRow {
  id: string;
  name: string;
  rmId: string | null;
  rmName: string | null;
  isActive: boolean;
  propertyCount: number;
  peopleCount: number;
  createdAt: string;
}

/** A person who signs in for an owner company. */
export interface PersonRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface NewPerson {
  id: string;
  name: string;
  email: string;
  temporaryPassword: string;
}

/** One line per property, for the console lists. */
export interface PropertySummary {
  id: string;
  name: string;
  code: string;
  abbreviation: string;
  city: string;
  state: string | null;
  country: string;
  defaultCurrency: string;
  numberOfFloors: number;
  totalRooms: number;
  roomCount: number;
  staffCount: number;
  ownerId: string;
  ownerName: string;
  createdAt: string;
}

/** What a new property sends: the details, the room categories, the rooms on each floor, and optionally its first Property Admin. */
export interface NewPropertyInput {
  property: { name: string; abbreviation: string; city: string; state?: string; country: string; defaultCurrency: string; numberOfFloors: number; totalRooms: number };
  categories: Array<{ name: string }>;
  /** Floors that have rooms; each room names its category, in position order (the first on floor 1 is 101). */
  floors: Array<{ floor: number; rooms: Array<{ category: string }> }>;
  propertyAdmin?: { name: string; email: string };
}

export interface CreatedProperty {
  propertyId: string;
  propertyAdmin: NewPerson | null;
}

export interface OverviewRow {
  rooms: number;
  occupiedRooms: number;
  occupancyPercent: number;
  arrivals: number;
  departures: number;
  inHouse: number;
}

/** An owner's consolidated view of today across their own properties. */
export interface OwnerOverview {
  ownerId: string;
  businessDate: string;
  totals: OverviewRow & { properties: number };
  properties: Array<OverviewRow & { id: string; name: string; city: string; country: string }>;
}

const base = (ownerId: string) => `/owners/${ownerId}`;

/** Owner companies, their people and their properties. Who may call what is decided by the server. */
export const ownerApi = {
  /** The Super Super Admin's owners, or a Relationship Manager's own. */
  list: () => request<OwnerRow[]>('/owners'),
  get: (ownerId: string) => request<OwnerRow>(base(ownerId)),
  create: (body: { name: string; person: { name: string; email: string }; rmId?: string | null }) =>
    request<{ owner: OwnerRow; person: NewPerson }>('/owners', body),
  update: (ownerId: string, body: { name?: string; isActive?: boolean; rmId?: string | null }) => request<OwnerRow>(base(ownerId), body, 'PATCH'),

  people: (ownerId: string) => request<PersonRow[]>(`${base(ownerId)}/people`),
  addPerson: (ownerId: string, body: { name: string; email: string }) => request<NewPerson>(`${base(ownerId)}/people`, body),
  updatePerson: (ownerId: string, personId: string, body: { name?: string; isActive?: boolean }) =>
    request<PersonRow>(`${base(ownerId)}/people/${personId}`, body, 'PATCH'),
  resetPassword: (ownerId: string, personId: string) => request<{ temporaryPassword: string }>(`${base(ownerId)}/people/${personId}/reset-password`, {}),

  properties: (ownerId: string) => request<PropertySummary[]>(`${base(ownerId)}/properties`),
  addProperty: (ownerId: string, body: NewPropertyInput) => request<CreatedProperty>(`${base(ownerId)}/properties`, body),
  overview: (ownerId: string) => request<OwnerOverview>(`${base(ownerId)}/overview`),
};
