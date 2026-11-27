import { PROPERTY, USERS } from './catalog';
import type { ActivationKey } from '../services/activationKeyApi';
import type { ActivityEntry } from '../services/activityApi';
import type { ApprovalStatus, UserRoleKey } from '../services/authApi';
import type { OtaChannel } from '../services/otaChannelApi';
import type { PlatformOverview } from '../services/platformApi';
import type { PropertyDetails } from '../services/propertyApi';

/** Everything that belongs to the platform rather than to one hotel. It lives in memory and resets on reload. */

export interface Account {
  id: string;
  email: string;
  name: string;
  password: string;
  role: UserRoleKey;
  isActive: boolean;
  mustChangePassword: boolean;
  approvalStatus: ApprovalStatus;
  /** Empty for a SUPER_ADMIN, who can open every property. */
  propertyIds: string[];
  /** The properties this account holds the ADMIN role on. */
  adminPropertyIds?: string[];
  createdAt: string;
  updatedAt: string;
}

/** The sign-ins the login page shows. */
export const DEMO_SIGN_INS = [
  { label: 'Super admin', email: 'admin@hotelpmx.demo', password: 'Admin@12345' },
  { label: 'Hotel staff', email: 'anaya@grandhorizon.in', password: 'Staff@12345' },
] as const;

const [superAdminSignIn, staffSignIn] = DEMO_SIGN_INS;

/** Timestamps are relative to the real clock, so "last 24 hours" filters and "2 hours ago" labels have something to show. */
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

export const properties: PropertyDetails[] = [
  blankProperty({
    id: PROPERTY.id, name: PROPERTY.name, code: 'GRAND-HORIZON', city: PROPERTY.city ?? 'Mumbai', state: 'Maharashtra',
    addressLine1: PROPERTY.addressLine1 ?? null, postalCode: '400050', primaryPhone: '+91 22 4000 1000', propertyType: 'Hotel',
    propertySegment: 'Business', taxType: 'GST', gstn: '27ABCDE1234F1Z5',
    checkoutToleranceValue: 60, numberOfFloors: 3, totalRooms: 15,
  }),
  blankProperty({
    id: 'prop-2', name: 'Horizon Lakeview Resort', code: 'LAKEVIEW', city: 'Udaipur', state: 'Rajasthan',
    addressLine1: '8 Lake Pichola Road', postalCode: '313001', primaryPhone: '+91 294 400 2000', propertyType: 'Resort',
    propertySegment: 'Resort', taxType: 'GST', numberOfFloors: 3, totalRooms: 15,
  }),
  blankProperty({
    id: 'prop-3', name: 'Horizon City Suites', code: 'CITY-SUITES', city: 'Bengaluru', state: 'Karnataka',
    addressLine1: '41 MG Road', postalCode: '560001', propertyType: 'Hotel', numberOfFloors: 3, totalRooms: 15, isActive: false,
  }),
];

/** When each property was added; the property record itself carries no date. */
export const propertyCreatedAt = new Map<string, string>([
  [PROPERTY.id, hoursAgo(24 * 400)],
  ['prop-2', hoursAgo(24 * 120)],
  ['prop-3', hoursAgo(24 * 9)],
]);

const account = (fields: Pick<Account, 'id' | 'email' | 'name' | 'password' | 'role'> & Partial<Account>): Account => ({
  isActive: true,
  mustChangePassword: false,
  approvalStatus: 'APPROVED',
  propertyIds: [],
  createdAt: hoursAgo(24 * 200),
  updatedAt: hoursAgo(24 * 3),
  ...fields,
});

export const accounts: Account[] = [
  account({ id: 'admin-1', email: superAdminSignIn.email, name: 'Platform Admin', password: superAdminSignIn.password, role: 'SUPER_ADMIN' }),
  // The people the hotel already knows (they take housekeeping and maintenance work) are its staff accounts.
  ...USERS.map((user) =>
    account({
      id: user.userId,
      email: user.email,
      name: user.fullName,
      password: staffSignIn.password,
      role: 'STAFF',
      propertyIds: user.email === staffSignIn.email ? [PROPERTY.id, 'prop-2'] : [PROPERTY.id],
    }),
  ),
  account({
    id: 'u-9', email: 'neha@grandhorizon.in', name: 'Neha Gupta', password: staffSignIn.password, role: 'STAFF',
    mustChangePassword: true, createdAt: hoursAgo(30), updatedAt: hoursAgo(30),
  }),
];

const key = (id: string, code: string, note: string | null, ageHours: number): ActivationKey => ({
  id, code, note, status: 'unused', createdAt: hoursAgo(ageHours), usedAt: null, revokedAt: null, usedByProperty: null,
});

export const activationKeys: ActivationKey[] = [
  key('key-1', 'DEMO-2026-HOTL-KEY1', 'Demo key for sign-up', 5),
  key('key-2', 'DEMO-2026-HOTL-KEY2', 'Demo key for sign-up', 5),
  key('key-3', 'DEMO-2026-HOTL-KEY3', 'Demo key for sign-up', 5),
  {
    ...key('key-4', 'LAKE-VIEW-2026-A7QX', 'Lakeview onboarding', 24 * 121),
    status: 'used', usedAt: hoursAgo(24 * 120), usedByProperty: { id: 'prop-2', name: 'Horizon Lakeview Resort', code: 'LAKEVIEW' },
  },
  { ...key('key-5', 'OLDK-EY00-2026-ZZ91', 'Sent to the wrong address', 24 * 40), status: 'revoked', revokedAt: hoursAgo(24 * 39) },
];

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

export const signIns: PlatformOverview['recentSignIns'] = accounts.slice(0, 4).map((user, index) => ({
  sessionId: `session-${index + 1}`,
  userId: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  ipAddress: `203.0.113.${20 + index}`,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0 Safari/537.36',
  signedInAt: hoursAgo(1 + index * 7),
}));

const entry = (
  id: number,
  ageHours: number,
  actorIndex: number,
  propertyIndex: number | null,
  resource: string,
  verb: string,
  summary: string,
): ActivityEntry => {
  const actor = accounts[actorIndex];
  const property = propertyIndex === null ? null : properties[propertyIndex];
  return {
    id: `act-${id}`,
    createdAt: hoursAgo(ageHours),
    property: property ? { id: property.id, name: property.name, code: property.code } : null,
    actor: { id: actor.id, name: actor.name, email: actor.email, role: actor.role },
    action: `${resource}.${verb}`,
    resource,
    resourceId: null,
    summary,
    method: verb === 'update' ? 'PATCH' : 'POST',
    path: `/${resource}`,
    statusCode: verb === 'create' ? 201 : 200,
    details: null,
    ipAddress: '203.0.113.20',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0 Safari/537.36',
  };
};

/** Newest first. */
export const activityLog: ActivityEntry[] = [
  entry(1, 0.4, 1, 0, 'reservations', 'create', 'Created a reservation'),
  entry(2, 2, 1, 0, 'guests', 'update', 'Updated a guest'),
  entry(3, 5, 0, null, 'activation-keys', 'create', 'Issued 3 activation keys'),
  entry(4, 20, 1, 1, 'room-listings', 'update', 'Updated a room'),
  entry(5, 30, 0, null, 'users', 'create', 'Created the user Neha Gupta'),
  entry(6, 52, 0, 0, 'cancellation-rules', 'create', 'Added a cancellation rule'),
  entry(7, 96, 2, 0, 'reservations', 'cancel', 'Cancelled a reservation'),
  entry(8, 200, 0, 2, 'properties', 'create', 'Created the property Horizon City Suites'),
  entry(9, 480, 1, 0, 'meal-plans', 'update', 'Renamed a meal plan'),
];
