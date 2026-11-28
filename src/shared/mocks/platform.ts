import type { ActivityEntry } from '../services/activityApi';
import type { UserRoleKey } from '../services/authApi';
import type { OtaChannel } from '../services/otaChannelApi';
import type { PropertyDetails } from '../services/propertyApi';

/**
 * What the in-memory screens still need of the platform. Accounts and properties come from the server and
 * are copied in as they are loaded (see `serverAccount.ts`); nothing here is a demo person or hotel.
 */

export interface Account {
  id: string;
  email: string;
  name: string;
  password: string;
  role: UserRoleKey;
  isActive: boolean;
  mustChangePassword: boolean;
  /** The properties this person can open. */
  propertyIds: string[];
  /** The properties this person may change the setup of. */
  adminPropertyIds?: string[];
  createdAt: string;
  updatedAt: string;
}

/** Timestamps are relative to the real clock, so "2 hours ago" labels have something to show. */
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export const blankProperty = (fields: Pick<PropertyDetails, 'id' | 'name' | 'code' | 'city'> & Partial<PropertyDetails>): PropertyDetails => ({
  propertyGroup: null, googleAnalyticsTag: null, metaPixel: null,
  addressLine1: null, addressLine2: null, postalCode: null, country: 'India', state: null,
  primaryPhone: null, secondaryPhone: null, website: null, defaultCurrency: 'INR', ignoreDecimalInBillSettlement: false,
  checkoutToleranceValue: null, locationMapUrl: null, latitude: null, longitude: null,
  propertySegment: null, propertyType: null, taxType: null, gstn: null, tripAdvisorListingName: null,
  tripAdvisorPropertyId: null, googleListingName: null, trivagoListingName: null,
  corporateAddress: null, autoConfirmBookings: false, numberOfFloors: null, totalRooms: null, isActive: true,
  ...fields,
});

export const properties: PropertyDetails[] = [];

/** When each property was added; the property record itself carries no date. */
export const propertyCreatedAt = new Map<string, string>();

export const accounts: Account[] = [];

const ota = (id: string, name: string, region: string | null, sortOrder: number, isActive = true): OtaChannel => ({
  id, name, region, isActive, sortOrder, createdAt: hoursAgo(24 * 300), updatedAt: hoursAgo(24 * 30),
});

export const otaChannels: OtaChannel[] = [
  ota('ota-1', 'Booking.com', 'Global', 1),
  ota('ota-2', 'Expedia', 'Global', 2),
  ota('ota-3', 'MakeMyTrip', 'India', 3),
  ota('ota-4', 'Goibibo', 'India', 4),
  ota('ota-5', 'Agoda', 'Asia Pacific', 5),
  ota('ota-6', 'Airbnb', 'Global', 6),
  ota('ota-7', 'Cleartrip', 'India', 7, false),
];

/** The changes made in this session, newest first; the activity log reads it. */
export const activityLog: ActivityEntry[] = [];
