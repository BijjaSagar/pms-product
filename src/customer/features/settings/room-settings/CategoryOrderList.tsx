import * as Lucide from 'lucide-react';
import type { RoomDetails } from '../../../../shared/services/roomListingApi';
import { CardSkeleton } from '../../../../shared/components/feedback/Skeleton';
import { Badge, Card, CardTitle } from '../../../../shared/components/ui/display';
import { Button, IconButton } from '../../../../shared/components/ui/primitives';
import { bedSummary } from '../components/bedSummary';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The switches that change how a category is counted or sold, shown only when on. */
function flagsOf(room: RoomDetails): string[] {
  return [
    room.syncCategoryOnOta ? 'Synced to OTA' : null,
    room.excludeFromRevenue ? 'No revenue' : null,
    room.excludeFromOccupancy ? 'No occupancy' : null,
    room.excludeFromUpgrade ? 'No upgrade' : null,
  ].filter((flag): flag is string => flag !== null);
}

function CategoryRow({
  room,
  index,
  last,
  busy,
  canEdit,
  onMove,
  onEdit,
}: {
  room: RoomDetails;
  index: number;
  last: boolean;
  busy: boolean;
  canEdit: boolean;
  onMove: (direction: -1 | 1) => void;
  onEdit: () => void;
}) {
  const flags = flagsOf(room);
  return (
    <li className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-3.5 transition-colors hover:border-primary/30 hover:bg-hover-surface/40 md:flex-row md:items-center md:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-primary/10 text-body font-bold text-primary tnum"
          aria-label={`Position ${index + 1} on the smart chart`}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-body font-semibold text-ink">{room.name}</p>
            {room.abbreviation ? <Badge tone="neutral" size="sm">{room.abbreviation}</Badge> : null}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-label text-ink-secondary">
            <span className="inline-flex items-center gap-1">
              <Lucide.BedDouble size={13} aria-hidden="true" />
              {bedSummary(room)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Lucide.Users size={13} aria-hidden="true" />
              Up to {plural(room.maxOccupancy, 'guest')} ({room.maxAdults}A · {room.maxChildren}C)
            </span>
          </p>
          {room.mealPlans.length > 0 || flags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {room.mealPlans.map((plan) => (
                <Badge key={plan} tone="success" size="sm">{plan}</Badge>
              ))}
              {flags.map((flag) => (
                <Badge key={flag} tone="info" size="sm">{flag}</Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-none items-center justify-between gap-3 border-t border-divider pt-3 md:justify-end md:border-0 md:pt-0">
        <div className="text-left md:min-w-[4.5rem] md:text-right">
          <p className="text-title font-bold leading-none text-ink tnum">{room.roomCount}</p>
          <p className="text-micro text-ink-muted">{room.roomCount === 1 ? 'room' : 'rooms'}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton
            title={`Move ${room.name} up`}
            aria-label={`Move ${room.name} up`}
            onClick={() => onMove(-1)}
            disabled={!canEdit || busy || index === 0}
          >
            <Lucide.ArrowUp size={14} />
          </IconButton>
          <IconButton
            title={`Move ${room.name} down`}
            aria-label={`Move ${room.name} down`}
            onClick={() => onMove(1)}
            disabled={!canEdit || busy || last}
          >
            <Lucide.ArrowDown size={14} />
          </IconButton>
          <Button variant="secondary" type="button" onClick={onEdit} icon={<Lucide.Pencil size={14} />} aria-label={`Edit ${room.name}`}>
            Edit
          </Button>
        </div>
      </div>
    </li>
  );
}

/** The property's room categories in smart chart order, each with what it offers and its rooms. */
export function CategoryOrderList({
  rooms,
  busy,
  loading,
  error,
  canEdit,
  onMove,
  onEdit,
}: {
  /** Already in smart chart order. */
  rooms: RoomDetails[];
  busy: boolean;
  loading: boolean;
  error: string | null;
  canEdit: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onEdit: (room: RoomDetails) => void;
}) {
  return (
    <Card>
      <CardTitle
        icon={Lucide.LayoutGrid}
        title="Room Categories"
        subtitle="Categories appear on the smart chart in this order. Use the arrows to change it."
        badge={rooms.length > 0 ? <Badge tone="neutral" size="sm">{rooms.length}</Badge> : undefined}
      />
      {rooms.length === 0 ? (
        loading && !error ? (
          <CardSkeleton lines={4} label="Loading room categories" />
        ) : (
          <p role={error ? 'alert' : undefined} className={`py-10 text-center text-label ${error ? 'text-danger-text' : 'text-ink-muted'}`}>
            {error ?? 'No room categories yet.'}
          </p>
        )
      ) : (
        <ol className="flex flex-col gap-2.5">
          {rooms.map((room, index) => (
            <CategoryRow
              key={room.id}
              room={room}
              index={index}
              last={index === rooms.length - 1}
              busy={busy}
              canEdit={canEdit}
              onMove={(direction) => onMove(index, direction)}
              onEdit={() => onEdit(room)}
            />
          ))}
        </ol>
      )}
    </Card>
  );
}
