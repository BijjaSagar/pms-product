import type { FolioItemRow, PaymentRow } from '../lib/api/pms';

export const round2 = (n: number): number => Math.round(n * 100) / 100;
export const money = (n: number): string => round2(n).toFixed(2);
export const num = (v: unknown): number => {
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(1, diffDays(checkIn, checkOut));
}

/** Dates (one per night) that a stay spans, excluding the checkout day. */
export function nightDates(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) nights.push(d);
  if (nights.length === 0) nights.push(checkIn);
  return nights;
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function stamp(dateIso: string, hour = 9, minute = 0): string {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${dateIso}T${hh}:${mm}:00Z`;
}

export interface FolioRec {
  id: string;
  folioNo: string;
  reservationId: string;
  status: 'OPEN' | 'CLOSED';
  currencyCode: string;
  guestName: string;
  items: FolioItemRow[];
  payments: PaymentRow[];
}

let idSeq = 5000;
export const nextId = (prefix: string): string => `${prefix}-${++idSeq}`;

export function paymentTotal(payments: PaymentRow[]): number {
  return payments
    .filter((p) => p.status !== 'PENDING' && p.status !== 'FAILED')
    .reduce((sum, p) => sum + num(p.amount) - num(p.refundedAmount ?? 0), 0);
}
