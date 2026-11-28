import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { CardSkeleton } from '../../components/feedback/Skeleton';
import { CredentialsDialog } from '../../components/ui/CredentialsDialog';
import type { Credentials } from '../../components/ui/CredentialsDialog';
import { Field, Switch } from '../../components/ui/controls';
import { Avatar, Badge, TableContainer } from '../../components/ui/display';
import { Modal } from '../../components/ui/overlays';
import { Button, IconButton, SelectField, TextField } from '../../components/ui/primitives';
import { displayError } from '../../services/errors';
import { staffApi } from '../../services/staffApi';
import type { StaffRole, StaffRow } from '../../services/staffApi';
import { useApiResource } from '../../services/useApiResource';
import { toast } from '../../utils/toast';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AddStaffDialog({ propertyId, roles, onClose, onCreated }: { propertyId: string; roles: StaffRole[]; onClose: () => void; onCreated: (credentials: Credentials) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(roles.find((r) => r.key === 'FRONT_OFFICE')?.key ?? roles[0]?.key ?? '');
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = {
    name: name.trim().length < 2 ? "Enter the person's full name." : undefined,
    email: !EMAIL.test(email.trim()) ? 'Enter a valid email address.' : undefined,
  };

  const save = async () => {
    setAttempted(true);
    if (errors.name || errors.email) return;
    setSaving(true);
    setError(null);
    try {
      const created = await staffApi.create(propertyId, { name: name.trim(), email: email.trim(), role });
      onCreated({ name: created.name, email: created.email, password: created.temporaryPassword });
    } catch (cause) {
      setError(displayError(cause));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add a team member"
      subtitle="They sign in with the email and a temporary password you hand over."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={saving} icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.UserPlus size={14} />}>
            {saving ? 'Adding…' : 'Add person'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 py-2 sm:grid-cols-2">
        <Field label="Full name" required error={attempted ? errors.name : undefined}>
          <TextField autoFocus value={name} maxLength={150} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Email address" required error={attempted ? errors.email : undefined}>
          <TextField type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Department role" required className="sm:col-span-2" hint="What they can see and do follows from this role.">
          <SelectField value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </SelectField>
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

/**
 * The people of one property and their department roles. A property always keeps at least one active
 * Property Admin; the server refuses a change that would leave none.
 */
export function StaffPanel({ propertyId }: { propertyId: string }) {
  const staff = useApiResource(() => staffApi.list(propertyId), [propertyId]);
  const roles = useApiResource(() => staffApi.roles(propertyId), [propertyId]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const change = async (person: StaffRow, body: { role?: string; isActive?: boolean }) => {
    setBusy(person.id);
    try {
      await staffApi.update(propertyId, person.id, body);
      toast('Saved', { detail: person.name, tone: 'success' });
      staff.refresh();
    } catch (cause) {
      toast('Could not save the change', { detail: displayError(cause), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const reset = async (person: StaffRow) => {
    setBusy(person.id);
    try {
      const { temporaryPassword } = await staffApi.resetPassword(propertyId, person.id);
      setCredentials({ name: person.name, email: person.email, password: temporaryPassword });
    } catch (cause) {
      toast('Could not reset the password', { detail: displayError(cause), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const list = staff.data;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-label text-ink-secondary">Each person has one department role. Switching someone off signs them out at once.</p>
        <Button variant="primary" onClick={() => setAdding(true)} disabled={!roles.data} icon={<Lucide.UserPlus size={14} />}>
          Add person
        </Button>
      </div>

      {!list && staff.loading ? (
        <CardSkeleton lines={4} label="Loading the team" />
      ) : staff.error && !list ? (
        <p role="alert" className="py-6 text-center text-label text-danger-text">
          Could not load the team: {staff.error}
        </p>
      ) : list ? (
        <div className={staff.loading ? 'opacity-60' : ''} aria-busy={staff.loading}>
          <TableContainer>
            <table className="pms-table w-full text-left">
              <thead>
                <tr>
                  <th>PERSON</th>
                  <th>DEPARTMENT ROLE</th>
                  <th>ACTIVE</th>
                  <th className="text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {list.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <span className="flex items-center gap-3">
                        <Avatar name={person.name} size={32} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 text-label font-semibold text-ink">
                            {person.name}
                            {person.mustChangePassword ? (
                              <Badge tone="warning" size="sm">
                                Password pending
                              </Badge>
                            ) : null}
                          </span>
                          <span className="block truncate text-micro text-ink-secondary">{person.email}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <SelectField
                        aria-label={`Department role of ${person.name}`}
                        value={person.role}
                        disabled={busy === person.id}
                        onChange={(e) => void change(person, { role: e.target.value })}
                      >
                        {(roles.data ?? [{ key: person.role, label: person.roleLabel }]).map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.label}
                          </option>
                        ))}
                      </SelectField>
                    </td>
                    <td>
                      <Switch label={`${person.name} can sign in`} checked={person.isActive} disabled={busy === person.id} onChange={(next) => void change(person, { isActive: next })} />
                    </td>
                    <td className="text-right">
                      <IconButton title={`Reset the password of ${person.name}`} aria-label={`Reset the password of ${person.name}`} disabled={busy === person.id} onClick={() => void reset(person)}>
                        <Lucide.KeyRound size={14} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        </div>
      ) : null}

      {adding && roles.data ? (
        <AddStaffDialog
          propertyId={propertyId}
          roles={roles.data}
          onClose={() => setAdding(false)}
          onCreated={(created) => {
            setAdding(false);
            setCredentials(created);
            staff.refresh();
          }}
        />
      ) : null}
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}
