export const MAX_FLOORS = 60;
export const MAX_ROOMS_PER_FLOOR = 99;

/** Parses a count field; anything that is not a whole number from 1 up counts as 0, larger values are capped. */
export const parseCount = (raw: string, max: number): number => {
  const n = Number(raw);
  return raw.trim() !== '' && Number.isInteger(n) && n > 0 ? Math.min(n, max) : 0;
};

/** Hotel-style room number: the 3rd room on floor 4 is 403. */
export const roomNumber = (floor: number, index: number): string => `${floor}${String(index).padStart(2, '0')}`;

export const boxKey = (floor: number, index: number): string => `${floor}-${index}`;
