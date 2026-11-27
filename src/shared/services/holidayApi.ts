import { HOLIDAYS } from '../mocks/holidays';
import { requireActivePropertyId, requireProperty } from './propertyAccess';

export interface HolidayRow { date: string; name: string }

/** Holidays of the active property's country, from `from` to `to` inclusive. */
export const holidayApi = {
  list: async (from: string, to: string): Promise<HolidayRow[]> => {
    const { country } = requireProperty(requireActivePropertyId());
    return (HOLIDAYS[country] ?? []).filter((holiday) => holiday.date >= from && holiday.date <= to);
  },
};
