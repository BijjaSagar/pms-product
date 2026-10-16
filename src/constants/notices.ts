import type { Notice } from '../types';

/**
 * Pre-configured alert notices for the PMS notifications center.
 */
export const NOTICES: Notice[] = [
  { id: 'N-1', title: 'Suite 503 out of service', detail: 'Faucet leak — work order WO-118 in progress.', tone: 'danger', time: '08:55', target: 'status-board' },
  { id: 'N-2', title: '6 VIP arrivals today', detail: 'Amelia Hart (204) expects high floor, quiet side.', tone: 'warning', time: '09:10', target: 'check-in' },
  { id: 'N-3', title: 'INV-3305 overdue', detail: 'Sofia Lind — $1,080 pending since Oct 05.', tone: 'warning', time: '09:30', target: 'invoices' },
  { id: 'N-4', title: 'Card declined on file', detail: 'Daniel Okafor (RSV-9046) — front desk to call.', tone: 'danger', time: '09:45', target: 'reservations' },
  { id: 'N-5', title: 'Room 204 inspected', detail: 'Ready for VIP arrival this afternoon.', tone: 'success', time: '09:25', target: 'room-overview' },
  { id: 'N-6', title: '2 late check-outs approved', detail: '501 until 14:00; 305 until 12:30.', tone: 'info', time: '10:02', target: 'check-out' },
];
