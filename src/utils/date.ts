/**
 * Today at the hotel (India time) as YYYY-MM-DD: the same day the backend
 * uses for arrivals, departures and "no check-in in the past".
 */
export function hotelTodayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Shifts an ISO date (YYYY-MM-DD) by whole days, computed in UTC. */
export function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
