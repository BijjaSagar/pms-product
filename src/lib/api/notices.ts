import type { Notice } from '../../types';
import { frontDeskApi, inventoryApi } from './pms';

/**
 * Notification centre items, built from the store so they always agree with the rooms and
 * stays on screen. A notice appears only when the store has something to report.
 */
export async function loadNotices(): Promise<Notice[]> {
  const [rooms, arrivals] = await Promise.all([
    inventoryApi.rooms(),
    frontDeskApi.arrivals().catch(() => ({ data: [] })),
  ]);
  const notices: Notice[] = [];

  for (const room of rooms.filter((item) => item.status === 'OUT_OF_ORDER')) {
    notices.push({
      id: `out-of-order-${room.roomNumber}`,
      title: `Room ${room.roomNumber} out of service`,
      detail: room.outOfOrderReason ?? 'No reason recorded.',
      tone: 'danger',
      time: '',
      target: 'status-board',
    });
  }

  const inspected = rooms.filter((item) => item.status === 'INSPECTED');
  if (inspected.length > 0) {
    notices.push({
      id: 'rooms-inspected',
      title: `${inspected.length} room${inspected.length === 1 ? '' : 's'} inspected`,
      detail: inspected.map((room) => room.roomNumber).join(', '),
      tone: 'success',
      time: '',
      target: 'room-overview',
    });
  }

  const arrivalRows = arrivals.data;
  if (arrivalRows.length > 0) {
    notices.push({
      id: 'arrivals-today',
      title: `${arrivalRows.length} arrival${arrivalRows.length === 1 ? '' : 's'} today`,
      detail: arrivalRows.map((stay) => stay.guestName ?? stay.bookingCode ?? 'Guest').join(', '),
      tone: 'info',
      time: '',
      target: 'reservations',
    });
  }

  return notices;
}
