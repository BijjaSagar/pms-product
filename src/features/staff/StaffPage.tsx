import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Avatar, Badge, Card, CardTitle, TableContainer } from '../../components/ui';
import { Field, FilterChip, Pagination } from '../../components/controls';
import { PageTabs } from '../../components/PageTabs';
import type { PageTab } from '../../components/PageTabs';
import { SummaryStrip } from '../../components/SummaryStrip';
import type { SummaryItem } from '../../components/SummaryStrip';
import { CardSkeleton } from '../../components/Skeleton';
import { Modal } from '../../components/overlays';
import { Button, IconButton, SelectField, TextField } from '../../components/primitives';
import type { BadgeTone } from '../../utils/status';
import { toast } from '../../utils/toast';
import { adminApi } from '../../lib/api/pms';
import type { RoleRow } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { useAuth } from '../../features/auth/AuthContext';

type StaffRow = {
  userId: string;
  email: string;
  fullName: string;
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
  roleKey: string;
  roleName: string;
  invitePending: boolean;
  inviteExpired: boolean;
  membershipActive: boolean;
};

type StaffTab = 'people' | 'roles';
type StatusFilter = 'all' | 'active' | 'invited' | 'disabled';

const PAGE_SIZE = 8;

const isActive = (row: StaffRow) => row.status === 'ACTIVE' && row.membershipActive;
const isInvited = (row: StaffRow) => row.status === 'INVITED';
const isDisabled = (row: StaffRow) => row.status === 'DISABLED' || !row.membershipActive;

const roleTone = (role: string): BadgeTone => {
  const r = role.toLowerCase();
  if (r.includes('admin') || r.includes('owner')) return 'info';
  if (r.includes('manager')) return 'success';
  return 'neutral';
};

const statusBadge = (row: StaffRow): { label: string; tone: BadgeTone } =>
  row.status === 'ACTIVE' ? { label: 'Active', tone: 'success' } : row.status === 'INVITED' ? { label: 'Pending', tone: 'warning' } : { label: 'Inactive', tone: 'danger' };

/** The badges one person carries: role, account status and, if there is one, the invitation state. */
function PersonBadges({ row }: { row: StaffRow }) {
  const status = statusBadge(row);
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge tone={roleTone(row.roleName || row.roleKey)} size="sm">{row.roleName || row.roleKey || 'Viewer'}</Badge>
      <Badge tone={status.tone} size="sm" dot>{status.label}</Badge>
      {row.invitePending ? <Badge tone="warning" size="sm">Invite pending</Badge> : row.inviteExpired ? <Badge tone="danger" size="sm">Invite expired</Badge> : null}
    </span>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Staff() {
  const { me, can } = useAuth();
  const load = useCallback(async () => {
    const [staff, roles, matrix] = await Promise.all([
      adminApi.users(),
      can('role.read') ? adminApi.roles() : Promise.resolve([]),
      can('role.read') ? adminApi.matrix() : Promise.resolve(null),
    ]);
    return { staff: staff as StaffRow[], roles, matrix };
  }, [can]);
  const resource = useApiResource(load);
  const rows = useMemo(() => resource.data?.staff ?? [], [resource.data?.staff]);
  const roles = resource.data?.roles ?? [];
  const matrix = resource.data?.matrix ?? null;

  const [tab, setTab] = useState<StaffTab>('people');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [email, setEmail] = useState('');
  const [roleKey, setRoleKey] = useState('FRONT_DESK');
  const [fullName, setFullName] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  const counts = { all: rows.length, active: rows.filter(isActive).length, invited: rows.filter(isInvited).length, disabled: rows.filter(isDisabled).length };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((row) => {
      if (status === 'active' && !isActive(row)) return false;
      if (status === 'invited' && !isInvited(row)) return false;
      if (status === 'disabled' && !isDisabled(row)) return false;
      return !needle || row.fullName.toLowerCase().includes(needle) || row.email.toLowerCase().includes(needle) || row.roleName.toLowerCase().includes(needle);
    });
  }, [rows, q, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const canManage = can('user.update') || can('role.assign') || can('user.deactivate');

  const openInvite = () => {
    setIsNew(true);
    setEditing(null);
    setAttempted(false);
    setFullName('');
    setEmail('');
    setRoleKey(roles[0]?.key ?? 'FRONT_DESK');
  };

  const closeDialog = () => {
    setEditing(null);
    setIsNew(false);
    setAttempted(false);
  };

  const inviteErrors = {
    fullName: fullName.trim() === '' ? 'Enter a name.' : undefined,
    email: !EMAIL.test(email.trim()) ? 'Enter a valid email address.' : undefined,
  };

  const save = async () => {
    if (isNew) {
      setAttempted(true);
      if (inviteErrors.fullName || inviteErrors.email) return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const invited = await adminApi.invite({ email: email.trim(), fullName: fullName.trim(), roleKey, propertyId: me?.activePropertyId ?? undefined });
        toast('Invitation created', { detail: `Share this link with ${invited.email}: ${window.location.origin}${invited.acceptUrl}`, tone: 'success' });
      } else if (editing) {
        const original = rows.find((row) => row.userId === editing.userId);
        if (can('user.update') && editing.fullName.trim() && editing.fullName !== original?.fullName) await adminApi.updateUser(editing.userId, { fullName: editing.fullName.trim() });
        if (can('role.assign') && editing.roleKey !== original?.roleKey && me?.activePropertyId) {
          await adminApi.setRole(editing.userId, me.activePropertyId, editing.roleKey);
        }
        if (can('user.deactivate') && editing.status !== original?.status && editing.status !== 'INVITED') {
          await adminApi.setUserStatus(editing.userId, editing.status);
        }
        toast('Staff record saved', { detail: editing.fullName, tone: 'success' });
      }
      closeDialog();
      setEmail('');
      setFullName('');
      resource.refresh();
    } catch (error) {
      toast('Could not save staff record', { detail: displayApiError(error), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const updateInvite = async (action: 'reissue' | 'cancel') => {
    if (!editing) return;
    try {
      if (action === 'reissue') {
        const result = await adminApi.reissueInvite(editing.userId);
        toast('Invitation reissued', { detail: `Share this link: ${window.location.origin}${result.acceptUrl}`, tone: 'success' });
      } else {
        await adminApi.cancelInvite(editing.userId);
        toast('Invitation cancelled', { detail: editing.email, tone: 'success' });
      }
      setEditing(null);
      resource.refresh();
    } catch (error) {
      toast(`Could not ${action} invitation`, { detail: displayApiError(error), tone: 'danger' });
    }
  };

  const summary: SummaryItem[] = [
    { label: 'Active staff', value: String(counts.active), hint: 'Can sign in now', icon: Lucide.UserCheck, tone: 'success' },
    { label: 'Invited', value: String(counts.invited), hint: 'Waiting to accept', icon: Lucide.MailPlus, tone: 'warning' },
    { label: 'Disabled', value: String(counts.disabled), hint: 'Cannot sign in', icon: Lucide.UserX, tone: 'danger' },
    { label: 'Roles', value: String(roles.length), hint: 'Access levels', icon: Lucide.ShieldCheck, tone: 'primary' },
  ];

  const tabs: PageTab<StaffTab>[] = [
    { id: 'people', label: 'People', icon: Lucide.Users, badge: rows.length },
    ...(matrix || roles.length ? [{ id: 'roles' as const, label: 'Roles & permissions', icon: Lucide.KeyRound, badge: roles.length }] : []),
  ];

  const filterChips: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: `All · ${counts.all}` },
    { id: 'active', label: `Active · ${counts.active}` },
    { id: 'invited', label: `Invited · ${counts.invited}` },
    { id: 'disabled', label: `Disabled · ${counts.disabled}` },
  ];

  return (
    <div className="pms-page gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-primary-foreground shadow-xs shadow-primary/20">
            <Lucide.ShieldCheck size={20} strokeWidth={2.4} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-disp3 font-bold leading-tight tracking-tight text-ink">Staff &amp; Access</h1>
            <p className="mt-0.5 text-label text-ink-secondary">Team members, invitations and what each role can do.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton title="Refresh staff" aria-label="Refresh staff" onClick={() => resource.refresh()}>
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
          </IconButton>
          {can('user.invite') ? (
            <Button variant="primary" onClick={openInvite} icon={<Lucide.UserPlus size={15} strokeWidth={2.4} />}>
              Invite staff
            </Button>
          ) : null}
        </div>
      </header>

      <SummaryStrip label="Staff summary" items={summary} columns="xs:grid-cols-2 lg:grid-cols-4" />

      {tabs.length > 1 ? (
        <PageTabs label="Staff sections" idPrefix="staff" panelId="staff-panel" tabs={tabs} active={tab} onChange={setTab} />
      ) : null}

      <div id="staff-panel" role="tabpanel" aria-labelledby={`staff-tab-${tab}`} className="flex min-w-0 flex-col gap-5">
        {tab === 'people' ? (
          <Card>
            <CardTitle
              icon={Lucide.Users}
              title="People"
              subtitle={resource.loading ? 'Loading people…' : `${rows.length} ${rows.length === 1 ? 'person has' : 'people have'} access to this property`}
            />

            {resource.error ? (
              <p role="alert" className="mb-3 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
                Could not load users: {resource.error}
              </p>
            ) : null}

            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Lucide.Search size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <TextField
                  type="search"
                  value={q}
                  onChange={(event) => {
                    setQ(event.target.value);
                    setPage(0);
                  }}
                  placeholder="Search by name, email or role"
                  aria-label="Search people"
                  className="!pl-8"
                />
              </div>
              <div className="pms-chip-row gap-2" role="group" aria-label="Filter by status">
                {filterChips.map((chip) => (
                  <FilterChip
                    key={chip.id}
                    active={status === chip.id}
                    onClick={() => {
                      setStatus(chip.id);
                      setPage(0);
                    }}
                  >
                    {chip.label}
                  </FilterChip>
                ))}
              </div>
            </div>

            {resource.loading && rows.length === 0 ? (
              <CardSkeleton lines={5} label="Loading people" />
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Lucide.UserSearch size={28} className="text-ink-muted" aria-hidden="true" />
                <p className="text-body font-semibold text-ink">No one matches</p>
                <p className="text-label text-ink-secondary">Try a different search or filter.</p>
                {q || status !== 'all' ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQ('');
                      setStatus('all');
                      setPage(0);
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>
            ) : (
              <>
                {/* Phones: one card per person. */}
                <ul className="flex flex-col gap-2.5 md:hidden">
                  {visible.map((row) => (
                    <li key={row.userId} className="rounded-xl border border-border bg-surface p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar name={row.fullName} size={38} />
                          <div className="min-w-0">
                            <p className="truncate text-body font-semibold text-ink">{row.fullName}</p>
                            <p className="truncate text-label text-ink-secondary">{row.email}</p>
                          </div>
                        </div>
                        {canManage ? (
                          <IconButton title={`Manage ${row.fullName}`} aria-label={`Manage ${row.fullName}`} onClick={() => { setEditing({ ...row }); setIsNew(false); }}>
                            <Lucide.Pencil size={14} />
                          </IconButton>
                        ) : null}
                      </div>
                      <div className="mt-3">
                        <PersonBadges row={row} />
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
                          <th>STATUS</th>
                          <th>INVITATION</th>
                          <th className="text-right">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((row) => {
                          const st = statusBadge(row);
                          return (
                            <tr key={row.userId}>
                              <td>
                                <div className="flex items-center gap-3">
                                  <Avatar name={row.fullName} size={36} />
                                  <div className="min-w-0">
                                    <p className="truncate text-label font-semibold text-ink">{row.fullName}</p>
                                    <p className="truncate text-label text-ink-secondary">{row.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td><Badge tone={roleTone(row.roleName || row.roleKey)} size="sm">{row.roleName || row.roleKey || 'Viewer'}</Badge></td>
                              <td><Badge tone={st.tone} size="sm" dot>{st.label}</Badge></td>
                              <td>
                                {row.invitePending ? <Badge tone="warning" size="sm">Pending</Badge> : row.inviteExpired ? <Badge tone="danger" size="sm">Expired</Badge> : <span className="text-label text-ink-muted">—</span>}
                              </td>
                              <td className="text-right">
                                {canManage ? (
                                  <Button variant="secondary" onClick={() => { setEditing({ ...row }); setIsNew(false); }} icon={<Lucide.Pencil size={13} />}>
                                    Manage
                                  </Button>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </TableContainer>
                </div>

                <div className="mt-4">
                  <Pagination
                    page={safePage}
                    totalPages={totalPages}
                    onChange={setPage}
                    summary={`Showing ${safePage * PAGE_SIZE + 1} to ${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} people`}
                  />
                </div>
              </>
            )}
          </Card>
        ) : (
          <>
            {roles.length ? (
              <Card>
                <CardTitle icon={Lucide.ShieldCheck} title="Roles" subtitle="Role permissions are managed in the backend" />
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {roles.map((role: RoleRow) => (
                    <li key={role.id} className="rounded-xl border border-border bg-surface p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-body font-semibold text-ink">{role.name}</p>
                        <Badge tone={role.isActive ? 'success' : 'neutral'} size="sm">{role.memberCount} {role.memberCount === 1 ? 'member' : 'members'}</Badge>
                      </div>
                      <p className="mt-1 text-label text-ink-secondary">{role.description ?? role.key}</p>
                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-ink-muted">
                        <span>{role.permissions.length} permissions</span>
                        {role.isSystem ? <Badge tone="info" size="sm">System role</Badge> : null}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {matrix ? (
              <Card>
                <CardTitle icon={Lucide.Grid3x3} title="Permission matrix" subtitle="System roles are read-only; the backend refuses runtime edits to seeded roles" />
                <div className="flex flex-col gap-2.5">
                  {matrix.resources.map((group, index) => (
                    <details key={group.resource} open={index === 0} className="group rounded-xl border border-border bg-surface">
                      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-body font-semibold text-ink hover:bg-hover-surface">
                        <span>{group.resource}</span>
                        <span className="flex items-center gap-2 text-label font-normal text-ink-muted">
                          {group.permissions.length} permissions
                          <Lucide.ChevronDown size={15} aria-hidden="true" className="transition-transform group-open:rotate-180" />
                        </span>
                      </summary>
                      <div className="pms-table-scroll overflow-x-auto border-t border-divider">
                        <table className="pms-table min-w-[640px] w-full">
                          <thead>
                            <tr>
                              <th>PERMISSION</th>
                              {matrix.roles.map((role) => <th key={role.key} className="text-center">{role.name}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {group.permissions.map((permission) => (
                              <tr key={permission.key}>
                                <td>
                                  <span className="block text-label font-medium text-ink">{permission.key}</span>
                                  <span className="block text-label text-ink-secondary">{permission.description}</span>
                                </td>
                                {matrix.roles.map((role) => {
                                  const allowed = permission.roles.includes(role.key);
                                  return (
                                    <td key={role.key} className="text-center">
                                      {allowed ? (
                                        <Lucide.Check size={16} className="mx-auto text-success-text" aria-label={`${role.name} can`} />
                                      ) : (
                                        <span className="text-ink-muted" aria-label={`${role.name} cannot`}>—</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ))}
                </div>
              </Card>
            ) : null}
          </>
        )}
      </div>

      <Modal
        open={isNew || editing !== null}
        onClose={closeDialog}
        title={isNew ? 'Invite a staff member' : `Manage ${editing?.fullName ?? ''}`}
        subtitle={isNew ? 'An invitation link is created for you to share; no email is sent.' : 'Changes are checked against your permissions'}
        wide
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void save()}
              disabled={saving}
              icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : isNew ? <Lucide.Send size={14} /> : <Lucide.Save size={14} />}
            >
              {saving ? 'Saving…' : isNew ? 'Create invitation' : 'Save changes'}
            </Button>
          </div>
        }
      >
        {isNew ? (
          <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 py-2 sm:grid-cols-2">
            <Field label="Full name" required error={attempted ? inviteErrors.fullName : undefined}>
              <TextField autoFocus value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </Field>
            <Field label="Email" required error={attempted ? inviteErrors.email : undefined}>
              <TextField type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Field label="Role" className="sm:col-span-2" hint="What this person can see and do at this property">
              <SelectField value={roleKey} onChange={(event) => setRoleKey(event.target.value)}>
                {roles.map((role: RoleRow) => <option key={role.key} value={role.key}>{role.name}</option>)}
              </SelectField>
            </Field>
          </div>
        ) : editing ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-3 rounded-xl bg-muted-surface/60 p-3">
              <Avatar name={editing.fullName} size={40} />
              <div className="min-w-0">
                <p className="truncate text-body font-semibold text-ink">{editing.email}</p>
                <div className="mt-1"><PersonBadges row={editing} /></div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
              <Field label="Full name">
                <TextField disabled={!can('user.update')} value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} />
              </Field>
              <Field label="Role">
                <SelectField disabled={!can('role.assign')} value={editing.roleKey} onChange={(event) => setEditing({ ...editing, roleKey: event.target.value })}>
                  {roles.map((role: RoleRow) => <option key={role.key} value={role.key}>{role.name}</option>)}
                </SelectField>
              </Field>
              <Field label="Account" className="sm:col-span-2" hint={editing.status === 'INVITED' ? 'The account becomes active once the invitation is accepted.' : 'A disabled account can no longer sign in.'}>
                <SelectField
                  disabled={!can('user.deactivate') || editing.status === 'INVITED'}
                  value={editing.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED'}
                  onChange={(event) => setEditing({ ...editing, status: event.target.value as StaffRow['status'] })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </SelectField>
              </Field>
            </div>

            {editing.status === 'INVITED' && can('user.invite') ? (
              <div className="rounded-xl border border-warning-border bg-warning-bg p-3.5">
                <p className="text-body font-semibold text-warning-text">Invitation {editing.inviteExpired ? 'expired' : 'pending'}</p>
                <p className="mt-0.5 text-label text-warning-text">Send a fresh link, or withdraw the invitation.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => void updateInvite('reissue')} icon={<Lucide.RefreshCw size={13} />}>
                    Reissue invitation
                  </Button>
                  <Button variant="secondary" onClick={() => void updateInvite('cancel')} icon={<Lucide.XCircle size={13} />} className="hover:text-danger-text">
                    Cancel invitation
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
