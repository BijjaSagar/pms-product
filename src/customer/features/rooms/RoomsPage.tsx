import { useCallback, useMemo, useState } from 'react';
import { PageSkeleton } from '../../../shared/components/feedback/Skeleton';
import * as Lucide from 'lucide-react';
import { Drawer } from '../../../shared/components/ui/overlays';
import { Button } from '../../../shared/components/ui/primitives';
import { inventoryApi } from '../../../shared/services/inventoryApi';
import { useApiResource } from '../../../shared/services/useApiResource';
import { useInventory } from '../inventory/inventoryContext';
import { RoomDetail, type RoomInfo } from './RoomDetail';
import { RoomFilterBar } from './RoomFilterBar';
import { EMPTY_ROOM_FILTERS, filterRooms, type RoomFilters } from './roomFilters';

export function Rooms({ focusId }: { focusId?: string } = {}) {
  const inventory = useInventory();

  const loadData = useCallback(async (): Promise<RoomInfo[]> => {
    // The rooms come from the rooms table, so read them again each time the page opens.
    await inventory.refresh();
    const rows = await inventoryApi.rooms();
    return rows.map((row) => ({
      number: row.roomNumber,
      type: row.roomTypeName ?? 'Unassigned',
      floor: Number.parseInt(row.floor ?? '0', 10) || 0,
      maxOccupancy: row.maxOccupancy ?? null,
      bedSetup: row.bedSetup ?? null,
    }));
  }, [inventory]);

  const resource = useApiResource(loadData);
  const all = useMemo(() => resource.data ?? [], [resource.data]);

  const [filters, setFilters] = useState<RoomFilters>(EMPTY_ROOM_FILTERS);
  const visibleRooms = useMemo(() => filterRooms(all, filters), [all, filters]);
  const floors = useMemo(() => {
    const byFloor = new Map<number, RoomInfo[]>();
    visibleRooms.forEach((room) => byFloor.set(room.floor, [...(byFloor.get(room.floor) ?? []), room]));
    return [...byFloor.entries()]
      .sort(([x], [y]) => x - y)
      .map(([floor, rooms]) => ({
        floor,
        rooms: [...rooms].sort((x, y) => x.number.localeCompare(y.number, undefined, { numeric: true })),
      }));
  }, [visibleRooms]);
  const roomTypes = useMemo(() => Array.from(new Set(all.map((room) => room.type))).sort(), [all]);

  const [openNo, setOpenNo] = useState<string | null>(focusId ?? null);
  const openRoom = all.find((room) => room.number === openNo) ?? null;

  if (resource.initialLoading) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-4 pms-animate-fade-in pb-8">
      <RoomFilterBar
        filters={filters}
        onChange={(patch) => setFilters((previous) => ({ ...previous, ...patch }))}
        onClear={() => setFilters(EMPTY_ROOM_FILTERS)}
        roomTypes={roomTypes}
      />

      {resource.error ? (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-danger-bg p-4 text-body text-danger-text">
          <Lucide.AlertCircle size={18} />
          <span>Could not load rooms: {resource.error}</span>
        </div>
      ) : null}

      {visibleRooms.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center" role="status">
          <Lucide.SearchX size={22} className="text-ink-muted" aria-hidden="true" />
          <p className="text-body font-semibold text-ink">{all.length === 0 ? 'No rooms yet' : 'No rooms match these filters'}</p>
          {all.length > 0 ? (
            <Button variant="secondary" type="button" onClick={() => setFilters(EMPTY_ROOM_FILTERS)}>
              Clear all filters
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* One section per floor */}
      <div className="flex flex-col gap-7">
        {floors.map(({ floor, rooms: floorRooms }) => (
          <section key={floor} aria-label={`Floor ${floor}`}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-title font-bold leading-tight text-ink">Floor {floor}</h2>
              <span className="rounded-full bg-muted-surface px-2.5 py-0.5 text-label font-semibold text-ink-secondary">
                {floorRooms.length} {floorRooms.length === 1 ? 'room' : 'rooms'}
              </span>
              <span className="h-px min-w-6 flex-1 bg-border" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3.5">
              {floorRooms.map((room) => (
                <button
                  key={room.number}
                  type="button"
                  onClick={() => setOpenNo(room.number)}
                  aria-label={`Open room ${room.number}, ${room.type}`}
                  className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <span className="tnum flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-muted-surface text-title font-bold text-ink">
                    {room.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-bold text-ink">{room.type}</span>
                    <span className="block text-label text-ink-secondary">Floor {room.floor}</span>
                  </span>
                  <Lucide.ChevronRight size={16} aria-hidden="true" className="flex-none text-ink-muted transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Drawer
        open={openRoom !== null}
        onClose={() => setOpenNo(null)}
        title={openRoom ? `Room ${openRoom.number}` : ''}
        subtitle={openRoom ? `${openRoom.type} · Floor ${openRoom.floor}` : undefined}
        footer={
          openRoom ? (
            <Button variant="secondary" onClick={() => setOpenNo(null)}>
              Close
            </Button>
          ) : undefined
        }
      >
        {openRoom ? <RoomDetail room={openRoom} /> : null}
      </Drawer>
    </div>
  );
}
