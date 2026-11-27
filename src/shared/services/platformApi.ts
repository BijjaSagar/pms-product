import { accounts, properties, propertyCreatedAt, signIns } from '../mocks/platform';
import { propertySettings } from '../mocks/propertySettings';
import { store } from '../mocks/store';
import type { UserRoleKey } from './authApi';
import { requireSuperAdmin } from './session';

/** Platform-wide figures for the super admin console. */
export interface PlatformOverview {
  generatedAt: string;
  properties: { total: number; active: number; inactive: number; totalRooms: number; withoutStaff: number };
  users: {
    total: number;
    active: number;
    superAdmins: number;
    staff: number;
    pendingPasswordChange: number;
    staffWithoutProperty: number;
  };
  /** Login sessions that have not been signed out. */
  activeSessions: number;
  /** "Today" is the UTC day: properties carry no time zone. */
  reservations: { total: number; inHouse: number; arrivalsToday: number; departuresToday: number };
  guests: number;
  recentProperties: Array<{
    id: string;
    name: string;
    code: string;
    city: string;
    country: string;
    isActive: boolean;
    totalRooms: number | null;
    staffCount: number;
    createdAt: string;
  }>;
  recentSignIns: Array<{
    sessionId: string;
    userId: string;
    name: string;
    email: string;
    role: UserRoleKey;
    ipAddress: string | null;
    userAgent: string | null;
    signedInAt: string;
  }>;
}

const roomCount = (propertyId: string) =>
  propertySettings.get(propertyId)?.floorPlan.floors.reduce((sum, floor) => sum + floor.roomCount, 0) ?? 0;

/** SUPER_ADMIN only. */
export const platformApi = {
  overview: async (): Promise<PlatformOverview> => {
    requireSuperAdmin();
    const staff = accounts.filter((a) => a.role === 'STAFF');
    const staffCount = (propertyId: string) => staff.filter((a) => a.propertyIds.includes(propertyId)).length;
    const active = properties.filter((p) => p.isActive).length;
    return {
      generatedAt: new Date().toISOString(),
      properties: {
        total: properties.length,
        active,
        inactive: properties.length - active,
        totalRooms: properties.reduce((sum, p) => sum + roomCount(p.id), 0),
        withoutStaff: properties.filter((p) => staffCount(p.id) === 0).length,
      },
      users: {
        total: accounts.length,
        active: accounts.filter((a) => a.isActive).length,
        superAdmins: accounts.length - staff.length,
        staff: staff.length,
        pendingPasswordChange: accounts.filter((a) => a.mustChangePassword).length,
        staffWithoutProperty: staff.filter((a) => a.propertyIds.length === 0).length,
      },
      activeSessions: signIns.length,
      ...store.platformTotals(properties.map((p) => p.id)),
      recentProperties: properties
        .map((p) => ({
          id: p.id, name: p.name, code: p.code, city: p.city, country: p.country, isActive: p.isActive,
          totalRooms: p.totalRooms, staffCount: staffCount(p.id), createdAt: propertyCreatedAt.get(p.id) ?? '',
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
      recentSignIns: structuredClone(signIns.slice(0, 6)),
    };
  },
};
