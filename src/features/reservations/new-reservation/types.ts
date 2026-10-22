export type BillingRoute = 'To Guest' | 'To Company' | 'To Travel Agent' | 'Direct Settlement' | 'Default';
export type OccupantRole = 'Primary guest' | 'Family member' | 'Driver' | 'Other';

export interface RoomOccupant {
  id: string;
  name: string;
  role: OccupantRole;
}

export interface RoomRequirement {
  id: string;
  roomIndex: number;
  roomTypeId: string;
  category: string;
  adults: number;
  children: number;
  infant: number;
  roomId: string | null;
  roomNo: string;
  rate: number;
  ratePlan: string;
  mealPlan: string;
  billingRoute: BillingRoute;
  occupants: RoomOccupant[];
}

export interface FrontDeskTask {
  id: string;
  text: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface OutletCatalogItem {
  id: string;
  outletId: string;
  outletName: string;
  name: string;
  description: string;
  unitPrice: number;
}

export interface OutletAddonLine {
  id: string;
  catalogItemId: string;
  outletId: string;
  outletName: string;
  name: string;
  quantity: number;
  unitPrice: number;
  roomRequirementId: string;
  billingRoute: BillingRoute;
}

export interface BillingPreferences {
  roomBillTo: Exclude<BillingRoute, 'Default' | 'Direct Settlement'>;
  extrasBillTo: Exclude<BillingRoute, 'Default'>;
  billToCompany: boolean;
  noPost: boolean;
  companyName: string;
  companyGst: string;
}

export interface RoomCategoryOption {
  id: string;
  name: string;
  baseRate: number;
  maxAdults: number;
  maxChildren: number;
  desc?: string;
}
