import type { RoomTimelineRow } from '../../../types';
import { TIME_TICKS } from './timelineMath';
import { TimelineBar } from './TimelineBar';

/* One room: its number and type in the sticky first column, its bookings and statuses on the track. */
export function TimelineRow({
  row,
  typeName,
  onOpenRoom,
}: {
  row: RoomTimelineRow;
  typeName: string;
  onOpenRoom: (roomNumber: string) => void;
}) {
  return (
    <tr>
      <td className="sticky left-0 z-10 w-44 border-r border-border bg-surface">
        <button
          type="button"
          onClick={() => onOpenRoom(row.number)}
          className="group flex w-full items-center justify-between gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="font-bold text-ink group-hover:text-primary">Room {row.number}</span>
          <span className="rounded bg-muted-surface px-1.5 py-0.5 text-micro font-bold uppercase tracking-wider text-ink-secondary">
            {typeName}
          </span>
        </button>
      </td>

      <td className="relative !h-14 !p-0">
        {TIME_TICKS.slice(1).map((tick) => (
          <span
            key={tick.hour}
            aria-hidden="true"
            className="absolute bottom-0 top-0 border-l border-divider"
            style={{ left: `${tick.percent}%` }}
          />
        ))}
        {row.events.map((event) => (
          <TimelineBar key={event.id} event={event} roomNumber={row.number} onOpen={() => onOpenRoom(row.number)} />
        ))}
      </td>
    </tr>
  );
}
