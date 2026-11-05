export type ChannelStatus = 'connected' | 'error' | 'paused';
export type ChannelTabId = 'inventory' | 'rates' | 'restrictions' | 'mapping' | 'promotions';
export type BookingStatus = 'Confirmed' | 'Pending' | 'Cancelled';

export interface Channel {
  id: string;
  name: string;
  code: string;
  logoBg: string;
  logoText: string;
  logoColor?: string;
  status: ChannelStatus;
  lastSync: string;
  activeRooms: number;
  bookingsMtd: number;
  syncSuccess: number;
  errorDetail?: string;
}

export interface ChannelProvider {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  logoColor?: string;
}

export interface ChannelBooking {
  id: string;
  channelId: string;
  guestName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
}

export interface ChannelPerformance {
  channelId: string;
  bookings: number;
  roomNights: number;
  revenue: number;
}

export interface RateMapping {
  id: string;
  channelId: string;
  roomType: string;
  ratePlan: string;
  externalCode: string;
  status: 'Mapped' | 'Needs review';
}

export interface InventoryDate {
  iso: string;
  day: string;
  month: string;
  weekday: string;
  isWeekend: boolean;
}

export interface InventoryRow {
  roomType: string;
  totalRooms: number;
  availability: number[];
}

export interface ChannelLog {
  id: string;
  time: string;
  channelId: string;
  event: string;
  status: 'Success' | 'Failed' | 'Running';
  detail: string;
}

export interface SyncSettings {
  availability: boolean;
  rates: boolean;
  restrictions: boolean;
  minStay: boolean;
  stopSell: boolean;
  autoSync: boolean;
  timeZone: string;
  defaultMarkup: string;
}

export interface InventorySelection {
  roomType: string;
  date: InventoryDate;
  available: number;
  total: number;
}
