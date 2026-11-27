import { addDaysToIso } from './room-calendar/calendarData';

/*
 * Whether a stay touches the chosen range. Check-out is exclusive, so a stay that ends on the range
 * start does not count. An empty bound leaves that side of the range open.
 */
export function stayOverlapsRange(checkIn: string, checkOut: string, from: string, to: string): boolean {
  if (from && checkOut <= from) return false;
  if (to && checkIn > to) return false;
  return true;
}

/** First day of the month containing an ISO date. */
export function startOfMonthIso(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

export function addMonthsIso(monthStart: string, months: number): string {
  const [year, month] = monthStart.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + months, 1)).toISOString().slice(0, 10);
}

/** Weeks of a month, Monday first. Cells outside the month are null so the grid lines up. */
export function monthWeeks(monthStart: string): (string | null)[][] {
  const first = new Date(`${monthStart}T00:00:00Z`);
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const leadingBlanks = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: leadingBlanks }, () => null);
  for (let offset = 0; offset < daysInMonth; offset += 1) cells.push(addDaysToIso(monthStart, offset));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** e.g. "19 Oct 2026" */
export function formatRangeDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** e.g. "October 2026" */
export function formatMonthTitle(monthStart: string): string {
  return new Date(`${monthStart}T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
