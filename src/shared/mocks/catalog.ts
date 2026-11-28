import type { GuestRow } from '../services/guestApi';
import type { RoomTypeRow } from '../services/inventoryApi';
import type { PropertyRow } from '../services/propertyApi';

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
  addressLine1: '123 Beach Road, Bandra West',
  city: 'Mumbai',
};

/** A person in the demo store: the signed-in actor, and the pools housekeeping and maintenance work is assigned from. */
export interface InternalUser {
  userId: string;
  email: string;
  fullName: string;
  status: string;
  /** 'housekeeping' and 'maintenance' people can be assigned tasks. */
  baseRoleKey: string;
}

export const USERS: InternalUser[] = [
  { userId: 'u-1', email: 'anaya@grandhorizon.in', fullName: 'Anaya Sharma', status: 'ACTIVE', baseRoleKey: 'owner' },
  { userId: 'u-6', email: 'anita@grandhorizon.in', fullName: 'Anita Desai', status: 'ACTIVE', baseRoleKey: 'housekeeping' },
  { userId: 'u-7', email: 'ramu@grandhorizon.in', fullName: 'Ramu Yadav', status: 'ACTIVE', baseRoleKey: 'housekeeping' },
  { userId: 'u-8', email: 'joseph@grandhorizon.in', fullName: 'Joseph Fernandes', status: 'ACTIVE', baseRoleKey: 'maintenance' },
];

export const ROOM_TYPES: RoomTypeRow[] = [
  { id: 'standard', code: 'STD', name: 'Standard', maxAdults: 2, maxChildren: 1, baseRate: '3500.00', isActive: true },
  { id: 'deluxe', code: 'DLX', name: 'Deluxe', maxAdults: 2, maxChildren: 1, baseRate: '4500.00', isActive: true },
  { id: 'superior', code: 'SUP', name: 'Superior', maxAdults: 3, maxChildren: 1, baseRate: '5500.00', isActive: true },
  { id: 'executive', code: 'EXE', name: 'Executive', maxAdults: 2, maxChildren: 2, baseRate: '6500.00', isActive: true },
  { id: 'family', code: 'FAM', name: 'Family Suite', maxAdults: 4, maxChildren: 2, baseRate: '8000.00', isActive: true },
  { id: 'suite', code: 'STE', name: 'Panorama Suite', maxAdults: 2, maxChildren: 2, baseRate: '12000.00', isActive: true },
];

export interface FloorPlan {
  floor: string;
  wing: string;
  typeId: string;
  start: number;
  count: number;
}

export const FLOOR_PLAN: FloorPlan[] = [
  { floor: '1', wing: 'East Wing', typeId: 'standard', start: 101, count: 5 },
  { floor: '2', wing: 'East Wing', typeId: 'deluxe', start: 201, count: 5 },
  { floor: '3', wing: 'West Wing', typeId: 'executive', start: 301, count: 5 },
];

/** The room currently taken out of service for repairs. */
export const OUT_OF_ORDER_ROOM = '205';

export const GUESTS: GuestRow[] = [
  { id: 'g-1023', firstName: 'Aarav', lastName: 'Iyer', email: 'aarav.iyer@example.com', phone: '+91 98765 43210' },
  { id: 'g-1001', firstName: 'Amelia', lastName: 'Hart', email: 'amelia.hart@example.com', phone: '+44 7700 900123' },
  { id: 'g-1002', firstName: 'Daniel', lastName: 'Okafor', email: 'daniel.okafor@example.com', phone: '+234 803 555 0110' },
  { id: 'g-1003', firstName: 'Sofia', lastName: 'Lind', email: 'sofia.lind@example.com', phone: '+46 70 123 4567' },
  { id: 'g-1004', firstName: 'Wei', lastName: 'Chen', email: 'wei.chen@example.com', phone: '+86 138 0013 8000' },
  { id: 'g-1005', firstName: 'Priya', lastName: 'Menon', email: 'priya.menon@example.com', phone: '+91 99887 76655' },
  { id: 'g-1006', firstName: 'Marcus', lastName: 'Webb', email: 'marcus.webb@example.com', phone: '+61 412 345 678' },
  { id: 'g-1007', firstName: 'Elena', lastName: 'Petrova', email: 'elena.petrova@example.com', phone: '+971 50 123 4567' },
  { id: 'g-1008', firstName: 'Hassan', lastName: 'Al-Farsi', email: 'hassan.alfarsi@example.com', phone: '+968 9123 4567' },
  { id: 'g-1010', firstName: 'Liam', lastName: "O'Connor", email: 'liam.oconnor@example.com', phone: '+353 85 123 4567' },
  { id: 'g-1011', firstName: 'Fatima', lastName: 'Noor', email: 'fatima.noor@example.com', phone: '+92 300 1234567' },
  { id: 'g-1012', firstName: 'Rohit', lastName: 'Sharma', email: 'rohit.sharma@example.com', phone: '+91 90000 12345' },
  { id: 'g-1013', firstName: 'Emily', lastName: 'Carter', email: 'emily.carter@example.com', phone: '+1 212 555 0142' },
  { id: 'g-1015', firstName: 'Isla', lastName: 'Macdonald', email: 'isla.macdonald@example.com', phone: '+44 7700 900456' },
  { id: 'g-1016', firstName: 'Kwame', lastName: 'Mensah', email: 'kwame.mensah@example.com', phone: '+233 24 123 4567' },
  { id: 'g-1017', firstName: 'Nadia', lastName: 'Rahman', email: 'nadia.rahman@example.com', phone: '+880 1712 345678' },
  { id: 'g-1021', firstName: 'Arjun', lastName: 'Kapoor', email: 'arjun.kapoor@example.com', phone: '+91 98800 11223' },
  { id: 'g-1022', firstName: 'Charlotte', lastName: 'Dubois', email: 'charlotte.dubois@example.com', phone: '+33 6 12 34 56 78' },
];
