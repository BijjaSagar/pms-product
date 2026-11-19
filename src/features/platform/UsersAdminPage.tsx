import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Avatar, Badge, Card, CardTitle, TableContainer } from '../../components/ui';
import { Field, FilterChip, Pagination, Switch } from '../../components/controls';
import { CardSkeleton } from '../../components/Skeleton';
import { Modal } from '../../components/overlays';
import { Button, IconButton, SelectField, TextField } from '../../components/primitives';
import { toast } from '../../utils/toast';
import { displayApiError } from '../../lib/api/client';
import { propertyApi, userAdminApi } from '../../lib/api/pms';
import type { AdminUser, AdminUserPage, PropertyDetails, UserRoleKey } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { MIN_PASSWORD } from '../auth/passwordRules';
import { useAuth } from '../auth/AuthContext';
import { CredentialsDialog } from './CredentialsDialog';
import type { Credentials } from './CredentialsDialog';
import { generatePassword } from './password';
import { PropertyMultiSelect } from './PropertyMultiSelect';
import { useDebouncedValue } from './useDebouncedValue';

const PAGE_SIZE = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RoleFilter = 'all' | UserRoleKey;
type StatusFilter = 'all' | 'active' | 'inactive';

const ROLE_LABEL: Record<UserRoleKey, string> = { SUPER_ADMIN: 'Super admin', STAFF: 'Staff' };

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

/** Where a person can work: every property, or the codes of the ones assigned to them. */
function PropertyBadges({ user }: { user: AdminUser }) {
  if (user.role === 'SUPER_ADMIN') return <span className="text-label text-ink-secondary">All properties</span>;
  if (user.properties.length === 0) {
    return (
      <Badge tone="warning" size="sm">
        None assigned
      </Badge>
    );
  }
  const first = user.properties.slice(0, 3);
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {first.map((p) => (
        <Badge key={p.id} tone={p.isActive ? 'neutral' : 'warning'} size="sm">
          {p.code}
        </Badge>
      ))}
      {user.properties.length > first.length ? <span className="text-label text-ink-muted">+{user.properties.length - first.length}</span> : null}
    </span>
  );
}

function StatusBadges({ user }: { user: AdminUser }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge tone={user.isActive ? 'success' : 'danger'} size="sm" dot>
        {user.isActive ? 'Active' : 'Inactive'}
      </Badge>
      {user.mustChangePassword ? (
        <Badge tone="info" size="sm">
          Password not set
        </Badge>
      ) : null}
    </span>
  );
}

/** A password field that shows what it holds, with a button for a fresh random one. */
function PasswordInput({ value, onChange, autoFocus = false }: { value: string; onChange: (value: string) => void; autoFocus?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <TextField value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" autoFocus={autoFocus} className="font-mono" />
      <IconButton title="Generate a password" aria-label="Generate a password" onClick={() => onChange(generatePassword())}>
        <Lucide.Shuffle size={14} />
      </IconButton>
    </div>
  );
}

function CreateUserDialog({
  properties,
  onClose,
  onCreated,
}: {
  properties: PropertyDetails[];
  onClose: () => void;
  onCreated: (user: AdminUser, password: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRoleKey>('STAFF');
  const [password, setPassword] = useState(() => generatePassword());
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = {
    name: name.trim().length < 2 ? 'Enter a name.' : undefined,
    email: !EMAIL.test(email.trim()) ? 'Enter a valid email address.' : undefined,
    password: password.length < MIN_PASSWORD ? `Use at least ${MIN_PASSWORD} characters.` : undefined,
  };

  const save = async () => {
    setAttempted(true);
    if (errors.name || errors.email || errors.password) return;
    setSaving(true);
    setError(null);
    try {
      const created = await userAdminApi.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        ...(role === 'STAFF' && propertyIds.length > 0 ? { propertyIds } : {}),
      });
      onCreated(created, password);
    } catch (cause) {
      setError(displayApiError(cause));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add a user"
      subtitle="You choose their first password; they replace it when they first sign in."
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void save()}
            disabled={saving}
            icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.UserPlus size={14} />}
          >
            {saving ? 'Creating…' : 'Create user'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 py-2 sm:grid-cols-2">
        <Field label="Full name" required error={attempted ? errors.name : undefined}>
          <TextField autoFocus value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Email" required error={attempted ? errors.email : undefined}>
          <TextField type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Role" hint={role === 'SUPER_ADMIN' ? 'Reaches every property and manages users.' : 'Works at the properties chosen below.'}>
          <SelectField value={role} onChange={(e) => setRole(e.target.value as UserRoleKey)}>
            <option value="STAFF">Staff</option>
            <option value="SUPER_ADMIN">Super admin</option>
          </SelectField>
        </Field>
        <Field label="First password" required error={attempted ? errors.password : undefined}>
          <PasswordInput value={password} onChange={setPassword} />
        </Field>
        {role === 'STAFF' ? (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="pms-label">Properties</span>
            <PropertyMultiSelect properties={properties} value={propertyIds} onChange={setPropertyIds} />
            <span className="pms-helper">They cannot sign in until at least one active property is assigned. You can change this any time.</span>
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

function ManageUserDialog({
  user,
  properties,
  isSelf,
  onClose,
  onSaved,
  onPasswordReset,
}: {
  user: AdminUser;
  properties: PropertyDetails[];
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
  onPasswordReset: (user: AdminUser, password: string) => void;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<UserRoleKey>(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [propertyIds, setPropertyIds] = useState(() => user.properties.map((p) => p.id));
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameProblem = name.trim().length < 2 ? 'Enter a name.' : undefined;

  const save = async () => {
    if (nameProblem) return;
    setSaving(true);
    setError(null);
    try {
      const changes: { name?: string; role?: UserRoleKey; isActive?: boolean } = {};
      if (name.trim() !== user.name) changes.name = name.trim();
      if (role !== user.role) changes.role = role;
      if (isActive !== user.isActive) changes.isActive = isActive;
      const updated = Object.keys(changes).length > 0 ? await userAdminApi.update(user.id, changes) : user;
      // Promoting to super admin clears their properties on the server, so there is nothing left to set.
      if (updated.role === 'STAFF' && !sameSet(propertyIds, updated.properties.map((p) => p.id))) {
        await userAdminApi.setProperties(user.id, propertyIds);
      }
      toast('User saved', { detail: name.trim(), tone: 'success' });
      onSaved();
    } catch (cause) {
      setError(displayApiError(cause));
      setSaving(false);
    }
  };

  const reset = async () => {
    if (newPassword.length < MIN_PASSWORD) {
      setError(`Use a password of at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await userAdminApi.resetPassword(user.id, newPassword);
      onPasswordReset(user, newPassword);
    } catch (cause) {
      setError(displayApiError(cause));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Manage ${user.name}`}
      subtitle={user.email}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void save()}
            disabled={saving || !!nameProblem}
            icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 py-2 sm:grid-cols-2">
        <Field label="Full name" error={nameProblem}>
          <TextField value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Role" hint={isSelf ? 'You cannot change your own role.' : undefined}>
          <SelectField value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value as UserRoleKey)}>
            <option value="STAFF">Staff</option>
            <option value="SUPER_ADMIN">Super admin</option>
          </SelectField>
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 sm:col-span-2">
          <div className="min-w-0">
            <p className="text-body font-semibold text-ink">Can sign in</p>
            <p className="text-label text-ink-secondary">{isSelf ? 'You cannot deactivate your own account.' : 'Switching this off signs them out everywhere.'}</p>
          </div>
          <Switch checked={isActive} onChange={setIsActive} disabled={isSelf} label="Can sign in" />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="pms-label">Properties</span>
          {role === 'SUPER_ADMIN' ? (
            <p className="rounded-xl border border-border bg-muted-surface/60 p-3 text-label text-ink-secondary">
              A super admin reaches every property, so none are assigned.{user.role === 'STAFF' ? ' Saving removes the ones this user has now.' : ''}
            </p>
          ) : (
            <>
              <PropertyMultiSelect properties={properties} value={propertyIds} onChange={setPropertyIds} />
              <span className="pms-helper">Applied on their next request; they do not need to sign in again.</span>
            </>
          )}
        </div>

        <div className="rounded-xl border border-border p-3 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-body font-semibold text-ink">Password</p>
              <p className="text-label text-ink-secondary">
                {isSelf ? 'Change your own password from your profile menu.' : 'Set a new one for them. They are signed out and must replace it.'}
              </p>
            </div>
            {!isSelf && !resetting ? (
              <Button
                variant="secondary"
                icon={<Lucide.KeyRound size={14} />}
                onClick={() => {
                  setNewPassword(generatePassword());
                  setResetting(true);
                }}
              >
                Reset password
              </Button>
            ) : null}
          </div>
          {resetting ? (
            <div className="mt-3 flex flex-col gap-2.5">
              <PasswordInput value={newPassword} onChange={setNewPassword} autoFocus />
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" onClick={() => void reset()} disabled={saving} icon={<Lucide.KeyRound size={14} />}>
                  Reset and sign out
                </Button>
                <Button variant="secondary" onClick={() => setResetting(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text sm:col-span-2">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

type Dialog = { kind: 'none' } | { kind: 'create' } | { kind: 'manage'; user: AdminUser };

/** SUPER_ADMIN only: every account, and which properties each STAFF user can open. */
export function UsersAdmin() {
  const { me } = useAuth();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [propertyId, setPropertyId] = useState('');
  const [page, setPage] = useState(0);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const search = useDebouncedValue(query.trim());
  const propertyList = useApiResource(() => propertyApi.list(), []);
  const properties = useMemo(() => propertyList.data ?? [], [propertyList.data]);

  const users = useApiResource(
    () =>
      userAdminApi.list({
        search: search || undefined,
        role: role === 'all' ? undefined : role,
        isActive: status === 'all' ? undefined : status === 'active',
        propertyId: propertyId || undefined,
        page: page + 1,
        pageSize: PAGE_SIZE,
      }),
    [search, role, status, propertyId, page],
  );
  // Keep showing the last page while the next one loads, so typing in the search box does not blank the list.
  const [lastPage, setLastPage] = useState<AdminUserPage | null>(null);
  if (users.data && users.data !== lastPage) setLastPage(users.data);
  const result = users.data ?? lastPage;
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));
  const filtered = query.trim() !== '' || role !== 'all' || status !== 'all' || propertyId !== '';

  const resetPaging = () => setPage(0);
  const closeDialog = () => setDialog({ kind: 'none' });

  const roleChips: { id: RoleFilter; label: string }[] = [
    { id: 'all', label: 'Everyone' },
    { id: 'STAFF', label: 'Staff' },
    { id: 'SUPER_ADMIN', label: 'Super admins' },
  ];
  const statusChips: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Any status' },
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
  ];

  return (
    <div className="pms-page gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-primary-foreground shadow-xs shadow-primary/20">
            <Lucide.Users size={20} strokeWidth={2.4} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-disp3 font-bold leading-tight tracking-tight text-ink">Users &amp; access</h1>
            <p className="mt-0.5 text-label text-ink-secondary">Accounts, and which properties each person can open.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton title="Refresh users" aria-label="Refresh users" onClick={() => users.refresh()}>
            <Lucide.RefreshCw size={14} className={users.loading ? 'animate-spin' : ''} />
          </IconButton>
          <Button variant="primary" onClick={() => setDialog({ kind: 'create' })} icon={<Lucide.UserPlus size={15} strokeWidth={2.4} />}>
            Add user
          </Button>
        </div>
      </header>

      <Card>
        <CardTitle
          icon={Lucide.Users}
          title="People"
          subtitle={result ? `${result.total} ${result.total === 1 ? 'person' : 'people'}${filtered ? ' match' : ''}` : 'Loading people…'}
        />

        {users.error ? (
          <p role="alert" className="mb-3 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            Could not load users: {users.error}
          </p>
        ) : null}

        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-sm">
              <Lucide.Search size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <TextField
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  resetPaging();
                }}
                placeholder="Search by name or email"
                aria-label="Search people"
                className="!pl-8"
              />
            </div>
            <div className="w-full lg:max-w-xs">
              <SelectField
                value={propertyId}
                aria-label="Filter by property"
                onChange={(e) => {
                  setPropertyId(e.target.value);
                  resetPaging();
                }}
              >
                <option value="">All properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
          <div className="pms-chip-row gap-2" role="group" aria-label="Filter people">
            {roleChips.map((chip) => (
              <FilterChip
                key={chip.id}
                active={role === chip.id}
                onClick={() => {
                  setRole(chip.id);
                  resetPaging();
                }}
              >
                {chip.label}
              </FilterChip>
            ))}
            <span className="mx-1 hidden h-6 w-px self-center bg-divider sm:block" aria-hidden="true" />
            {statusChips.map((chip) => (
              <FilterChip
                key={chip.id}
                active={status === chip.id}
                onClick={() => {
                  setStatus(chip.id);
                  resetPaging();
                }}
              >
                {chip.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {!result && users.loading ? (
          <CardSkeleton lines={5} label="Loading people" />
        ) : result && result.data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Lucide.UserSearch size={28} className="text-ink-muted" aria-hidden="true" />
            <p className="text-body font-semibold text-ink">{filtered ? 'No one matches' : 'No users yet'}</p>
            <p className="text-label text-ink-secondary">{filtered ? 'Try a different search or filter.' : 'Add the first person with the button above.'}</p>
            {filtered ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  setRole('all');
                  setStatus('all');
                  setPropertyId('');
                  resetPaging();
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : result ? (
          <div className={users.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={users.loading}>
            {/* Phones: one card per person. */}
            <ul className="flex flex-col gap-2.5 md:hidden">
              {result.data.map((user) => (
                <li key={user.id} className="rounded-xl border border-border bg-surface p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={user.name} size={38} />
                      <div className="min-w-0">
                        <p className="truncate text-body font-semibold text-ink">{user.name}</p>
                        <p className="truncate text-label text-ink-secondary">{user.email}</p>
                      </div>
                    </div>
                    <IconButton title={`Manage ${user.name}`} aria-label={`Manage ${user.name}`} onClick={() => setDialog({ kind: 'manage', user })}>
                      <Lucide.Pencil size={14} />
                    </IconButton>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={user.role === 'SUPER_ADMIN' ? 'info' : 'neutral'} size="sm">
                        {ROLE_LABEL[user.role]}
                      </Badge>
                      <StatusBadges user={user} />
                    </span>
                    <PropertyBadges user={user} />
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablet and up: the same people as a table. */}
            <div className="hidden md:block">
              <TableContainer>
                <table className="pms-table w-full text-left">
                  <thead>
                    <tr>
                      <th>PERSON</th>
                      <th>ROLE</th>
                      <th>PROPERTIES</th>
                      <th>STATUS</th>
                      <th className="text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar name={user.name} size={36} />
                            <div className="min-w-0">
                              <p className="truncate text-label font-semibold text-ink">{user.name}</p>
                              <p className="truncate text-label text-ink-secondary">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge tone={user.role === 'SUPER_ADMIN' ? 'info' : 'neutral'} size="sm">
                            {ROLE_LABEL[user.role]}
                          </Badge>
                        </td>
                        <td>
                          <PropertyBadges user={user} />
                        </td>
                        <td>
                          <StatusBadges user={user} />
                        </td>
                        <td className="text-right">
                          <Button variant="secondary" onClick={() => setDialog({ kind: 'manage', user })} icon={<Lucide.Pencil size={13} />}>
                            Manage
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </div>

            <div className="mt-4">
              <Pagination
                page={Math.min(page, totalPages - 1)}
                totalPages={totalPages}
                onChange={setPage}
                summary={`Showing ${page * PAGE_SIZE + 1} to ${Math.min((page + 1) * PAGE_SIZE, result.total)} of ${result.total} people`}
              />
            </div>
          </div>
        ) : null}
      </Card>

      {dialog.kind === 'create' ? (
        <CreateUserDialog
          properties={properties}
          onClose={closeDialog}
          onCreated={(created, password) => {
            closeDialog();
            setCredentials({ name: created.name, email: created.email, password });
            users.refresh();
          }}
        />
      ) : null}
      {dialog.kind === 'manage' ? (
        <ManageUserDialog
          user={dialog.user}
          properties={properties}
          isSelf={dialog.user.id === me?.user.id}
          onClose={closeDialog}
          onSaved={() => {
            closeDialog();
            users.refresh();
          }}
          onPasswordReset={(target, password) => {
            closeDialog();
            setCredentials({ name: target.name, email: target.email, password });
            users.refresh();
          }}
        />
      ) : null}
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}
