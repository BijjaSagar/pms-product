import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { roomListingApi } from '../../lib/api/pms';
import type { RoomDetails, RoomOrderList } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { IconButton } from '../../components/primitives';
import { Card, CardTitle, TableContainer } from '../../components/ui';
import { RoomCategoryDialog } from './RoomCategoryDialog';

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

function OrderTable({
  title,
  subtitle,
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
      <CardTitle icon={Lucide.ListOrdered} title={title} subtitle={subtitle} />
      <TableContainer>
        <table className="pms-table w-full min-w-[480px] text-left">
          <thead>
            <tr>
              <th className="w-32">DISPLAY ORDER</th>
              <th>NAME</th>
              <th className="text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room, index) => (
              <tr key={room.id} className="border-b border-divider transition-colors last:border-b-0 hover:bg-hover-surface/60">
                <td className="py-3 text-label font-bold text-ink">{index + 1}</td>
                <td className="py-3 text-label font-medium text-ink">{room.name}</td>
                <td className="py-3 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    {onEdit ? (
                      <IconButton title={`Edit ${room.name}`} onClick={() => onEdit(room)}>
                        <Lucide.Pencil size={14} />
                      </IconButton>
                    ) : null}
                    {onMove ? (
                      <>
                        <IconButton
                          title={`Move ${room.name} up`}
                          onClick={() => onMove(index, -1)}
                          disabled={!canEdit || busy || index === 0}
                        >
                          <Lucide.ArrowUp size={14} />
                        </IconButton>
                        <IconButton
                          title={`Move ${room.name} down`}
                          onClick={() => onMove(index, 1)}
                          disabled={!canEdit || busy || index === rooms.length - 1}
                        >
                          <Lucide.ArrowDown size={14} />
                        </IconButton>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-label text-ink-muted">
                  {error ?? (loading ? 'Loading rooms…' : 'No rooms yet. Add rooms in Room Setup.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableContainer>
    </Card>
  );
}

export function RoomSetup2Tab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => roomListingApi.list(propertyId), [propertyId]);
  const resource = useApiResource(load);
  const [busy, setBusy] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const rooms = resource.data ?? [];
  // Looked up by id so the open dialog shows fresh data after a save.
  const viewing = rooms.find((room) => room.id === viewingId) ?? null;
  const chartRooms = sortRooms(rooms, 'chart');
  const upsellRooms = sortRooms(rooms, 'upsell');

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
      <OrderTable
        title="Room Category (In Order of Display on Smart Chart)"
        subtitle="Rooms are shown on the smart chart in this order"
        rooms={chartRooms}
        busy={busy}
        loading={resource.loading}
        error={resource.error}
        canEdit={canEdit}
        onEdit={(room) => setViewingId(room.id)}
      />
      <OrderTable
        title="Room Category (Upsell Order)"
        subtitle="Rooms are offered for upselling in this order"
        rooms={upsellRooms}
        busy={busy}
        loading={resource.loading}
        error={resource.error}
        canEdit={canEdit}
        onMove={(index, direction) => void move('upsell', upsellRooms, index, direction)}
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
