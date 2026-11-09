import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { toast } from '../../utils/toast';
import { ROOM_TIMELINE_SEED, type RoomTimelineRow, type TimelineStatus } from '../../data/roomTimeline';
import { TableContainer } from '../../components/ui';
import { matchesRoomFilters, type RoomFilters } from './roomFilters';
import { END_HOUR, START_HOUR, TIME_TICKS, formatClock, pluralRooms, roomStatusOf } from './timeline/timelineMath';
import { TimelineRow } from './timeline/TimelineRow';
import { RoomStatusDialog, type TimelineRoomView } from './timeline/RoomStatusDialog';

/* The inventory name for a row, falling back to the timeline code when the room is not in the inventory. */
function typeNameOf(row: RoomTimelineRow, roomTypeNames: Record<string, string>): string {
  return roomTypeNames[row.number] ?? row.type;
}

/*
 * Rooms by hour. The filters narrow the rows; the room type comes from the room inventory because the
 * timeline's own codes (STD, DLX) do not match the inventory names.
 */
export function StatusTimeline({
  filters,
  roomTypeNames,
}: {
  filters: RoomFilters;
  roomTypeNames: Record<string, string>;
}) {
  const [rows, setRows] = useState<RoomTimelineRow[]>(ROOM_TIMELINE_SEED);
  const [collapsedFloors, setCollapsedFloors] = useState<Set<number>>(() => new Set());
  const [dialogRoomNumber, setDialogRoomNumber] = useState<string | null>(null);

  const visibleRows = useMemo(
    () =>
      rows.filter((row) =>
        matchesRoomFilters(
          {
            number: row.number,
            type: typeNameOf(row, roomTypeNames),
            status: roomStatusOf(row.events),
            guest: row.events.find((event) => event.guestName)?.guestName ?? null,
          },
          filters
        )
      ),
    [rows, filters, roomTypeNames]
  );

  const floors = useMemo(
    () => Array.from(new Set(rows.map((row) => row.floor))).sort((a, b) => a - b),
    [rows]
  );

  const dialogRow = rows.find((row) => row.number === dialogRoomNumber) ?? null;
  const dialogRoom: TimelineRoomView | null = dialogRow
    ? {
        number: dialogRow.number,
        typeName: typeNameOf(dialogRow, roomTypeNames),
        floor: dialogRow.floor,
        current: dialogRow.events[0],
      }
    : null;

  const toggleFloor = (floor: number) => {
    setCollapsedFloors((previous) => {
      const next = new Set(previous);
      if (next.has(floor)) next.delete(floor);
      else next.add(floor);
      return next;
    });
  };

  const setRoomStatus = (roomNumber: string, status: TimelineStatus) => {
    setRows((previous) =>
      previous.map((row) =>
        row.number === roomNumber
          ? {
              ...row,
              events: [
                {
                  id: `${roomNumber}-${status.toLowerCase()}`,
                  status,
                  label: status === 'Maintenance' ? 'Out of service' : status,
                  startHour: START_HOUR,
                  endHour: END_HOUR,
                },
              ],
            }
          : row
      )
    );
    toast(`Room ${roomNumber} updated`, {
      detail: `Now ${status === 'Maintenance' ? 'out of service' : status.toLowerCase()}.`,
      tone: 'success',
    });
  };

  return (
    <div className="flex flex-col gap-3.5">
      <section className="pms-card overflow-hidden" aria-label="Room status timeline">
        <header className="flex flex-col gap-1 border-b border-divider px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-title font-semibold text-ink">Room status timeline</h2>
          <p className="tnum text-label text-ink-secondary">
            {formatClock(START_HOUR)} – {formatClock(END_HOUR)} · {visibleRows.length} of {rows.length} rooms
          </p>
        </header>

        {visibleRows.length === 0 ? (
          <div role="status" className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Lucide.SearchX size={22} className="text-ink-muted" aria-hidden="true" />
            <p className="text-body font-semibold text-ink">No rooms match these filters</p>
            <p className="text-label text-ink-secondary">Clear the filters above to see every room.</p>
          </div>
        ) : (
          <TableContainer>
            <table aria-label="Rooms by hour" className="pms-table min-w-[920px] w-full border-collapse text-left text-label">
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-20 w-44 border-r border-border bg-muted-surface">
                    Room
                  </th>
                  <th scope="col" className="!p-0">
                    <span className="sr-only">Hours</span>
                    <div className="relative h-11">
                      {TIME_TICKS.map((tick, index) => {
                        const isFirst = index === 0;
                        const isLast = index === TIME_TICKS.length - 1;
                        const anchor = isFirst ? '' : isLast ? '-translate-x-full' : '-translate-x-1/2';
                        return (
                          <span
                            key={tick.hour}
                            className={`tnum absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-micro font-semibold text-ink-secondary ${anchor} ${isFirst ? 'pl-2' : ''} ${isLast ? 'pr-2' : ''}`}
                            style={{ left: `${tick.percent}%` }}
                          >
                            {tick.label}
                          </span>
                        );
                      })}
                    </div>
                  </th>
                </tr>
              </thead>

              {floors.map((floor) => {
                const floorRows = visibleRows.filter((row) => row.floor === floor);
                if (floorRows.length === 0) return null;
                const expanded = !collapsedFloors.has(floor);

                return (
                  <tbody key={floor} className="border-t border-border">
                    <tr>
                      <th colSpan={2} scope="colgroup" className="!p-0">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => toggleFloor(floor)}
                          className="flex w-full items-center gap-2 bg-primary/5 px-4 py-2 text-left text-label font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                        >
                          {expanded ? <Lucide.ChevronDown size={16} aria-hidden="true" /> : <Lucide.ChevronRight size={16} aria-hidden="true" />}
                          <span>Floor {floor}</span>
                          <span className="font-medium text-ink-muted">{pluralRooms(floorRows.length)}</span>
                        </button>
                      </th>
                    </tr>
                    {expanded
                      ? floorRows.map((row) => (
                          <TimelineRow
                            key={row.number}
                            row={row}
                            typeName={typeNameOf(row, roomTypeNames)}
                            onOpenRoom={setDialogRoomNumber}
                          />
                        ))
                      : null}
                  </tbody>
                );
              })}
            </table>
          </TableContainer>
        )}
      </section>

      <RoomStatusDialog room={dialogRoom} onClose={() => setDialogRoomNumber(null)} onSetStatus={setRoomStatus} />
    </div>
  );
}
