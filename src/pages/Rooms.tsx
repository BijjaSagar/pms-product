import { useCallback, useMemo, useState } from 'react';
import type { HkStatus, HousekeepingTask, MaintenanceRequest, Room, RoomStatus } from '../data/mock';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { roomTone } from '../components/status';
import type { BadgeTone } from '../components/status';
import { FilterChip } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Drawer } from '../components/overlays';
import { toast } from '../components/toastStore';
import { inventoryApi, operationsApi } from '../lib/api/pms';
import { housekeepingTaskFromApi, maintenanceFromApi } from '../lib/api/adapters';
import { loadRoomInventory } from '../lib/api/loaders';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { formatCurrency } from '../lib/api/format';
import { useAuth } from '../features/auth/AuthContext';

const STATUS_FILTERS: ('All' | RoomStatus)[] = ['All', 'Available', 'Occupied', 'Dirty', 'Cleaning', 'Inspected', 'Out-of-service'];

function hkTone(hk: HkStatus): BadgeTone {
  if (hk === 'Clean') return 'success';
  if (hk === 'Inspected') return 'success';
  if (hk === 'Cleaning') return 'info';
  return 'warning';
}

function RoomDetail({ room, hkHistory, mxHistory, currencyCode, onStatus }: { room: Room; hkHistory: HousekeepingTask[]; mxHistory: MaintenanceRequest[]; currencyCode: string; onStatus: (room: Room, s: RoomStatus) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="tnum text-[26px] font-semibold leading-none" style={{ color: 'var(--color-ink)' }}>{room.number}</p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--color-ink-secondary)' }}>{room.type} · Floor {room.floor} · <span className="tnum">{formatCurrency(room.rate, currencyCode)}/night</span></p>
        </div>
        <span className="flex flex-col items-end gap-1.5">
          <Badge tone={roomTone(room.status)}>{room.status}</Badge>
          <Badge tone={hkTone(room.hk)}>HK: {room.hk}</Badge>
        </span>
      </div>
      {room.guest ? (
        <div className="flex items-center gap-3 rounded-[10px] border p-3" style={{ borderColor: 'var(--color-border)' }}>
          <Avatar name={room.guest} />
          <div>
            <p className="text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{room.guest}</p>
            <p className="tnum text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{room.checkIn} → {room.checkOut}{room.reservationId ? ` · ${room.reservationId}` : ''}</p>
          </div>
        </div>
      ) : (
        <p className="pms-helper">No current guest is returned for this room.</p>
      )}
      <div>
        <p className="pms-label mb-1.5">Housekeeping history</p>
        {hkHistory.length === 0 ? <p className="pms-helper">No tasks recorded for this room.</p> : (
          <ul className="flex flex-col gap-1.5">
            {hkHistory.map((t) => (
              <li key={t.id} className="pms-summary-row tnum gap-2 rounded-[8px] border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-divider)' }}>
                <span style={{ color: 'var(--color-ink)' }}>{t.id} · {t.task}</span>
                <span style={{ color: 'var(--color-ink-secondary)' }}>{t.status} · {t.assignee}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="pms-label mb-1.5">Maintenance history</p>
        {mxHistory.length === 0 ? <p className="pms-helper">No work orders for this room.</p> : (
          <ul className="flex flex-col gap-1.5">
            {mxHistory.map((m) => (
              <li key={m.id} className="pms-summary-row tnum gap-2 rounded-[8px] border px-3 py-2 text-[12.5px]" style={{ borderColor: m.status === 'Resolved' ? 'var(--color-divider)' : 'var(--color-warning-border)', background: m.status === 'Resolved' ? undefined : 'var(--color-warning-bg)' }}>
                <span style={{ color: m.status === 'Resolved' ? 'var(--color-ink)' : 'var(--color-warning-text)' }}>{m.id} · {m.description}</span>
                <span style={{ color: 'var(--color-ink-secondary)' }}>{m.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="pms-label mb-2">Room service status</p>
        <p className="pms-helper mb-2">Cleanliness status is changed by housekeeping workflows. Out-of-order changes require a reason.</p>
        <div className="flex flex-wrap gap-1.5">
          {room.status !== 'Out-of-service' && room.status !== 'Occupied' ? <button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => onStatus(room, 'Out-of-service')}>Take out of order</button> : null}
          {room.status === 'Out-of-service' ? <button type="button" className="pms-btn-primary px-3 py-1.5" onClick={() => onStatus(room, 'Dirty')}>Return to service</button> : null}
        </div>
      </div>
    </div>
  );
}

export function Rooms({ initialQuery = '', focusId }: { initialQuery?: string; focusId?: string }) {
  const { me } = useAuth();
  const currencyCode = me?.user.propertyMemberships.find((membership) => membership.propertyId === me.activePropertyId)?.property.currencyCode ?? 'INR';
  const loadData = useCallback(async () => {
    const [inventory, tasks, tickets] = await Promise.all([loadRoomInventory(), operationsApi.housekeepingTasks(), operationsApi.maintenanceTickets()]);
    return {
      rooms: inventory.rooms,
      tasks: tasks.map(housekeepingTaskFromApi),
      tickets: tickets.map(maintenanceFromApi),
    };
  }, []);
  const resource = useApiResource(loadData);
  const all = useMemo(() => resource.data?.rooms ?? [], [resource.data?.rooms]);
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('All');
  const [type, setType] = useState('All');
  const [floor, setFloor] = useState('All');
  const [hk, setHk] = useState('All');
  const [openNo, setOpenNo] = useState<string | null>(focusId ?? null);

  const hkTasks = useMemo(() => resource.data?.tasks ?? [], [resource.data?.tasks]);
  const mxTickets = useMemo(() => resource.data?.tickets ?? [], [resource.data?.tickets]);
  const types = useMemo(() => ['All', ...Array.from(new Set(all.map((r) => r.type)))], [all]);
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

  const clear = () => { setQ(''); setStatus('All'); setType('All'); setFloor('All'); setHk('All'); };
  const openRoom = all.find((r) => r.number === openNo) ?? null;
  const setStatusOf = async (room: Room, status: RoomStatus) => {
    if (!room.backendId) return;
    const reason = window.prompt(status === 'Out-of-service' ? 'Reason for taking this room out of service:' : 'Note for returning this room to service:');
    if (!reason?.trim()) return;
    try {
      if (status === 'Out-of-service') await inventoryApi.outOfOrder(room.backendId, reason.trim());
      else await inventoryApi.backInService(room.backendId, reason.trim());
      resource.refresh();
      toast('Room status updated', { detail: `Room ${room.number} is now ${status}.`, tone: 'success' });
    } catch (error) { toast('Room status update failed', { detail: displayApiError(error), tone: 'danger' }); }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle title="Filters" subtitle={resource.loading ? 'Loading room inventory…' : `${filtered.length} of ${all.length} rooms shown`} />
        {resource.error ? <p role="alert" className="pms-helper">Could not load room inventory: {resource.error}</p> : null}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Room number or guest…" aria-label="Search rooms" className={inputClass()} />
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by room type" className={inputClass()}>{types.map((t) => <option key={t}>{t}</option>)}</select>
          <select value={floor} onChange={(e) => setFloor(e.target.value)} aria-label="Filter by floor" className={inputClass()}>
            {['All', '1', '2', '3', '4', '5'].map((f) => <option key={f} value={f}>{f === 'All' ? 'All floors' : `Floor ${f}`}</option>)}
          </select>
          <select value={hk} onChange={(e) => setHk(e.target.value)} aria-label="Filter by housekeeping status" className={inputClass()}>
            {['All', 'Clean', 'Dirty', 'Cleaning', 'Inspected'].map((h) => <option key={h} value={h}>{h === 'All' ? 'All housekeeping' : `HK: ${h}`}</option>)}
          </select>
        </div>
        <div className="mb-1 mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => <FilterChip key={f} active={status === f} onClick={() => setStatus(f)}>{f}</FilterChip>)}
          <button type="button" onClick={clear} className="ml-auto text-[12.5px] font-semibold underline" style={{ color: 'var(--color-primary)' }}>Clear all filters</button>
        </div>
      </Card>

      <div className="pms-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((room) => (
          <article key={room.number} className="pms-card pms-card-hover p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="tnum text-[20px] font-semibold leading-none" style={{ color: 'var(--color-ink)' }}>{room.number}</p>
                <p className="mt-1 text-[12.5px]" style={{ color: 'var(--color-ink-secondary)' }}>{room.type} · Floor {room.floor} · <span className="tnum">{formatCurrency(room.rate, currencyCode)}/night</span></p>
              </div>
              <span className="flex flex-col items-end gap-1">
                <Badge tone={roomTone(room.status)}>{room.status}</Badge>
                <Badge tone={hkTone(room.hk)}>HK: {room.hk}</Badge>
              </span>
            </div>
            <p className="tnum mt-3 min-h-[20px] text-[12.5px]" style={{ color: 'var(--color-ink-secondary)' }}>
              {room.guest ? `Guest: ${room.guest}${room.checkIn ? ` · ${room.checkIn} → ${room.checkOut}` : ''}` : room.status === 'Out-of-service' ? 'Blocked — see maintenance WO-118' : 'Ready to sell'}
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="pms-btn-ghost flex-1 px-3 py-2" onClick={() => setOpenNo(room.number)}>Details</button>
              <button type="button" className="pms-btn-primary flex-1 px-3 py-2" onClick={() => setOpenNo(room.number)}>
                {room.status === 'Available' || room.status === 'Inspected' ? 'Assign' : 'Update'}
              </button>
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 ? <Card><p className="pms-helper py-6 text-center">No rooms match — <button type="button" onClick={clear} className="font-semibold underline" style={{ color: 'var(--color-primary)' }}>clear filters</button>.</p></Card> : null}

      <Drawer open={openRoom !== null} onClose={() => setOpenNo(null)} title={openRoom ? `Room ${openRoom.number}` : ''} subtitle="Information, reservations, history and status">
        {openRoom ? <RoomDetail room={openRoom} hkHistory={hkTasks.filter((task) => task.room === openRoom.number)} mxHistory={mxTickets.filter((ticket) => ticket.room === openRoom.number)} currencyCode={currencyCode} onStatus={setStatusOf} /> : null}
      </Drawer>
    </div>
  );
}
