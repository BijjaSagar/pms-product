export type RateTabId =
  | 'calendar'
  | 'plans'
  | 'seasonality'
  | 'restrictions'
  | 'mapping'
  | 'bulk'
  | 'history';

export type RatePlanStatus = 'Active' | 'Inactive' | 'Scheduled';
export type SeasonStatus = 'Active' | 'Scheduled' | 'Expired';

export interface RatePlan {
  id: string;
  code: string;
  name: string;
  roomTypes: string[];
  channels: string[];
  status: RatePlanStatus;
  description: string;
  mealPlan: string;
  cancellationPolicy: string;
  adjustmentPct: number;
}

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  adjustmentPct: number;
  status: SeasonStatus;
}

export interface CalendarDate {
  iso: string;
  day: string;
  month: string;
  weekday: string;
  isWeekend: boolean;
}

export interface DistributionChannel {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  description: string;
  lastSync: string;
}

export interface RateHistoryEvent {
  id: string;
  title: string;
  detail: string;
  user: string;
  timestamp: string;
  tone: 'success' | 'info' | 'warning';
}

export type EditableRateRow = 'rate' | 'minStay' | 'maxStay' | 'cta' | 'ctd' | 'stopSell';

export interface BulkUpdatePayload {
  startDate: string;
  endDate: string;
  adjustmentPct: number;
  minStay: number | null;
  weekendsOnly: boolean;
}
