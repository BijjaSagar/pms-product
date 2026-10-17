import type { GuestRow, PropertyRow, RoomTypeRow, TaxRuleRow, UserRow } from '../lib/api/pms';

/** The single fixed business date the entire static demo revolves around. */
export const BUSINESS_DATE = '2026-10-17';
export const TAX_RATE = 0.12;

export const PROPERTY: PropertyRow = {
  id: 'prop-1',
  name: 'The Grand Horizon Hotel',
  slug: 'grand-horizon',
  timezone: 'Asia/Kolkata',
  currencyCode: 'INR',
  countryCode: 'IN',
  checkInTime: '14:00',
  checkOutTime: '12:00',
  addressLine1: '123 Beach Road, Bandra West',
  city: 'Mumbai',
};

export interface PermissionDef {
  key: string;
  resource: string;
  action: string;
  description: string;
}

export const PERMISSION_CATALOG: PermissionDef[] = [
  { key: 'dashboard.read', resource: 'Dashboard', action: 'read', description: 'View the operational dashboard' },
  { key: 'reservation.read', resource: 'Reservations', action: 'read', description: 'View reservations and the calendar' },
  { key: 'reservation.create', resource: 'Reservations', action: 'create', description: 'Create reservations and walk-ins' },
  { key: 'reservation.update', resource: 'Reservations', action: 'update', description: 'Amend reservation dates and details' },
  { key: 'reservation.cancel', resource: 'Reservations', action: 'cancel', description: 'Cancel a reservation' },
  { key: 'stay.check-in', resource: 'Front Desk', action: 'check-in', description: 'Check guests in' },
  { key: 'stay.check-out', resource: 'Front Desk', action: 'check-out', description: 'Check guests out' },
  { key: 'stay.extend', resource: 'Front Desk', action: 'extend', description: 'Extend an in-house stay' },
  { key: 'guest.read', resource: 'Guests', action: 'read', description: 'View guest profiles' },
  { key: 'guest.create', resource: 'Guests', action: 'create', description: 'Create guest profiles' },
  { key: 'guest.update', resource: 'Guests', action: 'update', description: 'Update guest profiles' },
  { key: 'room.read', resource: 'Rooms', action: 'read', description: 'View rooms and inventory' },
  { key: 'room.create', resource: 'Rooms', action: 'create', description: 'Create rooms and room types' },
  { key: 'room.update', resource: 'Rooms', action: 'update', description: 'Update room status and details' },
  { key: 'housekeeping.read', resource: 'Housekeeping', action: 'read', description: 'View housekeeping tasks' },
  { key: 'housekeeping.assign', resource: 'Housekeeping', action: 'assign', description: 'Assign housekeeping tasks' },
  { key: 'housekeeping.complete', resource: 'Housekeeping', action: 'complete', description: 'Progress and complete cleaning tasks' },
  { key: 'maintenance.read', resource: 'Maintenance', action: 'read', description: 'View maintenance tickets' },
  { key: 'maintenance.create', resource: 'Maintenance', action: 'create', description: 'Raise maintenance tickets' },
  { key: 'maintenance.assign', resource: 'Maintenance', action: 'assign', description: 'Assign maintenance tickets' },
  { key: 'maintenance.resolve', resource: 'Maintenance', action: 'resolve', description: 'Resolve and close tickets' },
  { key: 'folio.read', resource: 'Folios', action: 'read', description: 'View folios and balances' },
  { key: 'folio.update', resource: 'Folios', action: 'update', description: 'Post charges and settle folios' },
  { key: 'payment.read', resource: 'Payments', action: 'read', description: 'View the payments ledger' },
  { key: 'payment.record', resource: 'Payments', action: 'record', description: 'Record payments' },
  { key: 'payment.refund', resource: 'Payments', action: 'refund', description: 'Refund payments' },
  { key: 'invoice.read', resource: 'Invoices', action: 'read', description: 'View invoices' },
  { key: 'invoice.issue', resource: 'Invoices', action: 'issue', description: 'Issue and void invoices' },
  { key: 'night-audit.read', resource: 'Night Audit', action: 'read', description: 'View night audit status' },
  { key: 'night-audit.run', resource: 'Night Audit', action: 'run', description: 'Run night audit previews' },
  { key: 'night-audit.approve', resource: 'Night Audit', action: 'approve', description: 'Close or reopen business dates' },
  { key: 'report.read.operations', resource: 'Reports', action: 'read-operations', description: 'View operational reports' },
  { key: 'report.read.financial', resource: 'Reports', action: 'read-financial', description: 'View financial reports' },
  { key: 'report.export', resource: 'Reports', action: 'export', description: 'Export report data as CSV' },
  { key: 'audit-log.read', resource: 'Audit Log', action: 'read', description: 'View the audit log' },
  { key: 'audit-log.export', resource: 'Audit Log', action: 'export', description: 'Export the audit log' },
  { key: 'property.read', resource: 'Properties', action: 'read', description: 'View property settings' },
  { key: 'property.update', resource: 'Properties', action: 'update', description: 'Update property settings' },
  { key: 'user.read', resource: 'Staff', action: 'read', description: 'View staff and roles' },
  { key: 'user.invite', resource: 'Staff', action: 'invite', description: 'Invite staff members' },
  { key: 'user.update', resource: 'Staff', action: 'update', description: 'Update staff members' },
  { key: 'user.deactivate', resource: 'Staff', action: 'deactivate', description: 'Disable staff members' },
  { key: 'role.read', resource: 'Roles', action: 'read', description: 'View roles and permissions' },
  { key: 'role.assign', resource: 'Roles', action: 'assign', description: 'Assign roles to staff' },
  { key: 'role.manage', resource: 'Roles', action: 'manage', description: 'Manage the role matrix' },
  { key: 'theme.update', resource: 'Appearance', action: 'update', description: 'Change the property appearance' },
];

export const ALL_PERMISSIONS: string[] = PERMISSION_CATALOG.map((p) => p.key);

type RoleKey = 'owner' | 'admin' | 'manager' | 'front_desk' | 'housekeeping' | 'maintenance' | 'accountant';

export interface RoleDef {
  id: string;
  key: RoleKey;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
  permissions: string[];
}

const FRONT_DESK_PERMS = [
  'dashboard.read', 'reservation.read', 'reservation.create', 'reservation.update',
  'stay.check-in', 'stay.check-out', 'stay.extend',
  'guest.read', 'guest.create', 'guest.update', 'room.read', 'housekeeping.read',
  'folio.read', 'folio.update', 'payment.read', 'payment.record', 'invoice.read',
  'report.read.operations', 'property.read',
];

export const ROLE_DEFS: RoleDef[] = [
  {
    id: 'role-owner', key: 'owner', name: 'Owner', description: 'Full access to every module.',
    isSystem: true, isActive: true, permissions: ALL_PERMISSIONS,
  },
  {
    id: 'role-admin', key: 'admin', name: 'Administrator', description: 'Manages the property day to day.',
    isSystem: true, isActive: true, permissions: ALL_PERMISSIONS.filter((p) => p !== 'role.manage'),
  },
  {
    id: 'role-manager', key: 'manager', name: 'General Manager', description: 'Oversees front office, rooms and reporting.',
    isSystem: true, isActive: true,
    permissions: [
      ...FRONT_DESK_PERMS,
      'reservation.cancel', 'housekeeping.assign', 'housekeeping.complete',
      'maintenance.read', 'maintenance.create', 'maintenance.assign', 'maintenance.resolve',
      'payment.refund', 'invoice.issue', 'night-audit.read', 'night-audit.run',
      'report.read.financial', 'report.export', 'audit-log.read', 'user.read', 'role.read', 'property.update', 'theme.update',
    ],
  },
  {
    id: 'role-front-desk', key: 'front_desk', name: 'Front Desk Agent', description: 'Handles arrivals, departures and guest requests.',
    isSystem: true, isActive: true, permissions: [...FRONT_DESK_PERMS, 'reservation.cancel', 'housekeeping.complete'],
  },
  {
    id: 'role-housekeeping', key: 'housekeeping', name: 'Housekeeping Attendant', description: 'Cleans and inspects rooms.',
    isSystem: true, isActive: true,
    permissions: ['dashboard.read', 'room.read', 'housekeeping.read', 'housekeeping.complete', 'maintenance.read', 'maintenance.create'],
  },
  {
    id: 'role-maintenance', key: 'maintenance', name: 'Maintenance Technician', description: 'Resolves room and facility faults.',
    isSystem: true, isActive: true,
    permissions: ['dashboard.read', 'room.read', 'housekeeping.read', 'maintenance.read', 'maintenance.create', 'maintenance.resolve'],
  },
  {
    id: 'role-accountant', key: 'accountant', name: 'Accountant', description: 'Owns folios, payments, invoices and financial reporting.',
    isSystem: true, isActive: true,
    permissions: [
      'dashboard.read', 'folio.read', 'folio.update', 'payment.read', 'payment.refund',
      'invoice.read', 'invoice.issue', 'night-audit.read', 'report.read.operations',
      'report.read.financial', 'report.export', 'audit-log.read', 'audit-log.export', 'property.read',
    ],
  },
];

export interface InternalUser extends UserRow {
  /** Used to resolve a member's role for the current property. */
  baseRoleKey: RoleKey;
}

export const USERS: InternalUser[] = [
  { userId: 'u-1', email: 'anaya@grandhorizon.in', fullName: 'Anaya Sharma', status: 'ACTIVE', lastLoginAt: `${BUSINESS_DATE} 07:42`, membershipActive: true, invitePending: false, inviteExpired: false, propertyId: 'prop-1', roleKey: 'owner', roleName: 'Owner', baseRoleKey: 'owner' },
  { userId: 'u-2', email: 'rohan@grandhorizon.in', fullName: 'Rohan Mehta', status: 'ACTIVE', lastLoginAt: `${BUSINESS_DATE} 06:15`, membershipActive: true, invitePending: false, inviteExpired: false, propertyId: 'prop-1', roleKey: 'admin', roleName: 'Administrator', baseRoleKey: 'admin' },
  { userId: 'u-3', email: 'sara@grandhorizon.in', fullName: 'Sara Khan', status: 'ACTIVE', lastLoginAt: '2026-10-16 20:03', membershipActive: true, invitePending: false, inviteExpired: false, propertyId: 'prop-1', roleKey: 'manager', roleName: 'General Manager', baseRoleKey: 'manager' },
  { userId: 'u-4', email: 'vikram@grandhorizon.in', fullName: 'Vikram Rao', status: 'ACTIVE', lastLoginAt: `${BUSINESS_DATE} 05:58`, membershipActive: true, invitePending: false, inviteExpired: false, propertyId: 'prop-1', roleKey: 'front_desk', roleName: 'Front Desk Agent', baseRoleKey: 'front_desk' },
  { userId: 'u-5', email: 'neha@grandhorizon.in', fullName: 'Neha Gupta', status: 'ACTIVE', lastLoginAt: '2026-10-16 22:31', membershipActive: true, invitePending: false, inviteExpired: false, propertyId: 'prop-1', roleKey: 'front_desk', roleName: 'Front Desk Agent', baseRoleKey: 'front_desk' },
  { userId: 'u-6', email: 'anita@grandhorizon.in', fullName: 'Anita Desai', status: 'ACTIVE', lastLoginAt: `${BUSINESS_DATE} 06:40`, membershipActive: true, invitePending: false, inviteExpired: false, propertyId: 'prop-1', roleKey: 'housekeeping', roleName: 'Housekeeping Attendant', baseRoleKey: 'housekeeping' },
  { userId: 'u-7', email: 'ramu@grandhorizon.in', fullName: 'Ramu Yadav', status: 'ACTIVE', lastLoginAt: '2026-10-16 18:12', membershipActive: true, invitePending: false, inviteExpired: false, propertyId: 'prop-1', roleKey: 'housekeeping', roleName: 'Housekeeping Attendant', baseRoleKey: 'housekeeping' },
  { userId: 'u-8', email: 'joseph@grandhorizon.in', fullName: 'Joseph Fernandes', status: 'ACTIVE', lastLoginAt: '2026-10-16 16:47', membershipActive: true, invitePending: false, inviteExpired: false, propertyId: 'prop-1', roleKey: 'maintenance', roleName: 'Maintenance Technician', baseRoleKey: 'maintenance' },
  { userId: 'u-9', email: 'meera@grandhorizon.in', fullName: 'Meera Joshi', status: 'INVITED', lastLoginAt: null, membershipActive: false, invitePending: true, inviteExpired: false, propertyId: 'prop-1', roleKey: 'accountant', roleName: 'Accountant', baseRoleKey: 'accountant' },
];

export const CURRENT_USER_ID = 'u-1';

export const TAX_RULES: TaxRuleRow[] = [
  { id: 'tax-gst', code: 'GST', name: 'Goods & Services Tax', ratePercent: '12.00', appliesTo: 'ALL', isInclusive: false, isActive: true },
  { id: 'tax-luxury', code: 'LUXURY', name: 'Luxury Tax', ratePercent: '2.00', appliesTo: 'ROOMS', isInclusive: false, isActive: false },
];

export const ROOM_TYPES: RoomTypeRow[] = [
  { id: 'standard', code: 'STD', name: 'Standard', description: 'Compact comfort room with a city view.', maxAdults: 2, maxChildren: 1, baseRate: '3500.00', amenities: ['City view', 'Queen bed', 'Free Wi-Fi', '24 m²'], isActive: true },
  { id: 'deluxe', code: 'DLX', name: 'Deluxe', description: 'Spacious modern room with a king or twin beds.', maxAdults: 2, maxChildren: 1, baseRate: '4500.00', amenities: ['City view', 'King / Twin beds', 'Free Wi-Fi', '28 m²'], isActive: true },
  { id: 'superior', code: 'SUP', name: 'Superior', description: 'Higher-floor room with premium amenities.', maxAdults: 3, maxChildren: 1, baseRate: '5500.00', amenities: ['Sea view', 'King bed', 'Lounge access', '34 m²'], isActive: true },
  { id: 'executive', code: 'EXE', name: 'Executive', description: 'Executive room with a dedicated workspace.', maxAdults: 2, maxChildren: 2, baseRate: '6500.00', amenities: ['City view', 'King bed', 'Work desk', 'Lounge access', '38 m²'], isActive: true },
  { id: 'family', code: 'FAM', name: 'Family Suite', description: 'Two-room suite ideal for families.', maxAdults: 4, maxChildren: 2, baseRate: '8000.00', amenities: ['Two bedrooms', 'Living area', 'Kitchenette', '52 m²'], isActive: true },
  { id: 'suite', code: 'STE', name: 'Panorama Suite', description: 'Top-floor suite with panoramic views.', maxAdults: 2, maxChildren: 2, baseRate: '12000.00', amenities: ['Panoramic view', 'King bed', 'Butler service', 'Dining area', '68 m²'], isActive: true },
];

export interface FloorPlan {
  floor: string;
  wing: string;
  typeId: string;
  start: number;
  count: number;
}

export const FLOOR_PLAN: FloorPlan[] = [
  { floor: '1', wing: 'East Wing', typeId: 'standard', start: 101, count: 10 },
  { floor: '2', wing: 'East Wing', typeId: 'deluxe', start: 201, count: 10 },
  { floor: '3', wing: 'West Wing', typeId: 'deluxe', start: 301, count: 10 },
  { floor: '4', wing: 'West Wing', typeId: 'superior', start: 401, count: 8 },
  { floor: '5', wing: 'West Wing', typeId: 'executive', start: 501, count: 6 },
  { floor: '6', wing: 'East Wing', typeId: 'family', start: 601, count: 4 },
  { floor: '7', wing: 'West Wing', typeId: 'suite', start: 701, count: 2 },
];

/** The room currently taken out of service for repairs. */
export const OUT_OF_ORDER_ROOM = '208';

export const GUESTS: GuestRow[] = [
  { id: 'g-1023', firstName: 'Aarav', lastName: 'Iyer', email: 'aarav.iyer@example.com', phone: '+91 98765 43210', companyName: 'TechCorp Solutions', city: 'Mumbai', countryCode: 'IN', preferences: 'High floor, king bed, late check-out', internalNotes: 'Frequent business traveller, prefers a quiet room.', stayCount: 7, lastStayAt: '2026-10-17' },
  { id: 'g-1001', firstName: 'Amelia', lastName: 'Hart', email: 'amelia.hart@example.com', phone: '+44 7700 900123', companyName: null, city: 'London', countryCode: 'GB', preferences: 'Twin beds', internalNotes: null, stayCount: 3, lastStayAt: '2026-10-17' },
  { id: 'g-1002', firstName: 'Daniel', lastName: 'Okafor', email: 'daniel.okafor@example.com', phone: '+234 803 555 0110', companyName: 'Lagos Ventures', city: 'Lagos', countryCode: 'NG', preferences: 'Early check-in', internalNotes: null, stayCount: 2, lastStayAt: '2026-10-17' },
  { id: 'g-1003', firstName: 'Sofia', lastName: 'Lind', email: 'sofia.lind@example.com', phone: '+46 70 123 4567', companyName: null, city: 'Stockholm', countryCode: 'SE', preferences: 'Non-smoking', internalNotes: null, stayCount: 1, lastStayAt: '2026-10-17' },
  { id: 'g-1004', firstName: 'Wei', lastName: 'Chen', email: 'wei.chen@example.com', phone: '+86 138 0013 8000', companyName: 'Global Trade Co', city: 'Shanghai', countryCode: 'CN', preferences: 'High floor, vegetarian meals', internalNotes: 'Corporate rate agreed through Global Trade Co.', stayCount: 12, lastStayAt: '2026-10-17' },
  { id: 'g-1005', firstName: 'Priya', lastName: 'Menon', email: 'priya.menon@example.com', phone: '+91 99887 76655', companyName: null, city: 'Kochi', countryCode: 'IN', preferences: 'Extra pillows', internalNotes: null, stayCount: 4, lastStayAt: '2026-10-17' },
  { id: 'g-1006', firstName: 'Marcus', lastName: 'Webb', email: 'marcus.webb@example.com', phone: '+61 412 345 678', companyName: null, city: 'Sydney', countryCode: 'AU', preferences: 'Late arrival', internalNotes: null, stayCount: 2, lastStayAt: '2026-10-17' },
  { id: 'g-1007', firstName: 'Elena', lastName: 'Petrova', email: 'elena.petrova@example.com', phone: '+971 50 123 4567', companyName: 'Petrova Holdings', city: 'Dubai', countryCode: 'AE', preferences: 'Suite with a view', internalNotes: 'VIP — always welcome with a fruit platter.', stayCount: 9, lastStayAt: '2026-10-17' },
  { id: 'g-1008', firstName: 'Hassan', lastName: 'Al-Farsi', email: 'hassan.alfarsi@example.com', phone: '+968 9123 4567', companyName: 'Muscat Shipping', city: 'Muscat', countryCode: 'OM', preferences: 'Prayer mat in room', internalNotes: null, stayCount: 5, lastStayAt: '2026-10-17' },
  { id: 'g-1009', firstName: 'Grace', lastName: 'Kim', email: 'grace.kim@example.com', phone: '+82 10 1234 5678', companyName: null, city: 'Seoul', countryCode: 'KR', preferences: 'Quiet room away from the lift', internalNotes: null, stayCount: 3, lastStayAt: '2026-10-17' },
  { id: 'g-1010', firstName: 'Liam', lastName: "O'Connor", email: 'liam.oconnor@example.com', phone: '+353 85 123 4567', companyName: null, city: 'Dublin', countryCode: 'IE', preferences: 'Twin beds', internalNotes: null, stayCount: 1, lastStayAt: '2026-10-15' },
  { id: 'g-1011', firstName: 'Fatima', lastName: 'Noor', email: 'fatima.noor@example.com', phone: '+92 300 1234567', companyName: 'Karachi Textiles', city: 'Karachi', countryCode: 'PK', preferences: 'Family room', internalNotes: null, stayCount: 6, lastStayAt: '2026-10-17' },
  { id: 'g-1012', firstName: 'Rohit', lastName: 'Sharma', email: 'rohit.sharma@example.com', phone: '+91 90000 12345', companyName: 'Sharma & Co', city: 'Delhi', countryCode: 'IN', preferences: 'Airport pickup', internalNotes: null, stayCount: 2, lastStayAt: '2026-10-17' },
  { id: 'g-1013', firstName: 'Emily', lastName: 'Carter', email: 'emily.carter@example.com', phone: '+1 212 555 0142', companyName: 'Carter Media', city: 'New York', countryCode: 'US', preferences: 'Late check-out', internalNotes: 'Frequent guest, always books the Executive floor.', stayCount: 15, lastStayAt: '2026-10-17' },
  { id: 'g-1014', firstName: 'Tatsuya', lastName: 'Sato', email: 'tatsuya.sato@example.com', phone: '+81 90 1234 5678', companyName: null, city: 'Tokyo', countryCode: 'JP', preferences: 'Green tea in room', internalNotes: null, stayCount: 4, lastStayAt: '2026-10-17' },
  { id: 'g-1015', firstName: 'Isla', lastName: 'Macdonald', email: 'isla.macdonald@example.com', phone: '+44 7700 900456', companyName: null, city: 'Edinburgh', countryCode: 'GB', preferences: 'Extra blanket', internalNotes: null, stayCount: 2, lastStayAt: '2026-10-17' },
  { id: 'g-1016', firstName: 'Kwame', lastName: 'Mensah', email: 'kwame.mensah@example.com', phone: '+233 24 123 4567', companyName: 'Accra Gold', city: 'Accra', countryCode: 'GH', preferences: 'High floor', internalNotes: null, stayCount: 3, lastStayAt: '2026-10-17' },
  { id: 'g-1017', firstName: 'Nadia', lastName: 'Rahman', email: 'nadia.rahman@example.com', phone: '+880 1712 345678', companyName: null, city: 'Dhaka', countryCode: 'BD', preferences: 'Connecting rooms', internalNotes: null, stayCount: 2, lastStayAt: '2026-10-17' },
  { id: 'g-1018', firstName: 'Carlos', lastName: 'Mendes', email: 'carlos.mendes@example.com', phone: '+351 912 345 678', companyName: null, city: 'Lisbon', countryCode: 'PT', preferences: 'Non-smoking', internalNotes: null, stayCount: 1, lastStayAt: '2026-10-17' },
  { id: 'g-1019', firstName: 'Yuki', lastName: 'Tanaka', email: 'yuki.tanaka@example.com', phone: '+81 80 9876 5432', companyName: 'Osaka Electronics', city: 'Osaka', countryCode: 'JP', preferences: 'Suite, high floor', internalNotes: null, stayCount: 8, lastStayAt: '2026-10-17' },
  { id: 'g-1020', firstName: 'Olivia', lastName: 'Brown', email: 'olivia.brown@example.com', phone: '+1 416 555 0119', companyName: null, city: 'Toronto', countryCode: 'CA', preferences: 'Early check-in', internalNotes: null, stayCount: 3, lastStayAt: '2026-10-17' },
  { id: 'g-1021', firstName: 'Arjun', lastName: 'Kapoor', email: 'arjun.kapoor@example.com', phone: '+91 98800 11223', companyName: 'Kapoor Exports', city: 'Bengaluru', countryCode: 'IN', preferences: 'Quiet room', internalNotes: null, stayCount: 5, lastStayAt: '2026-10-17' },
  { id: 'g-1022', firstName: 'Charlotte', lastName: 'Dubois', email: 'charlotte.dubois@example.com', phone: '+33 6 12 34 56 78', companyName: null, city: 'Paris', countryCode: 'FR', preferences: 'City view', internalNotes: null, stayCount: 2, lastStayAt: '2026-10-17' },
];
