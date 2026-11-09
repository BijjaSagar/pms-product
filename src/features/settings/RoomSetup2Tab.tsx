import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { propertyApi, roomListingApi } from '../../lib/api/pms';
import type { PropertyDetails, RoomDetails, RoomOrderList } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { IconButton } from '../../components/primitives';
import { CardSkeleton } from '../../components/Skeleton';
import { Card, CardTitle } from '../../components/ui';
import { useInventory } from '../inventory/inventoryContext';
import { RoomCategoryDialog } from './RoomCategoryDialog';
import { FloorsSection } from './room-settings/FloorsSection';
import { useFloorPlanEditor } from './room-settings/useFloorPlanEditor';
import { SettingsHeader } from './SettingsKit';

const ORDER_KEY = { chart: 'chartOrder', upsell: 'upsellOrder' } as const;

/** Ordered rooms first, in their saved order; rooms never ordered follow by name. */
function sortRooms(rooms: RoomDetails[], list: RoomOrderList): RoomDetails[] {
  const key = ORDER_KEY[list];
  return [...rooms].sort((a, b) => {
    const left = a[key] ?? Number.MAX_SAFE_INTEGER;
    const right = b[key] ?? Number.MAX_SAFE_INTEGER;
    return left - right || a.name.localeCompare(b.name);
  });
}

/** One ordered list of rooms. Rows work at every width, so no separate phone layout is needed. */
function OrderList({
  title,
  subtitle,
  icon,
  rooms,
  busy,
  loading,
  error,
  canEdit,
  onMove,
  onEdit,
}: {
  title: string;
  subtitle: string;
  icon: Lucide.LucideIcon;
  rooms: RoomDetails[];
  busy: boolean;
  loading: boolean;
  error: string | null;
  canEdit: boolean;
  /** Adds move up / move down buttons to each row. */
  onMove?: (index: number, direction: -1 | 1) => void;
  /** Adds an Edit button to each row. */
  onEdit?: (room: RoomDetails) => void;
}) {
  return (
    <Card>
      <CardTitle icon={icon} title={title} subtitle={subtitle} />
      {rooms.length === 0 ? (
        loading && !error ? (
          <CardSkeleton lines={4} label={`Loading ${title.toLowerCase()}`} />
        ) : (
          <p role={error ? 'alert' : undefined} className={`py-8 text-center text-label ${error ? 'text-danger-text' : 'text-ink-muted'}`}>
            {error ?? 'No rooms yet.'}
          </p>
        )
      ) : (
        <ol className="flex flex-col gap-2">
          {rooms.map((room, index) => (
            <li
              key={room.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors hover:bg-hover-surface/60"
            >
              <span
                className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-primary/10 text-label font-bold text-primary tnum"
                aria-label={`Position ${index + 1}`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-ink">{room.name}</p>
                <p className="truncate text-label text-ink-secondary">
                  {room.roomType.name} · {room.roomCount} {room.roomCount === 1 ? 'room' : 'rooms'}
                </p>
              </div>
              <div className="flex flex-none items-center gap-1.5">
                {onEdit ? (
                  <IconButton title={`Edit ${room.name}`} aria-label={`Edit ${room.name}`} onClick={() => onEdit(room)}>
                    <Lucide.Pencil size={14} />
                  </IconButton>
                ) : null}
                {onMove ? (
                  <>
                    <IconButton
                      title={`Move ${room.name} up`}
                      aria-label={`Move ${room.name} up`}
                      onClick={() => onMove(index, -1)}
                      disabled={!canEdit || busy || index === 0}
                    >
                      <Lucide.ArrowUp size={14} />
                    </IconButton>
                    <IconButton
                      title={`Move ${room.name} down`}
                      aria-label={`Move ${room.name} down`}
                      onClick={() => onMove(index, 1)}
                      disabled={!canEdit || busy || index === rooms.length - 1}
                    >
                      <Lucide.ArrowDown size={14} />
                    </IconButton>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function RoomSetup2Tab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => roomListingApi.list(propertyId), [propertyId]);
  const resource = useApiResource(load);
  const [busy, setBusy] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  // Rooms placed on the floor plan must reach the reservation screens, which read the app-wide inventory.
  const { refresh: refreshInventory } = useInventory();
  const propertyResource = useApiResource(
    () => propertyApi.get(propertyId).catch(() => null as PropertyDetails | null),
    [propertyId],
  );

  const rooms = resource.data ?? [];
  // Looked up by id so the open dialog shows fresh data after a save.
  const viewing = rooms.find((room) => room.id === viewingId) ?? null;
  const chartRooms = sortRooms(rooms, 'chart');
  const upsellRooms = sortRooms(rooms, 'upsell');
  const floorEditor = useFloorPlanEditor({
    propertyId,
    rooms,
    totalRooms: propertyResource.data?.totalRooms ?? null,
    propertyFloors: propertyResource.data?.numberOfFloors,
    onSaved: () => {
      propertyResource.refresh();
      void refreshInventory();
    },
  });

  const move = async (list: RoomOrderList, ordered: RoomDetails[], index: number, direction: -1 | 1) => {
    const ids = ordered.map((room) => room.id);
    const target = index + direction;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    setBusy(true);
    try {
      await roomListingApi.setOrder(propertyId, list, ids);
      resource.refresh();
    } catch (err) {
      toast('Could not save the order', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Room Setup" description="Order your rooms and lay out the floors of the property" />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
        <OrderList
          icon={Lucide.LayoutGrid}
          title="Smart Chart Order"
          subtitle="Rooms appear on the smart chart in this order"
          rooms={chartRooms}
          busy={busy}
          loading={resource.loading}
          error={resource.error}
          canEdit={canEdit}
          onEdit={(room) => setViewingId(room.id)}
        />
        <OrderList
          icon={Lucide.TrendingUp}
          title="Upsell Order"
          subtitle="Rooms are offered for upselling in this order"
          rooms={upsellRooms}
          busy={busy}
          loading={resource.loading}
          error={resource.error}
          canEdit={canEdit}
          onMove={(index, direction) => void move('upsell', upsellRooms, index, direction)}
        />
      </div>

      <FloorsSection
        rooms={rooms}
        loading={resource.loading}
        floorInput={floorEditor.floorInput}
        onFloorInputChange={floorEditor.setFloorInput}
        plan={floorEditor.plan}
        onPlanChange={floorEditor.setPlan}
        loadError={floorEditor.loadError}
        dirty={floorEditor.dirty}
        saving={floorEditor.saving}
        canSave={canEdit}
        onSave={() => void floorEditor.save()}
        totalRooms={propertyResource.data?.totalRooms ?? null}
      />
      <RoomCategoryDialog
        key={viewingId ?? 'closed'}
        propertyId={propertyId}
        room={viewing}
        rooms={rooms}
        canEdit={canEdit}
        onSaved={resource.refresh}
        onClose={() => setViewingId(null)}
      />
    </div>
  );
}
