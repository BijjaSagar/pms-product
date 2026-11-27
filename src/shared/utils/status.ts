import type { PaymentStatus, ReservationStatus } from '../types/index';

export type BadgeTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export function reservationTone(status: ReservationStatus): BadgeTone {
  switch (status) {
    case 'Confirmed':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Checked-in':
      return 'info';
    case 'Checked-out':
      return 'neutral';
    case 'Cancelled':
      return 'danger';
    case 'No-show':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function paymentTone(status: PaymentStatus | 'Issued' | 'Draft' | 'Void' | 'Credited'): BadgeTone {
  switch (status) {
    case 'Paid':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Overdue':
    case 'Failed':
      return 'danger';
    case 'Refunded':
    case 'Void':
    case 'Credited':
      return 'neutral';
    case 'Partially refunded':
    case 'Draft':
      return 'warning';
    case 'Issued':
      return 'success';
  }
}
