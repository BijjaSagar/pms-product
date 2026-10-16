import type { Folio } from '../types';

/**
 * Common accounting and balance calculation helpers for Folios.
 */

export function folioSubtotal(f: Folio): number {
  return f.charges.reduce((s, c) => s + c.amount, 0);
}

export function folioTotal(f: Folio): number {
  return folioSubtotal(f) + f.tax - f.discount;
}

export function folioPaid(f: Folio): number {
  return f.payments.reduce((s, p) => s + p.amount, 0);
}

export function folioBalance(f: Folio): number {
  return folioTotal(f) - folioPaid(f);
}
