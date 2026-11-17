import { useCallback, useMemo, useState } from 'react';
import { PageSkeleton } from '../../components/Skeleton';
import * as Lucide from 'lucide-react';
import type { Room, RoomStatus } from '../../types';
import { Badge } from '../../components/ui';
import { roomTone } from '../../utils/status';
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
import { RoomDetail, RoomDrawerActions } from './RoomDetail';
import { Button } from '../../components/primitives';
import { RoomFilterBar, type RoomViewMode } from './RoomFilterBar';
import { EMPTY_ROOM_FILTERS, ROOM_STATUS_FILTERS, filterRooms, type RoomFilters } from './roomFilters';

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
  const floors = useMemo(() => {
    const byFloor = new Map<number, Room[]>();
    visibleRooms.forEach((room) => byFloor.set(room.floor, [...(byFloor.get(room.floor) ?? []), room]));
    return [...byFloor.entries()]
      .sort(([x], [y]) => x - y)
      .map(([floor, rooms]) => ({
        floor,
        rooms: [...rooms].sort((x, y) => x.number.localeCompare(y.number, undefined, { numeric: true })),
      }));
  }, [visibleRooms]);
  // Every status that has rooms, counted over all rooms so the chips do not shrink as filters narrow the rack.
  const statusCounts = useMemo(
    () =>
      ROOM_STATUS_FILTERS.map((status) => ({ status, count: all.filter((room) => room.status === status).length })).filter(
        ({ count }) => count > 0,
      ),
    [all],
  );
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

          {/* Status summary: one chip per status in use; clicking one filters the rack to it */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter rooms by status">
            {statusCounts.map(({ status, count }) => {
              const tone = roomTone(status);
              const active = filters.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilters((previous) => ({ ...previous, status: active ? 'All' : status }))}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-label font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-ink hover:bg-hover-surface'
                  }`}
                >
                  <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: `var(--color-${tone}-text)` }} aria-hidden="true" />
                  {status}
                  <span className="tnum rounded-full bg-muted-surface px-1.5 text-micro font-bold text-ink-secondary">{count}</span>
                </button>
              );
            })}
          </div>

          {/* One section per floor; the room badge carries the status colour */}
          <div className="flex flex-col gap-7">
            {floors.map(({ floor, rooms: floorRooms }) => (
              <section key={floor} aria-label={`Floor ${floor}`}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-title font-bold leading-tight text-ink">Floor {floor}</h2>
                  <span className="rounded-full bg-muted-surface px-2.5 py-0.5 text-label font-semibold text-ink-secondary">
                    {floorRooms.length} {floorRooms.length === 1 ? 'room' : 'rooms'}
                    {' · '}
                    {floorRooms.filter((r) => r.status === 'Occupied').length} occupied
                  </span>
                  <span className="h-px min-w-6 flex-1 bg-border" aria-hidden="true" />
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3.5">
            {floorRooms.map((room) => {
              const tone = roomTone(room.status);
              const note = room.guest ?? (room.status === 'Out-of-service' ? room.oosReason : null);
              return (
                <button
                  key={room.number}
                  type="button"
                  onClick={() => setOpenNo(room.number)}
                  aria-label={`Open room ${room.number}, ${room.type}, ${room.status}`}
                  className="group flex min-w-0 cursor-pointer flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="tnum flex h-12 w-12 flex-none items-center justify-center rounded-xl text-title font-bold"
                      style={{ background: `var(--color-${tone}-bg)`, color: `var(--color-${tone}-text)` }}
                    >
                      {room.number}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-bold text-ink">{room.type}</span>
                      <span className="block text-label text-ink-secondary">Floor {room.floor}</span>
                    </span>
                    <Lucide.ChevronRight size={16} aria-hidden="true" className="flex-none text-ink-muted transition-transform group-hover:translate-x-0.5" />
                  </span>

                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={tone} size="sm">{room.status}</Badge>
                  </span>

                  <span className="mt-auto flex items-end justify-between gap-3 border-t border-divider pt-3">
                    <span className="min-w-0 truncate text-label text-ink-secondary">{note ?? 'No guest in room'}</span>
                    <span className="tnum flex-none text-label">
                      <span className="font-bold text-ink">{formatCurrency(room.rate, currencyCode)}</span>
                      <span className="text-ink-muted"> /night</span>
                    </span>
                  </span>
                </button>
              );
            })}
                </div>
              </section>
            ))}
          </div>

          {/* Room Drawer */}
          <Drawer
            open={openRoom !== null}
            onClose={() => setOpenNo(null)}
            title={openRoom ? `Room ${openRoom.number}` : ''}
            subtitle={openRoom ? `${openRoom.type} · Floor ${openRoom.floor}` : undefined}
            footer={
              openRoom ? (
                <RoomDrawerActions
                  room={openRoom}
                  onClose={() => setOpenNo(null)}
                  onStatus={(room, status) => setStatusPrompt({ room, targetStatus: status })}
                />
              ) : undefined
            }
          >
            {openRoom ? (
              <RoomDetail
                room={openRoom}
                hkHistory={hkTasks.filter((task) => task.room === openRoom.number)}
                mxHistory={mxTickets.filter((ticket) => ticket.room === openRoom.number)}
                currencyCode={currencyCode}
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
