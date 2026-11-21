import type { LucideIcon } from 'lucide-react';
import { KeyRound, LogIn, LogOut, Pencil, Plus, ShieldAlert, Trash2, UserCheck } from 'lucide-react';
import type { ActivityEntry } from '../../lib/api/pms';
import type { BadgeTone } from '../../utils/status';

export type ActivityKind = 'create' | 'update' | 'delete' | 'signin' | 'signout' | 'password' | 'approval' | 'failed';

export interface KindStyle {
  label: string;
  Icon: LucideIcon;
  tone: BadgeTone;
}

export const KIND_STYLES: Record<ActivityKind, KindStyle> = {
  create: { label: 'Created', Icon: Plus, tone: 'success' },
  update: { label: 'Updated', Icon: Pencil, tone: 'info' },
  delete: { label: 'Deleted', Icon: Trash2, tone: 'danger' },
  signin: { label: 'Sign-in', Icon: LogIn, tone: 'neutral' },
  signout: { label: 'Sign-out', Icon: LogOut, tone: 'neutral' },
  password: { label: 'Password', Icon: KeyRound, tone: 'warning' },
  approval: { label: 'Approval', Icon: UserCheck, tone: 'success' },
  failed: { label: 'Failed', Icon: ShieldAlert, tone: 'danger' },
};

const DELETE_VERBS = /(delete|remove|cancel|reject|revoke|deactivate|disable|void)/;
const CREATE_VERBS = /(create|add|register|invite|import|check-in|checkin|issue)/;

/** Reads the kind of change off the dotted action name (`reservations.cancel`) and the response status. */
export function activityKind(entry: ActivityEntry): ActivityKind {
  const action = entry.action.toLowerCase();
  if (entry.statusCode >= 400) return 'failed';
  if (/(login|sign-in|signin)/.test(action)) return 'signin';
  if (/(logout|sign-out|signout)/.test(action)) return 'signout';
  if (/password/.test(action)) return 'password';
  if (/(approve|approval)/.test(action)) return 'approval';
  if (DELETE_VERBS.test(action) || entry.method === 'DELETE') return 'delete';
  if (CREATE_VERBS.test(action) || entry.method === 'POST') return 'create';
  return 'update';
}

/** "Today", "Yesterday", or a short date, for the Time column. */
export function shortDate(iso: string, now = new Date()): string {
  const day = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(day)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return day.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export const clockTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export const fullStamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** A short browser and system label from a user-agent string, so the row does not show 150 characters of it. */
export function deviceLabel(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const browser = /Edg\//.test(userAgent) ? 'Edge' : /Chrome\//.test(userAgent) ? 'Chrome' : /Firefox\//.test(userAgent) ? 'Firefox' : /Safari\//.test(userAgent) ? 'Safari' : null;
  const system = /Windows/.test(userAgent) ? 'Windows' : /Android/.test(userAgent) ? 'Android' : /iPhone|iPad/.test(userAgent) ? 'iOS' : /Mac OS/.test(userAgent) ? 'macOS' : /Linux/.test(userAgent) ? 'Linux' : null;
  return [browser, system].filter(Boolean).join(' on ') || userAgent.slice(0, 40);
}

/** One flat row per field of the request, so "what was sent" reads as a list instead of a JSON dump. */
export function flattenDetails(value: unknown, prefix = ''): Array<[string, string]> {
  if (value === null || value === undefined) return prefix ? [[prefix, '—']] : [];
  if (Array.isArray(value)) {
    if (value.length === 0) return [[prefix, '(empty list)']];
    return value.flatMap((item, index) => flattenDetails(item, `${prefix}[${index}]`));
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return prefix ? [[prefix, '(empty)']] : [];
    return entries.flatMap(([key, inner]) => flattenDetails(inner, prefix ? `${prefix}.${key}` : key));
  }
  return [[prefix, String(value)]];
}

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

/** The entries on screen as CSV text. */
export function entriesToCsv(entries: readonly ActivityEntry[]): string {
  const header = ['Time', 'Summary', 'Action', 'Person', 'Email', 'Role', 'Property', 'Method', 'Path', 'Status', 'IP address'];
  const rows = entries.map((e) =>
    [
      e.createdAt,
      e.summary,
      e.action,
      e.actor.name ?? '',
      e.actor.email ?? '',
      e.actor.role ?? '',
      e.property ? `${e.property.code} ${e.property.name}` : 'Platform',
      e.method,
      e.path,
      String(e.statusCode),
      e.ipAddress ?? '',
    ].map(csvCell).join(','),
  );
  return [header.map(csvCell).join(','), ...rows].join('\r\n');
}
