import { request } from './http';

/** Who created, changed or switched off whom. Never carries passwords. */
export interface AuditRow {
  id: string;
  actorType: string;
  actorName: string;
  /** `resource.verb`, e.g. `owner.create`. */
  action: string;
  targetType: string;
  targetId: string | null;
  ownerId: string | null;
  propertyId: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

/** The account and property administration trail, limited by the server to what the caller may see. */
export const auditLogApi = {
  list: (query: { ownerId?: string; propertyId?: string; limit?: number } = {}) => {
    const params = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string | number] => entry[1] !== undefined).map(([k, v]) => [k, String(v)]));
    return request<AuditRow[]>(`/audit-log${params.size > 0 ? `?${params}` : ''}`);
  },
};
