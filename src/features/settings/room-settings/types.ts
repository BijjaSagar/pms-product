export type RoomSettingsSectionId =
  | 'room-types'
  | 'categories'
  | 'amenities'
  | 'occupancy'
  | 'maintenance-reasons'
  | 'status-config';

export interface OccupancyConfig {
  baseOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  maxTotalOccupancy: number;
  allowExtraBeds: boolean;
  maxExtraBeds: number;
  extraBedRate: number;
  allowCribs: boolean;
  maxCribs: number;
  cribComplimentary: boolean;
  childFreeAgeLimit: number;
  extraAdultSurcharge: number;
}

export type MaintenancePriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type MaintenanceImpact = 'Out of Order' | 'Out of Service' | 'Inspection Required';

export interface MaintenanceReasonItem {
  id: string;
  code: string;
  name: string;
  category: 'Plumbing' | 'Electrical' | 'HVAC' | 'Renovation' | 'Housekeeping' | 'General' | 'Security';
  priority: MaintenancePriority;
  impact: MaintenanceImpact;
  avgResolutionHours: number;
  activeRoomsCount: number;
  requiresSupervisorSignoff: boolean;
  active: boolean;
}

export interface RoomStatusDefinition {
  id: string;
  code: string;
  shortCode: string;
  name: string;
  description: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  isSellable: boolean;
  requiresHousekeeping: boolean;
  requiresInspection: boolean;
  autoMarkDirtyOnCheckout: boolean;
  active: boolean;
}


