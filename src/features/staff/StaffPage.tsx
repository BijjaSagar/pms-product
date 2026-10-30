import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Avatar, Badge, Card, CardTitle, TableContainer, TableActionBtn } from '../../components/ui';
import { Field, Pagination } from '../../components/controls';
import { inputClass } from '../../utils/styling';
import { Modal } from '../../components/overlays';
import { toast } from '../../utils/toast';
import { adminApi } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { useAuth } from '../../features/auth/AuthContext';
import type { RoleRow } from '../../lib/api/pms';

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

function roleBadge(role: string) {
  const r = (role || '').toLowerCase();
  if (r.includes('admin') || r.includes('owner')) {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-info-bg text-info-text">Admin</span>;
  }
  if (r.includes('editor') || r.includes('desk') || r.includes('front')) {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">{role || 'Editor'}</span>;
  }
  if (r.includes('manager')) {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-success-bg text-success-text">{role}</span>;
  }
  return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-muted-surface text-ink">{role || 'Viewer'}</span>;
}

function statusBadge(status: StaffRow['status']) {
  if (status === 'ACTIVE') {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-success-bg text-success-text">Active</span>;
  }
  if (status === 'INVITED') {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-warning-bg text-warning-text">Pending</span>;
  }
  return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-danger-bg text-danger-text">Inactive</span>;
}

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
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [email, setEmail] = useState('');
  const [roleKey, setRoleKey] = useState('FRONT_DESK');
  const [fullName, setFullName] = useState('');

  const roles = resource.data?.roles ?? [];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((staff) => !needle || staff.fullName.toLowerCase().includes(needle) || staff.email.toLowerCase().includes(needle) || staff.roleName.toLowerCase().includes(needle));
  }, [rows, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedSlice = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const save = async () => {
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
      setEditing(null);
      setIsNew(false);
      setEmail(''); setFullName('');
      resource.refresh();
    } catch (error) { toast('Could not save staff record', { detail: displayApiError(error), tone: 'danger' }); }
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
    } catch (error) { toast(`Could not ${action} invitation`, { detail: displayApiError(error), tone: 'danger' }); }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20 mt-0.5">
            <Lucide.ShieldCheck size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] font-bold tracking-tight text-ink leading-tight">
                Staff & Access Roles
              </h1>
              <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-[10px] font-bold text-success-text border border-success-border/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-text opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-text"></span>
                </span>
                Staff Directory
              </span>
            </div>
            <p className="text-xs text-ink-secondary mt-1">
              Manage team members, property permissions, invitations, and role assignments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-surface text-ink hover:bg-page shadow-2xs cursor-pointer transition-colors"
            title="Refresh staff"
          >
            <Lucide.RefreshCw size={13} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          {can('user.invite') ? (
            <button
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:opacity-95 shadow-xs cursor-pointer transition-all"
              onClick={() => {
                setIsNew(true);
                setEmail('');
                setFullName('');
                setRoleKey(roles[0]?.key ?? 'FRONT_DESK');
              }}
            >
              <Lucide.UserPlus size={15} strokeWidth={2.4} />
              <span>Invite Staff</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          ['Active staff', rows.filter((row) => row.status === 'ACTIVE' && row.membershipActive).length],
          ['Invited', rows.filter((row) => row.status === 'INVITED').length],
          ['Disabled', rows.filter((row) => row.status === 'DISABLED' || !row.membershipActive).length],
          ['Roles', roles.length],
        ].map(([label, value]) => (
          <section key={label} className="pms-card p-3 sm:p-3.5">
            <p className="text-xs font-medium text-ink-secondary">{label}</p>
            <p className="text-xl font-bold text-ink tnum mt-1">{value}</p>
          </section>
        ))}
      </div>
      <Card>
        <CardTitle
          icon={Lucide.Users}
          iconBg="bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20"
          title="User Management"
          subtitle={resource.loading ? 'Loading users…' : 'A list of all registered users in the system.'}
          badge={
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/30">
              {rows.length} Users
            </span>
          }
          action={
            can('user.invite') ? (
              <button
                type="button"
                onClick={() => {
                  setIsNew(true);
                  setFullName('');
                  setEmail('');
                  setRoleKey(roles[0]?.key ?? 'FRONT_DESK');
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:opacity-95 shadow-xs cursor-pointer transition-all"
              >
                <Lucide.Plus size={14} />
                <span>Add User</span>
              </button>
            ) : undefined
          }
        />
        {resource.error ? <p role="alert" className="pms-helper mb-3 text-danger-text">Could not load users: {resource.error}</p> : null}
        
        <div className="mb-4 flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Lucide.Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(0);
              }}
              placeholder="Search by name, email or role…"
              aria-label="Search users"
              className={`${inputClass('text-sm')} pl-9.5 w-full`}
            />
          </div>
          {q ? (
            <button
              type="button"
              className="pms-btn-ghost px-3.5 py-2 text-sm font-medium"
              onClick={() => {
                setQ('');
                setPage(0);
              }}
            >
              Clear
            </button>
          ) : null}
        </div>

        <TableContainer>
          <table className="pms-table min-w-[760px]">
            <thead>
              <tr>
                <th className="w-12 text-center text-xs font-semibold">#</th>
                <th className="text-xs font-semibold">NAME</th>
                <th className="text-xs font-semibold">EMAIL</th>
                <th className="text-xs font-semibold">ROLE</th>
                <th className="text-xs font-semibold">STATUS</th>
                <th className="text-xs font-semibold">INVITE STATUS</th>
                <th className="text-right text-xs font-semibold">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSlice.map((staff, idx) => (
                <tr key={staff.userId}>
                  <td className="text-center font-medium text-ink-secondary text-xs">
                    {safePage * pageSize + idx + 1}
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={staff.fullName} size={36} />
                      <div>
                        <span className="block font-semibold text-ink text-xs">{staff.fullName}</span>
                        <span className="block font-mono text-xs text-ink-secondary">{staff.userId}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-ink text-xs">{staff.email}</span>
                  </td>
                  <td>
                    {roleBadge(staff.roleName || staff.roleKey)}
                  </td>
                  <td>
                    {statusBadge(staff.status)}
                  </td>
                  <td>
                    {staff.invitePending ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning-bg text-warning-text border border-warning-border/60">
                        Pending
                      </span>
                    ) : staff.inviteExpired ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger-bg text-danger-text border border-danger-border/60">
                        Expired
                      </span>
                    ) : (
                      <span className="text-ink-secondary text-xs">—</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {can('user.update') || can('role.assign') ? (
                        <TableActionBtn
                          icon={Lucide.Pencil}
                          title="Edit user"
                          onClick={() => {
                            setEditing({ ...staff });
                            setIsNew(false);
                          }}
                        />
                      ) : null}
                      {can('user.deactivate') ? (
                        <TableActionBtn
                          icon={Lucide.Trash2}
                          variant="danger"
                          title="Deactivate user"
                          onClick={() => {
                            setEditing({ ...staff });
                            setIsNew(false);
                          }}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? <p className="pms-helper py-8 text-center text-xs text-ink-secondary">No registered users match your query.</p> : null}
        </TableContainer>

        <div className="mt-4 pt-1">
          <Pagination
            page={safePage}
            totalPages={totalPages}
            onChange={setPage}
            summary={`Showing ${filtered.length > 0 ? safePage * pageSize + 1 : 0} to ${Math.min((safePage + 1) * pageSize, filtered.length)} of ${filtered.length} users`}
          />
        </div>
      </Card>
      {resource.data?.matrix ? <Card>
        <CardTitle title="Permission matrix" subtitle="System roles are read-only; the backend refuses runtime edits to seeded roles" />
        <div className="flex flex-col gap-3">
          {resource.data.matrix.resources.map((group) => (
            <div key={group.resource}>
              <p className="text-sm font-semibold text-ink mb-1">{group.resource}</p>
              <div className="pms-table-scroll overflow-x-auto"><table className="pms-table min-w-[640px]">
                <thead><tr><th className="text-xs font-semibold">Permission</th>{resource.data?.matrix?.roles.map((role) => <th key={role.key} className="text-xs font-semibold">{role.name}</th>)}</tr></thead>
                <tbody>{group.permissions.map((permission) => <tr key={permission.key}>
                  <td><span className="block font-medium text-xs text-ink">{permission.key}</span><span className="block text-xs text-ink-secondary">{permission.description}</span></td>
                  {resource.data?.matrix?.roles.map((role) => <td key={role.key} className="text-center text-xs">{permission.roles.includes(role.key) ? '✓' : '—'}</td>)}
                </tr>)}</tbody>
              </table></div>
            </div>
          ))}
        </div>
      </Card> : null}
      {roles.length ? <Card>
        <CardTitle title="Role catalogue" subtitle="Role permissions are managed in the backend" />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {roles.map((role: RoleRow) => <div key={role.id} className="rounded-control border p-3 sm:p-3.5" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-ink">{role.name}</span><Badge tone={role.isActive ? 'success' : 'neutral'}>{role.memberCount} members</Badge></div>
            <p className="text-xs text-ink-secondary mt-1">{role.description ?? role.key}</p>
            <p className="mt-1 text-xs text-ink-secondary">{role.permissions.length} permissions{role.isSystem ? ' · system role' : ''}</p>
          </div>)}
        </div>
      </Card> : null}
      <Modal open={isNew || editing !== null} onClose={() => { setEditing(null); setIsNew(false); }} title={isNew ? 'Invite staff member' : `Manage ${editing?.fullName ?? ''}`} subtitle={isNew ? 'The backend returns an invite token; it does not send email.' : 'Changes are checked against your permissions'} wide>
        {isNew ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full name"><input value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputClass('text-sm')} /></Field>
          <Field label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass('text-sm')} /></Field>
          <Field label="Role"><select value={roleKey} onChange={(event) => setRoleKey(event.target.value)} className={inputClass('text-sm')}>{roles.map((role: RoleRow) => <option key={role.key} value={role.key}>{role.name}</option>)}</select></Field>
          <div className="flex items-end"><button type="button" className="pms-btn-primary w-full px-4 py-2.5 text-sm font-semibold" onClick={() => void save()}>Create invitation</button></div>
        </div> : editing ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full name"><input disabled={!can('user.update')} value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} className={inputClass('text-sm')} /></Field>
          <Field label="Role"><select disabled={!can('role.assign')} value={editing.roleKey} onChange={(event) => setEditing({ ...editing, roleKey: event.target.value })} className={inputClass('text-sm')}>{roles.map((role: RoleRow) => <option key={role.key} value={role.key}>{role.name}</option>)}</select></Field>
          <Field label="Status"><select disabled={!can('user.deactivate')} value={editing.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED'} onChange={(event) => setEditing({ ...editing, status: event.target.value as StaffRow['status'] })} className={inputClass('text-sm')}><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option></select></Field>
          <div className="flex items-end"><button type="button" className="pms-btn-primary w-full px-4 py-2.5 text-sm font-semibold" onClick={() => void save()}>Save changes</button></div>
          {editing.status === 'INVITED' && can('user.invite') ? <div className="flex gap-2 sm:col-span-2"><button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5 text-sm font-medium" onClick={() => void updateInvite('reissue')}>Reissue invitation</button><button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5 text-sm font-medium" onClick={() => void updateInvite('cancel')}>Cancel invitation</button></div> : null}
        </div> : null}
      </Modal>
    </div>
  );
}
