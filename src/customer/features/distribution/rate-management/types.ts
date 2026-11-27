export type RateSectionId = 'bar' | 'packages' | 'planner' | 'restrictions' | 'deals' | 'activity';

/** One screen inside a section; a section with several switches between them with tabs. */
export type RateViewId =
  | 'bar'
  | 'yearly'
  | 'packages'
  | 'plans'
  | 'seasonality'
  | 'restrictions'
  | 'mapping'
  | 'bulk'
  | 'deals'
  | 'history';

type RatePlanStatus = 'Active' | 'Inactive' | 'Scheduled';
type SeasonStatus = 'Active' | 'Scheduled' | 'Expired';

export interface RatePlan {
  id: string;
  /** Hex value picked by the user to tell plans apart. */
  color: string;
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

export type SalesChannel = 'Direct' | 'OTA' | 'Agent' | 'BookingEngine' | 'Meta' | 'OTA-B2B';
export type Occupancy = 'Single' | 'Double' | 'Extra Person' | 'Extra Child';

/** Rates changed from their defaults, keyed by channel, category, meal plan, occupancy and day. */
export type RateGrid = Record<string, number>;
