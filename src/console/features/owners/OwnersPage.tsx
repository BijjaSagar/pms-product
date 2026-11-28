import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { CardSkeleton } from '../../../shared/components/feedback/Skeleton';
import { CredentialsDialog } from '../../../shared/components/ui/CredentialsDialog';
import type { Credentials } from '../../../shared/components/ui/CredentialsDialog';
import { Field, Switch } from '../../../shared/components/ui/controls';
import { Badge, Card, CardTitle, TableContainer } from '../../../shared/components/ui/display';
import { Modal } from '../../../shared/components/ui/overlays';
import { Button, IconButton, SelectField, TextField } from '../../../shared/components/ui/primitives';
import { useAuth } from '../../../shared/features/auth/AuthContext';
import { displayError } from '../../../shared/services/errors';
import { managerApi } from '../../../shared/services/managerApi';
import { ownerApi } from '../../../shared/services/ownerApi';
import type { OwnerRow } from '../../../shared/services/ownerApi';
import { useApiResource } from '../../../shared/services/useApiResource';
import { toast } from '../../../shared/utils/toast';
import { OwnerPeoplePanel } from './OwnerPeoplePanel';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NO_MANAGER = '';

/** Only the Super Super Admin chooses a manager; for a Relationship Manager an owner is always their own. */
function ManagerSelect({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const managers = useApiResource(() => managerApi.list(), []);
  return (
    <Field label="Relationship manager" hint="Leave empty to look after this owner directly from the platform.">
      <SelectField value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled || !managers.data}>
        <option value={NO_MANAGER}>No manager</option>
        {(managers.data ?? []).map((m) => (
          <option key={m.id} value={m.id} disabled={!m.isActive}>
            {m.name} ({m.ownerCount}/{m.maxOwners} owners){m.isActive ? '' : ' · off'}
          </option>
        ))}
      </SelectField>
    </Field>
  );
}

function CreateOwnerDialog({ canPickManager, onClose, onCreated }: { canPickManager: boolean; onClose: () => void; onCreated: (credentials: Credentials) => void }) {
  const [name, setName] = useState('');
  const [personName, setPersonName] = useState('');
  const [email, setEmail] = useState('');
  const [rmId, setRmId] = useState(NO_MANAGER);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = {
    name: name.trim().length < 2 ? 'Enter the owner company name.' : undefined,
    personName: personName.trim().length < 2 ? "Enter the person's full name." : undefined,
    email: !EMAIL.test(email.trim()) ? 'Enter a valid email address.' : undefined,
  };

  const save = async () => {
    setAttempted(true);
    if (errors.name || errors.personName || errors.email) return;
    setSaving(true);
    setError(null);
    try {
      const created = await ownerApi.create({
        name: name.trim(),
        person: { name: personName.trim(), email: email.trim() },
        ...(canPickManager ? { rmId: rmId || null } : {}),
      });
      onCreated({ name: created.person.name, email: created.person.email, password: created.person.temporaryPassword });
    } catch (cause) {
      setError(displayError(cause));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add an owner"
      subtitle="An owner is a company that owns properties. Add the first person who will sign in for it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={saving} icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Check size={14} />}>
            {saving ? 'Adding…' : 'Add owner'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 py-2 sm:grid-cols-2">
        <Field label="Owner company" required error={attempted ? errors.name : undefined} className="sm:col-span-2">
          <TextField autoFocus value={name} maxLength={150} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="First person's name" required error={attempted ? errors.personName : undefined}>
          <TextField value={personName} maxLength={150} onChange={(e) => setPersonName(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Their email address" required error={attempted ? errors.email : undefined}>
          <TextField type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </Field>
        {canPickManager ? (
          <div className="sm:col-span-2">
            <ManagerSelect value={rmId} onChange={setRmId} />
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text sm:col-span-2">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function EditOwnerDialog({ owner, canPickManager, onClose, onSaved }: { owner: OwnerRow; canPickManager: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(owner.name);
  const [isActive, setIsActive] = useState(owner.isActive);
  const [rmId, setRmId] = useState(owner.rmId ?? NO_MANAGER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameError = name.trim().length < 2 ? 'Enter the owner company name.' : undefined;

  const save = async () => {
    if (nameError) return;
    setSaving(true);
    setError(null);
    try {
      await ownerApi.update(owner.id, {
        name: name.trim(),
        isActive,
        ...(canPickManager && rmId !== (owner.rmId ?? NO_MANAGER) ? { rmId: rmId || null } : {}),
      });
      toast('Owner saved', { detail: name.trim(), tone: 'success' });
      onSaved();
    } catch (cause) {
      setError(displayError(cause));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${owner.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={saving} icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Check size={14} />}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3.5 py-2">
        <Field label="Owner company" required error={nameError}>
          <TextField autoFocus value={name} maxLength={150} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        {canPickManager ? <ManagerSelect value={rmId} onChange={setRmId} /> : null}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <span>
            <span className="block text-body font-semibold text-ink">Switched on</span>
            <span className="block text-label text-ink-secondary">Off stops its people and the staff of all its properties from signing in.</span>
          </span>
          <Switch label="Owner switched on" checked={isActive} onChange={setIsActive} />
        </div>
        {error ? (
          <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

type Dialog = { kind: 'none' } | { kind: 'create' } | { kind: 'edit'; owner: OwnerRow } | { kind: 'people'; owner: OwnerRow };

/** The Super Super Admin's owners, or a Relationship Manager's own. */
export function OwnersPage() {
  const { isSuperAdmin } = useAuth();
  const owners = useApiResource(() => ownerApi.list(), []);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const list = owners.data;
  const close = () => setDialog({ kind: 'none' });

  return (
    <Card>
      <CardTitle
        title="Owners"
        subtitle={isSuperAdmin ? 'Companies that own properties, and the manager looking after each.' : 'The owner companies you look after.'}
        icon={Lucide.Briefcase}
        action={
          <Button variant="primary" onClick={() => setDialog({ kind: 'create' })} icon={<Lucide.Plus size={14} />}>
            Add owner
          </Button>
        }
      />

      {!list && owners.loading ? (
        <CardSkeleton lines={5} label="Loading owners" />
      ) : owners.error && !list ? (
        <p role="alert" className="py-6 text-center text-label text-danger-text">
          Could not load the owners: {owners.error}
        </p>
      ) : list && list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Lucide.Briefcase size={28} className="text-ink-muted" aria-hidden="true" />
          <p className="text-body font-semibold text-ink">No owners yet</p>
          <p className="text-label text-ink-secondary">Add an owner company to get started. They add their own properties.</p>
        </div>
      ) : list ? (
        <div className={`mt-3 ${owners.loading ? 'opacity-60' : ''}`} aria-busy={owners.loading}>
          <TableContainer>
            <table className="pms-table w-full text-left">
              <thead>
                <tr>
                  <th>OWNER</th>
                  {isSuperAdmin ? <th>MANAGER</th> : null}
                  <th>PROPERTIES</th>
                  <th>PEOPLE</th>
                  <th className="text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {list.map((owner) => (
                  <tr key={owner.id}>
                    <td>
                      <span className="flex items-center gap-2 text-label font-semibold text-ink">
                        {owner.name}
                        {!owner.isActive ? (
                          <Badge tone="neutral" size="sm">
                            Off
                          </Badge>
                        ) : null}
                      </span>
                    </td>
                    {isSuperAdmin ? <td className="text-label text-ink-secondary">{owner.rmName ?? 'None (direct)'}</td> : null}
                    <td className="tnum text-label text-ink-secondary">{owner.propertyCount}</td>
                    <td className="tnum text-label text-ink-secondary">{owner.peopleCount}</td>
                    <td className="text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <IconButton title={`People of ${owner.name}`} aria-label={`People of ${owner.name}`} onClick={() => setDialog({ kind: 'people', owner })}>
                          <Lucide.Users size={14} />
                        </IconButton>
                        <IconButton title={`Edit ${owner.name}`} aria-label={`Edit ${owner.name}`} onClick={() => setDialog({ kind: 'edit', owner })}>
                          <Lucide.Pencil size={14} />
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

      {dialog.kind === 'create' ? (
        <CreateOwnerDialog
          canPickManager={isSuperAdmin}
          onClose={close}
          onCreated={(created) => {
            close();
            setCredentials(created);
            owners.refresh();
          }}
        />
      ) : null}
      {dialog.kind === 'edit' ? (
        <EditOwnerDialog
          owner={dialog.owner}
          canPickManager={isSuperAdmin}
          onClose={close}
          onSaved={() => {
            close();
            owners.refresh();
          }}
        />
      ) : null}
      {dialog.kind === 'people' ? (
        <Modal
          open
          wide
          onClose={() => {
            close();
            owners.refresh();
          }}
          title={`${dialog.owner.name} · people`}
          subtitle="Who can sign in for this owner company."
          footer={
            <Button
              variant="primary"
              onClick={() => {
                close();
                owners.refresh();
              }}
            >
              Done
            </Button>
          }
        >
          <div className="py-2">
            <OwnerPeoplePanel ownerId={dialog.owner.id} />
          </div>
        </Modal>
      ) : null}
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </Card>
  );
}
