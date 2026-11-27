import { FLOOR_PLAN, ROOM_TYPES } from './catalog';
import { properties } from './platform';
import type { CancellationRuleDetails } from '../services/cancellationRuleApi';
import type { FloorPlanInput } from '../services/floorPlanApi';
import type { HousekeepingStatusDetails } from '../services/housekeepingStatusApi';
import type { MealPlanDetails } from '../services/mealPlanApi';
import type { PostMasterSettingsDetails } from '../services/postMasterSettingsApi';
import type { PropertyPolicyDetails } from '../services/propertyPolicyApi';
import type { PropertyTermsDetails } from '../services/propertyTermsApi';
import type { ReservationSettingsDetails } from '../services/reservationSettingsApi';
import type { RoomImageDetails } from '../services/roomImageApi';
import type { RoomDetails } from '../services/roomListingApi';
import type { TaxCategoryRow, TaxGeneralSettings, TaxSetupRuleRow } from '../services/taxSetupApi';

/* ---------------------------------------------------------------- catalogs */

export const PROPERTY_AMENITY_CODES = [
  'FREE_INTERNET', 'FREE_PARKING', 'SWIMMING_POOL', 'FITNESS_CENTRE', 'RESTAURANT', 'BAR', 'SPA',
  'ROOM_SERVICE', 'AIRPORT_SHUTTLE', 'BUSINESS_CENTRE', 'LAUNDRY_SERVICE', 'PET_FRIENDLY',
];

export const ROOM_AMENITIES = [
  { code: 'AIR_CONDITIONING', type: 'Comfort', name: 'Air conditioning' },
  { code: 'CEILING_FAN', type: 'Comfort', name: 'Ceiling fan' },
  { code: 'BALCONY', type: 'Comfort', name: 'Balcony' },
  { code: 'FLAT_TV', type: 'Entertainment', name: 'Flat-screen TV' },
  { code: 'WIFI', type: 'Entertainment', name: 'Wi-Fi' },
  { code: 'MINIBAR', type: 'Food and drink', name: 'Minibar' },
  { code: 'KETTLE', type: 'Food and drink', name: 'Electric kettle' },
  { code: 'HAIR_DRYER', type: 'Bathroom', name: 'Hair dryer' },
  { code: 'BATHTUB', type: 'Bathroom', name: 'Bathtub' },
  { code: 'TOILETRIES', type: 'Bathroom', name: 'Free toiletries' },
  { code: 'SAFE', type: 'Security', name: 'In-room safe' },
];

/** Same codes as pms-backend (room-categories.service.ts). */
export const BED_TYPES = [
  { code: 'KING', name: 'King Size Bed' },
  { code: 'QUEEN', name: 'Queen Size Bed' },
  { code: 'DOUBLE', name: 'Double Bed' },
  { code: 'TWIN', name: 'Twin Bed' },
  { code: 'SINGLE', name: 'Single Bed' },
  { code: 'BUNK', name: 'Bunk Bed' },
  { code: 'SOFA_BED', name: 'Sofa Bed' },
];

export const EXTRA_BED_TYPES = [
  { code: 'SINGLE', name: 'Single Bed' },
  { code: 'DOUBLE', name: 'Double Bed' },
];

const MEAL_PLAN_NAMES: Array<[string, string]> = [
  ['EP', 'Room only'], ['CP', 'Bed and breakfast'], ['MAP', 'Half board'], ['AP', 'Full board'],
  ['MAPAI', 'Half board, all inclusive'], ['APAI', 'Full board, all inclusive'],
];

/* -------------------------------------------------------------- per property */

export interface RoomCategoryRecord { id: string; name: string; bedSetup: string }

/** A room offering; its category and room count are worked out when it is read. */
export type ListingRecord = Omit<RoomDetails, 'category' | 'roomCount'> & { baseRate: number };

export interface RoomImageRecord extends RoomImageDetails { file: Blob }

export interface PropertySettings {
  categories: RoomCategoryRecord[];
  listings: ListingRecord[];
  floorPlan: FloorPlanInput;
  images: RoomImageRecord[];
  policy: PropertyPolicyDetails;
  amenities: Record<string, boolean>;
  roomAmenities: Record<string, { active: Record<string, boolean> }>;
  logo: { file: Blob; updatedAt: string } | null;
  mealPlans: MealPlanDetails[];
  reservationSettings: ReservationSettingsDetails;
  postMaster: PostMasterSettingsDetails;
  housekeepingStatuses: HousekeepingStatusDetails[];
  terms: PropertyTermsDetails;
  cancellationRules: CancellationRuleDetails[];
  taxCategories: TaxCategoryRow[];
  taxRules: TaxSetupRuleRow[];
  taxSettings: TaxGeneralSettings;
}

export function newListing(propertyId: string, fields: Pick<ListingRecord, 'id' | 'name' | 'baseRate'> & Partial<ListingRecord>): ListingRecord {
  return {
    propertyId, categoryId: null, description: null, allowExtraBeds: false, maxAdults: 2, maxChildren: 0, maxOccupancy: 2,
    bathrooms: 1, chartOrder: null, abbreviation: null, inclusions: null,
    baseOccupancy: null, idealOccupancy: null, bedTypes: {}, extraBedTypes: [], syncCategoryOnOta: false, excludeFromRevenue: false,
    excludeFromOccupancy: false, excludeFromUpgrade: false, mealPlans: ['EP', 'CP'], amenityIds: [],
    ...fields,
  };
}

const housekeepingStatus = (
  propertyId: string,
  displayOrder: number,
  name: string,
  abbreviation: string,
  color: string,
  extra: Partial<HousekeepingStatusDetails> = {},
): HousekeepingStatusDetails => ({
  id: `${propertyId}-hks-${displayOrder}`, propertyId, name, color, displayOrder, abbreviation, description: null,
  permissionRequired: 'NONE', checkinDefault: false, checkoutDefault: false, roomChangeDefault: false,
  availableForParkingLot: false, allowCheckin: false, checkinHardStop: false,
  ...extra,
});

/** The settings every property starts with: catalogs and defaults, but no rooms. */
export function blankSettings(propertyId: string): PropertySettings {
  return {
    categories: [],
    listings: [],
    floorPlan: { numberOfFloors: 1, floors: [] },
    images: [],
    policy: {
      cancellationPolicy: null, noShowPolicy: null, childExtraBedPolicy: null, requireGovernmentId: true,
      requireSecurityDeposit: true, enforceMinimumAge: true, smokingPolicy: null, updatedAt: null,
    },
    amenities: Object.fromEntries(PROPERTY_AMENITY_CODES.map((code) => [code, false])),
    roomAmenities: {},
    logo: null,
    mealPlans: MEAL_PLAN_NAMES.map(([code, name], index) => ({ displayOrder: index + 1, code, displayName: name, shortDisplayName: code })),
    reservationSettings: {
      reservationPrefix: 'RSV', maxReservationNumber: 9100, infantCount: 1, infantDisplayText: 'Infant', infantMinAge: 0,
      infantMaxAge: 2, chargeableChildMinAge: 6, chargeableChildMaxAge: 12, daysBetweenCheckInCheckOut: 30,
      considerDirtyRoomForParkingLot: false, softBlockForDoNotMove: false, allowZeroRateBookings: false,
      moveCheckInCheckOutBooking: false,
    },
    postMaster: {
      maxOpenPmReservations: 5, pmOpenTotalGrossAmount: 500000, maxRooms: 10, maxNights: 30, maxRoomNights: 100,
      maxReservationGrossAmount: 200000,
    },
    housekeepingStatuses: [
      // palette-allow: colours a hotel gives its own housekeeping statuses
      housekeepingStatus(propertyId, 1, 'Clean', 'CL', '#2e9e5b', { allowCheckin: true }),
      // palette-allow: colours a hotel gives its own housekeeping statuses
      housekeepingStatus(propertyId, 2, 'Dirty', 'DI', '#c2453d', { checkoutDefault: true, roomChangeDefault: true }),
      // palette-allow: colours a hotel gives its own housekeeping statuses
      housekeepingStatus(propertyId, 3, 'To be inspected', 'TI', '#c98a1b', { permissionRequired: 'CLEAN' }),
      // palette-allow: colours a hotel gives its own housekeeping statuses
      housekeepingStatus(propertyId, 4, 'Inspected', 'IN', '#2f73b8', { allowCheckin: true, checkinDefault: true }),
      // palette-allow: colours a hotel gives its own housekeeping statuses
      housekeepingStatus(propertyId, 5, 'Under maintenance', 'UM', '#6b7280', { checkinHardStop: true }),
    ],
    terms: {
      includeInclusions: false, inclusions: null, includeBookingTerms: false, bookingTerms: null,
      includeCheckInTerms: false, checkInTerms: null, updatedAt: null,
    },
    cancellationRules: [],
    taxCategories: [],
    taxRules: [],
    taxSettings: {
      computation: 'COMPOSITE_SUPPLY', sacRoomCode: '996311', enableSacCodes: true, applyRoomSlabOnMeals: false,
      applyRoomSlabOnExtraBed: true, showPropertyGstNo: true,
    },
  };
}

/** The settings of an established demo hotel: the demo room types as its rooms, laid out on the demo floor plan. */
function seededSettings(propertyId: string): PropertySettings {
  const settings = blankSettings(propertyId);
  settings.categories = [
    { id: `${propertyId}-cat-king`, name: 'King room', bedSetup: '1 King Bed (180x200 cm)' },
    { id: `${propertyId}-cat-queen`, name: 'Queen room', bedSetup: '1 Queen Bed (150x200 cm)' },
  ];
  settings.listings = ROOM_TYPES.map((type, index) =>
    newListing(propertyId, {
      id: type.id,
      name: type.name,
      abbreviation: type.code,
      baseRate: Number(type.baseRate),
      categoryId: settings.categories[index % 2].id,
      description: `${type.name} with city view.`,
      maxAdults: type.maxAdults,
      maxChildren: type.maxChildren,
      maxOccupancy: type.maxAdults + type.maxChildren,
      bedTypes: { [index % 2 === 0 ? 'KING' : 'QUEEN']: 1 },
      extraBedTypes: ['SINGLE'],
      chartOrder: index + 1,
    }),
  );
  settings.floorPlan = {
    numberOfFloors: FLOOR_PLAN.length,
    floors: FLOOR_PLAN.map((plan) => ({
      floor: Number(plan.floor),
      roomCount: plan.count,
      assignments: Array.from({ length: plan.count }, (_, index) => ({ position: index + 1, roomId: plan.typeId })),
    })),
  };
  for (const listing of settings.listings) {
    settings.roomAmenities[listing.id] = {
      active: { AIR_CONDITIONING: true, FLAT_TV: true, WIFI: true, KETTLE: true, TOILETRIES: true, SAFE: true },
    };
  }
  settings.policy = {
    cancellationPolicy: 'Free cancellation until 48h before arrival; first night charged thereafter.',
    noShowPolicy: 'First night charged to the primary payment method on file.',
    childExtraBedPolicy: 'Children under 6 stay complimentary using existing bedding.',
    requireGovernmentId: true, requireSecurityDeposit: true, enforceMinimumAge: true,
    smokingPolicy: 'ALL_NON_SMOKING', updatedAt: null,
  };
  for (const code of ['FREE_INTERNET', 'FREE_PARKING', 'RESTAURANT', 'ROOM_SERVICE', 'LAUNDRY_SERVICE']) settings.amenities[code] = true;
  settings.terms = {
    includeInclusions: true, inclusions: 'Complimentary Wi-Fi and drinking water.',
    includeBookingTerms: true, bookingTerms: 'A valid photo ID is required for every adult guest.',
    includeCheckInTerms: true, checkInTerms: 'Check-in from 14:00. Check-out by 11:00.',
    updatedAt: '2026-09-01T09:00:00.000Z',
  };
  settings.cancellationRules = [
    { id: `${propertyId}-cxl-1`, propertyId, startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-12-31T00:00:00.000Z', daysFromCheckin: 3, penaltyPercent: '50.00' },
    { id: `${propertyId}-cxl-2`, propertyId, startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-12-31T00:00:00.000Z', daysFromCheckin: 1, penaltyPercent: '100.00' },
  ];
  settings.taxCategories = [
    { id: `${propertyId}-taxcat-1`, name: 'Room Tariff', description: 'GST on accommodation' },
    { id: `${propertyId}-taxcat-2`, name: 'Food and Beverage', description: 'GST on restaurant and bar sales' },
  ];
  settings.taxRules = [
    {
      id: `${propertyId}-taxrule-1`, name: 'GST on rooms', description: 'Slab-based GST on the room tariff',
      startDate: '2026-04-01', endDate: '', categoryId: `${propertyId}-taxcat-1`,
      components: (['CGST', 'SGST'] as const).map((code) => ({
        code,
        appliedOn: 'ROOM_TARIFF' as const,
        slabs: [
          { id: `${propertyId}-${code}-1`, from: '0.00', to: '7500.00', valueType: 'PERCENTAGE' as const, value: '6.00' },
          { id: `${propertyId}-${code}-2`, from: '7500.01', to: '999999.00', valueType: 'PERCENTAGE' as const, value: '9.00' },
        ],
      })),
    },
  ];
  return settings;
}

/** Seeded when this module loads, before any screen can edit the demo room types. */
export const propertySettings = new Map<string, PropertySettings>(
  properties.map((property) => [property.id, seededSettings(property.id)]),
);
