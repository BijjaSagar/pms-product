import * as Lucide from 'lucide-react';
import { CardSkeleton } from '../../../shared/components/feedback/Skeleton';
import { Badge, Card, CardTitle, TableContainer } from '../../../shared/components/ui/display';
import { auditLogApi } from '../../../shared/services/auditLogApi';
import type { AuditRow } from '../../../shared/services/auditLogApi';
import { useApiResource } from '../../../shared/services/useApiResource';

const WHO: Record<string, string> = { SUPER_ADMIN: 'Super Super Admin', RM: 'Relationship Manager', OWNER: 'Owner', STAFF: 'Staff' };

const VERBS: Record<string, string> = {
  create: 'Created',
  update: 'Changed',
  'reset-password': 'Reset the password of',
};

const THINGS: Record<string, string> = {
  'relationship-manager': 'a relationship manager',
  owner: 'an owner',
  'owner-person': 'a person of an owner',
  property: 'a property',
  staff: 'a team member',
};

/** "owner.create" as a sentence fragment: "Created an owner". */
function sentence(row: AuditRow): string {
  const [thing = '', verb = ''] = row.action.split('.');
  return `${VERBS[verb] ?? verb} ${THINGS[thing] ?? thing}`.trim();
}

/** The thing that was changed, taken from the details the server kept (a name, never a password). */
function subject(row: AuditRow): string {
  const name = row.detail?.name;
  return typeof name === 'string' ? name : '';
}

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Who created, changed or switched off whom. Each person sees the part of the chain they are responsible for. */
export function AuditPage() {
  const audit = useApiResource(() => auditLogApi.list({ limit: 200 }), []);
  const list = audit.data;

  return (
    <Card>
      <CardTitle title="Audit trail" subtitle="Accounts and properties: who created or changed what, newest first." icon={Lucide.History} />
      {!list && audit.loading ? (
        <CardSkeleton lines={6} label="Loading the audit trail" />
      ) : audit.error && !list ? (
        <p role="alert" className="py-6 text-center text-label text-danger-text">
          Could not load the audit trail: {audit.error}
        </p>
      ) : list && list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Lucide.History size={28} className="text-ink-muted" aria-hidden="true" />
          <p className="text-body font-semibold text-ink">Nothing recorded yet</p>
          <p className="text-label text-ink-secondary">Creating or changing owners, properties and people shows up here.</p>
        </div>
      ) : list ? (
        <div className="mt-3">
          <TableContainer>
            <table className="pms-table w-full text-left">
              <thead>
                <tr>
                  <th>WHEN</th>
                  <th>WHO</th>
                  <th>WHAT</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap text-label text-ink-secondary">{when(row.createdAt)}</td>
                    <td>
                      <span className="block text-label font-semibold text-ink">{row.actorName}</span>
                      <Badge tone="neutral" size="sm">
                        {WHO[row.actorType] ?? row.actorType}
                      </Badge>
                    </td>
                    <td className="text-label text-ink">
                      {sentence(row)}
                      {subject(row) ? <span className="font-semibold"> · {subject(row)}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        </div>
      ) : null}
    </Card>
  );
}
