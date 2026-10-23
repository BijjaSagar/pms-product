import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import * as Lucide from 'lucide-react';
import type { BadgeTone } from '../../components/status';
import { Avatar, Badge, Card, PageHeader, ProgressBar } from '../../components/ui';
import { Field, FilterChip } from '../../components/controls';
import { Drawer, Modal } from '../../components/overlays';
import { inputClass } from '../../components/inputClass';
import { toast } from '../../components/toastStore';
import { adminApi, operationsApi } from '../../lib/api/pms';
import { loadRoomInventory } from '../../lib/api/loaders';
import type { UserRow } from '../../lib/api/pms';
import type { HousekeepingTask, Room } from '../../types';
import { housekeepingTaskFromApi } from '../../lib/api/adapters';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { useAuth } from '../../features/auth/AuthContext';

type CommandAction = 'block' | 'cancel';

type StatusFilter =
  | 'All'
  | 'TODO'
  | 'IN_PROGRESS'
  | 'CLEANED'
  | 'INSPECTION_REQUIRED'
  | 'READY'
  | 'BLOCKED'
  | 'CANCELLED';

const HK_STATUS_LABEL: Record<string, string> = {
  TODO: 'Pending',
  IN_PROGRESS: 'In cleaning',
  CLEANED: 'Cleaned',
  INSPECTION_REQUIRED: 'Inspection needed',
  READY: 'Ready for guest',
  BLOCKED: 'Blocked / Issue',
  CANCELLED: 'Cancelled',
};

const STATUS_FILTERS: { value: StatusFilter; label: string; icon: Lucide.LucideIcon }[] = [
  { value: 'All', label: 'All Tasks', icon: Lucide.ClipboardList },
  { value: 'TODO', label: 'Pending', icon: Lucide.Clock3 },
  { value: 'IN_PROGRESS', label: 'In Cleaning', icon: Lucide.Sparkles },
  { value: 'INSPECTION_REQUIRED', label: 'Inspection Needed', icon: Lucide.SearchCheck },
  { value: 'READY', label: 'Ready', icon: Lucide.CircleCheck },
  { value: 'BLOCKED', label: 'Blocked', icon: Lucide.Ban },
];

const TURNOVER_TYPES = ['CHECKOUT_CLEAN', 'STAYOVER_CLEAN', 'LINEN_CHANGE', 'DEEP_CLEAN'];

const TASK_TYPE_CONFIG: Record<string, { label: string; icon: Lucide.LucideIcon; tone: string }> = {
  CHECKOUT_CLEAN: { label: 'Checkout Clean', icon: Lucide.LogOut, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  STAYOVER_CLEAN: { label: 'Stayover Clean', icon: Lucide.BedDouble, tone: 'text-sky-700 bg-sky-50 border-sky-200' },
  LINEN_CHANGE: { label: 'Linen Change', icon: Lucide.Layers, tone: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  INSPECTION: { label: 'Supervisor Inspection', icon: Lucide.SearchCheck, tone: 'text-purple-700 bg-purple-50 border-purple-200' },
  TURNDOWN: { label: 'Evening Turndown', icon: Lucide.Moon, tone: 'text-blue-700 bg-blue-50 border-blue-200' },
  SPECIAL_REQUEST: { label: 'Guest Request', icon: Lucide.Sparkles, tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  DEEP_CLEAN: { label: 'Deep Sanitization', icon: Lucide.Flame, tone: 'text-rose-700 bg-rose-50 border-rose-200' },
  OTHER: { label: 'General Task', icon: Lucide.ClipboardList, tone: 'text-slate-700 bg-slate-50 border-slate-200' },
};

function hkStatusLabel(status?: string): string {
  return status ? HK_STATUS_LABEL[status] ?? status.replace(/_/g, ' ') : '—';
}

function statusTone(status?: string): BadgeTone {
  if (status === 'READY') return 'success';
  if (status === 'CANCELLED') return 'neutral';
  if (status === 'BLOCKED') return 'danger';
  if (status === 'IN_PROGRESS' || status === 'CLEANED') return 'info';
  if (status === 'INSPECTION_REQUIRED') return 'warning';
  return 'neutral';
}

function priorityTone(priority: string): BadgeTone {
  if (priority === 'High' || priority === 'Urgent') return 'danger';
  if (priority === 'Medium') return 'warning';
  return 'neutral';
}

function isOpen(task: HousekeepingTask): boolean {
  return !['READY', 'CANCELLED'].includes(task.backendStatus ?? '');
}

function isOverdue(task: HousekeepingTask, nowMs: number): boolean {
  if (!isOpen(task) || !task.dueAtIso) return false;
  const dueAt = Date.parse(task.dueAtIso);
  return Number.isFinite(dueAt) && dueAt < nowMs;
}

function formatDueAt(value: string | null | undefined, timeZone?: string): string {
  if (!value) return 'No due time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Due time unavailable';

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  try {
    return new Intl.DateTimeFormat(undefined, { ...options, ...(timeZone ? { timeZone } : {}) }).format(date);
  } catch {
    return new Intl.DateTimeFormat(undefined, options).format(date);
  }
}

function getTaskTypeInfo(type?: string) {
  if (!type) return TASK_TYPE_CONFIG.OTHER;
  return TASK_TYPE_CONFIG[type] ?? {
    label: type.replace(/_/g, ' '),
    icon: Lucide.ClipboardList,
    tone: 'text-slate-700 bg-slate-50 border-slate-200',
  };
}

// -------------------------------------------------------------------------------------------------
// Task Details Side Drawer
// -------------------------------------------------------------------------------------------------
type TaskDrawerProps = {
  task: HousekeepingTask | null;
  room?: Room;
  staffUsers: UserRow[];
  canAssign: boolean;
  canComplete: boolean;
  canCancel: boolean;
  canFlagMaintenance: boolean;
  busy: boolean;
  busyAction?: string;
  onClose: () => void;
  onAssign: (task: HousekeepingTask, staffId: string) => void;
  onAdvance: (task: HousekeepingTask, result?: 'pass' | 'fail') => void;
  onCommand: (task: HousekeepingTask, action: CommandAction) => void;
  onUnblock: (task: HousekeepingTask) => void;
  onFlagMaintenance: (task: HousekeepingTask) => void;
  timeZone?: string;
  nowMs: number;
};

function TaskDetailsDrawer({
  task,
  room,
  staffUsers,
  canAssign,
  canComplete,
  canCancel,
  canFlagMaintenance,
  busy,
  busyAction,
  onClose,
  onAssign,
  onAdvance,
  onCommand,
  onUnblock,
  onFlagMaintenance,
  timeZone,
  nowMs,
}: TaskDrawerProps) {
  if (!task) return null;
  const overdue = isOverdue(task, nowMs);
  const typeInfo = getTaskTypeInfo(task.type);
  const TypeIcon = typeInfo.icon;

  const STAGES = [
    { key: 'TODO', label: 'Pending' },
    { key: 'IN_PROGRESS', label: 'In Cleaning' },
    { key: 'CLEANED', label: 'Cleaned' },
    { key: 'INSPECTION_REQUIRED', label: 'Inspection' },
    { key: 'READY', label: 'Ready' },
  ];

  const currentStageIndex = STAGES.findIndex((s) => s.key === task.backendStatus);

  return (
    <Drawer
      open={Boolean(task)}
      onClose={onClose}
      title={`Room ${task.room} • ${task.task}`}
      subtitle={`Task ID: ${task.id} • Created ${task.updated}`}
    >
      <div className="flex flex-col gap-5 text-sm">
        {/* Status Pipeline Visualizer */}
        <div className="rounded-2xl border p-4 bg-black/[0.015]" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary mb-3">
            Turnaround Pipeline
          </p>
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {STAGES.map((stage, idx) => {
              const isPast = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;
              return (
                <div key={stage.key} className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-[var(--color-primary)] text-white shadow-sm ring-2 ring-[var(--color-primary)]/20'
                        : isPast
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isPast ? <Lucide.Check size={13} strokeWidth={2.8} /> : idx + 1}
                  </div>
                  <span
                    className={`mt-1.5 text-[10px] font-semibold truncate max-w-full ${
                      isCurrent
                        ? 'text-ink font-bold'
                        : isPast
                          ? 'text-emerald-700'
                          : 'text-ink-muted'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority & Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(task.backendStatus)} dot>
            {hkStatusLabel(task.backendStatus)}
          </Badge>
          <Badge tone={priorityTone(task.priority)}>Priority: {task.priority}</Badge>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${typeInfo.tone}`}>
            <TypeIcon size={13} />
            {typeInfo.label}
          </span>
          {overdue ? <Badge tone="danger">Past Due Target</Badge> : null}
        </div>

        {/* Room & Stay Profile */}
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary">Target Room</p>
              <p className="tnum font-mono text-2xl font-bold text-ink mt-0.5">Room {task.room}</p>
              <p className="text-xs text-ink-secondary mt-0.5">{task.roomType || 'Standard Room'}</p>
            </div>
            {room?.guest ? (
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <Lucide.User size={11} />
                  In-House Guest
                </span>
                <p className="text-xs font-bold text-ink mt-1 truncate max-w-[160px]">{room.guest}</p>
                <p className="text-[11px] text-ink-muted">Stay: {room.checkIn} → {room.checkOut}</p>
              </div>
            ) : (
              <span className="text-[11px] font-semibold text-ink-muted px-2.5 py-1 rounded-lg bg-black/[0.03]">
                Vacant Room
              </span>
            )}
          </div>

          {room ? (
            <div className="mt-3.5 grid grid-cols-2 gap-2 border-t pt-3 text-xs" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div>
                <span className="text-ink-muted">Floor:</span>{' '}
                <span className="font-semibold text-ink">{room.floor || '—'}</span>
              </div>
              <div>
                <span className="text-ink-muted">Bed setup:</span>{' '}
                <span className="font-semibold text-ink">{room.bedType || 'King Bed'}</span>
              </div>
              <div>
                <span className="text-ink-muted">Occupancy:</span>{' '}
                <span className="font-semibold text-ink">Max {room.maxOccupancy ?? 2} guests</span>
              </div>
              <div>
                <span className="text-ink-muted">HK clean status:</span>{' '}
                <span className="font-semibold text-ink">{room.hk}</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Assigned Staff Member */}
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary mb-2.5">
            Housekeeper Assignment
          </p>
          <div className="flex items-center gap-3">
            <Avatar name={task.assignee} size={38} />
            <div className="flex-1 min-w-0">
              {canAssign && staffUsers.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <select
                    value={task.assignedToId ?? ''}
                    onChange={(e) => onAssign(task, e.target.value)}
                    disabled={busy}
                    aria-label="Assign housekeeper"
                    className={`${inputClass()} py-1 text-xs`}
                  >
                    <option value="">Unassigned</option>
                    {staffUsers.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.fullName} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <p className="font-semibold text-ink text-sm">{task.assignee}</p>
                  <p className="text-xs text-ink-muted">Assigned staff on duty</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Schedule & Due Time */}
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary mb-2">Schedule & Due Target</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <Lucide.Clock3 size={15} className="text-ink-muted mt-0.5" />
              <div>
                <p className="text-ink-muted text-[11px]">Due Target</p>
                <p className={`font-bold mt-0.5 ${overdue ? 'text-rose-600' : 'text-ink'}`}>
                  {formatDueAt(task.dueAtIso, timeZone)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Lucide.Calendar size={15} className="text-ink-muted mt-0.5" />
              <div>
                <p className="text-ink-muted text-[11px]">Started / Progress</p>
                <p className="font-bold text-ink mt-0.5">{task.startTime || 'Not started'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Special Instructions */}
        {task.notes ? (
          <div className="rounded-2xl border p-4 bg-amber-50/60 border-amber-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1">
              <Lucide.AlertCircle size={14} />
              <span>Special Instructions / Floor Notes</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium whitespace-pre-wrap">{task.notes}</p>
          </div>
        ) : null}

        {/* Actions Footer */}
        <div className="mt-2 flex flex-col gap-2.5 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary mb-1">Turnaround Actions</p>
          <div className="flex flex-wrap items-center gap-2">
            {canComplete && task.backendStatus === 'TODO' ? (
              <button
                type="button"
                className="pms-btn-primary flex-1 py-2 text-xs font-semibold"
                onClick={() => onAdvance(task)}
                disabled={busy}
              >
                {busyAction === 'advance' ? <Lucide.LoaderCircle size={14} className="animate-spin" /> : <Lucide.Sparkles size={14} />}
                <span>Start Cleaning</span>
              </button>
            ) : null}

            {canComplete && task.backendStatus === 'IN_PROGRESS' ? (
              <button
                type="button"
                className="pms-btn-primary flex-1 py-2 text-xs font-semibold"
                onClick={() => onAdvance(task)}
                disabled={busy}
              >
                {busyAction === 'advance' ? <Lucide.LoaderCircle size={14} className="animate-spin" /> : <Lucide.CheckCircle2 size={14} />}
                <span>Mark Cleaned</span>
              </button>
            ) : null}

            {canComplete && task.backendStatus === 'CLEANED' ? (
              <button
                type="button"
                className="pms-btn-primary flex-1 py-2 text-xs font-semibold"
                onClick={() => onAdvance(task)}
                disabled={busy}
              >
                {busyAction === 'advance' ? <Lucide.LoaderCircle size={14} className="animate-spin" /> : <Lucide.SearchCheck size={14} />}
                <span>Request Supervisor Inspection</span>
              </button>
            ) : null}

            {canComplete && task.backendStatus === 'INSPECTION_REQUIRED' ? (
              <div className="flex w-full gap-2">
                <button
                  type="button"
                  className="pms-btn-primary flex-1 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 border-emerald-600"
                  onClick={() => onAdvance(task, 'pass')}
                  disabled={busy}
                >
                  <Lucide.CircleCheck size={14} />
                  <span>Pass Inspection</span>
                </button>
                <button
                  type="button"
                  className="pms-btn-ghost flex-1 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border-rose-200"
                  onClick={() => onAdvance(task, 'fail')}
                  disabled={busy}
                >
                  <Lucide.CircleX size={14} />
                  <span>Fail Inspection</span>
                </button>
              </div>
            ) : null}

            {canComplete && task.backendStatus === 'BLOCKED' ? (
              <button
                type="button"
                className="pms-btn-ghost flex-1 py-2 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200 font-semibold"
                onClick={() => onUnblock(task)}
                disabled={busy}
              >
                <Lucide.RotateCcw size={14} />
                <span>Unblock Room</span>
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
            {canFlagMaintenance && task.roomId ? (
              <button
                type="button"
                className="pms-btn-ghost flex-1 py-1.5 text-xs font-semibold"
                onClick={() => onFlagMaintenance(task)}
                disabled={busy}
              >
                <Lucide.Wrench size={13} />
                <span>Escalate to Maintenance</span>
              </button>
            ) : null}

            {canComplete && !['READY', 'CANCELLED', 'BLOCKED'].includes(task.backendStatus ?? '') ? (
              <button
                type="button"
                className="pms-btn-ghost py-1.5 px-3 text-xs"
                onClick={() => onCommand(task, 'block')}
                disabled={busy}
              >
                <Lucide.Ban size={13} />
                <span>Block</span>
              </button>
            ) : null}

            {canCancel && !['READY', 'CANCELLED'].includes(task.backendStatus ?? '') ? (
              <button
                type="button"
                className="pms-btn-ghost py-1.5 px-3 text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                onClick={() => onCommand(task, 'cancel')}
                disabled={busy}
              >
                <Lucide.X size={13} />
                <span>Cancel</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

// -------------------------------------------------------------------------------------------------
// Main Housekeeping Page Component
// -------------------------------------------------------------------------------------------------
export function Housekeeping() {
  const { can, me } = useAuth();

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

  const timeZone = me?.user.propertyMemberships.find(
    (membership) => membership.propertyId === me.activePropertyId,
  )?.property.timezone;

  // Filter states
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [priority, setPriority] = useState('All');
  const [staffFilter, setStaffFilter] = useState('All');
  const [taskTypeFilter, setTaskTypeFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Selected tasks for bulk batch actions
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Task drawer & modals
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [newType, setNewType] = useState('CHECKOUT_CLEAN');
  const [newPriority, setNewPriority] = useState('NORMAL');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Command modal (Block or Cancel)
  const [commandModal, setCommandModal] = useState<{ task: HousekeepingTask; action: CommandAction } | null>(null);
  const [commandReason, setCommandReason] = useState('');
  const [commandSubmitting, setCommandSubmitting] = useState(false);

  // Maintenance modal
  const [maintenanceModal, setMaintenanceModal] = useState<HousekeepingTask | null>(null);
  const [maintenanceCategory, setMaintenanceCategory] = useState('OTHER');
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);

  // Individual task busy state tracker
  const [busyTaskIds, setBusyTaskIds] = useState<Record<string, string>>({});

  // Clock for overdue calculations
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const detailTask = useMemo(() => tasks.find((t) => t.id === detailTaskId) ?? null, [tasks, detailTaskId]);
  const detailRoom = useMemo(() => rooms.find((r) => r.number === detailTask?.room), [rooms, detailTask]);

  const staffOptions = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.assignee))).sort((a, b) => a.localeCompare(b)),
    [tasks],
  );

  const statusCounts = useMemo(
    () =>
      tasks.reduce<Record<string, number>>((result, task) => {
        const taskStatus = task.backendStatus ?? 'TODO';
        result[taskStatus] = (result[taskStatus] ?? 0) + 1;
        return result;
      }, {}),
    [tasks],
  );

  const counts = useMemo(
    () => ({
      open: tasks.filter(isOpen).length,
      turnover: tasks.filter((task) => isOpen(task) && TURNOVER_TYPES.includes(task.type ?? '')).length,
      inProgress: tasks.filter((task) => task.backendStatus === 'IN_PROGRESS').length,
      ready: tasks.filter((task) => task.backendStatus === 'READY').length,
      inspection: tasks.filter((task) => ['CLEANED', 'INSPECTION_REQUIRED'].includes(task.backendStatus ?? '')).length,
      blocked: tasks.filter((task) => task.backendStatus === 'BLOCKED').length,
      overdue: tasks.filter((task) => isOverdue(task, nowMs)).length,
    }),
    [tasks, nowMs],
  );

  const progressTotal = tasks.filter((task) => task.backendStatus !== 'CANCELLED').length;
  const progressValue = progressTotal ? Math.round((counts.ready / progressTotal) * 100) : 0;

  // Filtered task collection
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesStatus = status === 'All' || task.backendStatus === status;
      const matchesPriority = priority === 'All' || task.priority === priority;
      const matchesStaff = staffFilter === 'All' || task.assignee === staffFilter;
      const matchesType = taskTypeFilter === 'All' || task.type === taskTypeFilter;
      const matchesOverdue = !overdueOnly || isOverdue(task, nowMs);

      const searchable = [task.room, task.id, task.task, task.type, task.assignee, task.notes, task.roomType]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        matchesStatus &&
        matchesPriority &&
        matchesStaff &&
        matchesType &&
        matchesOverdue &&
        (!needle || searchable.includes(needle))
      );
    });
  }, [tasks, q, status, priority, staffFilter, taskTypeFilter, overdueOnly, nowMs]);

  const setTaskBusy = (taskId: string, action: string | null) => {
    setBusyTaskIds((previous) => {
      const next = { ...previous };
      if (action) next[taskId] = action;
      else delete next[taskId];
      return next;
    });
  };

  // Action handlers
  const act = async (task: HousekeepingTask, inspectionResult: 'pass' | 'fail' = 'pass') => {
    if (!can('housekeeping.complete')) return;
    if (!['TODO', 'IN_PROGRESS', 'CLEANED', 'INSPECTION_REQUIRED'].includes(task.backendStatus ?? '')) {
      toast('Nothing to advance', { detail: `This task is ${hkStatusLabel(task.backendStatus)}.`, tone: 'info' });
      return;
    }

    setTaskBusy(task.id, 'advance');
    try {
      if (task.backendStatus === 'TODO') await operationsApi.startTask(task.id);
      else if (task.backendStatus === 'IN_PROGRESS') await operationsApi.completeTask(task.id);
      else if (task.backendStatus === 'CLEANED') await operationsApi.requestInspection(task.id);
      else await operationsApi.inspectTask(task.id, inspectionResult);
      resource.refresh();
      toast(
        task.backendStatus === 'INSPECTION_REQUIRED' && inspectionResult === 'fail'
          ? 'Inspection failed'
          : 'Housekeeping task updated',
        {
          detail:
            task.backendStatus === 'INSPECTION_REQUIRED' && inspectionResult === 'fail'
              ? `Room ${task.room} was returned to pending queue.`
              : `Room ${task.room} • ${task.task}.`,
          tone: 'success',
        },
      );
    } catch (error) {
      toast('Task update failed', { detail: displayApiError(error), tone: 'danger' });
    } finally {
      setTaskBusy(task.id, null);
    }
  };

  const openCommand = (task: HousekeepingTask, action: CommandAction) => {
    setCommandReason('');
    setCommandModal({ task, action });
  };

  const handleCommandSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!commandModal || !commandReason.trim() || commandSubmitting) return;
    const { task, action } = commandModal;
    setCommandSubmitting(true);
    setTaskBusy(task.id, action);
    try {
      if (action === 'block') await operationsApi.blockTask(task.id, commandReason.trim());
      else await operationsApi.cancelTask(task.id, commandReason.trim());
      resource.refresh();
      setCommandModal(null);
      setCommandReason('');
      toast(`Task ${action === 'block' ? 'blocked' : 'cancelled'}`, { detail: `Room ${task.room}`, tone: 'success' });
    } catch (error) {
      toast(`Could not ${action} task`, { detail: displayApiError(error), tone: 'danger' });
    } finally {
      setTaskBusy(task.id, null);
      setCommandSubmitting(false);
    }
  };

  const unblock = async (task: HousekeepingTask) => {
    if (!can('housekeeping.complete')) return;
    setTaskBusy(task.id, 'unblock');
    try {
      await operationsApi.unblockTask(task.id);
      resource.refresh();
      toast('Task unblocked', { detail: `Room ${task.room} is back in the active queue.`, tone: 'success' });
    } catch (error) {
      toast('Could not unblock task', { detail: displayApiError(error), tone: 'danger' });
    } finally {
      setTaskBusy(task.id, null);
    }
  };

  const openMaintenanceDialog = (task: HousekeepingTask) => {
    setMaintenanceCategory('OTHER');
    setMaintenanceNotes(task.notes || `Housekeeping found an issue in Room ${task.room}`);
    setMaintenanceModal(task);
  };

  const handleMaintenanceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!maintenanceModal || !can('maintenance.create') || maintenanceSubmitting) return;
    if (!maintenanceModal.roomId) {
      toast('Could not flag maintenance', { detail: 'Room reference is missing.', tone: 'danger' });
      return;
    }
    setMaintenanceSubmitting(true);
    try {
      await operationsApi.createTicket({
        title: `Housekeeping issue in room ${maintenanceModal.room}`,
        description: maintenanceNotes.trim() || maintenanceModal.task,
        roomId: maintenanceModal.roomId,
        category: maintenanceCategory,
        priority: maintenanceModal.priority === 'High' ? 'HIGH' : 'NORMAL',
      });
      setMaintenanceModal(null);
      toast('Maintenance work order created', {
        detail: `Room ${maintenanceModal.room} was escalated to engineering.`,
        tone: 'success',
      });
    } catch (error) {
      toast('Could not flag maintenance', { detail: displayApiError(error), tone: 'danger' });
    } finally {
      setMaintenanceSubmitting(false);
    }
  };

  const openCreateTask = () => {
    setNewRoomId(rooms[0]?.backendId || '');
    setNewType('CHECKOUT_CLEAN');
    setNewPriority('NORMAL');
    setNewAssigneeId('');
    setNewNotes('');
    setCreating(true);
  };

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newRoomId) {
      toast('Choose a room', { detail: 'A housekeeping task needs a room.', tone: 'warning' });
      return;
    }
    if (creatingTask) return;
    setCreatingTask(true);
    try {
      const created = await operationsApi.createTask({
        roomId: newRoomId,
        type: newType,
        priority: newPriority,
        assignedToId: newAssigneeId || undefined,
        notes: newNotes.trim() || undefined,
      });
      setCreating(false);
      resource.refresh();
      toast('Housekeeping task created', {
        detail: `Room ${created.roomNumber} • ${newType.replace(/_/g, ' ')}.`,
        tone: 'success',
      });
    } catch (error) {
      toast('Could not create task', { detail: displayApiError(error), tone: 'danger' });
    } finally {
      setCreatingTask(false);
    }
  };

  const assign = async (task: HousekeepingTask, assignedToId: string) => {
    if (!can('housekeeping.assign')) return;
    setTaskBusy(task.id, 'assign');
    try {
      await operationsApi.assignTask(task.id, assignedToId || null);
      resource.refresh();
      toast('Assignment updated', { detail: `Room ${task.room}`, tone: 'success' });
    } catch (error) {
      toast('Could not assign task', { detail: displayApiError(error), tone: 'danger' });
    } finally {
      setTaskBusy(task.id, null);
    }
  };

  // Bulk batch actions
  const toggleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selectedTaskIds.size === filtered.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filtered.map((t) => t.id)));
    }
  };

  const bulkAssign = async (staffId: string) => {
    if (!can('housekeeping.assign') || selectedTaskIds.size === 0) return;
    try {
      await Promise.all(Array.from(selectedTaskIds).map((id) => operationsApi.assignTask(id, staffId || null)));
      resource.refresh();
      toast('Batch assignment complete', {
        detail: `Updated ${selectedTaskIds.size} tasks.`,
        tone: 'success',
      });
      setSelectedTaskIds(new Set());
    } catch (error) {
      toast('Bulk assignment failed', { detail: displayApiError(error), tone: 'danger' });
    }
  };

  const bulkAdvance = async () => {
    if (!can('housekeeping.complete') || selectedTaskIds.size === 0) return;
    const selectedTasks = tasks.filter((t) => selectedTaskIds.has(t.id));
    try {
      await Promise.all(
        selectedTasks.map(async (t) => {
          if (t.backendStatus === 'TODO') await operationsApi.startTask(t.id);
          else if (t.backendStatus === 'IN_PROGRESS') await operationsApi.completeTask(t.id);
          else if (t.backendStatus === 'CLEANED') await operationsApi.requestInspection(t.id);
        }),
      );
      resource.refresh();
      toast('Batch progress updated', {
        detail: `Advanced ${selectedTaskIds.size} tasks.`,
        tone: 'success',
      });
      setSelectedTaskIds(new Set());
    } catch (error) {
      toast('Batch update failed', { detail: displayApiError(error), tone: 'danger' });
    }
  };

  const clearFilters = () => {
    setQ('');
    setStatus('All');
    setPriority('All');
    setStaffFilter('All');
    setTaskTypeFilter('All');
    setOverdueOnly(false);
  };

  const hasFilters =
    Boolean(q.trim()) ||
    status !== 'All' ||
    priority !== 'All' ||
    staffFilter !== 'All' ||
    taskTypeFilter !== 'All' ||
    overdueOnly;

  const isInitialLoading = resource.loading && resource.data === null;
  const canAssign = can('housekeeping.assign');
  const canComplete = can('housekeeping.complete');
  const canFlagMaintenance = can('maintenance.create');
  const canCancel = canAssign;

  // 4 Top Spacious KPI Cards
  const metrics = [
    {
      id: 'open',
      label: 'Open Queue',
      value: counts.open,
      hint: `${counts.turnover} turnovers pending`,
      Icon: Lucide.ClipboardList,
      toneStyle: 'text-amber-700 bg-amber-50 border-amber-200/80',
      active: status === 'All' && !overdueOnly,
      onClick: () => { setStatus('All'); setOverdueOnly(false); },
    },
    {
      id: 'cleaning',
      label: 'In Cleaning',
      value: counts.inProgress,
      hint: 'Housekeepers on floor',
      Icon: Lucide.Sparkles,
      toneStyle: 'text-sky-700 bg-sky-50 border-sky-200/80',
      active: status === 'IN_PROGRESS',
      onClick: () => { setStatus('IN_PROGRESS'); setOverdueOnly(false); },
    },
    {
      id: 'inspection',
      label: 'Inspection Needed',
      value: counts.inspection,
      hint: 'Awaiting supervisor sign-off',
      Icon: Lucide.SearchCheck,
      toneStyle: 'text-purple-700 bg-purple-50 border-purple-200/80',
      active: status === 'INSPECTION_REQUIRED',
      onClick: () => { setStatus('INSPECTION_REQUIRED'); setOverdueOnly(false); },
    },
    {
      id: 'ready',
      label: 'Ready for Guest',
      value: counts.ready,
      hint: `${progressValue}% completion rate`,
      Icon: Lucide.CircleCheck,
      toneStyle: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
      active: status === 'READY',
      onClick: () => { setStatus('READY'); setOverdueOnly(false); },
    },
  ];

  return (
    <div className="flex flex-col gap-5 pms-animate-fade-in pb-12">
      {/* 1. Page Header */}
      <PageHeader
        icon={Lucide.Sparkles}
        iconBg="bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-xs shadow-sky-500/20"
        title="Housekeeping"
        badge={
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Live Floor Dispatch
          </span>
        }
        subtitle="Coordinate real-time room turnarounds, inspections, housekeeper assignments and maintenance follow-ups."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => resource.refresh()}
              disabled={resource.loading}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors disabled:opacity-60"
              aria-label="Refresh tasks"
            >
              <Lucide.RefreshCw size={13} className={resource.loading ? 'animate-spin' : ''} />
              <span>{resource.loading ? 'Syncing…' : 'Refresh'}</span>
            </button>
            {canAssign ? (
              <button
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:opacity-95 shadow-xs cursor-pointer transition-all"
                onClick={openCreateTask}
              >
                <Lucide.Plus size={15} strokeWidth={2.4} />
                <span>New Task</span>
              </button>
            ) : null}
          </div>
        }
      />

      {/* 2. Top KPI Cards & Integrated Progress */}
      {isInitialLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="pms-card min-h-[96px] p-4">
              <div className="pms-skeleton h-3 w-20 rounded-full" />
              <div className="pms-skeleton mt-3 h-7 w-14 rounded-lg" />
              <div className="pms-skeleton mt-2 h-2.5 w-24 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metrics.map((m) => {
              const Icon = m.Icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={m.onClick}
                  className={`pms-card pms-card-hover group relative flex flex-col justify-between p-4 text-left transition-all cursor-pointer rounded-2xl ${
                    m.active ? 'ring-2 ring-[var(--color-primary)] shadow-sm' : ''
                  }`}
                  style={{ background: 'var(--color-surface)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary truncate">
                      {m.label}
                    </span>
                    <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-xl border ${m.toneStyle}`}>
                      <Icon size={14} />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-2">
                    <p className="tnum font-mono text-2xl font-bold text-ink">{m.value}</p>
                    <span className="text-xs text-ink-muted">{m.hint}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Clean Integrated Turnover Progress Bar */}
          <div className="pms-card p-4 rounded-2xl flex flex-col gap-2.5" style={{ background: 'var(--color-surface)' }}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink">Turnover Readiness:</span>
                <span className="font-semibold text-ink-secondary">
                  {counts.ready} of {progressTotal} rooms ready for check-in
                </span>
                {counts.overdue > 0 ? (
                  <button
                    type="button"
                    onClick={() => setOverdueOnly(!overdueOnly)}
                    className={`ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      overdueOnly
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <Lucide.Clock3 size={12} />
                    <span>{counts.overdue} Overdue Attention</span>
                  </button>
                ) : null}
              </div>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {progressValue}% Ready
              </span>
            </div>
            <ProgressBar value={progressValue} />
          </div>
        </div>
      )}

      {/* 3. Spacious Task Listing Section */}
      <Card className="p-5 sm:p-6 rounded-2xl">
        {/* Header: Title + Active Stats */}
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <div>
            <h2 className="text-base font-bold tracking-tight text-ink">Task Queue</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              {resource.loading ? 'Updating tasks…' : `Showing ${filtered.length} of ${tasks.length} total room tasks`}
            </p>
          </div>

          {/* Quick Select All Toggle */}
          {filtered.length > 0 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-xs font-semibold text-ink-secondary hover:text-ink px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              >
                {selectedTaskIds.size === filtered.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          ) : null}
        </div>

        {/* Clean, Spacious Search & Filter Bar */}
        <div className="mb-5 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            {/* Search Input */}
            <div className="relative">
              <Lucide.Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search room number, housekeeper, or task…"
                aria-label="Search housekeeping tasks"
                className={`${inputClass()} w-full pl-9 text-xs`}
              />
              {q ? (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                >
                  <Lucide.X size={14} />
                </button>
              ) : null}
            </div>

            {/* Staff Filter */}
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              aria-label="Filter by housekeeper"
              className={`${inputClass()} text-xs`}
            >
              <option value="All">All Housekeepers</option>
              {staffOptions.map((staff) => (
                <option key={staff} value={staff}>
                  {staff}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              aria-label="Filter by priority"
              className={`${inputClass()} text-xs`}
            >
              <option value="All">All Priorities</option>
              {['High', 'Medium', 'Low'].map((p) => (
                <option key={p} value={p}>
                  {p === 'High' ? 'High / Urgent' : p}
                </option>
              ))}
            </select>

            {/* Task Type Filter */}
            <select
              value={taskTypeFilter}
              onChange={(e) => setTaskTypeFilter(e.target.value)}
              aria-label="Filter by task type"
              className={`${inputClass()} text-xs`}
            >
              <option value="All">All Task Types</option>
              {Object.entries(TASK_TYPE_CONFIG).map(([k, cfg]) => (
                <option key={k} value={k}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Chips Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
              {STATUS_FILTERS.map(({ value, label, icon: Icon }) => {
                const count = value === 'All' ? tasks.length : statusCounts[value] ?? 0;
                const isActive = status === value;
                return (
                  <FilterChip key={value} active={isActive} onClick={() => setStatus(value)}>
                    <span className="flex items-center gap-1.5">
                      <Icon size={12} />
                      <span>{label}</span>
                      <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] font-bold">{count}</span>
                    </span>
                  </FilterChip>
                );
              })}
            </div>

            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="pms-btn-ghost px-3 py-1 text-xs font-semibold flex items-center gap-1.5 text-ink-muted hover:text-ink"
              >
                <Lucide.RotateCcw size={13} />
                <span>Reset filters</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Error Alert */}
        {resource.error ? (
          <div
            className="mb-4 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)' }}
            role="alert"
          >
            <div className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--color-danger-text)' }}>
              <Lucide.CircleAlert size={18} className="mt-0.5 flex-none" />
              <span>Could not load housekeeping tasks: {resource.error}</span>
            </div>
            <button type="button" onClick={() => resource.refresh()} className="pms-btn-ghost px-3 py-1.5 text-xs">
              <Lucide.RefreshCw size={14} />
              Try again
            </button>
          </div>
        ) : null}

        {/* ----------------------------------------------------------------------------------------- */}
        {/* THE REDESIGNED SPACIOUS LISTING (Generous Padding, Clear Hierarchy, Uncluttered)           */}
        {/* ----------------------------------------------------------------------------------------- */}
        {isInitialLoading ? (
          <div className="flex flex-col gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="pms-card p-5 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="pms-skeleton h-12 w-16 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="pms-skeleton h-4 w-48 rounded-full" />
                    <div className="pms-skeleton h-3 w-32 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="flex flex-col gap-3.5">
            {filtered.map((task) => {
              const overdue = isOverdue(task, nowMs);
              const isSelected = selectedTaskIds.has(task.id);
              const typeInfo = getTaskTypeInfo(task.type);
              const TypeIcon = typeInfo.icon;
              const isBusy = Boolean(busyTaskIds[task.id]);

              return (
                <article
                  key={task.id}
                  className={`pms-card pms-card-hover group relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all ${
                    isSelected ? 'ring-2 ring-[var(--color-primary)] bg-sky-50/20' : ''
                  }`}
                  style={{
                    borderColor: overdue ? 'var(--color-danger-border)' : 'var(--color-border)',
                    background: 'var(--color-surface)',
                  }}
                >
                  {/* Left Column: Multi-select checkbox + Room Pill + Task Info */}
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectTask(task.id)}
                      aria-label={`Select room ${task.room}`}
                      className="h-4 w-4 rounded mt-1 sm:mt-0 flex-none text-primary cursor-pointer"
                    />

                    {/* Room Box */}
                    <div
                      className="flex flex-col items-center justify-center h-12 w-16 flex-none rounded-xl font-mono text-sm font-bold tnum border"
                      style={{
                        background: 'var(--color-muted-surface)',
                        color: 'var(--color-ink)',
                        borderColor: 'var(--color-border-subtle)',
                      }}
                    >
                      <span className="leading-tight">{task.room}</span>
                      <span className="text-[10px] font-sans font-semibold text-ink-muted uppercase">Room</span>
                    </div>

                    {/* Task Title & Room Category */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailTaskId(task.id)}
                          className="text-left font-bold text-ink text-sm hover:text-primary transition-colors cursor-pointer tracking-tight"
                        >
                          {task.task}
                        </button>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${typeInfo.tone}`}>
                          <TypeIcon size={12} />
                          {typeInfo.label}
                        </span>
                        <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                      </div>

                      <p className="text-xs text-ink-muted mt-1">
                        <span>{task.roomType || 'Standard Room'}</span>
                        <span className="mx-1.5">•</span>
                        <span className="font-mono">#{task.id}</span>
                      </p>

                      {/* Instructions snippet if present */}
                      {task.notes ? (
                        <p className="text-xs text-ink-secondary mt-1.5 flex items-center gap-1.5 bg-black/[0.02] px-2.5 py-1 rounded-lg border border-black/[0.04]">
                          <Lucide.FileText size={12} className="text-ink-muted flex-none" />
                          <span className="truncate max-w-[480px]">{task.notes}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Middle Column: Status Badge, Staff Assignment & Due Time */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 flex-none border-t lg:border-t-0 pt-3 lg:pt-0" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    {/* Status Pill */}
                    <div className="flex-none">
                      <Badge tone={statusTone(task.backendStatus)} dot>
                        {hkStatusLabel(task.backendStatus)}
                      </Badge>
                    </div>

                    {/* Assigned Housekeeper */}
                    <div className="flex items-center gap-2 flex-none min-w-[130px]">
                      <Avatar name={task.assignee} size={28} />
                      <div className="text-left">
                        <p className="text-xs font-bold text-ink leading-tight truncate max-w-[120px]">{task.assignee}</p>
                        <p className="text-[10px] text-ink-muted">Assigned staff</p>
                      </div>
                    </div>

                    {/* Target Due */}
                    <div className="text-left flex-none min-w-[130px]">
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${overdue ? 'text-rose-600 font-bold' : 'text-ink-secondary'}`}>
                        <Lucide.Clock3 size={13} className="text-ink-muted flex-none" />
                        <span>{formatDueAt(task.dueAtIso, timeZone)}</span>
                      </div>
                      {overdue ? (
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-md">
                          Past Due
                        </span>
                      ) : (
                        <span className="text-[10px] text-ink-muted block mt-0.5">Target finish</span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Clean Contextual Action Button + Details trigger */}
                  <div className="flex items-center justify-end gap-2 flex-none border-t lg:border-t-0 pt-3 lg:pt-0" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    {/* Contextual Single Primary Action */}
                    {canComplete && task.backendStatus === 'TODO' ? (
                      <button
                        type="button"
                        className="pms-btn-primary px-3.5 py-1.5 text-xs font-semibold"
                        onClick={() => act(task)}
                        disabled={isBusy}
                      >
                        {busyTaskIds[task.id] === 'advance' ? (
                          <Lucide.LoaderCircle size={13} className="animate-spin" />
                        ) : (
                          <Lucide.Sparkles size={13} />
                        )}
                        <span>Start Cleaning</span>
                      </button>
                    ) : null}

                    {canComplete && task.backendStatus === 'IN_PROGRESS' ? (
                      <button
                        type="button"
                        className="pms-btn-primary px-3.5 py-1.5 text-xs font-semibold"
                        onClick={() => act(task)}
                        disabled={isBusy}
                      >
                        {busyTaskIds[task.id] === 'advance' ? (
                          <Lucide.LoaderCircle size={13} className="animate-spin" />
                        ) : (
                          <Lucide.CheckCircle2 size={13} />
                        )}
                        <span>Mark Cleaned</span>
                      </button>
                    ) : null}

                    {canComplete && task.backendStatus === 'CLEANED' ? (
                      <button
                        type="button"
                        className="pms-btn-primary px-3.5 py-1.5 text-xs font-semibold"
                        onClick={() => act(task)}
                        disabled={isBusy}
                      >
                        {busyTaskIds[task.id] === 'advance' ? (
                          <Lucide.LoaderCircle size={13} className="animate-spin" />
                        ) : (
                          <Lucide.SearchCheck size={13} />
                        )}
                        <span>Request Inspection</span>
                      </button>
                    ) : null}

                    {canComplete && task.backendStatus === 'INSPECTION_REQUIRED' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="pms-btn-primary px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 border-emerald-600"
                          onClick={() => act(task, 'pass')}
                          disabled={isBusy}
                        >
                          <Lucide.CircleCheck size={13} />
                          <span>Pass</span>
                        </button>
                        <button
                          type="button"
                          className="pms-btn-ghost px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border-rose-200"
                          onClick={() => act(task, 'fail')}
                          disabled={isBusy}
                        >
                          <Lucide.CircleX size={13} />
                          <span>Fail</span>
                        </button>
                      </div>
                    ) : null}

                    {canComplete && task.backendStatus === 'BLOCKED' ? (
                      <button
                        type="button"
                        className="pms-btn-ghost px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200 font-semibold"
                        onClick={() => unblock(task)}
                        disabled={isBusy}
                      >
                        <Lucide.RotateCcw size={13} />
                        <span>Unblock</span>
                      </button>
                    ) : null}

                    {task.backendStatus === 'READY' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                        <Lucide.CircleCheck size={13} />
                        <span>Inspected & Ready</span>
                      </span>
                    ) : null}

                    {/* View Details Button */}
                    <button
                      type="button"
                      onClick={() => setDetailTaskId(task.id)}
                      className="pms-btn-ghost px-3 py-1.5 text-xs font-semibold"
                      title="View room details and actions"
                    >
                      <Lucide.SlidersHorizontal size={13} />
                      <span className="hidden sm:inline">Details</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed px-5 py-14 text-center" style={{ borderColor: 'var(--color-border)' }}>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Lucide.SearchX size={22} />
            </span>
            <h3 className="mt-3 text-sm font-bold text-ink">No housekeeping tasks match your filters</h3>
            <p className="pms-helper mt-1 text-xs">Try searching another room number or clear active filters.</p>
            {hasFilters ? (
              <button type="button" onClick={clearFilters} className="pms-btn-ghost mt-4 px-3.5 py-1.5 text-xs font-semibold">
                Clear active filters
              </button>
            ) : null}
          </div>
        )}
      </Card>

      {/* 4. Floating Bottom Bulk Action Dock */}
      {selectedTaskIds.size > 0 ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border bg-white/95 px-5 py-3 shadow-xl backdrop-blur-md border-slate-200 text-ink animate-bounce-in">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-xs font-bold">
              {selectedTaskIds.size}
            </span>
            <span className="text-xs font-bold text-ink">Selected</span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {canAssign && staffUsers.length > 0 ? (
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) bulkAssign(e.target.value);
                }}
                defaultValue=""
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-ink"
              >
                <option value="" disabled>
                  Assign to staff…
                </option>
                {staffUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {canComplete ? (
            <button
              type="button"
              onClick={bulkAdvance}
              className="pms-btn-primary px-3 py-1.5 text-xs font-semibold"
            >
              Advance Stage
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setSelectedTaskIds(new Set())}
            className="pms-btn-ghost px-2.5 py-1.5 text-xs"
          >
            Deselect
          </button>
        </div>
      ) : null}

      {/* 5. Comprehensive Task Details Side Drawer */}
      <TaskDetailsDrawer
        task={detailTask}
        room={detailRoom}
        staffUsers={staffUsers}
        canAssign={canAssign}
        canComplete={canComplete}
        canCancel={canCancel}
        canFlagMaintenance={canFlagMaintenance}
        onClose={() => setDetailTaskId(null)}
        onAssign={assign}
        onAdvance={act}
        onCommand={openCommand}
        onUnblock={unblock}
        onFlagMaintenance={openMaintenanceDialog}
        timeZone={timeZone}
        nowMs={nowMs}
        busy={Boolean(detailTask && busyTaskIds[detailTask.id])}
        busyAction={detailTask ? busyTaskIds[detailTask.id] : undefined}
      />

      {/* 6. Create New Task Modal */}
      <Modal
        open={creating}
        onClose={() => {
          if (!creatingTask) setCreating(false);
        }}
        title="Schedule Housekeeping Task"
        subtitle="Dispatch room turnarounds, linen changes, or supervisor quality inspections."
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreating(false)}
              disabled={creatingTask}
              className="pms-btn-ghost px-4 py-2 text-xs font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="housekeeping-create-form"
              disabled={creatingTask || !rooms.length}
              className="pms-btn-primary px-4 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {creatingTask ? <Lucide.LoaderCircle size={14} className="animate-spin" /> : <Lucide.Plus size={14} />}
              <span>{creatingTask ? 'Dispatching…' : 'Dispatch Task'}</span>
            </button>
          </>
        }
      >
        <form
          id="housekeeping-create-form"
          onSubmit={(e) => void createTask(e)}
          className="grid grid-cols-1 gap-3.5 py-1 sm:grid-cols-2 text-xs"
        >
          <Field label="Target Room">
            <select
              value={newRoomId}
              onChange={(e) => setNewRoomId(e.target.value)}
              className={inputClass()}
              disabled={!rooms.length || creatingTask}
              required
            >
              {rooms.length ? (
                rooms.map((room) => (
                  <option key={room.backendId} value={room.backendId}>
                    Room {room.number} • {room.type} ({room.status})
                  </option>
                ))
              ) : (
                <option value="">No rooms available</option>
              )}
            </select>
          </Field>

          <Field label="Task Type">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className={inputClass()}
              disabled={creatingTask}
            >
              {Object.entries(TASK_TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priority Level">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className={inputClass()}
              disabled={creatingTask}
            >
              {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((val) => (
                <option key={val} value={val}>
                  {val === 'HIGH' ? 'High / Fast turnaround' : val === 'URGENT' ? 'Urgent / VIP Arrival' : val}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assign Housekeeper" hint="Optional initial staff assignment">
            <select
              value={newAssigneeId}
              onChange={(e) => setNewAssigneeId(e.target.value)}
              className={inputClass()}
              disabled={creatingTask}
            >
              <option value="">Unassigned (pool queue)</option>
              {staffUsers.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Instructions & Notes" hint="Optional notes for the assigned floor housekeeper">
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className={`${inputClass()} min-h-[88px] resize-y`}
                placeholder="e.g. VIP welcome amenity, extra towels, allergen-free bedding"
                disabled={creatingTask}
              />
            </Field>
          </div>
        </form>
      </Modal>

      {/* 7. Block / Cancel Modal */}
      <Modal
        open={commandModal !== null}
        onClose={() => {
          if (!commandSubmitting) setCommandModal(null);
        }}
        title={commandModal?.action === 'block' ? 'Block Housekeeping Task' : 'Cancel Housekeeping Task'}
        subtitle={
          commandModal ? `Room ${commandModal.task.room} • ${commandModal.task.task}` : undefined
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setCommandModal(null)}
              disabled={commandSubmitting}
              className="pms-btn-ghost px-4 py-2 text-xs font-semibold disabled:opacity-50"
            >
              Keep Task
            </button>
            <button
              type="submit"
              form="housekeeping-command-form"
              disabled={commandSubmitting || !commandReason.trim()}
              className={`${
                commandModal?.action === 'cancel' ? 'pms-btn-danger' : 'pms-btn-primary'
              } px-4 py-2 text-xs font-semibold disabled:opacity-50`}
            >
              {commandSubmitting ? <Lucide.LoaderCircle size={14} className="animate-spin" /> : null}
              <span>
                {commandSubmitting
                  ? 'Saving…'
                  : commandModal?.action === 'block'
                    ? 'Block Task'
                    : 'Cancel Task'}
              </span>
            </button>
          </>
        }
      >
        <form id="housekeeping-command-form" onSubmit={(e) => void handleCommandSubmit(e)} className="py-1">
          <Field
            label={`Reason for ${commandModal?.action === 'block' ? 'blocking' : 'cancelling'}`}
            hint="A clear operational reason is required for audit logs."
          >
            <textarea
              value={commandReason}
              onChange={(e) => setCommandReason(e.target.value)}
              className={`${inputClass()} min-h-[96px] resize-y`}
              placeholder="e.g. Guest requested privacy until 3 PM, maintenance issue in bathroom"
              disabled={commandSubmitting}
              required
              autoFocus
            />
          </Field>
        </form>
      </Modal>

      {/* 8. Flag Maintenance Modal */}
      <Modal
        open={maintenanceModal !== null}
        onClose={() => {
          if (!maintenanceSubmitting) setMaintenanceModal(null);
        }}
        title="Escalate to Maintenance"
        subtitle={
          maintenanceModal ? `Create an engineering work order for Room ${maintenanceModal.room}` : undefined
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setMaintenanceModal(null)}
              disabled={maintenanceSubmitting}
              className="pms-btn-ghost px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="housekeeping-maintenance-form"
              disabled={maintenanceSubmitting || !maintenanceNotes.trim()}
              className="pms-btn-primary px-4 py-2 text-xs font-semibold"
            >
              {maintenanceSubmitting ? <Lucide.LoaderCircle size={14} className="animate-spin" /> : <Lucide.Wrench size={14} />}
              <span>{maintenanceSubmitting ? 'Creating…' : 'Create Work Order'}</span>
            </button>
          </>
        }
      >
        <form id="housekeeping-maintenance-form" onSubmit={(e) => void handleMaintenanceSubmit(e)} className="flex flex-col gap-3 py-1">
          <Field label="Issue Category">
            <select
              value={maintenanceCategory}
              onChange={(e) => setMaintenanceCategory(e.target.value)}
              className={inputClass()}
              disabled={maintenanceSubmitting}
            >
              <option value="PLUMBING">Plumbing (leaks, faucet, toilet)</option>
              <option value="ELECTRICAL">Electrical (lights, power outlet)</option>
              <option value="HVAC">HVAC / Air Conditioning</option>
              <option value="FURNITURE">Furniture & Fixtures</option>
              <option value="OTHER">Other Issue</option>
            </select>
          </Field>

          <Field label="Issue Description" hint="Explain the defect found by housekeeping staff">
            <textarea
              value={maintenanceNotes}
              onChange={(e) => setMaintenanceNotes(e.target.value)}
              className={`${inputClass()} min-h-[100px] resize-y`}
              placeholder="Describe the issue in detail…"
              disabled={maintenanceSubmitting}
              required
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
