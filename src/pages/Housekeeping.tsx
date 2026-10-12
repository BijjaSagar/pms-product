import { useMemo, useState } from 'react';
import { TASKS } from '../data/mock';
import type { BadgeTone } from '../components/status';
import type { HousekeepingTask } from '../data/mock';
import { Badge, Card, CardTitle, ProgressBar } from '../components/ui';
import { FilterChip, Tabs } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { toast } from '../components/toastStore';

function statusTone(s: string): BadgeTone {
  if (s === 'Done') return 'success';
  if (s === 'In progress') return 'info';
  return 'warning';
}

function priorityTone(p: string): BadgeTone {
  if (p === 'High') return 'danger';
  if (p === 'Medium') return 'warning';
  return 'neutral';
}

const STAFF = ['All', 'Maria S.', 'James K.', 'Ana R.', 'Supervisor', 'Ops team'];

export function Housekeeping() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>(TASKS);
  const [view, setView] = useState<'list' | 'board'>('list');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [priority, setPriority] = useState('All');
  const [staff, setStaff] = useState('All');

  const filtered = useMemo(() => {
    const needle = q.trim();
    return tasks.filter(
      (t) =>
        (status === 'All' || t.status === status) &&
        (priority === 'All' || t.priority === priority) &&
        (staff === 'All' || t.assignee === staff) &&
        (!needle || t.room.includes(needle) || t.id.toLowerCase().includes(needle.toLowerCase())),
    );
  }, [tasks, q, status, priority, staff]);

  const counts = {
    attention: tasks.filter((t) => t.status !== 'Done').length,
    dirty: tasks.filter((t) => t.task.toLowerCase().includes('turnover') || t.task.toLowerCase().includes('linen')).length,
    inProgress: tasks.filter((t) => t.status === 'In progress').length,
    ready: tasks.filter((t) => t.status === 'Done').length,
    inspection: tasks.filter((t) => t.task.toLowerCase().includes('inspect')).length,
    overdue: tasks.filter((t) => t.status !== 'Done' && t.dueTime < '11:00').length,
  };

  const act = (id: string, next: HousekeepingTask['status'], msg: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: next, updated: 'now' } : t)));
    toast(msg, { detail: `${id} updated on this screen.` });
  };
  const assign = (id: string, who: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, assignee: who, updated: 'now' } : t)));
    toast(`Assigned to ${who} (demo)`, { detail: id });
  };

  const cards: [string, number, string][] = [
    ['Needs attention', counts.attention, 'Open + in-progress tasks'],
    ['Turnover cleans', counts.dirty, 'Full cleans & linen'],
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
          subtitle="Housekeeping + maintenance flags in one queue"
          action={<Tabs label="Layout" tabs={[{ id: 'list', label: 'List' }, { id: 'board', label: 'Room board' }]} active={view} onChange={setView} />}
        />
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Room or task ID…" aria-label="Search tasks" className={inputClass()} />
          <select value={staff} onChange={(e) => setStaff(e.target.value)} aria-label="Filter by staff" className={inputClass()}>{STAFF.map((s) => <option key={s}>{s}</option>)}</select>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by task status">
            {['All', 'Pending', 'In progress', 'Done'].map((s) => <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>{s}</FilterChip>)}
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by priority">
            {['All', 'High', 'Medium', 'Low'].map((p) => <FilterChip key={p} active={priority === p} onClick={() => setPriority(p)}>{p}</FilterChip>)}
          </div>
        </div>

        {view === 'list' ? (
          <ul className="flex flex-col gap-2.5">
            {filtered.map((t) => (
              <li key={t.id} className="rounded-[10px] border p-3" style={{ borderColor: 'var(--color-border)', opacity: t.status === 'Done' ? 0.75 : 1 }}>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="tnum rounded-[8px] px-2.5 py-1.5 font-mono text-[13px] font-semibold" style={{ background: 'var(--color-muted-surface)', color: 'var(--color-ink)' }}>Rm {t.room}</span>
                  <div className="min-w-[160px] flex-1">
                    <p className="text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{t.task}</p>
                    <p className="tnum text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{t.id} · {t.roomType} · {t.startTime} → {t.dueTime} · ~{t.durationMin} min · updated {t.updated}</p>
                    {t.notes ? <p className="mt-0.5 text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{t.notes}</p> : null}
                  </div>
                  <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
                  <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <select value={t.assignee} onChange={(e) => assign(t.id, e.target.value)} aria-label={`Assign ${t.id}`} className={inputClass() + ' max-w-[170px] py-1.5 text-[12px]'}>
                    {STAFF.filter((s) => s !== 'All').map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {t.status === 'Pending' ? <button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => act(t.id, 'In progress', 'Cleaning started (demo)')}>Start cleaning</button> : null}
                  {t.status === 'In progress' ? <button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => act(t.id, 'Done', 'Cleaning complete (demo)')}>Mark complete</button> : null}
                  {t.status !== 'Done' && !t.task.toLowerCase().includes('inspect') ? <button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => toast('Inspection requested (demo)', { detail: `${t.id} sent to supervisor queue.` , tone: 'info' })}>Request inspection</button> : null}
                  {t.status === 'Done' && t.task.toLowerCase().includes('inspect') ? <button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => toast('Marked inspected & ready (demo)', { detail: `${t.id} closed.` })}>Mark inspected</button> : null}
                  <button type="button" className="px-3 py-1.5 text-[12px] font-semibold underline" style={{ color: 'var(--color-danger-text)' }} onClick={() => toast('Maintenance flagged (demo)', { detail: `${t.id} copied to the maintenance queue.`, tone: 'warning' })}>Flag maintenance</button>
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
                onClick={() => { if (t.status === 'Pending') act(t.id, 'In progress', 'Cleaning started (demo)'); else if (t.status === 'In progress') act(t.id, 'Done', 'Cleaning complete (demo)'); }}
                className="rounded-[10px] border p-3 text-center"
                style={{ borderColor: t.status === 'Done' ? 'var(--color-success-border)' : 'var(--color-border)', background: t.status === 'Done' ? 'var(--color-success-bg)' : 'var(--color-muted-surface)' }}
                aria-label={`Room ${t.room}, ${t.status}. Activate to advance.`}
              >
                <span className="tnum block text-[17px] font-semibold" style={{ color: 'var(--color-ink)' }}>{t.room}</span>
                <span className="mt-1 block"><Badge tone={statusTone(t.status)}>{t.status}</Badge></span>
                <span className="mt-1 block truncate text-[11.5px]" style={{ color: 'var(--color-ink-secondary)' }}>{t.assignee} · {t.dueTime}</span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
