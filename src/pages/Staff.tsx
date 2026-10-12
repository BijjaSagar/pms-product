import { useMemo, useState } from 'react';
import { STAFF } from '../data/mock';
import type { StaffMember } from '../data/mock';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import type { BadgeTone } from '../components/status';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Modal } from '../components/overlays';
import { toast } from '../components/toastStore';

function staffTone(s: StaffMember['status']): BadgeTone {
  if (s === 'Active') return 'success';
  if (s === 'On leave') return 'warning';
  return 'neutral';
}

export function Staff() {
  const [rows, setRows] = useState<StaffMember[]>(STAFF);
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('All');
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [isNew, setIsNew] = useState(false);

  const depts = useMemo(() => ['All', ...Array.from(new Set(STAFF.map((s) => s.department)))], []);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((s) => (dept === 'All' || s.department === dept) && (!needle || s.name.toLowerCase().includes(needle) || s.role.toLowerCase().includes(needle)));
  }, [rows, q, dept]);

  const save = () => {
    if (!editing) return;
    if (editing.name.trim().length < 2 || editing.role.trim().length < 2) {
      toast('Check the form', { detail: 'Name and role are required.', tone: 'warning' });
      return;
    }
    if (isNew) {
      setRows((prev) => [...prev, { ...editing, id: `S-${String(prev.length + 1).padStart(2, '0')}` }]);
      toast('Staff added (demo)', { detail: 'Local directory update only.' });
    } else {
      setRows((prev) => prev.map((s) => (s.id === editing.id ? editing : s)));
      toast('Staff updated (demo)', { detail: 'Local directory update only.' });
    }
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Active staff', String(rows.filter((s) => s.status === 'Active').length)], ['On leave', String(rows.filter((s) => s.status === 'On leave').length)], ['Departments', String(depts.length - 1)], ['Roles', String(new Set(rows.map((s) => s.role)).size)]].map(([k, v]) => (
          <section key={k} className="pms-card p-4">
            <p className="pms-label">{k}</p>
            <p className="pms-kpi-value tnum mt-1">{v}</p>
          </section>
        ))}
      </div>
      <Card>
        <CardTitle
          title="Staff directory"
          subtitle={`${filtered.length} team members · demo records`}
          action={<button type="button" onClick={() => { setEditing({ id: '', name: '', role: '', department: 'Front Office', phone: '', email: '', status: 'Active', permissions: ['Reservations (view)'] }); setIsNew(true); }} className="pms-btn-primary px-3.5 py-2.5">+ Add staff</button>}
        />
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or role…" aria-label="Search staff" className={inputClass()} />
          <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter by department" className={inputClass()}>{depts.map((d) => <option key={d}>{d}</option>)}</select>
          <button type="button" className="pms-btn-ghost px-3 py-2.5" onClick={() => { setQ(''); setDept('All'); }}>Clear</button>
        </div>
        <div className="overflow-x-auto">
          <table className="pms-table min-w-[760px]">
            <thead><tr><th>Staff</th><th>Role · Department</th><th>Contact</th><th>Status</th><th>Permissions</th><th><span className="sr-only">Edit</span></th></tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={s.name} />
                      <span>
                        <span className="block font-semibold">{s.name}</span>
                        <span className="tnum block font-mono text-[11.5px]" style={{ color: 'var(--color-ink-muted)' }}>{s.id}</span>
                      </span>
                    </span>
                  </td>
                  <td><span className="block font-medium">{s.role}</span><span className="block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{s.department}</span></td>
                  <td style={{ color: 'var(--color-ink-secondary)' }}><span className="block">{s.email}</span><span className="tnum block text-[12px]">{s.phone}</span></td>
                  <td><Badge tone={staffTone(s.status)}>{s.status}</Badge></td>
                  <td className="max-w-[220px] truncate text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{s.permissions.join(' · ')}</td>
                  <td><button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => { setEditing({ ...s, permissions: [...s.permissions] }); setIsNew(false); }} aria-label={`Edit ${s.name}`}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? <p className="pms-helper py-6 text-center">No staff match.</p> : null}
        </div>
      </Card>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={isNew ? 'Add staff member' : `Edit ${editing?.name}`} subtitle="Demo only — stored on this screen" wide>
        {editing ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Full name"><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputClass()} /></Field>
            <Field label="Role"><input value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} placeholder="Front-desk Agent" className={inputClass()} /></Field>
            <Field label="Department">
              <select value={editing.department} onChange={(e) => setEditing({ ...editing, department: e.target.value })} className={inputClass()}>
                {['Management', 'Front Office', 'Housekeeping', 'Finance', 'Engineering', 'Food & Beverage'].map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as never })} className={inputClass()}>
                {['Active', 'On leave', 'Inactive'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Phone"><input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} inputMode="tel" className={inputClass()} /></Field>
            <Field label="Email"><input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} inputMode="email" className={inputClass()} /></Field>
            <div className="sm:col-span-2"><Field label="Permissions (comma separated)" hint="Descriptive only in this demo"><input value={editing.permissions.join(', ')} onChange={(e) => setEditing({ ...editing, permissions: e.target.value.split(',').map((p) => p.trim()).filter(Boolean) })} className={inputClass()} /></Field></div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => setEditing(null)}>Cancel</button>
              <button type="button" className="pms-btn-primary flex-[2] px-4 py-2.5" onClick={save}>Save (demo)</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
