import type { HolidayRow } from '../services/holidayApi';

/** Public holidays by country name, as stored on the property. */
export const HOLIDAYS: Record<string, HolidayRow[]> = {
  India: [
    { date: '2026-10-02', name: 'Gandhi Jayanti' },
    { date: '2026-10-20', name: 'Dussehra' },
    { date: '2026-10-26', name: 'Maharishi Valmiki Jayanti' },
    { date: '2026-11-08', name: 'Diwali' },
    { date: '2026-11-24', name: 'Guru Nanak Jayanti' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2027-01-26', name: 'Republic Day' },
  ],
};
