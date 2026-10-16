// Backward-compatibility facade for mock dataset references.
// Canonical types live in src/types/index.ts, notices in src/constants/notices.ts,
// and accounting calculations in src/utils/folio.ts.

export type {
  ReservationStatus,
  RoomStatus,
  HkStatus,
  PaymentStatus,
  FolioStatus,
  MaintenanceStatus,
  MaintenancePriority,
  RoomType,
  Reservation,
  Room,
  Guest,
  HousekeepingTask,
  Invoice,
  FolioCharge,
  FolioPayment,
  Folio,
  Payment,
  MaintenanceRequest,
  Notice,
} from '../types';

export { NOTICES } from '../constants/notices';
export { folioSubtotal, folioTotal, folioPaid, folioBalance } from '../utils/folio';
