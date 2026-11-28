import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { CardSkeleton } from '../../../shared/components/feedback/Skeleton';
import { CredentialsDialog } from '../../../shared/components/ui/CredentialsDialog';
import type { Credentials } from '../../../shared/components/ui/CredentialsDialog';
import { Field, Switch } from '../../../shared/components/ui/controls';
import { Avatar, Badge, TableContainer } from '../../../shared/components/ui/display';
import { Modal } from '../../../shared/components/ui/overlays';
import { Button, IconButton, TextField } from '../../../shared/components/ui/primitives';
import { displayError } from '../../../shared/services/errors';
import { ownerApi } from '../../../shared/services/ownerApi';
import type { PersonRow } from '../../../shared/services/ownerApi';
import { useApiResource } from '../../../shared/services/useApiResource';
import { toast } from '../../../shared/utils/toast';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AddPersonDialog({ ownerId, onClose, onCreated }: { ownerId: string; onClose: () => void; onCreated: (credentials: Credentials) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
      const created = await ownerApi.addPerson(ownerId, { name: name.trim(), email: email.trim() });
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
      title="Add a person"
      subtitle="They can see and manage every property of this company."
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
        {error ? (
          <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text sm:col-span-2">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

/** The people who can sign in for one owner company. At least one of them always stays switched on. */
export function OwnerPeoplePanel({ ownerId }: { ownerId: string }) {
  const people = useApiResource(() => ownerApi.people(ownerId), [ownerId]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const toggle = async (person: PersonRow, isActive: boolean) => {
    setBusy(person.id);
    try {
      await ownerApi.updatePerson(ownerId, person.id, { isActive });
      toast(isActive ? 'Switched on' : 'Switched off', { detail: person.name, tone: 'success' });
      people.refresh();
    } catch (cause) {
      toast('Could not save the change', { detail: displayError(cause), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const reset = async (person: PersonRow) => {
    setBusy(person.id);
    try {
      const { temporaryPassword } = await ownerApi.resetPassword(ownerId, person.id);
      setCredentials({ name: person.name, email: person.email, password: temporaryPassword });
    } catch (cause) {
      toast('Could not reset the password', { detail: displayError(cause), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const list = people.data;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-label text-ink-secondary">Everyone here can sign in for the company and sees all of its properties.</p>
        <Button variant="primary" onClick={() => setAdding(true)} icon={<Lucide.UserPlus size={14} />}>
          Add person
        </Button>
      </div>

      {!list && people.loading ? (
        <CardSkeleton lines={3} label="Loading people" />
      ) : people.error && !list ? (
        <p role="alert" className="py-6 text-center text-label text-danger-text">
          Could not load the people: {people.error}
        </p>
      ) : list ? (
        <TableContainer>
          <table className="pms-table w-full text-left">
            <thead>
              <tr>
                <th>PERSON</th>
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
                    <Switch label={`${person.name} can sign in`} checked={person.isActive} disabled={busy === person.id} onChange={(next) => void toggle(person, next)} />
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
      ) : null}

      {adding ? (
        <AddPersonDialog
          ownerId={ownerId}
          onClose={() => setAdding(false)}
          onCreated={(created) => {
            setAdding(false);
            setCredentials(created);
            people.refresh();
          }}
        />
      ) : null}
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}
