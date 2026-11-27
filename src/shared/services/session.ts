import { accounts, activityLog, properties, type Account } from '../mocks/platform';

/**
 * Who is signed in. Only the account id is kept, in sessionStorage, so a reload stays signed in and
 * closing the tab signs out. The accounts themselves are in memory and reset on reload.
 */
const SESSION_KEY = 'pms.session';

export const hasSession = (): boolean => sessionStorage.getItem(SESSION_KEY) !== null;
export const startSession = (accountId: string): void => sessionStorage.setItem(SESSION_KEY, accountId);
export const endSession = (): void => sessionStorage.removeItem(SESSION_KEY);

/** The signed-in account. A session whose account has gone or been deactivated is ended. */
export function requireAccount(): Account {
  const id = sessionStorage.getItem(SESSION_KEY);
  const account = accounts.find((item) => item.id === id && item.isActive);
  if (!account) {
    endSession();
    throw new Error('Your session has ended. Please sign in again.');
  }
  return account;
}

export function requireSuperAdmin(): Account {
  const account = requireAccount();
  if (account.role !== 'SUPER_ADMIN') throw new Error('Only a super admin can do this.');
  return account;
}

/** For changing a property's setup: a super admin, or the ADMIN of that property. */
export function requirePropertyAdmin(propertyId: string): Account {
  const account = requireAccount();
  if (account.role !== 'SUPER_ADMIN' && !account.adminPropertyIds?.includes(propertyId)) {
    throw new Error('Only an administrator of this property can do this.');
  }
  return account;
}

/** The properties the account can open: every one for a SUPER_ADMIN, the assigned ones for STAFF. */
export const propertiesOf = (account: Account) =>
  account.role === 'SUPER_ADMIN' ? properties : properties.filter((p) => account.propertyIds.includes(p.id));

/** Adds a change to the platform's activity log, attributed to the signed-in account. */
export function recordActivity(
  resource: string,
  verb: string,
  summary: string,
  options: { propertyId?: string; resourceId?: string; details?: Record<string, unknown> } = {},
): void {
  const actor = accounts.find((item) => item.id === sessionStorage.getItem(SESSION_KEY));
  const property = properties.find((item) => item.id === options.propertyId);
  activityLog.unshift({
    id: globalThis.crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    property: property ? { id: property.id, name: property.name, code: property.code } : null,
    actor: { id: actor?.id ?? null, name: actor?.name ?? null, email: actor?.email ?? null, role: actor?.role ?? null },
    action: `${resource}.${verb}`,
    resource,
    resourceId: options.resourceId ?? null,
    summary,
    method: verb === 'create' ? 'POST' : verb === 'delete' ? 'DELETE' : 'PATCH',
    path: options.resourceId ? `/${resource}/${options.resourceId}` : `/${resource}`,
    statusCode: verb === 'create' ? 201 : 200,
    details: options.details ?? null,
    ipAddress: null,
    userAgent: globalThis.navigator?.userAgent ?? null,
  });
}
