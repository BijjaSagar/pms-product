/*
 * The frontend's permission keys (data/catalog.ts) and the backend's permission
 * codes (pms-backend access/rbac.ts) were named independently. This table says
 * which backend codes grant each frontend key. A key is granted when the user
 * holds any one of its codes.
 */
const FRONTEND_TO_BACKEND: Record<string, string[]> = {
  'dashboard.read': ['dashboard.read'],
  'reservation.read': ['reservation.read'],
  'reservation.create': ['reservation.create'],
  'reservation.update': ['reservation.update'],
  'reservation.cancel': ['reservation.cancel'],
  'stay.check-in': ['reservation.checkin'],
  'stay.check-out': ['reservation.checkout'],
  'stay.extend': ['reservation.update'],
  'guest.read': ['guest.read'],
  'guest.create': ['guest.create'],
  'guest.update': ['guest.update'],
  'room.read': ['room.read'],
  'room.create': ['room.manage'],
  'room.update': ['room.manage', 'room.status.update'],
  'housekeeping.read': ['housekeeping.task.read'],
  'housekeeping.assign': ['housekeeping.task.assign'],
  'housekeeping.complete': ['housekeeping.task.update'],
  'maintenance.read': ['maintenance.read'],
  'maintenance.create': ['maintenance.create'],
  'maintenance.assign': ['maintenance.manage'],
  'maintenance.resolve': ['maintenance.manage'],
  'folio.read': ['folio.read'],
  'folio.update': ['folio.post'],
  'payment.read': ['payment.read'],
  'payment.record': ['payment.record'],
  'payment.refund': ['payment.refund'],
  'invoice.read': ['invoice.read'],
  'invoice.issue': ['invoice.issue'],
  'night-audit.read': ['night_audit.read'],
  'night-audit.run': ['night_audit.run'],
  'night-audit.approve': ['night_audit.close_day'],
  'report.read.operations': ['report.read'],
  'report.read.financial': ['report.read'],
  'report.export': ['report.export'],
  'audit-log.read': ['audit.read'],
  'audit-log.export': ['data.export'],
  'property.read': ['property.read'],
  'property.update': ['property.update'],
  'user.read': ['user.read'],
  'user.invite': ['user.create'],
  'user.update': ['user.update'],
  'user.deactivate': ['user.deactivate'],
  'role.read': ['role.read'],
  'role.assign': ['user.assign_role'],
  'role.manage': ['role.update'],
  'theme.update': ['property.update'],
};

/** Turns the backend's permission codes for one property into the frontend's keys. */
export function toFrontendPermissions(backendCodes: readonly string[]): string[] {
  const held = new Set(backendCodes);
  return Object.entries(FRONTEND_TO_BACKEND)
    .filter(([, codes]) => codes.some((code) => held.has(code)))
    .map(([key]) => key);
}

/** "HOTEL_ADMIN" -> "Hotel Admin", for the role badge in the header. */
export function roleLabel(roleCode: string): string {
  return roleCode
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
