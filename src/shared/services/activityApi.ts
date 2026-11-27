import { activityLog } from '../mocks/platform';
import type { UserRoleKey } from './authApi';
import { requireSuperAdmin } from './session';

/** One change made through the data layer, as the activity log shows it. */
export interface ActivityEntry {
  id: string;
  createdAt: string;
  /** Null for platform-level changes such as sign-ins and user accounts. */
  property: { id: string; name: string; code: string } | null;
  /** Copied when the change was made, so it still reads the same after the account is renamed or removed. */
  actor: { id: string | null; name: string | null; email: string | null; role: UserRoleKey | null };
  /** Dotted name, e.g. `reservations.cancel`. */
  action: string;
  resource: string;
  resourceId: string | null;
  summary: string;
  method: string;
  path: string;
  statusCode: number;
  /** The request body, query and file, with secrets removed and long values cut. */
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}
export interface ActivityPage { data: ActivityEntry[]; total: number; page: number; pageSize: number }
export interface ActivityQuery {
  propertyId?: string;
  /** Only changes that belong to no property. Ignored when `propertyId` is set. */
  platformOnly?: boolean;
  actorId?: string;
  resource?: string;
  search?: string;
  /** ISO instants. */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/** SUPER_ADMIN only. */
export const activityApi = {
  list: async (query: ActivityQuery = {}): Promise<ActivityPage> => {
    requireSuperAdmin();
    const { propertyId, platformOnly, actorId, resource, search, from, to, page = 1, pageSize = 25 } = query;
    const needle = search?.trim().toLowerCase();
    const rows = activityLog.filter(
      (e) =>
        (propertyId ? e.property?.id === propertyId : !platformOnly || e.property === null) &&
        (!actorId || e.actor.id === actorId) &&
        (!resource || e.resource === resource) &&
        (!needle || [e.summary, e.actor.name, e.actor.email, e.action].some((v) => v?.toLowerCase().includes(needle))) &&
        (!from || e.createdAt >= from) &&
        (!to || e.createdAt <= to),
    );
    return { data: structuredClone(rows.slice((page - 1) * pageSize, page * pageSize)), total: rows.length, page, pageSize };
  },
};
