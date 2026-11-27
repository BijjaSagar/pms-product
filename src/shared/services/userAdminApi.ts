import { accounts, properties, type Account } from '../mocks/platform';
import type { ApprovalStatus } from './authApi';
import { recordActivity, requireSuperAdmin } from './session';
import { MIN_PASSWORD } from '../utils/passwordRules';

/** A user as the user management screens see them: never with the password. */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  /** True until the user replaces the password a super admin set for them. */
  mustChangePassword: boolean;
  approvalStatus: ApprovalStatus;
  /** The properties the user is assigned to. */
  properties: Array<{
    id: string;
    name: string;
    code: string;
    isActive: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}
export interface AdminUserPage { data: AdminUser[]; total: number; page: number; pageSize: number }
export interface AdminUserQuery {
  search?: string;
  isActive?: boolean;
  /** PENDING_SETUP lists sign-ups that have not entered a key yet. */
  approvalStatus?: ApprovalStatus;
  propertyId?: string;
  page?: number;
  pageSize?: number;
}
export interface AdminUserCreate {
  name: string;
  email: string;
  /** The first password, to be shared with the user; they must replace it at their first sign-in. */
  password: string;
  propertyIds?: string[];
}

const toAdminUser = (account: Account): AdminUser => ({
  id: account.id,
  email: account.email,
  name: account.name,
  isActive: account.isActive,
  mustChangePassword: account.mustChangePassword,
  approvalStatus: account.approvalStatus,
  properties: properties
    .filter((p) => account.propertyIds.includes(p.id))
    .map((p) => ({ id: p.id, name: p.name, code: p.code, isActive: p.isActive })),
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
});

/** Super admins are not users: only staff accounts are managed here. */
const staff = () => accounts.filter((a) => a.role === 'STAFF');

function requireUser(id: string): Account {
  requireSuperAdmin();
  const account = staff().find((a) => a.id === id);
  if (!account) throw new Error('This user no longer exists.');
  return account;
}

function assertPassword(password: string) {
  if (password.length < MIN_PASSWORD) throw new Error(`Use a password of at least ${MIN_PASSWORD} characters.`);
}

function changed(account: Account, verb: string, summary: string): AdminUser {
  account.updatedAt = new Date().toISOString();
  recordActivity('users', verb, summary, { resourceId: account.id });
  return toAdminUser(account);
}

/** Accounts and property access. SUPER_ADMIN only. */
export const userAdminApi = {
  list: async (query: AdminUserQuery = {}): Promise<AdminUserPage> => {
    requireSuperAdmin();
    const { search, isActive, approvalStatus, propertyId, page = 1, pageSize = 25 } = query;
    const needle = search?.trim().toLowerCase();
    const rows = staff()
      .filter((a) => !needle || a.name.toLowerCase().includes(needle) || a.email.includes(needle))
      .filter((a) => isActive === undefined || a.isActive === isActive)
      .filter((a) => !approvalStatus || a.approvalStatus === approvalStatus)
      .filter((a) => !propertyId || a.propertyIds.includes(propertyId))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { data: rows.slice((page - 1) * pageSize, page * pageSize).map(toAdminUser), total: rows.length, page, pageSize };
  },
  create: async (body: AdminUserCreate) => {
    requireSuperAdmin();
    const email = body.email.trim().toLowerCase();
    if (accounts.some((a) => a.email === email)) throw new Error('An account with this email already exists.');
    assertPassword(body.password);
    const now = new Date().toISOString();
    const account: Account = {
      id: globalThis.crypto.randomUUID(), email, name: body.name.trim(), password: body.password, role: 'STAFF',
      isActive: true, mustChangePassword: true, approvalStatus: 'APPROVED', propertyIds: [...(body.propertyIds ?? [])],
      createdAt: now, updatedAt: now,
    };
    accounts.push(account);
    return changed(account, 'create', `Created the user ${account.name}`);
  },
  update: async (id: string, body: { name?: string; isActive?: boolean }) => {
    const account = Object.assign(requireUser(id), body);
    return changed(account, 'update', `Updated the user ${account.name}`);
  },
  /** Replaces the user's whole set of properties; an empty list removes all access. */
  setProperties: async (id: string, propertyIds: string[]) => {
    const account = requireUser(id);
    account.propertyIds = [...propertyIds];
    return changed(account, 'update', `Changed the properties of ${account.name}`);
  },
  /** The user must replace this password at their next sign-in. */
  resetPassword: async (id: string, password: string) => {
    const account = requireUser(id);
    assertPassword(password);
    account.password = password;
    account.mustChangePassword = true;
    changed(account, 'reset-password', `Reset the password of ${account.name}`);
  },
  forProperty: async (propertyId: string) => {
    requireSuperAdmin();
    return staff().filter((a) => a.propertyIds.includes(propertyId)).map(toAdminUser);
  },
  assign: async (propertyId: string, userId: string) => {
    const account = requireUser(userId);
    if (!account.propertyIds.includes(propertyId)) account.propertyIds.push(propertyId);
    changed(account, 'update', `Gave ${account.name} access to a property`);
  },
  unassign: async (propertyId: string, userId: string) => {
    const account = requireUser(userId);
    account.propertyIds = account.propertyIds.filter((id) => id !== propertyId);
    changed(account, 'update', `Removed ${account.name} from a property`);
  },
};
