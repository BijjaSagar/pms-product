import { ALL_PERMISSIONS, PROPERTY } from '../mocks/catalog';
import { signIns } from '../mocks/platform';
import { store } from '../mocks/store';
import { clearToken, request, saveToken } from './http';
import { copyAccount, copyProperty } from './serverAccount';
import { endSession, propertiesOf, startSession } from './session';

export interface PropertyMembership {
  id: string;
  userId: string;
  propertyId: string;
  roleId: string;
  isActive: boolean;
  role: { id: string; key: string; name: string; description: string | null };
  property: { id: string; name: string; slug: string; timezone: string; currencyCode: string };
}
export type UserRoleKey = 'SUPER_ADMIN' | 'STAFF';
/**
 * Where a self sign-up stands: PENDING_SETUP (account made, property not yet sent with an activation key)
 * or APPROVED. Accounts a super admin creates are APPROVED.
 */
export type ApprovalStatus = 'PENDING_SETUP' | 'APPROVED';
export interface AuthMe {
  user: {
    id: string;
    email: string;
    fullName: string;
    status: string;
    role: UserRoleKey;
    /** True until the user replaces a password a super admin set for them; the data layer refuses everything else meanwhile. */
    mustChangePassword: boolean;
    /** Until APPROVED the data layer lets the account do nothing but finish onboarding or wait. */
    approvalStatus: ApprovalStatus;
    /** Every property a SUPER_ADMIN can open; for STAFF, the ones assigned to them. */
    propertyMemberships: PropertyMembership[];
  };
  activePropertyId: string | null;
  permissions: string[];
}

const ROLE_LABELS: Record<UserRoleKey, { id: string; key: string; name: string; description: string }> = {
  SUPER_ADMIN: { id: 'role-super-admin', key: 'super_admin', name: 'Super Admin', description: 'Manages every property and user.' },
  STAFF: { id: 'role-staff', key: 'staff', name: 'Staff', description: 'Works at the properties assigned to them.' },
};

const ACTIVE_PROPERTY_KEY = 'pms.activePropertyId';

/**
 * The property to open straight away, or null to show Choose a property. A choice already made in
 * this tab wins; otherwise a STAFF user with exactly one property goes straight in. A SUPER_ADMIN
 * always chooses, so they can add properties, and may open one that is inactive to fix or reactivate it.
 */
function pickActiveProperty(role: UserRoleKey, properties: Array<{ id: string; isActive: boolean }>): string | null {
  const usable = properties.filter((p) => role === 'SUPER_ADMIN' || p.isActive);
  const saved = sessionStorage.getItem(ACTIVE_PROPERTY_KEY);
  if (saved && usable.some((p) => p.id === saved)) return saved;
  return role === 'STAFF' && usable.length === 1 ? (usable[0]?.id ?? null) : null;
}

const NO_RESET = 'Password reset is not available yet. Ask your administrator for help.';

/** Accounts live on the server; a STAFF user only ever sees the properties assigned to them. */
export const authApi = {
  login: async (email: string, password: string) => {
    const { token } = await request<{ token: string }>('/auth/login', { email, password });
    saveToken(token);
    sessionStorage.removeItem(ACTIVE_PROPERTY_KEY);
  },
  /** Step one of sign-up: creates the account only. The caller signs in next, then sets up the property. */
  register: (name: string, email: string, password: string) =>
    request<{ id: string; email: string; name: string }>('/auth/register', { name, email, password }),
  forgotPassword: async (_email: string): Promise<{ message: string; delivery: 'email' | 'none' }> => {
    throw new Error(NO_RESET);
  },
  resetPassword: async (_email: string, _otp: string, _newPassword: string) => {
    throw new Error(NO_RESET);
  },
  me: async (): Promise<AuthMe> => {
    const server = await request<AuthMe>('/auth/me');
    const { user } = server;
    const isNewSignIn = sessionStorage.getItem('pms.session') !== user.id;
    const assigned = user.propertyMemberships;
    const account = copyAccount({
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      approvalStatus: user.approvalStatus,
      propertyIds: assigned.map((m) => m.propertyId),
      adminPropertyIds: assigned.filter((m) => m.role.key === 'admin').map((m) => m.propertyId),
    });
    startSession(account.id);
    for (const membership of assigned) await copyProperty(membership.propertyId);
    if (isNewSignIn) {
      signIns.unshift({
        sessionId: globalThis.crypto.randomUUID(),
        userId: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        ipAddress: null,
        userAgent: globalThis.navigator?.userAgent ?? null,
        signedInAt: new Date().toISOString(),
      });
    }

    // Until the password is changed, or a sign-up is activated, no property is read.
    const properties = account.mustChangePassword || account.approvalStatus !== 'APPROVED' ? [] : propertiesOf(account);
    const activeId = pickActiveProperty(account.role, properties);
    const active = properties.find((p) => p.id === activeId);
    store.setActor(account.name);
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

    return {
      user: {
        ...user,
        propertyMemberships: properties.map((p) => {
          // The server's role on this property (ADMIN for whoever set it up); the account type otherwise.
          const role = assigned.find((m) => m.propertyId === p.id)?.role ?? ROLE_LABELS[account.role];
          return {
            id: `membership-${p.id}`,
            userId: account.id,
            propertyId: p.id,
            roleId: role.id,
            isActive: p.isActive,
            role,
            property: { id: p.id, name: p.name, slug: p.code, timezone: PROPERTY.timezone, currencyCode: p.defaultCurrency },
          };
        }),
      },
      activePropertyId: active?.id ?? null,
      // The server has no permission tables yet.
      permissions: ALL_PERMISSIONS,
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
  /** Opens a property, or (null) goes back to Choose a property. `me` still limits what the user can open. */
  switchProperty: async (propertyId: string | null) => {
    if (propertyId) sessionStorage.setItem(ACTIVE_PROPERTY_KEY, propertyId);
    else sessionStorage.removeItem(ACTIVE_PROPERTY_KEY);
  },
};
