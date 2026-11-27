import { store } from '../mocks/store';

/**
 * Selection-time room holds.
 *
 * Acquiring a hold the moment a room is picked is what stops a second user from
 * choosing — and then losing — the same room-night. The hold expires on its own
 * after ten minutes and is consumed by the reservation that uses it.
 */
export interface DayEnquiryRow {
  id: string;
  date: string;
  guestName: string;
  phone: string;
  detail: string;
}
export interface DayLogSummaryRow {
  hasNote: boolean;
  enquiryCount: number;
}

/** Per-date notes and enquiries shown in the room calendar's date header. */
export const dayLogApi = {
  summary: async (dates: string[]) => store.dayLogSummary(dates),
  note: async (date: string) => store.dayNote(date),
  saveNote: async (date: string, text: string) => store.saveDayNote(date, text),
  enquiries: async (date: string) => store.dayEnquiries(date),
  removeEnquiry: async (id: string) => store.removeDayEnquiry(id),
};
