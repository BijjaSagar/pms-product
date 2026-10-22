import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import type { BadgeTone } from '../../components/status';
import type { MaintenanceRequest, MaintenanceStatus } from '../../types';
import { Badge, Card, CardTitle, TableContainer, TableActionBtn } from '../../components/ui';
import { Field, FilterChip } from '../../components/controls';
import { inputClass } from '../../components/inputClass';
import { Drawer, Modal, PromptDialog } from '../../components/overlays';
import { toast } from '../../components/toastStore';
import { adminApi, operationsApi } from '../../lib/api/pms';
import type { UserRow } from '../../lib/api/pms';
import { maintenanceFromApi } from '../../lib/api/adapters';
import { loadRoomInventory } from '../../lib/api/loaders';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { useAuth } from '../../features/auth/AuthContext';

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

  // PromptDialog state for closing or reopening tickets
  const [reasonModal, setReasonModal] = useState<{ ticket: MaintenanceRequest; action: 'close' | 'reopen' } | null>(null);

  const open = reqs.find((r) => r.id === openId) ?? null;
  const oosCount = resource.data?.rooms.filter((r) => r.status === 'Out-of-service').length ?? 0;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return reqs.filter(
      (r) =>
        (status === 'All' || r.status === status) &&
        (!needle ||
          r.id.toLowerCase().includes(needle) ||
          r.room.toLowerCase().includes(needle) ||
          r.description.toLowerCase().includes(needle)),
    );
  }, [reqs, q, status]);

  const transition = async (ticket: MaintenanceRequest, action: 'start' | 'resolve' | 'close' | 'reopen') => {
    if (!ticket.backendId) return;
    if (action === 'resolve' && !note.trim()) {
      return toast('Resolution required', { detail: 'Enter the work completed before resolving this ticket.', tone: 'warning' });
    }
    if (action === 'close' || action === 'reopen') {
      setReasonModal({ ticket, action });
      return;
    }
    try {
      if (action === 'start') await operationsApi.startTicket(ticket.backendId);
      else if (action === 'resolve') await operationsApi.resolveTicket(ticket.backendId, note.trim());
      setNote('');
      resource.refresh();
      toast(action === 'start' ? 'Work started' : 'Ticket resolved', { detail: ticket.id, tone: 'success' });
    } catch (error) {
      toast('Ticket update failed', { detail: displayApiError(error), tone: 'danger' });
    }
  };

  const handleReasonSubmit = async (reason: string) => {
    if (!reasonModal?.ticket.backendId || !reason.trim()) return;
    const { ticket, action } = reasonModal;
    const backendId = ticket.backendId;
    if (!backendId) return;
    try {
      if (action === 'close') await operationsApi.closeTicket(backendId, reason.trim());
      else await operationsApi.reopenTicket(backendId, reason.trim());
      resource.refresh();
      setReasonModal(null);
      toast(action === 'close' ? 'Ticket closed' : 'Ticket reopened', { detail: ticket.id, tone: 'success' });
    } catch (error) {
      toast('Ticket update failed', { detail: displayApiError(error), tone: 'danger' });
    }
  };

  const assign = async (ticket: MaintenanceRequest, assignedToId: string) => {
    if (!ticket.backendId) return;
    try {
      await operationsApi.assignTicket(ticket.backendId, assignedToId || null);
      resource.refresh();
      toast('Ticket assignment updated', { detail: ticket.id, tone: 'success' });
    } catch (error) {
      toast('Could not assign ticket', { detail: displayApiError(error), tone: 'danger' });
    }
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
        category:
          ({ Plumbing: 'PLUMBING', Electrical: 'ELECTRICAL', HVAC: 'HVAC', Furniture: 'FURNITURE', Other: 'OTHER' } as Record<
            string,
            string
          >)[category] ?? 'OTHER',
        priority:
          ({ Urgent: 'CRITICAL', High: 'HIGH', Medium: 'NORMAL', Low: 'LOW' } as Record<string, string>)[priority] ?? 'NORMAL',
      });
      setCreating(false);
      setRoom('');
      setDesc('');
      setNote('');
      resource.refresh();
      toast('Work order created', { detail: created.ticketNo, tone: 'success' });
    } catch (error) {
      toast('Could not create work order', { detail: displayApiError(error), tone: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.Wrench className="text-primary" size={28} />
            <span>Maintenance & Repairs</span>
          </h1>
          <p className="mt-1 text-xs text-ink-secondary">
            Manage engineering work orders, prioritize urgent repairs, and return rooms to service
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl border border-border"
            title="Refresh tickets"
          >
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="pms-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl"
          >
            <Lucide.Plus size={16} strokeWidth={2.4} />
            <span>New Work Order</span>
          </button>
        </div>
      </div>

      {oosCount > 0 ? (
        <div
          className="flex items-start gap-3 rounded-2xl border p-4 shadow-xs"
          style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)' }}
          role="alert"
        >
          <Lucide.AlertTriangle size={20} className="text-danger flex-none mt-0.5" />
          <div>
            <p className="text-sm font-bold text-danger">
              {oosCount} room(s) currently out of order
            </p>
            <p className="mt-0.5 text-xs text-danger/90">
              Resolve the maintenance ticket, then return each room to service from Room Overview.
            </p>
          </div>
        </div>
      ) : null}

      <Card>
        <CardTitle
          title="Work Orders"
          subtitle={resource.loading ? 'Loading maintenance tickets…' : `${filtered.length} of ${reqs.length} requests`}
          action={
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="pms-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold"
            >
              <Lucide.Plus size={16} strokeWidth={2.4} />
              <span>New request</span>
            </button>
          }
        />
        {resource.error ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <Lucide.AlertCircle size={18} />
            <span>Could not load maintenance tickets: {resource.error}</span>
          </div>
        ) : null}

        <div className="mb-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
          <div className="relative">
            <Lucide.Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ticket ID, room or issue…"
              aria-label="Search work orders"
              className={`${inputClass()} pl-9 w-full`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
            {['All', 'Open', 'In progress', 'Resolved'].map((s) => (
              <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
                {s}
              </FilterChip>
            ))}
          </div>
          <button
            type="button"
            className="pms-btn-ghost px-3 py-2 text-xs font-semibold"
            onClick={() => { setQ(''); setStatus('All'); }}
          >
            Reset
          </button>
        </div>

        <TableContainer>
          <table className="pms-table min-w-[820px]">
            <thead>
              <tr>
                <th className="w-12 text-center">#</th>
                <th>REQUEST</th>
                <th>ROOM</th>
                <th>ISSUE</th>
                <th>PRIORITY</th>
                <th>ASSIGNEE</th>
                <th>DUE DATE</th>
                <th>STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr key={r.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="text-center font-medium text-slate-400 text-xs">
                    {idx + 1}
                  </td>
                  <td className="tnum font-mono font-bold text-slate-900 text-xs">{r.id}</td>
                  <td className="tnum font-semibold text-slate-900 text-sm">{r.room}</td>
                  <td className="max-w-[280px] truncate text-slate-600 text-sm font-medium">{r.description}</td>
                  <td>
                    <Badge tone={priorityTone(r.priority)}>{r.priority}</Badge>
                  </td>
                  <td className="text-slate-600 text-sm">{r.assignee}</td>
                  <td className="tnum text-xs text-slate-500">{r.due}</td>
                  <td>
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <TableActionBtn
                        icon={Lucide.Wrench}
                        title={`Open ticket ${r.id}`}
                        onClick={() => setOpenId(r.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? <p className="pms-helper py-8 text-center text-slate-400">No maintenance requests match.</p> : null}
        </TableContainer>
      </Card>

      {/* Ticket Details Drawer */}
      <Drawer
        open={open !== null}
        onClose={() => { setOpenId(null); setNote(''); }}
        title={open ? `Work Order ${open.id}` : ''}
        subtitle="Details, technician assignment and resolution"
      >
        {open ? (
          <div className="flex flex-col gap-4 text-[13.5px]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={priorityTone(open.priority)}>{open.priority}</Badge>
              <Badge tone={statusTone(open.status)}>{open.status}</Badge>
              <Badge tone="neutral">{open.category}</Badge>
            </div>
            <p className="text-[14px] leading-relaxed text-ink font-medium p-3 rounded-xl border bg-black/[0.02]" style={{ borderColor: 'var(--color-border-subtle)' }}>
              {open.description}
            </p>
            <dl className="grid grid-cols-2 gap-2 text-[13px]">
              {[
                ['Room / Facility', open.room],
                ['Reported by', open.reportedBy],
                ['Created', open.created],
                ['Due date', open.due],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border p-2.5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                  <dt className="text-xs text-ink-muted">{k}</dt>
                  <dd className="font-semibold text-ink mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <p className="pms-label mb-1.5">Technician</p>
                {can('maintenance.assign') && resource.data?.users.length ? (
                  <select
                    value={open.assignedToId ?? ''}
                    onChange={(event) => void assign(open, event.target.value)}
                    className={inputClass()}
                    aria-label="Assigned technician"
                  >
                    <option value="">Unassigned</option>
                    {resource.data.users.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.fullName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="font-semibold text-ink">{open.assignee}</p>
                )}
              </div>
              <div>
                <p className="pms-label mb-1.5">Priority Level</p>
                <Badge tone={priorityTone(open.priority)}>{open.priority}</Badge>
              </div>
            </div>
            <div>
              <p className="pms-label mb-1.5">Notes & History</p>
              <ul className="flex flex-col gap-1.5">
                {open.notes.length === 0 ? (
                  <p className="pms-helper">No notes recorded yet.</p>
                ) : (
                  open.notes.map((n, i) => (
                    <li
                      key={i}
                      className="rounded-xl border px-3 py-2 text-xs text-ink-secondary"
                      style={{ borderColor: 'var(--color-divider)' }}
                    >
                      {n}
                    </li>
                  ))
                )}
              </ul>
              {open.status !== 'Resolved' ? (
                <div className="mt-3">
                  <Field label="Resolution details" hint="Required when marking resolved">
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Describe the fix or parts replaced..."
                      aria-label="Resolution details"
                      className={inputClass()}
                    />
                  </Field>
                </div>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {open.backendStatus === 'OPEN' || open.backendStatus === 'ASSIGNED' || open.backendStatus === 'REOPENED' ? (
                <button
                  type="button"
                  className="pms-btn-primary flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5"
                  onClick={() => void transition(open, 'start')}
                >
                  <Lucide.Play size={15} />
                  <span>Start work</span>
                </button>
              ) : null}
              {open.backendStatus === 'IN_PROGRESS' ? (
                <button
                  type="button"
                  className="pms-btn-primary flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5"
                  onClick={() => void transition(open, 'resolve')}
                >
                  <Lucide.CheckCircle2 size={15} />
                  <span>Mark resolved</span>
                </button>
              ) : null}
              {open.backendStatus === 'RESOLVED' ? (
                <button
                  type="button"
                  className="pms-btn-ghost flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5"
                  onClick={() => void transition(open, 'close')}
                >
                  <Lucide.Archive size={15} />
                  <span>Close ticket</span>
                </button>
              ) : null}
              {['RESOLVED', 'CLOSED'].includes(open.backendStatus ?? '') ? (
                <button
                  type="button"
                  className="pms-btn-ghost flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5"
                  onClick={() => void transition(open, 'reopen')}
                >
                  <Lucide.RotateCcw size={15} />
                  <span>Reopen ticket</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* New Maintenance Request Modal */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New Maintenance Request"
        subtitle="Submit a work order ticket to hotel engineering"
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 py-2">
          <Field label="Room / Facility">
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. 208 or Lobby"
              className={inputClass()}
            />
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass()}>
              {['Plumbing', 'Electrical', 'HVAC', 'Furniture', 'Bathroom', 'Other'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Issue Description" hint="At least 8 characters">
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What needs repair and where exactly?"
                className={inputClass()}
              />
            </Field>
          </div>
          <Field label="Priority Level">
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass()}>
              {['Urgent', 'High', 'Medium', 'Low'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <div className="flex items-end gap-2 sm:pt-6">
            <button
              type="button"
              className="pms-btn-ghost flex-1 px-4 py-2.5"
              onClick={() => setCreating(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pms-btn-primary flex-[2] px-4 py-2.5 font-semibold"
              onClick={create}
            >
              Create work order
            </button>
          </div>
        </div>
      </Modal>

      {/* Prompt Dialog for Close / Reopen */}
      <PromptDialog
        open={reasonModal !== null}
        onClose={() => setReasonModal(null)}
        onSubmit={handleReasonSubmit}
        title={reasonModal?.action === 'close' ? 'Close Maintenance Ticket' : 'Reopen Maintenance Ticket'}
        subtitle={`Ticket ${reasonModal?.ticket.id} (${reasonModal?.ticket.room})`}
        label={`Reason for ${reasonModal?.action === 'close' ? 'closing' : 'reopening'}`}
        placeholder="Enter notes or justification..."
        confirmLabel={reasonModal?.action === 'close' ? 'Close Ticket' : 'Reopen Ticket'}
      />
    </div>
  );
}
