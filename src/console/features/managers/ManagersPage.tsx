import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { CardSkeleton } from '../../../shared/components/feedback/Skeleton';
import { CredentialsDialog } from '../../../shared/components/ui/CredentialsDialog';
import type { Credentials } from '../../../shared/components/ui/CredentialsDialog';
import { Field, Switch } from '../../../shared/components/ui/controls';
import { Avatar, Badge, Card, CardTitle, TableContainer } from '../../../shared/components/ui/display';
import { Modal } from '../../../shared/components/ui/overlays';
import { Button, IconButton, TextField } from '../../../shared/components/ui/primitives';
import { displayError } from '../../../shared/services/errors';
import { managerApi } from '../../../shared/services/managerApi';
import type { ManagerRow } from '../../../shared/services/managerApi';
import { useApiResource } from '../../../shared/services/useApiResource';
import { toast } from '../../../shared/utils/toast';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_LIMIT = '10';

/** Adds a manager, or edits one (name and how many owners they may look after). */
function ManagerDialog({ manager, onClose, onSaved }: { manager: ManagerRow | null; onClose: () => void; onSaved: (credentials?: Credentials) => void }) {
  const [name, setName] = useState(manager?.name ?? '');
  const [email, setEmail] = useState('');
  const [limit, setLimit] = useState(String(manager?.maxOwners ?? DEFAULT_LIMIT));
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const max = Number(limit);
  const errors = {
    name: name.trim().length < 2 ? "Enter the manager's full name." : undefined,
    email: !manager && !EMAIL.test(email.trim()) ? 'Enter a valid email address.' : undefined,
    limit: !Number.isInteger(max) || max < 1 || max > 1000 ? 'Use a whole number from 1 to 1000.' : undefined,
  };

  const save = async () => {
    setAttempted(true);
    if (errors.name || errors.email || errors.limit) return;
    setSaving(true);
    setError(null);
    try {
      if (manager) {
        await managerApi.update(manager.id, { name: name.trim(), maxOwners: max });
        toast('Manager saved', { detail: name.trim(), tone: 'success' });
        onSaved();
      } else {
        const created = await managerApi.create({ name: name.trim(), email: email.trim(), maxOwners: max });
        onSaved({ name: created.name, email: created.email, password: created.temporaryPassword });
      }
    } catch (cause) {
      setError(displayError(cause));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={manager ? `Edit ${manager.name}` : 'Add a relationship manager'}
      subtitle={manager ? undefined : 'They sign in with the email and a temporary password you hand over.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={saving} icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Check size={14} />}>
            {saving ? 'Saving…' : manager ? 'Save changes' : 'Add manager'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 py-2 sm:grid-cols-2">
        <Field label="Full name" required error={attempted ? errors.name : undefined}>
          <TextField autoFocus value={name} maxLength={150} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        {manager ? (
          <Field label="Email address" hint="The sign-in email cannot be changed.">
            <TextField value={manager.email} disabled readOnly />
          </Field>
        ) : (
          <Field label="Email address" required error={attempted ? errors.email : undefined}>
            <TextField type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </Field>
        )}
        <Field
          label="Owners they may look after"
          required
          error={attempted ? errors.limit : undefined}
          hint={manager ? `They look after ${manager.ownerCount} now; the limit cannot go below that.` : 'Ten is the usual number.'}
          className="sm:col-span-2"
        >
          <TextField inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} autoComplete="off" />
        </Field>
        {error ? (
          <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text sm:col-span-2">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

type Dialog = { kind: 'none' } | { kind: 'edit'; manager: ManagerRow | null };

/** Super Super Admin only: the Relationship Managers and how many owners each may look after. */
export function ManagersPage() {
  const managers = useApiResource(() => managerApi.list(), []);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });
  const [busy, setBusy] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const list = managers.data;
  const close = () => setDialog({ kind: 'none' });

  const toggle = async (manager: ManagerRow, isActive: boolean) => {
    setBusy(manager.id);
    try {
      await managerApi.update(manager.id, { isActive });
      toast(isActive ? 'Switched on' : 'Switched off', { detail: manager.name, tone: 'success' });
      managers.refresh();
    } catch (cause) {
      toast('Could not save the change', { detail: displayError(cause), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const reset = async (manager: ManagerRow) => {
    setBusy(manager.id);
    try {
      const { temporaryPassword } = await managerApi.resetPassword(manager.id);
      setCredentials({ name: manager.name, email: manager.email, password: temporaryPassword });
    } catch (cause) {
      toast('Could not reset the password', { detail: displayError(cause), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardTitle
        title="Relationship managers"
        subtitle="Each manager looks after a limited number of owner companies."
        icon={Lucide.UserCheck}
        action={
          <Button variant="primary" onClick={() => setDialog({ kind: 'edit', manager: null })} icon={<Lucide.Plus size={14} />}>
            Add manager
          </Button>
        }
      />

      {!list && managers.loading ? (
        <CardSkeleton lines={4} label="Loading managers" />
      ) : managers.error && !list ? (
        <p role="alert" className="py-6 text-center text-label text-danger-text">
          Could not load the managers: {managers.error}
        </p>
      ) : list && list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Lucide.UserCheck size={28} className="text-ink-muted" aria-hidden="true" />
          <p className="text-body font-semibold text-ink">No managers yet</p>
          <p className="text-label text-ink-secondary">You can look after owners directly, or add managers to share the work.</p>
        </div>
      ) : list ? (
        <div className={`mt-3 ${managers.loading ? 'opacity-60' : ''}`} aria-busy={managers.loading}>
          <TableContainer>
            <table className="pms-table w-full text-left">
              <thead>
                <tr>
                  <th>MANAGER</th>
                  <th>OWNERS</th>
                  <th>ACTIVE</th>
                  <th className="text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {list.map((manager) => (
                  <tr key={manager.id}>
                    <td>
                      <span className="flex items-center gap-3">
                        <Avatar name={manager.name} size={32} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 text-label font-semibold text-ink">
                            {manager.name}
                            {manager.mustChangePassword ? (
                              <Badge tone="warning" size="sm">
                                Password pending
                              </Badge>
                            ) : null}
                          </span>
                          <span className="block truncate text-micro text-ink-secondary">{manager.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="tnum text-label text-ink-secondary">
                      {manager.ownerCount} of {manager.maxOwners}
                    </td>
                    <td>
                      <Switch label={`${manager.name} can sign in`} checked={manager.isActive} disabled={busy === manager.id} onChange={(next) => void toggle(manager, next)} />
                    </td>
                    <td className="text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <IconButton title={`Edit ${manager.name}`} aria-label={`Edit ${manager.name}`} onClick={() => setDialog({ kind: 'edit', manager })}>
                          <Lucide.Pencil size={14} />
                        </IconButton>
                        <IconButton title={`Reset the password of ${manager.name}`} aria-label={`Reset the password of ${manager.name}`} disabled={busy === manager.id} onClick={() => void reset(manager)}>
                          <Lucide.KeyRound size={14} />
                        </IconButton>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        </div>
      ) : null}

      {dialog.kind === 'edit' ? (
        <ManagerDialog
          manager={dialog.manager}
          onClose={close}
          onSaved={(created) => {
            close();
            if (created) setCredentials(created);
            managers.refresh();
          }}
        />
      ) : null}
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </Card>
  );
}
