import type { RoomStatus } from '../../../types';
import type { Tone } from '../../../theme/tone';
import type { TimelineEvent, TimelineStatus } from '../../../data/roomTimeline';

export const START_HOUR = 8;
export const END_HOUR = 22;
const SPAN = END_HOUR - START_HOUR;

/* Hour ticks along the track, each placed as a percentage of the visible span. */
export const TIME_TICKS = [8, 10, 12, 14, 16, 18, 20, 22].map((hour) => ({
  hour,
  label: formatTick(hour),
  percent: ((hour - START_HOUR) / SPAN) * 100,
}));

export function formatTick(hour: number): string {
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

/* 10.5 reads as 10:30 AM. */
export function formatClock(hour: number): string {
  const whole = Math.floor(hour);
  const minutes = Math.round((hour - whole) * 60);
  const hour12 = whole % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${whole < 12 ? 'AM' : 'PM'}`;
}

/* Left edge and width of a bar, in percent of the track. The 1% gap keeps neighbouring bars apart. */
export function barPlacement(event: TimelineEvent): { left: number; width: number } {
  const left = ((event.startHour - START_HOUR) / SPAN) * 100;
  const width = ((event.endHour - event.startHour) / SPAN) * 100;
  return { left: Math.max(0.5, left), width: Math.min(99, width - 1) };
}

/* Colour family for each timeline status. */
export const EVENT_TONE: Record<TimelineStatus, Tone> = {
  Available: 'success',
  Inspected: 'success',
  Occupied: 'info',
  Arriving: 'info',
  Cleaning: 'info',
  Departing: 'warning',
  Dirty: 'warning',
  Maintenance: 'danger',
  'Out-of-service': 'danger',
};

/* The room status a timeline event implies, so the room filters match what the row shows. */
const TIMELINE_ROOM_STATUS: Record<TimelineStatus, RoomStatus> = {
  Available: 'Available',
  Occupied: 'Occupied',
  Arriving: 'Occupied',
  Departing: 'Occupied',
  Dirty: 'Dirty',
  Cleaning: 'Cleaning',
  Inspected: 'Inspected',
  'Out-of-service': 'Out-of-service',
  Maintenance: 'Out-of-service',
};

export function roomStatusOf(events: TimelineEvent[]): RoomStatus {
  const current = events[0];
  return current ? TIMELINE_ROOM_STATUS[current.status] : 'Available';
}

export function pluralRooms(count: number): string {
  return count === 1 ? '1 room' : `${count} rooms`;
}
