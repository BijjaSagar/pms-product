import { useMemo, useState } from 'react';
import { MAINTENANCE } from '../data/mock';
import type { BadgeTone } from '../components/status';
import type { MaintenanceRequest, MaintenanceStatus } from '../data/mock';
import { Badge, Card, CardTitle } from '../components/ui';
import { Field, FilterChip } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Drawer, Modal } from '../components/overlays';
import { toast } from '../components/toastStore';

function priorityTone(p: string): BadgeTone {
  if (p === 'Urgent' || p === 'High') return 'danger';
  if (p === 'Medium') return 'warning';
  return 'neutral';
}

function statusTone(s: MaintenanceStatus): BadgeTone {
  if (s === 'Resolved') return 'success';
  if (s === 'In progress') return 'info';
  return 'warning';
}

export function Maintenance() {
  const [reqs, setReqs] = useState<MaintenanceRequest[]>(MAINTENANCE);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [room, setRoom] = useState('');
  const [category, setCategory] = useState('Plumbing');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [note, setNote] = useState('');

  const open = reqs.find((r) => r.id === openId) ?? null;
  const oosCount = reqs.filter((r) => r.status !== 'Resolved' && r.priority === 'Urgent').length;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return reqs.filter(
      (r) => (status === 'All' || r.status === status) && (!needle || r.id.toLowerCase().includes(needle) || r.room.toLowerCase().includes(needle) || r.description.toLowerCase().includes(needle)),
    );
  }, [reqs, q, status]);

  const mutate = (id: string, patch: Partial<MaintenanceRequest>, msg: string) => {
    setReqs((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    toast(msg, { detail: `${id} updated on this screen.` });
  };

  const create = () => {
    if (room.trim().length < 1 || desc.trim().length < 8) {
      toast('Check the form', { detail: 'Room and a clear description (8+ characters) are required.', tone: 'warning' });
      return;
    }
    const id = `WO-${119 + reqs.length}`;
    setReqs((prev) => [{ id, room: room.trim(), category, description: desc.trim(), priority: priority as never, reportedBy: 'Front desk (demo)', assignee: 'Unassigned', created: 'Oct 10', due: 'Oct 13', status: 'Open', notes: [] }, ...prev]);
    setCreating(false);
    setRoom(''); setDesc(''); setNote('');
    setOpenId(id);
    toast('Work order created (demo)', { detail: `${id} added to this queue only.` });
  };

  return (
    <div className="flex flex-col gap-4">
      {oosCount > 0 ? (
        <div className="rounded-[12px] border p-4" style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)' }} role="alert">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--color-danger-text)' }}>⚠ {oosCount} urgent request blocks room availability</p>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--color-danger-text)' }}>Suite 503 stays out-of-service until WO-118 is resolved. Resolving it here is a local demo action.</p>
        </div>
      ) : null}

      <Card>
        <CardTitle
          title="Work orders"
          subtitle={`${filtered.length} of ${reqs.length} requests`}
          action={<button type="button" onClick={() => setCreating(true)} className="pms-btn-primary px-3.5 py-2.5">+ New request</button>}
        />
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ID, room or issue…" aria-label="Search work orders" className={inputClass()} />
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
            {['All', 'Open', 'In progress', 'Resolved'].map((s) => <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>{s}</FilterChip>)}
          </div>
          <button type="button" className="pms-btn-ghost px-3 py-2.5" onClick={() => { setQ(''); setStatus('All'); }}>Clear</button>
        </div>
        <div className="overflow-x-auto">
          <table className="pms-table min-w-[820px]">
            <thead><tr><th>Request</th><th>Room / facility</th><th>Issue</th><th>Priority</th><th>Assignee</th><th>Due</th><th>Status</th><th><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="tnum font-mono font-semibold">{r.id}</td>
                  <td className="tnum">{r.room}</td>
                  <td className="max-w-[260px] truncate" style={{ color: 'var(--color-ink-secondary)' }}>{r.description}</td>
                  <td><Badge tone={priorityTone(r.priority)}>{r.priority}</Badge></td>
                  <td style={{ color: 'var(--color-ink-secondary)' }}>{r.assignee}</td>
                  <td style={{ color: 'var(--color-ink-secondary)' }}>{r.due}</td>
                  <td><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                  <td><button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => setOpenId(r.id)} aria-label={`Open ${r.id}`}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? <p className="pms-helper py-6 text-center">No requests match.</p> : null}
        </div>
      </Card>

      <Drawer open={open !== null} onClose={() => { setOpenId(null); setNote(''); }} title={open ? `Work order ${open.id}` : ''} subtitle="Details, assignment and history">
        {open ? (
          <div className="flex flex-col gap-3 text-[13.5px]">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={priorityTone(open.priority)}>{open.priority}</Badge>
              <Badge tone={statusTone(open.status)}>{open.status}</Badge>
              <Badge tone="neutral">{open.category}</Badge>
            </div>
            <p style={{ color: 'var(--color-ink)' }}>{open.description}</p>
            <dl className="grid grid-cols-2 gap-2">
              {[['Room / facility', open.room], ['Reported by', open.reportedBy], ['Created', open.created], ['Due', open.due]].map(([k, v]) => (
                <div key={k} className="rounded-[10px] border p-2.5" style={{ borderColor: 'var(--color-border)' }}>
                  <dt className="pms-helper">{k}</dt>
                  <dd className="font-semibold" style={{ color: 'var(--color-ink)' }}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label="Technician">
                <select value={open.assignee} onChange={(e) => mutate(open.id, { assignee: e.target.value }, `Assigned to ${e.target.value} (demo)`)} className={inputClass()}>
                  {['Unassigned', 'In-house team', 'FixRight Plumbing', 'Grace Liu'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select value={open.priority} onChange={(e) => mutate(open.id, { priority: e.target.value as never }, `Priority → ${e.target.value} (demo)`)} className={inputClass()}>
                  {['Urgent', 'High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <div>
              <p className="pms-label mb-1.5">Notes & history</p>
              <ul className="flex flex-col gap-1.5">
                {open.notes.length === 0 ? <p className="pms-helper">No notes yet.</p> : open.notes.map((n, i) => <li key={i} className="rounded-[8px] border px-3 py-2" style={{ borderColor: 'var(--color-divider)', color: 'var(--color-ink-secondary)' }}>{n}</li>)}
              </ul>
              <div className="mt-2 flex gap-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" aria-label="Add a note" className={inputClass()} />
                <button type="button" className="pms-btn-ghost flex-none px-3 py-2" onClick={() => { if (note.trim()) { mutate(open.id, { notes: [...open.notes, `${note.trim()} — Oct 10`] }, 'Note added (demo)'); setNote(''); } }}>Add</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {open.status === 'Open' ? <button type="button" className="pms-btn-primary flex-1 px-3 py-2.5" onClick={() => mutate(open.id, { status: 'In progress' }, 'Marked in progress (demo)')}>Start work</button> : null}
              {open.status !== 'Resolved' ? <button type="button" className="pms-btn-primary flex-1 px-3 py-2.5" onClick={() => mutate(open.id, { status: 'Resolved' }, 'Marked resolved (demo)')}>Mark resolved</button> : null}
            </div>
          </div>
        ) : null}
      </Drawer>

      <Modal open={creating} onClose={() => setCreating(false)} title="New maintenance request" subtitle="Demo only — stored in this queue">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Room / facility"><input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. 208 or Lobby" className={inputClass()} /></Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass()}>
              {['Plumbing', 'Electrical', 'HVAC', 'Furniture', 'Bathroom', 'Other'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Description" hint="At least 8 characters"><input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is wrong, and where exactly?" className={inputClass()} /></Field></div>
          <Field label="Priority">
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass()}>
              {['Urgent', 'High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <div className="flex items-end gap-2">
            <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => setCreating(false)}>Cancel</button>
            <button type="button" className="pms-btn-primary flex-[2] px-4 py-2.5" onClick={create}>Create request</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
