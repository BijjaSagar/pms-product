import { blankProperty, properties, propertyCreatedAt } from '../mocks/platform';
import { requireProperty } from './propertyAccess';
import { loadPropertyDetails, savePropertyDetails } from './serverProperty';
import { propertiesOf, recordActivity, requireAccount, requirePropertyAdmin, requireSuperAdmin } from './session';

export interface PropertyRow {
  id: string; name: string; slug: string; timezone: string; currencyCode: string; countryCode?: string;
  checkInTime?: string; checkOutTime?: string; addressLine1?: string | null; city?: string | null;
}
/** A property as the data layer stores it. */
export interface PropertyDetails {
  id: string;
  name: string;
  /** Shown as the "Abbreviation". */
  code: string;
  propertyGroup: string | null;
  googleAnalyticsTag: string | null;
  metaPixel: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  country: string;
  state: string | null;
  city: string;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  website: string | null;
  /** ISO 4217 code. */
  defaultCurrency: string;
  ignoreDecimalInBillSettlement: boolean;
  /** In minutes. */
  checkoutToleranceValue: number | null;
  locationMapUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  propertySegment: string | null;
  propertyType: string | null;
  taxType: string | null;
  gstn: string | null;
  tripAdvisorListingName: string | null;
  tripAdvisorPropertyId: string | null;
  googleListingName: string | null;
  trivagoListingName: string | null;
  corporateAddress: string | null;
  autoConfirmBookings: boolean;
  numberOfFloors: number | null;
  totalRooms: number | null;
  isActive: boolean;
  /** Set for a property kept on the server; see propertyLogoApi. */
  hasLogo?: boolean;
  logoUpdatedAt?: string | null;
}
/** Only the fields being changed; `null` clears an optional field. */
export type PropertyUpdate = Partial<Omit<PropertyDetails, 'id' | 'hasLogo' | 'logoUpdatedAt'>>;
/** What a new property needs; everything else is filled in later under Settings. */
export interface PropertyCreate {
  name: string;
  /** Abbreviation, 2-20 letters, digits, "-" or "_". */
  code: string;
  city: string;
  state?: string;
  country: string;
  defaultCurrency: string;
  numberOfFloors: number;
  totalRooms: number;
}

const codeTaken = (code: string, exceptId?: string) =>
  properties.some((p) => p.id !== exceptId && p.code.toUpperCase() === code.toUpperCase());

/** Reading is open to the property's own staff; creating is SUPER_ADMIN only, updating is for a super admin or the property's ADMIN. */
export const propertyApi = {
  /** Every property for a SUPER_ADMIN, only the assigned ones for STAFF. */
  list: async () => structuredClone(propertiesOf(requireAccount())),
  get: async (id: string) => {
    const property = requireProperty(id);
    await loadPropertyDetails(property);
    return structuredClone(property);
  },
  /** SUPER_ADMIN only. */
  create: async (body: PropertyCreate) => {
    requireSuperAdmin();
    if (codeTaken(body.code)) throw new Error('Another property already uses this abbreviation.');
    const property = blankProperty({ ...body, id: globalThis.crypto.randomUUID(), state: body.state ?? null });
    properties.push(property);
    propertyCreatedAt.set(property.id, new Date().toISOString());
    recordActivity('properties', 'create', `Created the property ${property.name}`, { propertyId: property.id, resourceId: property.id });
    return structuredClone(property);
  },
  update: async (id: string, body: PropertyUpdate) => {
    requirePropertyAdmin(id);
    const property = requireProperty(id);
    // A server property is saved there; abbreviations only have to be unique among the demo ones.
    if (!(await savePropertyDetails(property, body))) {
      if (body.code && codeTaken(body.code, id)) throw new Error('Another property already uses this abbreviation.');
      Object.assign(property, body);
    }
    recordActivity('properties', 'update', `Updated ${property.name}`, { propertyId: id, resourceId: id, details: { ...body } });
    return structuredClone(property);
  },
};
