/* Holidays and hotel events shown on the room calendar, one row per date. Demo seed data. */

export interface CalendarDayEvent {
  date: string; // ISO yyyy-mm-dd
  label: string;
  kind: 'holiday' | 'event';
}

export const CALENDAR_DAY_EVENTS: CalendarDayEvent[] = [
  { date: '2026-10-20', label: 'Dussehra', kind: 'holiday' },
  { date: '2026-11-08', label: 'Diwali', kind: 'holiday' },
  { date: '2026-11-24', label: 'Guru Nanak Jayanti', kind: 'holiday' },
];
