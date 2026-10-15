import { useCallback, useMemo, useState } from 'react';
import type { BadgeTone } from '../components/status';
import type { MaintenanceRequest, MaintenanceStatus } from '../data/mock';
import { Badge, Card, CardTitle } from '../components/ui';
import { Field, FilterChip } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Drawer, Modal } from '../components/overlays';
import { toast } from '../components/toastStore';
import { adminApi, operationsApi } from '../lib/api/pms';
import type { UserRow } from '../lib/api/pms';
import { maintenanceFromApi } from '../lib/api/adapters';
import { loadRoomInventory } from '../lib/api/loaders';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { useAuth } from '../features/auth/AuthContext';

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
  const { can } = useAuth();
  const loadData = useCallback(async () => {
    const [tickets, inventory, users] = await Promise.all([
      operationsApi.maintenanceTickets(),
      loadRoomInventory(),
      can('maintenance.assign') && can('user.read') ? adminApi.users() : Promise.resolve([] as UserRow[]),
    ]);
    return { tickets: tickets.map(maintenanceFromApi), rooms: inventory.rooms, users };
  }, [can]);
  const resource = useApiResource(loadData);
  const reqs = useMemo(() => resource.data?.tickets ?? [], [resource.data?.tickets]);
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
  const oosCount = resource.data?.rooms.filter((r) => r.status === 'Out-of-service').length ?? 0;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return reqs.filter(
      (r) => (status === 'All' || r.status === status) && (!needle || r.id.toLowerCase().includes(needle) || r.room.toLowerCase().includes(needle) || r.description.toLowerCase().includes(needle)),
    );
  }, [reqs, q, status]);

  const transition = async (ticket: MaintenanceRequest, action: 'start' | 'resolve' | 'close' | 'reopen') => {
    if (!ticket.backendId) return;
    if (action === 'resolve' && !note.trim()) return toast('Resolution required', { detail: 'Enter the work completed before resolving this ticket.', tone: 'warning' });
    const reason = action === 'close' || action === 'reopen' ? window.prompt(`Reason for ${action}ing this ticket:`) : null;
    if ((action === 'close' || action === 'reopen') && !reason?.trim()) return;
    try {
      if (action === 'start') await operationsApi.startTicket(ticket.backendId);
      else if (action === 'resolve') await operationsApi.resolveTicket(ticket.backendId, note.trim());
      else if (action === 'close') await operationsApi.closeTicket(ticket.backendId, reason?.trim());
      else await operationsApi.reopenTicket(ticket.backendId, reason!.trim());
      setNote('');
      resource.refresh();
      toast(action === 'start' ? 'Work started' : 'Ticket resolved', { detail: ticket.id, tone: 'success' });
    } catch (error) { toast('Ticket update failed', { detail: displayApiError(error), tone: 'danger' }); }
  };

  const assign = async (ticket: MaintenanceRequest, assignedToId: string) => {
    if (!ticket.backendId) return;
    try { await operationsApi.assignTicket(ticket.backendId, assignedToId || null); resource.refresh(); toast('Ticket assignment updated', { detail: ticket.id, tone: 'success' }); }
    catch (error) { toast('Could not assign ticket', { detail: displayApiError(error), tone: 'danger' }); }
  };

  const create = async () => {
    if (room.trim().length < 1 || desc.trim().length < 8) {
      toast('Check the form', { detail: 'Room and a clear description (8+ characters) are required.', tone: 'warning' });
      return;
    }
    const roomRecord = resource.data?.rooms.find((candidate) => candidate.number === room.trim());
    try {
      const created = await operationsApi.createTicket({
        title: `${category}: ${desc.trim().slice(0, 180)}`,
        description: desc.trim(),
        roomId: roomRecord?.backendId,
        category: ({ Plumbing: 'PLUMBING', Electrical: 'ELECTRICAL', HVAC: 'HVAC', Furniture: 'FURNITURE', Other: 'OTHER' } as Record<string, string>)[category] ?? 'OTHER',
        priority: ({ Urgent: 'CRITICAL', High: 'HIGH', Medium: 'NORMAL', Low: 'LOW' } as Record<string, string>)[priority] ?? 'NORMAL',
      });
      setCreating(false);
      setRoom(''); setDesc(''); setNote('');
      resource.refresh();
      toast('Work order created', { detail: created.ticketNo, tone: 'success' });
    } catch (error) { toast('Could not create work order', { detail: displayApiError(error), tone: 'danger' }); }
  };

  return (
    <div className="flex flex-col gap-4">
      {oosCount > 0 ? (
        <div className="rounded-[12px] border p-4" style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)' }} role="alert">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--color-danger-text)' }}>⚠ {oosCount} room(s) currently out of order</p>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--color-danger-text)' }}>Resolve the maintenance ticket, then return each room to service from the Room Overview.</p>
        </div>
      ) : null}

      <Card>
        <CardTitle
          title="Work orders"
          subtitle={resource.loading ? 'Loading maintenance tickets…' : `${filtered.length} of ${reqs.length} requests`}
          action={<button type="button" onClick={() => setCreating(true)} className="pms-btn-primary px-3.5 py-2.5">+ New request</button>}
        />
        {resource.error ? <p role="alert" className="pms-helper mb-3">Could not load maintenance tickets: {resource.error}</p> : null}
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
                <div key={k} className="rounded-control border p-2.5" style={{ borderColor: 'var(--color-border)' }}>
                  <dt className="pms-helper">{k}</dt>
                  <dd className="font-semibold" style={{ color: 'var(--color-ink)' }}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div><p className="pms-label mb-1">Technician</p>{can('maintenance.assign') && resource.data?.users.length ? <select value={open.assignedToId ?? ''} onChange={(event) => void assign(open, event.target.value)} className={inputClass()} aria-label="Assigned technician"><option value="">Unassigned</option>{resource.data.users.map((member) => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}</select> : <p>{open.assignee}</p>}</div>
              <div><p className="pms-label mb-1">Priority</p><Badge tone={priorityTone(open.priority)}>{open.priority}</Badge></div>
            </div>
            <div>
              <p className="pms-label mb-1.5">Notes & history</p>
              <ul className="flex flex-col gap-1.5">
                {open.notes.length === 0 ? <p className="pms-helper">No notes yet.</p> : open.notes.map((n, i) => <li key={i} className="rounded-[8px] border px-3 py-2" style={{ borderColor: 'var(--color-divider)', color: 'var(--color-ink-secondary)' }}>{n}</li>)}
              </ul>
              {open.status !== 'Resolved' ? <Field label="Resolution details"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Required when resolving a ticket" aria-label="Resolution details" className={inputClass()} /></Field> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {open.backendStatus === 'OPEN' || open.backendStatus === 'ASSIGNED' || open.backendStatus === 'REOPENED' ? <button type="button" className="pms-btn-primary flex-1 px-3 py-2.5" onClick={() => void transition(open, 'start')}>Start work</button> : null}
              {open.backendStatus === 'IN_PROGRESS' ? <button type="button" className="pms-btn-primary flex-1 px-3 py-2.5" onClick={() => void transition(open, 'resolve')}>Mark resolved</button> : null}
              {open.backendStatus === 'RESOLVED' ? <button type="button" className="pms-btn-ghost flex-1 px-3 py-2.5" onClick={() => void transition(open, 'close')}>Close ticket</button> : null}
              {['RESOLVED', 'CLOSED'].includes(open.backendStatus ?? '') ? <button type="button" className="pms-btn-ghost flex-1 px-3 py-2.5" onClick={() => void transition(open, 'reopen')}>Reopen ticket</button> : null}
            </div>
          </div>
        ) : null}
      </Drawer>

      <Modal open={creating} onClose={() => setCreating(false)} title="New maintenance request" subtitle="Creates a backend maintenance ticket">
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
