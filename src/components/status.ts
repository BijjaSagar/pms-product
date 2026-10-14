import type { PaymentStatus, ReservationStatus, RoomStatus } from '../data/mock';

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
  }
}

export function roomTone(status: RoomStatus): BadgeTone {
  switch (status) {
    case 'Available':
      return 'success';
    case 'Occupied':
      return 'info';
    case 'Dirty':
      return 'warning';
    case 'Cleaning':
      return 'info';
    case 'Inspected':
      return 'success';
    case 'Out-of-service':
      return 'danger';
  }
}

export function paymentTone(status: PaymentStatus | 'Issued' | 'Draft' | 'Void' | 'Credited'): BadgeTone {
  switch (status) {
    case 'Paid':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Overdue':
      return 'danger';
    case 'Failed':
      return 'danger';
    case 'Refunded':
      return 'neutral';
    case 'Partially refunded':
      return 'warning';
    case 'Issued':
      return 'success';
    case 'Draft':
      return 'warning';
    case 'Void':
    case 'Credited':
      return 'neutral';
  }
}
