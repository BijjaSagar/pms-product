import { useSyncExternalStore } from 'react';

/*
 * The property's business date as pms-backend reports it. It is set when the session
 * starts and cleared at sign-out, and the reservation and calendar screens follow it.
 */
let businessDate = '';
const listeners = new Set<() => void>();

export function setBusinessDate(next: string): void {
  if (next === businessDate) return;
  businessDate = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** A business date for display, such as "1 November 2026". Empty input gives an empty string. */
export function formatBusinessDate(iso: string): string {
  if (!iso) return '';
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** The business date. Empty until a signed-in property has loaded. */
export function useBusinessDate(): string {
  return useSyncExternalStore(subscribe, () => businessDate, () => businessDate);
}
