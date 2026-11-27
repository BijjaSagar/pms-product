import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { propertyApi, type PropertyDetails } from '../../../../shared/services/propertyApi';
import { roomListingApi, type RoomDetails } from '../../../../shared/services/roomListingApi';
import { useApiResource } from '../../../../shared/services/useApiResource';
import { displayError } from '../../../../shared/services/errors';
import { toast } from '../../../../shared/utils/toast';
import { useInventory } from '../../inventory/inventoryContext';
import { RoomCategoryDialog } from '../components/RoomCategoryDialog';
import { CategoryOrderList } from '../room-settings/CategoryOrderList';
import { sortByChartOrder } from '../room-settings/chartOrder';
import { FloorsSection } from '../room-settings/FloorsSection';
import { useFloorPlanEditor } from '../room-settings/useFloorPlanEditor';
import { SettingsHeader } from '../components/SettingsKit';

interface Stat {
  label: string;
  value: string;
  hint: string;
  icon: Lucide.LucideIcon;
  /** Draws attention when something needs doing. */
  warn?: boolean;
}

function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {stats.map(({ label, value, hint, icon: Icon, warn }) => (
        <div
          key={label}
          className={`flex min-w-0 items-center gap-3 rounded-xl border p-3.5 ${
            warn ? 'border-warning-border bg-warning-bg' : 'border-border bg-surface'
          }`}
        >
          <span
            className={`hidden h-9 w-9 flex-none items-center justify-center rounded-xl sm:flex ${
              warn ? 'bg-warning-text/10 text-warning-text' : 'bg-primary/10 text-primary'
            }`}
          >
            <Icon size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <dt className="truncate text-micro font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
            <dd className={`text-title font-bold leading-tight tnum ${warn ? 'text-warning-text' : 'text-ink'}`}>{value}</dd>
            <dd className="truncate text-micro text-ink-secondary">{hint}</dd>
          </div>
        </div>
      ))}
    </dl>
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
  const ordered = sortByChartOrder(rooms);
  // Looked up by id so the open dialog shows fresh data after a save.
  const viewing = rooms.find((room) => room.id === viewingId) ?? null;
  const totalRooms = propertyResource.data?.totalRooms ?? null;
  const floorEditor = useFloorPlanEditor({
    propertyId,
    rooms,
    totalRooms,
    propertyFloors: propertyResource.data?.numberOfFloors,
    onSaved: () => {
      propertyResource.refresh();
      void refreshInventory();
    },
  });

  const linked = rooms.reduce((sum, room) => sum + room.roomCount, 0);
  const unlinked = totalRooms === null ? null : Math.max(totalRooms - linked, 0);
  const withoutBeds = rooms.filter((room) => Object.keys(room.bedTypes).length === 0).length;
  const stats: Stat[] = [
    { label: 'Categories', value: String(rooms.length), hint: 'Room types you sell', icon: Lucide.Layers },
    { label: 'Rooms', value: totalRooms === null ? String(linked) : `${linked} / ${totalRooms}`, hint: 'Linked to a category', icon: Lucide.DoorOpen },
    {
      label: 'Unlinked',
      value: unlinked === null ? '–' : String(unlinked),
      hint: unlinked ? 'Link them on the floor plan' : 'Every room is linked',
      icon: Lucide.Unlink,
      warn: Boolean(unlinked),
    },
    {
      label: 'No bed type',
      value: String(withoutBeds),
      hint: withoutBeds ? 'Add beds with Edit' : 'Every category has beds',
      icon: Lucide.BedDouble,
      warn: withoutBeds > 0,
    },
  ];

  const move = async (index: number, direction: -1 | 1) => {
    const ids = ordered.map((room) => room.id);
    const target = index + direction;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    setBusy(true);
    try {
      await roomListingApi.setChartOrder(propertyId, ids);
      resource.refresh();
    } catch (err) {
      toast('Could not save the order', { detail: displayError(err), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Room Setup" description="Set up your room categories, their order on the smart chart and the floors of the property" />

      {rooms.length > 0 ? <StatStrip stats={stats} /> : null}

      <CategoryOrderList
        rooms={ordered}
        busy={busy}
        loading={resource.loading}
        error={resource.error}
        canEdit={canEdit}
        onMove={(index, direction) => void move(index, direction)}
        onEdit={(room: RoomDetails) => setViewingId(room.id)}
      />

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
        totalRooms={totalRooms}
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
