import { store } from '../mocks/store';
import { request } from './http';
import { requireActivePropertyId } from './propertyAccess';
import { isServerProperty } from './serverProperty';

export interface AuditEventRow {
  id: string; action: string; resourceType: string; resourceId: string | null; outcome: string;
  reason: string | null; actorName: string | null; createdAt: string;
  /** What staff know the record by, such as a booking code; the id itself is not for people to read. */
  reference?: string | null;
}
export interface AuditEventsResult { total: number; returned: number; limit: number; rows: AuditEventRow[] }

/** An entry of the guest_activity table. */
interface ServerActivity {
  id: string; action: string; reference: string | null; detail: string | null; actorName: string | null; createdAt: string;
}

/** "27 Nov 2026, 10:05", on the clock of the person reading it. */
const shownAt = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const auditApi = {
  list: async (limit = 20) => store.auditEvents(limit),
  /** A server property's log is kept in the guest_activity table, so it survives a reload; a demo property's is in memory. */
  forGuest: async (guestId: string, limit = 15): Promise<AuditEventsResult> => {
    const propertyId = requireActivePropertyId();
    if (!isServerProperty(propertyId)) return store.guestAuditEvents(guestId, limit);
    const all = await request<ServerActivity[]>(`/properties/${propertyId}/guests/${guestId}/activity`);
    const rows = all.slice(0, limit).map((entry): AuditEventRow => ({
      id: entry.id, action: entry.action, resourceType: entry.action.split('.')[0], resourceId: null, outcome: 'SUCCESS',
      reason: entry.detail, actorName: entry.actorName, createdAt: shownAt(entry.createdAt), reference: entry.reference,
    }));
    return { total: all.length, returned: rows.length, limit, rows };
  },
  export: () => '/audit-log/export.csv',
};
