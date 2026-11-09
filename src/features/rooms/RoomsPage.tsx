import { useCallback, useMemo, useState } from 'react';
import { PageSkeleton } from '../../components/Skeleton';
import * as Lucide from 'lucide-react';
import type { HkStatus, HousekeepingTask, MaintenanceRequest, Room, RoomStatus } from '../../types';
import { Avatar, Badge } from '../../components/ui';
import { roomTone } from '../../utils/status';
import type { BadgeTone } from '../../utils/status';
import { Drawer, PromptDialog } from '../../components/overlays';
import { toast } from '../../utils/toast';
import { inventoryApi, operationsApi } from '../../lib/api/pms';
import { housekeepingTaskFromApi, maintenanceFromApi } from '../../lib/api/adapters';
import { loadRoomInventory } from '../../lib/api/loaders';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { formatCurrency } from '../../utils/currency';
import { useAuth } from '../../features/auth/AuthContext';
import { StatusTimeline } from './StatusTimeline';
import { Button } from '../../components/primitives';
import { RoomFilterBar, type RoomViewMode } from './RoomFilterBar';
import { EMPTY_ROOM_FILTERS, filterRooms, type RoomFilters } from './roomFilters';

function hkTone(hk: HkStatus): BadgeTone {
  if (hk === 'Clean') return 'success';
  if (hk === 'Inspected') return 'success';
  if (hk === 'Cleaning') return 'info';
  return 'warning';
}

/* What the card says about the room right now: the guest, the block reason, or that it is free to sell. */
function roomSummary(room: Room): { Icon: Lucide.LucideIcon; text: string } {
  if (room.guest) {
    return {
      Icon: Lucide.User,
      text: room.checkIn ? `${room.guest} · ${room.checkIn} → ${room.checkOut}` : room.guest,
    };
  }
  if (room.status === 'Out-of-service') {
    return { Icon: Lucide.Ban, text: room.oosReason || 'Maintenance in progress' };
  }
  return { Icon: Lucide.Sparkles, text: 'Ready to allocate' };
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
    <div className="pms-page">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="tnum text-disp3 font-bold leading-none text-ink">Room {room.number}</p>
          <p className="mt-1 text-body text-ink-secondary">
            {room.type} · Floor {room.floor} · <span className="tnum font-semibold text-ink">{formatCurrency(room.rate, currencyCode)}/night</span>
          </p>
        </div>
        <span className="flex flex-col items-end gap-1.5">
          <Badge tone={roomTone(room.status)}>{room.status}</Badge>
          <Badge tone={hkTone(room.hk)}>HK: {room.hk}</Badge>
        </span>
      </div>

      {room.guest ? (
        <div className="rounded-2xl border p-4 shadow-xs border-border bg-surface">
          <p className="pms-label mb-2">Current in-house guest</p>
          <div className="flex items-center gap-3">
            <Avatar name={room.guest} size={38} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink truncate">{room.guest}</p>
              <p className="tnum text-label text-ink-secondary">
                {room.checkIn} → {room.checkOut}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {room.status === 'Out-of-service' && room.oosReason ? (
        <div className="rounded-2xl border p-4 bg-danger-bg/50 border-danger-border">
          <p className="pms-label text-danger-text">Out of service details</p>
          <p className="mt-1 text-body text-danger-text font-medium">{room.oosReason}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 text-body">
        {[
          ['Max occupancy', `${room.maxOccupancy ?? 2} guests`],
          ['Bed setup', room.bedType ?? 'King bed'],
          ['Housekeeping status', room.hk],
          ['Room status', room.status],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border p-2.5 border-border bg-surface">
            <p className="text-label text-ink-muted">{k}</p>
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
            <li key={hk.id} className="rounded-xl border p-2.5 text-label" style={{ borderColor: 'var(--color-border-subtle)' }}>
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
            <li key={mx.id} className="rounded-xl border p-2.5 text-label" style={{ borderColor: 'var(--color-border-subtle)' }}>
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
      <div className="mt-2 flex flex-wrap gap-2.5 pt-2 border-t border-border">
        {room.status === 'Out-of-service' ? (
          <Button variant="primary"
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5"
            onClick={() => onStatus(room, 'Available')}
          >
            <Lucide.CheckCircle2 size={16} />
            <span>Return to service</span>
          </Button>
        ) : (
          <Button variant="secondary"
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 text-danger"
            onClick={() => onStatus(room, 'Out-of-service')}
          >
            <Lucide.AlertOctagon size={16} />
            <span>Take out of service</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export function Rooms({
  focusId,
  initialViewMode = 'grid',
}: {
  focusId?: string;
  initialViewMode?: 'grid' | 'timeline';
} = {}) {
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

  // Grid vs Timeline — mirrors the Reservations page view switcher.
  const [viewMode, setViewMode] = useState<RoomViewMode>(initialViewMode);
  const [filters, setFilters] = useState<RoomFilters>(EMPTY_ROOM_FILTERS);
  const visibleRooms = useMemo(() => filterRooms(all, filters), [all, filters]);
  const roomTypes = useMemo(() => Array.from(new Set(all.map((room) => room.type))).sort(), [all]);
  const roomTypeNames = useMemo(() => Object.fromEntries(all.map((room) => [room.number, room.type])), [all]);

  const [openNo, setOpenNo] = useState<string | null>(focusId ?? null);

  // Status prompt modal state
  const [statusPrompt, setStatusPrompt] = useState<{ room: Room; targetStatus: RoomStatus } | null>(null);

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

  if (resource.initialLoading) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-4 pms-animate-fade-in pb-8">
      <RoomFilterBar
        filters={filters}
        onChange={(patch) => setFilters((previous) => ({ ...previous, ...patch }))}
        onClear={() => setFilters(EMPTY_ROOM_FILTERS)}
        roomTypes={roomTypes}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === 'timeline' ? (
        <StatusTimeline filters={filters} roomTypeNames={roomTypeNames} />
      ) : (
        <>
          {resource.error ? (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-danger-bg p-4 text-body text-danger-text">
              <Lucide.AlertCircle size={18} />
              <span>Could not load room inventory: {resource.error}</span>
            </div>
          ) : null}

          {visibleRooms.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center" role="status">
              <Lucide.SearchX size={22} className="text-ink-muted" aria-hidden="true" />
              <p className="text-body font-semibold text-ink">No rooms match these filters</p>
              <Button variant="secondary" type="button" onClick={() => setFilters(EMPTY_ROOM_FILTERS)}>
                Clear all filters
              </Button>
            </div>
          ) : null}

          {/* Room Grid */}
          <div className="pms-stagger grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleRooms.map((room) => {
              const summary = roomSummary(room);
              return (
                <article
                  key={room.number}
                  className="pms-card pms-card-hover group relative flex flex-col gap-4 p-4 focus-within:ring-2 focus-within:ring-primary"
                >
                  {/* The whole card opens the room; the button stretches over it so the content stays plain text. */}
                  <button
                    type="button"
                    onClick={() => setOpenNo(room.number)}
                    aria-label={`Open room ${room.number}`}
                    className="absolute inset-0 z-[1] cursor-pointer rounded-[inherit] focus-visible:outline-none"
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="tnum text-title font-bold leading-tight text-ink">Room {room.number}</p>
                      <p className="mt-1 truncate text-label text-ink-secondary">{room.type}</p>
                    </div>
                    <Badge tone={roomTone(room.status)}>{room.status}</Badge>
                  </div>

                  <div className="flex flex-col gap-2 text-label">
                    <p className="text-ink-secondary">Floor {room.floor}</p>
                    <p className="tnum">
                      <span className="font-bold text-ink">{formatCurrency(room.rate, currencyCode)}</span>
                      <span className="text-ink-muted"> per night</span>
                    </p>
                  </div>

                  <p className="mt-auto flex items-start gap-2 text-label text-ink-secondary">
                    <summary.Icon size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted" />
                    <span className="min-w-0 break-words">{summary.text}</span>
                  </p>
                </article>
              );
            })}
          </div>

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
        </>
      )}
    </div>
  );
}
