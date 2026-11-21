import { useState } from 'react';
import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { Avatar, Badge } from '../../components/ui';
import { Drawer } from '../../components/overlays';
import { Button } from '../../components/primitives';
import { toast } from '../../utils/toast';
import type { ActivityEntry } from '../../lib/api/pms';
import { KIND_STYLES, activityKind, deviceLabel, flattenDetails, fullStamp } from './activityMeta';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-divider py-2.5 last:border-b-0">
      <dt className="text-label text-ink-secondary">{label}</dt>
      <dd className="min-w-0 break-words text-label text-ink">{children}</dd>
    </div>
  );
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error('Could not copy', 'Your browser blocked access to the clipboard.');
  }
}

/** Everything known about one log entry, in a side panel so the timeline keeps its place behind it. */
export function ActivityDetailDrawer({ entry, onClose }: { entry: ActivityEntry | null; onClose: () => void }) {
  const [raw, setRaw] = useState(false);
  if (!entry) return null;

  const kind = KIND_STYLES[activityKind(entry)];
  const fields = flattenDetails(entry.details);
  const device = deviceLabel(entry.userAgent);

  return (
    <Drawer
      open
      onClose={onClose}
      title={kind.label}
      subtitle={fullStamp(entry.createdAt)}
      footer={
        <Button variant="secondary" icon={<Lucide.Copy size={13} />} onClick={() => copy(JSON.stringify(entry, null, 2), 'Entry')}>
          Copy as JSON
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <Avatar name={entry.actor.name ?? '?'} size={40} />
          <div className="min-w-0">
            <p className="text-body font-semibold text-ink">{entry.summary}</p>
            <p className="text-label text-ink-secondary">
              {entry.actor.name ?? 'Unknown'}
              {entry.actor.id ? '' : ' (account deleted)'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone={kind.tone} size="sm">
                {kind.label}
              </Badge>
              <Badge tone={entry.statusCode >= 400 ? 'danger' : 'success'} size="sm">
                {entry.statusCode >= 400 ? `Failed · ${entry.statusCode}` : `Succeeded · ${entry.statusCode}`}
              </Badge>
            </div>
          </div>
        </div>

        <section aria-label="Overview">
          <h3 className="pms-label mb-1">Overview</h3>
          <dl className="rounded-xl border border-border px-3">
            <Row label="Person">
              {entry.actor.email ?? '—'}
              {entry.actor.role ? ` · ${entry.actor.role === 'SUPER_ADMIN' ? 'Super admin' : 'Staff'}` : ''}
            </Row>
            <Row label="Property">{entry.property ? `${entry.property.name} (${entry.property.code})` : 'Platform (no property)'}</Row>
            <Row label="Action">
              <span className="font-mono">{entry.action}</span>
            </Row>
            <Row label="Record">
              {entry.resourceId ? (
                <button type="button" className="cursor-pointer font-mono underline decoration-dotted" onClick={() => copy(entry.resourceId ?? '', 'Record ID')}>
                  {entry.resourceId}
                </button>
              ) : (
                '—'
              )}
            </Row>
            <Row label="Request">
              <span className="font-mono">
                {entry.method} {entry.path}
              </span>
            </Row>
            <Row label="IP address">{entry.ipAddress ?? '—'}</Row>
            <Row label="Device">{device ?? '—'}</Row>
            <Row label="Entry ID">
              <button type="button" className="cursor-pointer font-mono underline decoration-dotted" onClick={() => copy(entry.id, 'Entry ID')}>
                {entry.id}
              </button>
            </Row>
          </dl>
        </section>

        <section aria-label="What was sent">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="pms-label">What was sent</h3>
            {entry.details ? (
              <button type="button" className="cursor-pointer text-label font-semibold text-primary" onClick={() => setRaw((v) => !v)}>
                {raw ? 'Show as list' : 'Show raw JSON'}
              </button>
            ) : null}
          </div>
          {!entry.details ? (
            <p className="rounded-xl border border-border p-3 text-label text-ink-secondary">The request carried no data.</p>
          ) : raw ? (
            <pre className="max-h-96 overflow-auto rounded-xl border border-border bg-muted-surface/50 p-3 font-mono text-label text-ink">
              {JSON.stringify(entry.details, null, 2)}
            </pre>
          ) : (
            <dl className="rounded-xl border border-border px-3">
              {fields.map(([key, value], index) => (
                <Row key={`${key}-${index}`} label={key}>
                  <span className="font-mono">{value}</span>
                </Row>
              ))}
            </dl>
          )}
        </section>
      </div>
    </Drawer>
  );
}
