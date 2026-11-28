import { store } from '../mocks/store';
import { clearToken, request, saveToken } from './http';
import { copyAccount, copyProperty } from './serverAccount';
import { endSession, startSession } from './session';
import { properties } from '../mocks/platform';

/**
 * The chain of responsibility, top to bottom: SUPER_ADMIN (Super Super Admin), RM (Relationship Manager),
 * OWNER (a person of an owner company) and STAFF (a person who works at one property).
 */
export type UserRoleKey = 'SUPER_ADMIN' | 'RM' | 'OWNER' | 'STAFF';

export interface PropertyMembership {
  id: string;
  userId: string;
  propertyId: string;
  roleId: string;
  isActive: boolean;
  role: { id: string; key: string; name: string; description: string | null };
  property: { id: string; name: string; slug: string; timezone: string; currencyCode: string };
}
export interface AuthMe {
  user: {
    id: string;
    email: string;
    fullName: string;
    status: string;
    role: UserRoleKey;
    /** The department role of a STAFF user, e.g. `PROPERTY_ADMIN` or `FRONT_OFFICE`; null for everyone else. */
    roleName: string | null;
    /** The owner company an OWNER person signs in for. */
    ownerId: string | null;
    /** True until the user replaces a password someone set for them; the server refuses everything else meanwhile. */
    mustChangePassword: boolean;
    /** Every property this person can open: all of them for the Super Super Admin, their owners' for an RM, their company's for an owner, the one they work at for staff. */
    propertyMemberships: PropertyMembership[];
  };
  activePropertyId: string | null;
  permissions: string[];
}

const ACTIVE_PROPERTY_KEY = 'pms.activePropertyId';

/**
 * The property to open straight away, or null to show the console (or Choose a property). STAFF work at the one
 * property the server names. Everyone above chooses from their console, and a choice already made in this tab wins.
 */
function pickActiveProperty(role: UserRoleKey, serverActiveId: string | null, memberships: PropertyMembership[]): string | null {
  if (role === 'STAFF') return serverActiveId;
  const saved = sessionStorage.getItem(ACTIVE_PROPERTY_KEY);
  return saved && memberships.some((m) => m.propertyId === saved) ? saved : null;
}

const NO_RESET = 'Password reset is not available yet. Ask your administrator for help.';

/** Accounts live on the server; each person only ever sees what is below them in the chain. */
export const authApi = {
  login: async (email: string, password: string) => {
    const { token } = await request<{ token: string }>('/auth/login', { email, password });
    saveToken(token);
    sessionStorage.removeItem(ACTIVE_PROPERTY_KEY);
  },
  forgotPassword: async (_email: string): Promise<{ message: string; delivery: 'email' | 'none' }> => {
    throw new Error(NO_RESET);
  },
  resetPassword: async (_email: string, _otp: string, _newPassword: string) => {
    throw new Error(NO_RESET);
  },
  me: async (): Promise<AuthMe> => {
    const server = await request<AuthMe>('/auth/me');
    const { user } = server;
    // Until the password is replaced no property is read.
    const memberships = user.mustChangePassword ? [] : user.propertyMemberships;
    const ids = memberships.map((m) => m.propertyId);
    const account = copyAccount({
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      propertyIds: ids,
      // Staff change a property's setup only as its Property Admin; everyone above them may in what they reach.
      adminPropertyIds: user.role === 'STAFF' ? (user.roleName === 'PROPERTY_ADMIN' ? ids : []) : ids,
    });
    startSession(account.id);

    // Staff are told their property up front, but the server refuses to serve it until the password is replaced.
    const activeId = user.mustChangePassword ? null : pickActiveProperty(user.role, server.activePropertyId, memberships);
    store.setActor(account.name);
    if (activeId) {
      await copyProperty(activeId);
      const active = properties.find((p) => p.id === activeId);
      if (active) {
        store.openProperty({
          id: active.id,
          name: active.name,
          slug: active.code,
          currencyCode: active.defaultCurrency,
          addressLine1: active.addressLine1,
          city: active.city,
        });
      }
    }
    return {
      user: { ...user, propertyMemberships: memberships },
      activePropertyId: activeId,
      permissions: server.permissions,
    };
  },
  /** Replaces the signed-in user's password. */
  changePassword: async (currentPassword: string, newPassword: string) => {
    await request<void>('/auth/change-password', { currentPassword, newPassword });
  },
  logout: async () => {
    try {
      await request<void>('/auth/logout', undefined, 'POST');
    } catch {
      // Signing out here must work even if the server cannot be reached.
    } finally {
      clearToken();
      endSession();
      sessionStorage.removeItem(ACTIVE_PROPERTY_KEY);
    }
  },
  /** Opens a property, or (null) goes back to the console / Choose a property. `me` still limits what the user can open. */
  switchProperty: async (propertyId: string | null) => {
    if (propertyId) sessionStorage.setItem(ACTIVE_PROPERTY_KEY, propertyId);
    else sessionStorage.removeItem(ACTIVE_PROPERTY_KEY);
  },
};
