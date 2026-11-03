import { useEffect, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { toast } from '../../utils/toast';
import type { RoomTimelineRow, TimelineStatus } from '../../types';
import { frontDeskApi, inventoryApi } from '../../lib/api/pms';
import { timelineRowsFromApi } from '../../lib/api/adapters';
import { useBusinessDate } from '../../lib/api/businessDate';
import { TableContainer } from '../../components/ui';
import { matchesRoomFilters, type RoomFilters } from './roomFilters';
import {
  END_HOUR,
  START_HOUR,
  TIME_TICKS,
  clipToWindow,
  currentEvent,
  formatClock,
  pluralRooms,
  roomStatusOf,
} from './timeline/timelineMath';
import { TimelineRow } from './timeline/TimelineRow';
import { RoomStatusDialog, type TimelineRoomView } from './timeline/RoomStatusDialog';

/* The housekeeping state each status sets. Cleaning has none: it follows a housekeeping task. */
const HOUSEKEEPING_FOR: Partial<Record<TimelineStatus, 'CLEAN' | 'DIRTY' | 'INSPECTED'>> = {
  Available: 'CLEAN',
  Dirty: 'DIRTY',
  Inspected: 'INSPECTED',
};

const OUT_OF_SERVICE: TimelineStatus[] = ['Out-of-service', 'Maintenance'];

const STATUS_CHANGE_REASON = 'Set from the room status timeline';

/* The inventory name for a row, falling back to the timeline's own room type when the room is not in the inventory. */
function typeNameOf(row: RoomTimelineRow, roomTypeNames: Record<string, string>): string {
  return roomTypeNames[row.number] ?? row.type;
}

/*
 * Rooms by hour for the business date. The filters narrow the rows; the room type comes from the room
 * inventory because the timeline's own names can differ from the inventory names.
 */
export function StatusTimeline({
  filters,
  roomTypeNames,
}: {
  filters: RoomFilters;
  roomTypeNames: Record<string, string>;
}) {
  const businessDate = useBusinessDate();
  const [rows, setRows] = useState<RoomTimelineRow[] | null>(null);
  const [collapsedFloors, setCollapsedFloors] = useState<Set<number>>(() => new Set());
  const [dialogRoomNumber, setDialogRoomNumber] = useState<string | null>(null);

  const allRows = useMemo(() => rows ?? [], [rows]);

  /* Bumped after a status change so the timeline is read from the backend again. */
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let current = true;
    const load = async () => {
      try {
        const response = await frontDeskApi.roomTimeline(businessDate);
        if (!current) return;
        setRows(timelineRowsFromApi(response).map((row) => ({ ...row, events: clipToWindow(row.events) })));
      } catch (error) {
        if (current) toast.error('Could not load the room timeline', error instanceof Error ? error.message : undefined);
      }
    };
    void load();
    return () => {
      current = false;
    };
  }, [businessDate, revision]);

  const visibleRows = useMemo(
    () =>
      allRows.filter((row) =>
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
    [allRows, filters, roomTypeNames]
  );

  const floors = useMemo(
    () => Array.from(new Set(allRows.map((row) => row.floor))).sort((a, b) => a - b),
    [allRows]
  );

  const dialogRow = allRows.find((row) => row.number === dialogRoomNumber) ?? null;
  const dialogRoom: TimelineRoomView | null = dialogRow
    ? {
        number: dialogRow.number,
        typeName: typeNameOf(dialogRow, roomTypeNames),
        floor: dialogRow.floor,
        current: currentEvent(dialogRow.events),
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

  const setRoomStatus = async (roomNumber: string, status: TimelineStatus) => {
    const row = allRows.find((item) => item.number === roomNumber);
    if (!row) return;
    if (status === 'Cleaning') {
      toast('Cleaning follows a housekeeping task', {
        detail: 'Start a cleaning task for this room from Housekeeping.',
        tone: 'info',
      });
      return;
    }
    const label = status === 'Maintenance' ? 'out of service' : status.toLowerCase();
    try {
      if (status === 'Maintenance') {
        await inventoryApi.outOfOrder(row.backendId, STATUS_CHANGE_REASON);
      } else {
        const current = currentEvent(row.events)?.status;
        if (current && OUT_OF_SERVICE.includes(current)) {
          await inventoryApi.backInService(row.backendId, STATUS_CHANGE_REASON);
        }
        const housekeeping = HOUSEKEEPING_FOR[status];
        if (housekeeping) {
          await inventoryApi.setHousekeepingStatus(row.backendId, housekeeping, row.version, STATUS_CHANGE_REASON);
        }
      }
      toast(`Room ${roomNumber} updated`, { detail: `Now ${label}.`, tone: 'success' });
      setRevision((value) => value + 1);
    } catch (error) {
      toast.error(`Could not set room ${roomNumber} ${label}`, error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <section className="pms-card overflow-hidden" aria-label="Room status timeline">
        <header className="flex flex-col gap-1 border-b border-divider px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-body font-semibold text-ink">Room status timeline</h2>
          <p className="tnum text-label text-ink-secondary">
            {formatClock(START_HOUR)} – {formatClock(END_HOUR)} · {visibleRows.length} of {allRows.length} rooms
          </p>
        </header>

        {rows === null ? (
          <div role="status" className="flex items-center justify-center gap-2 px-6 py-12 text-label text-ink-secondary">
            <Lucide.Loader2 size={16} className="animate-spin" aria-hidden="true" />
            <span>Loading room timeline…</span>
          </div>
        ) : visibleRows.length === 0 ? (
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
