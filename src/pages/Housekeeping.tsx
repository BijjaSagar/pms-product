import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BadgeTone } from '../components/status';
import { Badge, Card, CardTitle, ProgressBar } from '../components/ui';
import { Field, FilterChip, Tabs } from '../components/controls';
import { Modal } from '../components/overlays';
import { inputClass } from '../components/inputClass';
import { toast } from '../components/toastStore';
import { adminApi, operationsApi } from '../lib/api/pms';
import { loadRoomInventory } from '../lib/api/loaders';
import type { UserRow } from '../lib/api/pms';
import type { HousekeepingTask } from '../data/mock';
import { housekeepingTaskFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { useAuth } from '../features/auth/AuthContext';

/** Display label for the raw backend task status, so blocked and cancelled
 *  work is distinguishable rather than collapsed into "Pending". */
const HK_STATUS_LABEL: Record<string, string> = {
  TODO: 'Pending',
  IN_PROGRESS: 'In progress',
  CLEANED: 'Cleaned',
  INSPECTION_REQUIRED: 'Awaiting inspection',
  READY: 'Ready',
  BLOCKED: 'Blocked',
  CANCELLED: 'Cancelled',
};

function hkStatusLabel(status?: string): string {
  return status ? HK_STATUS_LABEL[status] ?? status.replace(/_/g, ' ') : '—';
}

function statusTone(status?: string): BadgeTone {
  if (status === 'READY') return 'success';
  if (status === 'CANCELLED') return 'neutral';
  if (status === 'BLOCKED') return 'danger';
  if (status === 'IN_PROGRESS' || status === 'CLEANED' || status === 'INSPECTION_REQUIRED') return 'info';
  return 'warning';
}

/** Task types that count as a room turnover clean. */
const TURNOVER_TYPES = ['CHECKOUT_CLEAN', 'STAYOVER_CLEAN', 'LINEN_CHANGE'];

function priorityTone(p: string): BadgeTone {
  if (p === 'High') return 'danger';
  if (p === 'Medium') return 'warning';
  return 'neutral';
}

export function Housekeeping() {
  const { can } = useAuth();
  const loadTasks = useCallback(async () => {
    const [rows, users, inventory] = await Promise.all([
      operationsApi.housekeepingTasks(),
      can('housekeeping.assign') && can('user.read') ? adminApi.users() : Promise.resolve([] as UserRow[]),
      can('housekeeping.assign') ? loadRoomInventory() : Promise.resolve(null),
    ]);
    return { tasks: rows.map(housekeepingTaskFromApi), users, rooms: inventory?.rooms ?? [] };
  }, [can]);
  const resource = useApiResource(loadTasks);
  const tasks = useMemo(() => resource.data?.tasks ?? [], [resource.data?.tasks]);
  const staffUsers = useMemo(() => resource.data?.users ?? [], [resource.data?.users]);
  const rooms = useMemo(() => resource.data?.rooms ?? [], [resource.data?.rooms]);
  const [creating, setCreating] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [newType, setNewType] = useState('CHECKOUT_CLEAN');
  const [newPriority, setNewPriority] = useState('NORMAL');
  const [newNotes, setNewNotes] = useState('');
  const [view, setView] = useState<'list' | 'board'>('list');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [priority, setPriority] = useState('All');
  const [staffFilter, setStaffFilter] = useState('All');

  // A ticking clock so "overdue" recomputes without calling Date.now in render.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const staffOptions = useMemo(() => ['All', ...Array.from(new Set(tasks.map((task) => task.assignee)))], [tasks]);

  const filtered = useMemo(() => {
    const needle = q.trim();
    return tasks.filter(
      (t) =>
        (status === 'All' || t.backendStatus === status) &&
        (priority === 'All' || t.priority === priority) &&
        (staffFilter === 'All' || t.assignee === staffFilter) &&
        (!needle || t.room.includes(needle) || t.id.toLowerCase().includes(needle.toLowerCase())),
    );
  }, [tasks, q, status, priority, staffFilter]);

  const isOpen = (t: HousekeepingTask) => !['READY', 'CANCELLED'].includes(t.backendStatus ?? '');
  const counts = {
    attention: tasks.filter(isOpen).length,
    turnover: tasks.filter((t) => isOpen(t) && TURNOVER_TYPES.includes(t.type ?? '')).length,
    inProgress: tasks.filter((t) => t.backendStatus === 'IN_PROGRESS').length,
    ready: tasks.filter((t) => t.backendStatus === 'READY').length,
    inspection: tasks.filter((t) => ['CLEANED', 'INSPECTION_REQUIRED'].includes(t.backendStatus ?? '')).length,
    overdue: tasks.filter((t) => isOpen(t) && t.dueAtIso && new Date(t.dueAtIso).getTime() < nowMs).length,
  };

  const act = async (task: HousekeepingTask, inspectionResult: 'pass' | 'fail' = 'pass') => {
    try {
      if (task.backendStatus === 'TODO') await operationsApi.startTask(task.id);
      else if (task.backendStatus === 'IN_PROGRESS') await operationsApi.completeTask(task.id);
      else if (task.backendStatus === 'CLEANED') await operationsApi.requestInspection(task.id);
      else if (task.backendStatus === 'INSPECTION_REQUIRED') await operationsApi.inspectTask(task.id, inspectionResult);
      else { toast('Nothing to advance', { detail: `This task is ${hkStatusLabel(task.backendStatus)}.`, tone: 'info' }); return; }
      resource.refresh();
      toast('Housekeeping task updated', { detail: `Room ${task.room} · ${task.task}.`, tone: 'success' });
    } catch (error) { toast('Task update failed', { detail: displayApiError(error), tone: 'danger' }); }
  };

  const taskCommand = async (task: HousekeepingTask, action: 'block' | 'cancel') => {
    const reason = window.prompt(`${action === 'block' ? 'Reason for blocking' : 'Reason for cancelling'} task ${task.id}:`);
    if (!reason?.trim()) return;
    try {
      if (action === 'block') await operationsApi.blockTask(task.id, reason.trim());
      else await operationsApi.cancelTask(task.id, reason.trim());
      resource.refresh();
      toast(`Task ${action}led`, { detail: task.id, tone: 'success' });
    } catch (error) { toast(`Could not ${action} task`, { detail: displayApiError(error), tone: 'danger' }); }
  };

  const unblock = async (task: HousekeepingTask) => {
    try {
      await operationsApi.unblockTask(task.id);
      resource.refresh();
      toast('Task unblocked', { detail: `Room ${task.room} is back on the floor.`, tone: 'success' });
    } catch (error) { toast('Could not unblock task', { detail: displayApiError(error), tone: 'danger' }); }
  };

  const flagMaintenance = async (task: HousekeepingTask) => {
    if (!task.roomId) return toast('Could not flag maintenance', { detail: 'Room reference is missing.', tone: 'danger' });
    try {
      await operationsApi.createTicket({ title: `Housekeeping issue in room ${task.room}`, description: task.notes || task.task, roomId: task.roomId, category: 'OTHER', priority: task.priority === 'High' ? 'HIGH' : 'NORMAL' });
      toast('Maintenance ticket created', { detail: `Room ${task.room} was sent to the maintenance queue.`, tone: 'success' });
    } catch (error) { toast('Could not flag maintenance', { detail: displayApiError(error), tone: 'danger' }); }
  };

  const createTask = async () => {
    if (!newRoomId) return toast('Choose a room', { detail: 'A housekeeping task needs a room.', tone: 'warning' });
    try {
      const created = await operationsApi.createTask({ roomId: newRoomId, type: newType, priority: newPriority, notes: newNotes || undefined });
      setCreating(false);
      setNewNotes('');
      resource.refresh();
      toast('Housekeeping task created', { detail: `Room ${created.roomNumber} · ${newType}.`, tone: 'success' });
    } catch (error) { toast('Could not create task', { detail: displayApiError(error), tone: 'danger' }); }
  };

  const assign = async (task: HousekeepingTask, assignedToId: string) => {
    try {
      await operationsApi.assignTask(task.id, assignedToId || null);
      resource.refresh();
      toast('Housekeeping assignment updated', { detail: task.room, tone: 'success' });
    } catch (error) { toast('Could not assign task', { detail: displayApiError(error), tone: 'danger' }); }
  };

  const cards: [string, number, string][] = [
    ['Needs attention', counts.attention, 'Open + in-progress tasks'],
    ['Turnover cleans', counts.turnover, 'Checkout, stayover & linen'],
    ['Cleaning now', counts.inProgress, 'Staff on the floor'],
    ['Ready rooms', counts.ready, 'Clean & inspected'],
    ['Awaiting inspection', counts.inspection, 'Supervisor queue'],
    ['Overdue', counts.overdue, 'Past due time'],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(([k, v, h]) => (
          <section key={k} className="pms-card p-4">
            <p className="pms-label">{k}</p>
            <p className="pms-kpi-value tnum mt-1">{v}</p>
            <p className="pms-helper mt-1">{h}</p>
          </section>
        ))}
      </div>

      <Card>
        <CardTitle title="Today's turnover" subtitle={`${counts.ready} of ${tasks.length} tasks complete`} />
        <ProgressBar value={Math.round((counts.ready / Math.max(1, tasks.length)) * 100)} />
      </Card>

      <Card>
        <CardTitle
          title="Task list"
          subtitle={resource.loading ? 'Loading housekeeping tasks…' : 'Live housekeeping tasks from the active property'}
          action={<div className="flex flex-wrap items-center gap-2"><Tabs label="Layout" tabs={[{ id: 'list', label: 'List' }, { id: 'board', label: 'Room board' }]} active={view} onChange={setView} />{can('housekeeping.assign') ? <button type="button" className="pms-btn-primary px-3 py-2" onClick={() => { setNewRoomId(rooms[0]?.backendId ?? ''); setCreating(true); }}>+ New task</button> : null}</div>}
        />
        {resource.error ? <p role="alert" className="pms-helper mb-3">Could not load housekeeping tasks: {resource.error}</p> : null}
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Room or task ID…" aria-label="Search tasks" className={inputClass()} />
          <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} aria-label="Filter by staff" className={inputClass()}>{staffOptions.map((s) => <option key={s}>{s}</option>)}</select>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by task status">
            {[['All', 'All'], ['TODO', 'Pending'], ['IN_PROGRESS', 'In progress'], ['INSPECTION_REQUIRED', 'Inspection'], ['READY', 'Ready'], ['BLOCKED', 'Blocked']].map(([value, label]) => <FilterChip key={value} active={status === value} onClick={() => setStatus(value)}>{label}</FilterChip>)}
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by priority">
            {['All', 'High', 'Medium', 'Low'].map((p) => <FilterChip key={p} active={priority === p} onClick={() => setPriority(p)}>{p}</FilterChip>)}
          </div>
        </div>

        {view === 'list' ? (
          <ul className="flex flex-col gap-2.5">
            {filtered.map((t) => (
              <li key={t.id} className="rounded-control border p-3" style={{ borderColor: 'var(--color-border)', opacity: t.status === 'Done' ? 0.75 : 1 }}>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="tnum rounded-[8px] px-2.5 py-1.5 font-mono text-[13px] font-semibold" style={{ background: 'var(--color-muted-surface)', color: 'var(--color-ink)' }}>Rm {t.room}</span>
                  <div className="min-w-[160px] flex-1">
                    <p className="text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{t.task}</p>
                    <p className="tnum text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{t.id} · {t.roomType} · {t.startTime} → {t.dueTime}{t.durationMin ? ` · ~${t.durationMin} min` : ''} · updated {t.updated}</p>
                    {t.notes ? <p className="mt-0.5 text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{t.notes}</p> : null}
                  </div>
                  <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
                  <Badge tone={statusTone(t.backendStatus)}>{hkStatusLabel(t.backendStatus)}</Badge>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {can('housekeeping.assign') && staffUsers.length ? <select value={t.assignedToId ?? ''} onChange={(event) => void assign(t, event.target.value)} aria-label={`Assign ${t.id}`} className={inputClass() + ' max-w-[190px] py-1.5 text-[12px]'}>
                    <option value="">Unassigned</option>{staffUsers.map((member) => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}
                  </select> : <span className="pms-helper px-2 py-1">Assigned: {t.assignee}</span>}
                  {['TODO', 'IN_PROGRESS', 'CLEANED'].includes(t.backendStatus ?? '') ? <button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => void act(t)}>{t.backendStatus === 'TODO' ? 'Start cleaning' : t.backendStatus === 'IN_PROGRESS' ? 'Mark complete' : 'Request inspection'}</button> : null}
                  {t.backendStatus === 'INSPECTION_REQUIRED' ? <><button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => void act(t, 'pass')}>Inspect & pass</button><button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => void act(t, 'fail')}>Fail inspection</button></> : null}
                  {can('housekeeping.complete') && !['READY', 'CANCELLED'].includes(t.backendStatus ?? '') ? <button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => void taskCommand(t, 'block')}>Block</button> : null}
                  {t.backendStatus === 'BLOCKED' && can('housekeeping.complete') ? <button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => void unblock(t)}>Unblock</button> : null}
                  {can('housekeeping.assign') && !['READY', 'CANCELLED'].includes(t.backendStatus ?? '') ? <button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => void taskCommand(t, 'cancel')}>Cancel</button> : null}
                  {can('maintenance.create') ? <button type="button" className="px-3 py-1.5 text-[12px] font-semibold underline" style={{ color: 'var(--color-danger-text)' }} onClick={() => void flagMaintenance(t)}>Flag maintenance</button> : null}
                </div>
              </li>
            ))}
            {filtered.length === 0 ? <p className="pms-helper py-6 text-center">No tasks match these filters.</p> : null}
          </ul>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { void act(t); }}
                className="min-w-0 rounded-control border p-3 text-center"
                style={{ borderColor: t.backendStatus === 'READY' ? 'var(--color-success-border)' : 'var(--color-border)', background: t.backendStatus === 'READY' ? 'var(--color-success-bg)' : 'var(--color-muted-surface)' }}
                aria-label={`Room ${t.room}, ${hkStatusLabel(t.backendStatus)}. Activate to advance.`}
              >
                <span className="tnum block text-[17px] font-semibold" style={{ color: 'var(--color-ink)' }}>{t.room}</span>
                <span className="mt-1 block"><Badge tone={statusTone(t.backendStatus)}>{hkStatusLabel(t.backendStatus)}</Badge></span>
                <span className="mt-1 block truncate text-[11.5px]" style={{ color: 'var(--color-ink-secondary)' }}>{t.assignee} · {t.dueTime}</span>
              </button>
            ))}
          </div>
        )}
      </Card>
      <Modal open={creating} onClose={() => setCreating(false)} title="New housekeeping task" subtitle="One open task per room and type">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Room"><select value={newRoomId} onChange={(event) => setNewRoomId(event.target.value)} className={inputClass()}>{rooms.map((room) => <option key={room.backendId} value={room.backendId}>{room.number} · {room.type} · {room.status}</option>)}</select></Field>
          <Field label="Task type"><select value={newType} onChange={(event) => setNewType(event.target.value)} className={inputClass()}>{['CHECKOUT_CLEAN', 'STAYOVER_CLEAN', 'INSPECTION', 'TURNDOWN', 'LINEN_CHANGE', 'SPECIAL_REQUEST', 'OTHER'].map((type) => <option key={type} value={type}>{type}</option>)}</select></Field>
          <Field label="Priority"><select value={newPriority} onChange={(event) => setNewPriority(event.target.value)} className={inputClass()}>{['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></Field>
          <Field label="Notes"><input value={newNotes} onChange={(event) => setNewNotes(event.target.value)} className={inputClass()} placeholder="Optional task notes" /></Field>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => setCreating(false)}>Cancel</button>
            <button type="button" className="pms-btn-primary flex-[2] px-4 py-2.5" onClick={() => void createTask()}>Create task</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
