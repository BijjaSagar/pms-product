import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import type { BadgeTone } from '../components/status';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Modal } from '../components/overlays';
import { toast } from '../components/toastStore';
import { adminApi } from '../lib/api/pms';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { useAuth } from '../features/auth/AuthContext';
import type { RoleRow } from '../lib/api/pms';

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

function staffTone(status: StaffRow['status']): BadgeTone {
  return status === 'ACTIVE' ? 'success' : status === 'INVITED' ? 'warning' : 'neutral';
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
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.ShieldCheck className="text-primary" size={26} />
            <span>Staff & Access Roles</span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Manage team members, property permissions, invitations, and role assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border"
            title="Refresh staff"
          >
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          {can('user.invite') ? (
            <button
              type="button"
              className="pms-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-bold rounded-xl"
              onClick={() => {
                setIsNew(true);
                setEmail('');
                setFullName('');
                setRoleKey(roles[0]?.key ?? 'FRONT_DESK');
              }}
            >
              <Lucide.UserPlus size={16} strokeWidth={2.4} />
              <span>Invite Staff</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Active staff', rows.filter((row) => row.status === 'ACTIVE' && row.membershipActive).length],
          ['Invited', rows.filter((row) => row.status === 'INVITED').length],
          ['Disabled', rows.filter((row) => row.status === 'DISABLED' || !row.membershipActive).length],
          ['Roles', roles.length],
        ].map(([label, value]) => <section key={label} className="pms-card p-4"><p className="pms-label">{label}</p><p className="pms-kpi-value tnum mt-1">{value}</p></section>)}
      </div>
      <Card>
        <CardTitle title="Staff directory" subtitle={resource.loading ? 'Loading staff…' : `${filtered.length} members at the active property`} action={can('user.invite') ? <button type="button" onClick={() => { setIsNew(true); setFullName(''); setEmail(''); setRoleKey(roles[0]?.key ?? 'FRONT_DESK'); }} className="pms-btn-primary px-3.5 py-2.5">+ Invite staff</button> : undefined} />
        {resource.error ? <p role="alert" className="pms-helper mb-3">Could not load staff: {resource.error}</p> : null}
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name, email or role…" aria-label="Search staff" className={inputClass()} />
          <button type="button" className="pms-btn-ghost px-3 py-2.5" onClick={() => setQ('')}>Clear</button>
        </div>
        <div className="overflow-x-auto">
          <table className="pms-table min-w-[760px]">
            <thead><tr><th>Staff</th><th>Role</th><th>Email</th><th>Status</th><th>Invite</th><th><span className="sr-only">Edit</span></th></tr></thead>
            <tbody>{filtered.map((staff) => (
              <tr key={staff.userId}>
                <td><span className="flex items-center gap-2.5"><Avatar name={staff.fullName} /><span><span className="block font-semibold">{staff.fullName}</span><span className="block font-mono text-[11px]" style={{ color: 'var(--color-ink-muted)' }}>{staff.userId}</span></span></span></td>
                <td>{staff.roleName || staff.roleKey}</td>
                <td>{staff.email}</td>
                <td><Badge tone={staffTone(staff.status)}>{staff.status}</Badge></td>
                <td>{staff.invitePending ? <Badge tone="warning">Pending</Badge> : staff.inviteExpired ? <Badge tone="danger">Expired</Badge> : '—'}</td>
                <td>{can('user.update') || can('role.assign') || can('user.deactivate') ? <button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => { setEditing({ ...staff }); setIsNew(false); }}>Manage</button> : null}</td>
              </tr>
            ))}</tbody>
          </table>
          {filtered.length === 0 ? <p className="pms-helper py-6 text-center">No staff match.</p> : null}
        </div>
      </Card>
      {resource.data?.matrix ? <Card>
        <CardTitle title="Permission matrix" subtitle="System roles are read-only; the backend refuses runtime edits to seeded roles" />
        <div className="flex flex-col gap-3">
          {resource.data.matrix.resources.map((group) => (
            <div key={group.resource}>
              <p className="pms-label mb-1">{group.resource}</p>
              <div className="overflow-x-auto"><table className="pms-table min-w-[640px]">
                <thead><tr><th>Permission</th>{resource.data?.matrix?.roles.map((role) => <th key={role.key}>{role.name}</th>)}</tr></thead>
                <tbody>{group.permissions.map((permission) => <tr key={permission.key}>
                  <td><span className="block font-medium">{permission.key}</span><span className="block text-[11.5px]" style={{ color: 'var(--color-ink-secondary)' }}>{permission.description}</span></td>
                  {resource.data?.matrix?.roles.map((role) => <td key={role.key} className="text-center">{permission.roles.includes(role.key) ? '✓' : '—'}</td>)}
                </tr>)}</tbody>
              </table></div>
            </div>
          ))}
        </div>
      </Card> : null}
      {roles.length ? <Card>
        <CardTitle title="Role catalogue" subtitle="Role permissions are managed in the backend" />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {roles.map((role: RoleRow) => <div key={role.id} className="rounded-control border p-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between gap-2"><span className="font-semibold">{role.name}</span><Badge tone={role.isActive ? 'success' : 'neutral'}>{role.memberCount} members</Badge></div>
            <p className="pms-helper mt-1">{role.description ?? role.key}</p>
            <p className="mt-1 text-[11.5px]" style={{ color: 'var(--color-ink-secondary)' }}>{role.permissions.length} permissions{role.isSystem ? ' · system role' : ''}</p>
          </div>)}
        </div>
      </Card> : null}
      <Modal open={isNew || editing !== null} onClose={() => { setEditing(null); setIsNew(false); }} title={isNew ? 'Invite staff member' : `Manage ${editing?.fullName ?? ''}`} subtitle={isNew ? 'The backend returns an invite token; it does not send email.' : 'Changes are checked against your permissions'} wide>
        {isNew ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full name"><input value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputClass()} /></Field>
          <Field label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass()} /></Field>
          <Field label="Role"><select value={roleKey} onChange={(event) => setRoleKey(event.target.value)} className={inputClass()}>{roles.map((role: RoleRow) => <option key={role.key} value={role.key}>{role.name}</option>)}</select></Field>
          <div className="flex items-end"><button type="button" className="pms-btn-primary w-full px-4 py-2.5" onClick={() => void save()}>Create invitation</button></div>
        </div> : editing ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full name"><input disabled={!can('user.update')} value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} className={inputClass()} /></Field>
          <Field label="Role"><select disabled={!can('role.assign')} value={editing.roleKey} onChange={(event) => setEditing({ ...editing, roleKey: event.target.value })} className={inputClass()}>{roles.map((role: RoleRow) => <option key={role.key} value={role.key}>{role.name}</option>)}</select></Field>
          <Field label="Status"><select disabled={!can('user.deactivate')} value={editing.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED'} onChange={(event) => setEditing({ ...editing, status: event.target.value as StaffRow['status'] })} className={inputClass()}><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option></select></Field>
          <div className="flex items-end"><button type="button" className="pms-btn-primary w-full px-4 py-2.5" onClick={() => void save()}>Save changes</button></div>
          {editing.status === 'INVITED' && can('user.invite') ? <div className="flex gap-2 sm:col-span-2"><button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => void updateInvite('reissue')}>Reissue invitation</button><button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => void updateInvite('cancel')}>Cancel invitation</button></div> : null}
        </div> : null}
      </Modal>
    </div>
  );
}
