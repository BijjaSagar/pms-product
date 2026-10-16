import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import type { HkStatus, HousekeepingTask, MaintenanceRequest, Room, RoomStatus } from '../types';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { roomTone } from '../components/status';
import type { BadgeTone } from '../components/status';
import { FilterChip } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Drawer, PromptDialog } from '../components/overlays';
import { toast } from '../components/toastStore';
import { inventoryApi, operationsApi } from '../lib/api/pms';
import { housekeepingTaskFromApi, maintenanceFromApi } from '../lib/api/adapters';
import { loadRoomInventory } from '../lib/api/loaders';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { formatCurrency } from '../lib/api/format';
import { useAuth } from '../features/auth/AuthContext';

const STATUS_FILTERS: ('All' | RoomStatus)[] = ['All', 'Available', 'Occupied', 'Dirty', 'Inspected', 'Out-of-service'];

function hkTone(hk: HkStatus): BadgeTone {
  if (hk === 'Clean') return 'success';
  if (hk === 'Inspected') return 'success';
  if (hk === 'Cleaning') return 'info';
  return 'warning';
}

function RoomDetail({
  room,
  hkHistory,
  mxHistory,
  currencyCode,
  onStatus,
}: {
  room: Room;
  hkHistory: HousekeepingTask[];
  mxHistory: MaintenanceRequest[];
  currencyCode: string;
  onStatus: (room: Room, s: RoomStatus) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="tnum text-[28px] font-bold leading-none text-ink">Room {room.number}</p>
          <p className="mt-1 text-[13px] text-ink-secondary">
            {room.type} · Floor {room.floor} · <span className="tnum font-semibold text-ink">{formatCurrency(room.rate, currencyCode)}/night</span>
          </p>
        </div>
        <span className="flex flex-col items-end gap-1.5">
          <Badge tone={roomTone(room.status)}>{room.status}</Badge>
          <Badge tone={hkTone(room.hk)}>HK: {room.hk}</Badge>
        </span>
      </div>

      {room.guest ? (
        <div className="rounded-2xl border p-4 shadow-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <p className="pms-label mb-2">Current in-house guest</p>
          <div className="flex items-center gap-3">
            <Avatar name={room.guest} size={38} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink truncate">{room.guest}</p>
              <p className="tnum text-xs text-ink-secondary">
                {room.checkIn} → {room.checkOut}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {room.status === 'Out-of-service' && room.oosReason ? (
        <div className="rounded-2xl border p-4 bg-red-50/50 border-red-200">
          <p className="pms-label text-red-700">Out of service details</p>
          <p className="mt-1 text-sm text-red-900 font-medium">{room.oosReason}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 text-[13px]">
        {[
          ['Max occupancy', `${room.maxOccupancy ?? 2} guests`],
          ['Bed setup', room.bedType ?? 'King bed'],
          ['Housekeeping status', room.hk],
          ['Room status', room.status],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border p-2.5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <p className="text-xs text-ink-muted">{k}</p>
            <p className="font-semibold text-ink mt-0.5">{v}</p>
          </div>
        ))}
      </div>

      {/* Housekeeping history */}
      <div>
        <p className="pms-label mb-2 flex items-center gap-1.5">
          <Lucide.Sparkles size={14} />
          <span>Recent housekeeping</span>
        </p>
        <ul className="flex flex-col gap-1.5">
          {hkHistory.slice(0, 3).map((hk) => (
            <li key={hk.id} className="rounded-xl border p-2.5 text-xs" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">{hk.task}</span>
                <span className="text-ink-secondary">{hk.updated}</span>
              </div>
              <p className="text-ink-muted mt-0.5">Assigned to: {hk.assignee}</p>
            </li>
          ))}
          {hkHistory.length === 0 ? <p className="pms-helper">No recent housekeeping tasks.</p> : null}
        </ul>
      </div>

      {/* Maintenance history */}
      <div>
        <p className="pms-label mb-2 flex items-center gap-1.5">
          <Lucide.Wrench size={14} />
          <span>Recent maintenance</span>
        </p>
        <ul className="flex flex-col gap-1.5">
          {mxHistory.slice(0, 3).map((mx) => (
            <li key={mx.id} className="rounded-xl border p-2.5 text-xs" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">{mx.description}</span>
                <span className="text-ink-secondary">{mx.status}</span>
              </div>
              <p className="text-ink-muted mt-0.5">{mx.category} · Priority: {mx.priority}</p>
            </li>
          ))}
          {mxHistory.length === 0 ? <p className="pms-helper">No recent maintenance orders.</p> : null}
        </ul>
      </div>

      {/* Actions */}
      <div className="mt-2 flex flex-wrap gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {room.status === 'Out-of-service' ? (
          <button
            type="button"
            className="pms-btn-primary flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5"
            onClick={() => onStatus(room, 'Available')}
          >
            <Lucide.CheckCircle2 size={16} />
            <span>Return to service</span>
          </button>
        ) : (
          <button
            type="button"
            className="pms-btn-ghost flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-danger"
            onClick={() => onStatus(room, 'Out-of-service')}
          >
            <Lucide.AlertOctagon size={16} />
            <span>Take out of service</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function Rooms({ initialQuery, focusId }: { initialQuery?: string; focusId?: string } = {}) {
  const { me } = useAuth();
  const currencyCode =
    me?.user.propertyMemberships.find((membership) => membership.propertyId === me.activePropertyId)?.property
      .currencyCode ?? 'INR';

  const loadData = useCallback(async () => {
    const [inventory, housekeeping, maintenance] = await Promise.all([
      loadRoomInventory(),
      operationsApi.housekeepingTasks(),
      operationsApi.maintenanceTickets(),
    ]);
    return {
      rooms: inventory.rooms,
      roomTypes: inventory.roomTypes,
      hkTasks: housekeeping.map(housekeepingTaskFromApi),
      mxTickets: maintenance.map(maintenanceFromApi),
    };
  }, []);

  const resource = useApiResource(loadData);
  const all = useMemo(() => resource.data?.rooms ?? [], [resource.data?.rooms]);
  const hkTasks = useMemo(() => resource.data?.hkTasks ?? [], [resource.data?.hkTasks]);
  const mxTickets = useMemo(() => resource.data?.mxTickets ?? [], [resource.data?.mxTickets]);

  const [q, setQ] = useState(initialQuery ?? '');
  const [status, setStatus] = useState<('All' | RoomStatus)>('All');
  const [type, setType] = useState('All');
  const [floor, setFloor] = useState('All');
  const [hk, setHk] = useState('All');
  const [openNo, setOpenNo] = useState<string | null>(focusId ?? null);

  // Status prompt modal state
  const [statusPrompt, setStatusPrompt] = useState<{ room: Room; targetStatus: RoomStatus } | null>(null);

  const types = useMemo(() => ['All', ...Array.from(new Set(all.map((r) => r.type)))], [all]);
  const floorOptions = useMemo(
    () => ['All', ...Array.from(new Set(all.map((r) => r.floor))).sort((a, b) => a - b).map(String)],
    [all],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter(
      (r) =>
        (status === 'All' || r.status === status) &&
        (type === 'All' || r.type === type) &&
        (floor === 'All' || r.floor === Number(floor)) &&
        (hk === 'All' || r.hk === hk) &&
        (!needle || r.number.includes(needle) || (r.guest ?? '').toLowerCase().includes(needle)),
    );
  }, [all, q, status, type, floor, hk]);

  const clear = () => {
    setQ('');
    setStatus('All');
    setType('All');
    setFloor('All');
    setHk('All');
  };

  const openRoom = all.find((r) => r.number === openNo) ?? null;

  const handleStatusSubmit = async (reason: string) => {
    if (!statusPrompt?.room.backendId || !reason.trim()) return;
    const { room, targetStatus } = statusPrompt;
    const backendId = room.backendId;
    if (!backendId) return;
    try {
      if (targetStatus === 'Out-of-service') await inventoryApi.outOfOrder(backendId, reason.trim());
      else await inventoryApi.backInService(backendId, reason.trim());
      resource.refresh();
      setStatusPrompt(null);
      toast('Room status updated', { detail: `Room ${room.number} is now ${targetStatus}.`, tone: 'success' });
    } catch (error) {
      toast('Room status update failed', { detail: displayApiError(error), tone: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.DoorOpen className="text-primary" size={26} />
            <span>Room Directory & Overview</span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Live room status, guest occupancy, housekeeping cycles, and out-of-service controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border"
            title="Refresh rooms"
          >
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <Card>
        <CardTitle
          title="Room Directory"
          subtitle={resource.loading ? 'Loading room inventory…' : `${filtered.length} of ${all.length} rooms shown`}
        />
        {resource.error ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <Lucide.AlertCircle size={18} />
            <span>Could not load room inventory: {resource.error}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-4">
          <div className="relative">
            <Lucide.Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Room number or guest name…"
              aria-label="Search rooms"
              className={`${inputClass()} pl-9 w-full`}
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Filter by room type"
            className={inputClass()}
          >
            {types.map((t) => (
              <option key={t} value={t}>{t === 'All' ? 'All room types' : t}</option>
            ))}
          </select>
          <select
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            aria-label="Filter by floor"
            className={inputClass()}
          >
            {floorOptions.map((f) => (
              <option key={f} value={f}>{f === 'All' ? 'All floors' : f === '0' ? 'Ground / Unassigned' : `Floor ${f}`}</option>
            ))}
          </select>
          <select
            value={hk}
            onChange={(e) => setHk(e.target.value)}
            aria-label="Filter by housekeeping status"
            className={inputClass()}
          >
            {['All', 'Clean', 'Dirty', 'Cleaning', 'Inspected'].map((h) => (
              <option key={h} value={h}>{h === 'All' ? 'All housekeeping' : `HK: ${h}`}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by room status">
          {STATUS_FILTERS.map((s) => (
            <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s}
            </FilterChip>
          ))}
          <button
            type="button"
            onClick={clear}
            className="ml-auto text-xs font-semibold text-primary hover:underline"
          >
            Reset filters
          </button>
        </div>
      </Card>

      {/* Room Grid */}
      <div className="pms-stagger grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((room) => (
          <article
            key={room.number}
            className="pms-card pms-card-hover p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="tnum text-[22px] font-bold leading-none text-ink">Room {room.number}</p>
                  <p className="mt-1 text-[12.5px] text-ink-secondary">
                    {room.type} · Floor {room.floor} · <span className="tnum font-semibold text-ink">{formatCurrency(room.rate, currencyCode)}</span>
                  </p>
                </div>
                <span className="flex flex-col items-end gap-1">
                  <Badge tone={roomTone(room.status)}>{room.status}</Badge>
                  <Badge tone={hkTone(room.hk)}>HK: {room.hk}</Badge>
                </span>
              </div>
              <p className="tnum mt-3 min-h-[20px] text-[12.5px] text-ink-secondary">
                {room.guest
                  ? `Guest: ${room.guest}${room.checkIn ? ` · ${room.checkIn} → ${room.checkOut}` : ''}`
                  : room.status === 'Out-of-service'
                  ? `Blocked: ${room.oosReason || 'Maintenance in progress'}`
                  : 'Ready to allocate'}
              </p>
            </div>
            <div className="mt-4 flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <button
                type="button"
                className="pms-btn-ghost flex-1 py-1.5 text-xs font-medium"
                onClick={() => setOpenNo(room.number)}
              >
                Details
              </button>
              <button
                type="button"
                className="pms-btn-primary flex-1 py-1.5 text-xs font-semibold"
                onClick={() => setOpenNo(room.number)}
              >
                Manage
              </button>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <Lucide.DoorClosed size={40} className="mx-auto text-ink-muted mb-2 opacity-40" />
            <p className="pms-helper">No rooms match these filters.</p>
            <button
              type="button"
              onClick={clear}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              Clear all filters
            </button>
          </div>
        </Card>
      ) : null}

      {/* Room Drawer */}
      <Drawer
        open={openRoom !== null}
        onClose={() => setOpenNo(null)}
        title={openRoom ? `Room ${openRoom.number}` : ''}
        subtitle="Specifications, guest folio, housekeeping & maintenance history"
      >
        {openRoom ? (
          <RoomDetail
            room={openRoom}
            hkHistory={hkTasks.filter((task) => task.room === openRoom.number)}
            mxHistory={mxTickets.filter((ticket) => ticket.room === openRoom.number)}
            currencyCode={currencyCode}
            onStatus={(r, s) => setStatusPrompt({ room: r, targetStatus: s })}
          />
        ) : null}
      </Drawer>

      {/* PromptDialog for Out-of-service / Return to service */}
      <PromptDialog
        open={statusPrompt !== null}
        onClose={() => setStatusPrompt(null)}
        onSubmit={handleStatusSubmit}
        title={statusPrompt?.targetStatus === 'Out-of-service' ? 'Take Room Out of Service' : 'Return Room to Service'}
        subtitle={`Room ${statusPrompt?.room.number} (${statusPrompt?.room.type})`}
        label={
          statusPrompt?.targetStatus === 'Out-of-service'
            ? 'Reason for taking room out of service'
            : 'Operational note for returning to service'
        }
        placeholder="Enter notes or justification..."
        confirmLabel={statusPrompt?.targetStatus === 'Out-of-service' ? 'Take out of service' : 'Return to service'}
        danger={statusPrompt?.targetStatus === 'Out-of-service'}
      />
    </div>
  );
}
