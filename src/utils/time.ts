/** "14:00" -> "02:00 PM". Anything that is not a 24-hour time is returned unchanged. */
export function to12Hour(value: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return value;
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(display).padStart(2, '0')}:${match[2]} ${suffix}`;
}

/**
 * "02:00 PM", "2:00pm" or "14:00" -> "14:00" (24-hour HH:mm, what the backend
 * stores). Returns null when the text is not a valid time.
 */
export function to24Hour(value: string): string | null {
  const match = /^(\d{1,2}):([0-5]\d)\s*([AaPp][Mm])?$/.exec(value.trim());
  if (!match) return null;
  let hours = Number(match[1]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem === 'PM' ? 12 : 0);
  } else if (hours > 23) {
    return null;
  }
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
}
