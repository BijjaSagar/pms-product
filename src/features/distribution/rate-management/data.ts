import type { DistributionChannel, RateHistoryEvent, RatePlan, Season } from './types';

export const BUSINESS_DATE = '2026-10-17';
export const INITIAL_RANGE_START = '2026-10-14';
export const ROOM_TYPES = ['Standard', 'Deluxe', 'Superior', 'Executive', 'Family', 'Suite'];

export const INITIAL_RATES = [
  8500, 8500, 9000, 9500, 9500, 8500, 8500, 8500, 9000, 9500, 9500, 8500, 8500, 8500, 8500,
];
export const INITIAL_MIN_STAYS = [1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1];
export const INITIAL_MAX_STAYS = Array.from({ length: 15 }, () => 14);
export const INITIAL_CLOSED_TO_ARRIVAL = [false, false, false, true, true, false, false, false, false, false, true, true, false, false, false];
export const INITIAL_CLOSED_TO_DEPARTURE = [...INITIAL_CLOSED_TO_ARRIVAL];
export const INITIAL_STOP_SELL = Array.from({ length: 15 }, () => false);
export const INITIAL_AVAILABILITY = [15, 15, 12, 8, 8, 15, 15, 15, 12, 8, 8, 15, 15, 15, 15];
export const INITIAL_DEMAND: Array<'Medium' | 'High'> = [
  'Medium', 'Medium', 'High', 'High', 'High', 'Medium', 'Medium', 'Medium', 'High', 'High', 'High', 'Medium', 'Medium', 'Medium', 'Medium',
];

export const INITIAL_RATE_PLANS: RatePlan[] = [
  {
    id: 'bar',
    code: 'BAR',
    name: 'Best Available Rate',
    roomTypes: ['All room types'],
    channels: ['booking', 'expedia', 'airbnb', 'agoda', 'makemytrip', 'goibibo'],
    status: 'Active',
    description: 'Flexible public rate with no booking restrictions.',
    mealPlan: 'Room only',
    cancellationPolicy: 'Free cancellation up to 24 hours',
    adjustmentPct: 0,
  },
  {
    id: 'advance',
    code: 'ADV15',
    name: 'Advance Purchase',
    roomTypes: ['All room types'],
    channels: ['booking', 'expedia', 'agoda', 'makemytrip', 'goibibo'],
    status: 'Active',
    description: 'Non-refundable offer for bookings made at least 14 days ahead.',
    mealPlan: 'Room only',
    cancellationPolicy: 'Non-refundable',
    adjustmentPct: -15,
  },
  {
    id: 'lastminute',
    code: 'LMD10',
    name: 'Last Minute Deal',
    roomTypes: ['Standard', 'Deluxe'],
    channels: ['booking', 'airbnb', 'agoda', 'goibibo'],
    status: 'Active',
    description: 'A short-lead offer for arrivals within the next 48 hours.',
    mealPlan: 'Room only',
    cancellationPolicy: 'Free cancellation up to 6 hours',
    adjustmentPct: -10,
  },
  {
    id: 'corporate',
    code: 'CORP',
    name: 'Corporate Rate',
    roomTypes: ['All room types'],
    channels: ['booking', 'expedia', 'makemytrip'],
    status: 'Inactive',
    description: 'Negotiated pricing for approved corporate accounts.',
    mealPlan: 'Breakfast included',
    cancellationPolicy: 'Free cancellation up to 48 hours',
    adjustmentPct: 0,
  },
  {
    id: 'member',
    code: 'MEM10',
    name: 'Member Discount',
    roomTypes: ['All room types'],
    channels: ['booking', 'expedia', 'airbnb', 'agoda', 'makemytrip', 'goibibo'],
    status: 'Active',
    description: 'Loyalty pricing for eligible members across supported channels.',
    mealPlan: 'Breakfast included',
    cancellationPolicy: 'Free cancellation up to 24 hours',
    adjustmentPct: -10,
  },
  {
    id: 'longstay',
    code: 'LONG',
    name: 'Long Stay Rate',
    roomTypes: ['Executive', 'Family', 'Suite'],
    channels: ['booking', 'expedia', 'airbnb', 'agoda'],
    status: 'Active',
    description: 'Extended-stay package with added guest amenities.',
    mealPlan: 'Breakfast included',
    cancellationPolicy: 'Free cancellation up to 72 hours',
    adjustmentPct: -12,
  },
];

export const INITIAL_SEASONS: Season[] = [
  { id: 'peak', name: 'Peak Season', startDate: '2026-12-20', endDate: '2027-01-10', adjustmentPct: 30, status: 'Active' },
  { id: 'summer', name: 'Summer Holiday', startDate: '2027-04-01', endDate: '2027-06-15', adjustmentPct: 20, status: 'Scheduled' },
  { id: 'monsoon', name: 'Monsoon Special', startDate: '2027-07-01', endDate: '2027-09-15', adjustmentPct: -15, status: 'Scheduled' },
  { id: 'diwali', name: 'Diwali Festive', startDate: '2026-10-20', endDate: '2026-11-10', adjustmentPct: 25, status: 'Scheduled' },
  { id: 'new-year', name: 'New Year', startDate: '2026-12-28', endDate: '2027-01-02', adjustmentPct: 40, status: 'Scheduled' },
];

export const CHANNELS: DistributionChannel[] = [
  { id: 'booking', name: 'Booking.com', abbreviation: 'B.', color: '#003580', description: 'Global accommodation marketplace', lastSync: '2 min ago' },
  { id: 'expedia', name: 'Expedia', abbreviation: 'e', color: '#FFCC00', description: 'Expedia Group distribution', lastSync: '4 min ago' },
  { id: 'airbnb', name: 'Airbnb', abbreviation: 'A', color: '#FF5A5F', description: 'Short-stay and vacation rentals', lastSync: '6 min ago' },
  { id: 'agoda', name: 'Agoda', abbreviation: 'a', color: '#0B72E7', description: 'Asia-Pacific travel marketplace', lastSync: '8 min ago' },
  { id: 'makemytrip', name: 'MakeMyTrip', abbreviation: 'M', color: '#E53935', description: 'Indian travel marketplace', lastSync: '11 min ago' },
  { id: 'goibibo', name: 'Goibibo', abbreviation: 'g', color: '#F36B21', description: 'Indian hotel and travel bookings', lastSync: '13 min ago' },
];

export const INITIAL_HISTORY: RateHistoryEvent[] = [
  { id: 'h-1', title: 'Weekend BAR rates updated', detail: 'Deluxe · 3 dates · synced to 6 channels', user: 'Anaya Sharma', timestamp: 'Today, 11:20 AM', tone: 'success' },
  { id: 'h-2', title: 'Diwali Festive season scheduled', detail: 'Oct 20 – Nov 10 · +25%', user: 'Anaya Sharma', timestamp: 'Today, 10:42 AM', tone: 'info' },
  { id: 'h-3', title: 'Advance Purchase paused on Airbnb', detail: 'Channel mapping changed', user: 'Rohan Mehta', timestamp: 'Yesterday, 4:18 PM', tone: 'warning' },
  { id: 'h-4', title: 'Member Discount plan created', detail: 'All room types · 6 channels', user: 'Anaya Sharma', timestamp: 'Oct 15, 2026 · 2:05 PM', tone: 'success' },
];

export function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildDateRange(startDate: string, length = 15) {
  return Array.from({ length }, (_, index) => {
    const iso = shiftDate(startDate, index);
    const date = new Date(`${iso}T12:00:00Z`);
    return {
      iso,
      day: String(date.getUTCDate()).padStart(2, '0'),
      month: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      isWeekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
    };
  });
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  const format = (date: Date, includeYear: boolean) => date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
  return `${format(start, false)} – ${format(end, true)}`;
}

export function formatSeasonPeriod(startDate: string, endDate: string): string {
  const format = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
  return `${format(startDate)} – ${format(endDate)}`;
}
