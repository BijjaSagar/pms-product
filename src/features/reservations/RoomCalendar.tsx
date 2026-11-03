import { useEffect, useMemo, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import { toast } from '../../utils/toast';
import type { NavTarget } from '../../config/navigation';
import { store } from '../../data/store';
import { IconButton } from '../../components/primitives';
import type { CalendarReservation, CalendarRoom, DragState, ProposedReservationChange, ReservationStatus as CalendarReservationStatus } from './room-calendar/types';
import {
  BUSINESS_DATE,
  addDaysToIso,
  countNights,
  daysBetween,
  formatCalendarDate,
  loadCalendarRooms,
  loadSyncedReservations,
} from './room-calendar/calendarData';
import { validateReservationMove } from './room-calendar/validation';
import { ReservationChangeDialog } from './room-calendar/ReservationChangeDialog';
import { ReservationDetailModal } from './room-calendar/ReservationDetailModal';
import type { ReservationFilters } from './reservationFilters';
import { matchesStatusFilter } from './reservationStatusFilters';
import { stayOverlapsRange } from './reservationDateRange';
import { DayLogButton } from './day-log/DayLogButton';
import { DayNoteModal } from './day-log/DayNoteModal';
import { DayEnquiriesModal } from './day-log/DayEnquiriesModal';
import { dayLogApi, type DayLogSummaryRow } from '../../lib/api/pms';

// ================= ROOM CALENDAR: 10-DAY VIEW =================
const DAYS_IN_VIEW = 10;
const ROOM_COL_WIDTH = 108; // sticky room column
const MIN_DAY_WIDTH = 84; // below this width the view scrolls sideways instead of shrinking
const AVAIL_ROW_HEIGHT = 32;
const ROW_HEIGHT = 56; // drag maths uses this to map vertical movement to rooms
const BAR_INSET = 3; // gap between a booking bar and the day lines it spans

type DragType = 'move' | 'resize-start' | 'resize-end';

const RESERVATION_BAR_TONES: Record<
  CalendarReservationStatus,
  { background: string; color: string; border: string; accent: string }
> = {
  Confirmed: {
    background: 'var(--color-success-bg)',
    color: 'var(--color-success-text)',
    border: 'var(--color-success-border)',
    accent: 'var(--color-success-text)',
  },
  'Checked-in': {
    background: 'var(--color-info-bg)',
    color: 'var(--color-info-text)',
    border: 'var(--color-info-border)',
    accent: 'var(--color-info-text)',
  },
  Pending: {
    background: 'var(--color-warning-bg)',
    color: 'var(--color-warning-text)',
    border: 'var(--color-warning-border)',
    accent: 'var(--color-warning-text)',
  },
  Tentative: {
    background: 'var(--color-warning-bg)',
    color: 'var(--color-warning-text)',
    border: 'var(--color-warning-border)',
    accent: 'var(--color-warning-text)',
  },
  'Checked-out': {
    background: 'var(--color-neutral-bg)',
    color: 'var(--color-neutral-text)',
    border: 'var(--color-neutral-border)',
    accent: 'var(--color-neutral-text)',
  },
  Cancelled: {
    background: 'var(--color-danger-bg)',
    color: 'var(--color-danger-text)',
    border: 'var(--color-danger-border)',
    accent: 'var(--color-danger-text)',
  },
  'No-show': {
    background: 'var(--color-danger-bg)',
    color: 'var(--color-danger-text)',
    border: 'var(--color-danger-border)',
    accent: 'var(--color-danger-text)',
  },
};

/** Where a bar sits inside the visible week, or null when the stay is entirely outside it. */
function barGeometry(
  checkIn: string,
  checkOut: string,
  firstDay: string,
  horizonEnd: string,
  dayWidth: number
) {
  if (checkOut <= firstDay || checkIn >= horizonEnd) return null;
  const startedBefore = checkIn < firstDay;
  const endsAfter = checkOut > horizonEnd;
  const visibleStart = startedBefore ? firstDay : checkIn;
  const visibleEnd = endsAfter ? horizonEnd : checkOut;
  return {
    left: daysBetween(firstDay, visibleStart) * dayWidth + BAR_INSET,
    width: Math.max(32, daysBetween(visibleStart, visibleEnd) * dayWidth - BAR_INSET * 2),
    startedBefore,
    endsAfter,
  };
}

/** A room is held on a night when a live booking covers it; cancelled and no-show bookings leave it free. */
function isRoomBookedOn(room: CalendarRoom, dateStr: string, reservations: CalendarReservation[]): boolean {
  return reservations.some(
    (res) =>
      (res.roomId === room.id || res.roomNumber === room.number) &&
      res.status !== 'Cancelled' &&
      res.status !== 'No-show' &&
      res.checkInDate <= dateStr &&
      dateStr < res.checkOutDate
  );
}

function ResizeHandle({ side, onPointerDown }: { side: 'start' | 'end'; onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <div
      onPointerDown={onPointerDown}
      title={side === 'start' ? 'Drag to adjust arrival date' : 'Drag to adjust departure date'}
      className={`absolute bottom-0 top-0 z-10 flex w-2.5 cursor-ew-resize items-center justify-center opacity-40 transition-opacity group-hover:opacity-100 ${side === 'start' ? 'left-0' : 'right-0'}`}
    >
      <span className="h-4 w-0.5 rounded-full bg-current/50" />
    </div>
  );
}

function StatusGlyph({ status }: { status: CalendarReservationStatus }) {
  if (status === 'Checked-in') return <Lucide.Key size={12} aria-hidden="true" />;
  if (status === 'Confirmed') return <Lucide.Check size={12} aria-hidden="true" />;
  if (status === 'Tentative' || status === 'Pending') return <Lucide.Clock size={12} aria-hidden="true" />;
  if (status === 'Cancelled' || status === 'No-show') return <Lucide.CircleX size={12} aria-hidden="true" />;
  return null;
}

function ReservationBar({
  res,
  left,
  width,
  startedBefore,
  endsAfter,
  isDragging,
  onPointerDown,
  onOpen,
}: {
  res: CalendarReservation;
  left: number;
  width: number;
  startedBefore: boolean;
  endsAfter: boolean;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent, dragType: DragType) => void;
  onOpen: () => void;
}) {
  const tone = RESERVATION_BAR_TONES[res.status];
  const inactive = res.status === 'Cancelled' || res.status === 'No-show';
  const adjustable = res.status !== 'Cancelled';

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={(e) => onPointerDown(e, 'move')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`${res.guestName}, ${res.status}, ${res.checkInDate} to ${res.checkOutDate}. Select for details.`}
      title={`${res.guestName} (${res.id}) · ${res.checkInDate} to ${res.checkOutDate} (${res.nights}n) · ₹${res.totalAmount.toLocaleString('en-IN')}`}
      style={{
        left,
        width,
        top: 6,
        bottom: 6,
        background: tone.background,
        color: tone.color,
        borderColor: tone.border,
        borderLeft: `3px solid ${tone.accent}`,
      }}
      className={`group absolute z-10 flex select-none items-center gap-1.5 overflow-hidden border px-2 text-label font-semibold shadow-xs transition-[filter,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${startedBefore ? 'rounded-l-none' : 'rounded-l-lg'} ${endsAfter ? 'rounded-r-none' : 'rounded-r-lg'} ${res.status === 'Cancelled' ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} ${isDragging ? 'opacity-30' : 'hover:brightness-[0.98]'} ${inactive ? 'opacity-75' : ''}`}
    >
      {!startedBefore && adjustable && (
        <ResizeHandle side="start" onPointerDown={(e) => onPointerDown(e, 'resize-start')} />
      )}
      {startedBefore && <span className="font-mono text-micro opacity-75" aria-hidden="true">‹</span>}
      <span className={`min-w-0 truncate ${inactive ? 'line-through' : ''}`}>{res.guestName}</span>
      <span className="shrink-0 rounded border px-1 text-micro font-semibold" style={{ borderColor: tone.border }}>
        {res.nights}n
      </span>
      <span className="ml-auto shrink-0 pl-1" aria-hidden="true">
        <StatusGlyph status={res.status} />
      </span>
      {endsAfter && <span className="font-mono text-micro opacity-75" aria-hidden="true">›</span>}
      {!endsAfter && adjustable && (
        <ResizeHandle side="end" onPointerDown={(e) => onPointerDown(e, 'resize-end')} />
      )}
    </div>
  );
}

export function RoomCalendar({
  go,
  onReservationUpdated,
  filters,
}: {
  go?: (t: NavTarget) => void;
  onReservationUpdated?: () => void;
  filters: ReservationFilters;
}) {
  // The window starts on the range's first night, or the business date when no range is set;
  // the arrows move it by a full window. Changing the range resets the window to its start.
  const windowAnchor = filters.from || BUSINESS_DATE;
  const [startOffset, setStartOffset] = useState(0);
  const [anchorSeen, setAnchorSeen] = useState(windowAnchor);
  if (anchorSeen !== windowAnchor) {
    setAnchorSeen(windowAnchor);
    setStartOffset(0);
  }
  const days = useMemo(
    () => Array.from({ length: DAYS_IN_VIEW }, (_, i) => addDaysToIso(windowAnchor, startOffset + i)),
    [windowAnchor, startOffset]
  );
  const firstDay = days[0];
  const horizonEnd = addDaysToIso(days[DAYS_IN_VIEW - 1], 1);

  // Master data synchronized with the central PMS store
  const [rooms] = useState<CalendarRoom[]>(loadCalendarRooms);
  const [reservations, setReservations] = useState<CalendarReservation[]>(() => loadSyncedReservations());

  // Day notes and enquiries: summary drives the header icons, the date opens the day log
  const [dayLog, setDayLog] = useState<Record<string, DayLogSummaryRow>>({});
  const [dayLogVersion, setDayLogVersion] = useState(0);
  const [openLog, setOpenLog] = useState<{ date: string; kind: 'note' | 'enquiries' } | null>(null);
  useEffect(() => {
    let active = true;
    dayLogApi
      .summary(days)
      .then((summary) => {
        if (active) setDayLog(summary);
      })
      .catch(() => toast.error('Could not load day notes'));
    return () => {
      active = false;
    };
  }, [days, dayLogVersion]);

  // Detail modal & change confirmation
  const [activeReservation, setActiveReservation] = useState<CalendarReservation | null>(null);
  const [pendingChange, setPendingChange] = useState<ProposedReservationChange | null>(null);
  const [isSavingChange, setIsSavingChange] = useState(false);

  // Drag & resize
  const [dragState, setDragState] = useState<DragState | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const isPointerDownRef = useRef(false);

  // Day columns share the card width; they only get narrower than the minimum by scrolling sideways.
  const [dayWidth, setDayWidth] = useState(MIN_DAY_WIDTH);
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    const measure = () =>
      setDayWidth(Math.max(MIN_DAY_WIDTH, Math.floor((el.clientWidth - ROOM_COL_WIDTH) / DAYS_IN_VIEW)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const canvasWidth = DAYS_IN_VIEW * dayWidth;
  const gridWidth = ROOM_COL_WIDTH + canvasWidth;

  const filteredRooms = useMemo(() => {
    const needle = filters.q.trim().toLowerCase();
    return rooms.filter((r) => {
      const matchType = filters.roomType === 'All' || r.type === filters.roomType;
      const matchSearch =
        !needle ||
        r.number.includes(filters.q.trim()) ||
        reservations.some(
          (res) =>
            res.roomId === r.id &&
            (res.guestName.toLowerCase().includes(needle) || res.id.toLowerCase().includes(needle))
        );
      return matchType && matchSearch;
    });
  }, [rooms, filters.roomType, filters.q, reservations]);

  // Sellable rooms per night; out-of-order rooms are left out of the total
  const availability = useMemo(() => {
    const sellable = rooms.filter((r) => r.status !== 'Out-of-Order');
    return days.map((dateStr) => ({
      dateStr,
      free: sellable.filter((r) => !isRoomBookedOn(r, dateStr, reservations)).length,
      total: sellable.length,
    }));
  }, [days, rooms, reservations]);

  /**
   * Clicking a free day cell starts a new reservation pre-filled with that room
   * and night (check-out defaults to the next day).
   */
  const handleNewReservation = (room: CalendarRoom, checkIn: string) => {
    const covered = reservations.some(
      (res) =>
        (res.roomId === room.id || res.roomNumber === room.number) &&
        res.status !== 'Cancelled' &&
        res.status !== 'No-show' &&
        res.checkInDate <= checkIn &&
        checkIn < res.checkOutDate
    );
    if (covered) return;

    if (room.status === 'Out-of-Order') {
      toast.info('Room unavailable', { detail: `Room ${room.number} is out of order and cannot be booked.` });
      return;
    }

    if (!go) {
      toast.info('New reservation', { detail: 'Open Reservations to create this booking.' });
      return;
    }

    const checkOut = addDaysToIso(checkIn, 1);
    go({
      view: 'new-reservation',
      draft: { roomId: room.id, roomNumber: room.number, roomType: room.type, checkIn, checkOut },
    });
    toast.success('New reservation started', { detail: `Room ${room.number} · ${checkIn} → ${checkOut}` });
  };

  // ================= DRAG & DROP =================

  const handlePointerDown = (e: React.PointerEvent, res: CalendarReservation, dragType: DragType) => {
    if (e.button !== 0) return; // primary button or touch only
    if (res.status === 'Cancelled') {
      toast.info('Cancelled Reservation', { detail: 'Cancelled bookings cannot be adjusted on calendar.' });
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    isPointerDownRef.current = true;

    setDragState({
      isDragging: false,
      reservationId: res.id,
      dragType,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      originRoomId: res.roomId,
      originCheckIn: res.checkInDate,
      originCheckOut: res.checkOutDate,
      proposedRoomId: res.roomId,
      proposedCheckIn: res.checkInDate,
      proposedCheckOut: res.checkOutDate,
      isValid: true,
    });
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDownRef.current || !dragState) return;

      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;
      if (Math.abs(deltaX) <= 4 && Math.abs(deltaY) <= 4) return;

      const res = reservations.find((r) => r.id === dragState.reservationId);
      if (!res) return;

      const daysShift = Math.round(deltaX / dayWidth);
      let proposedCheckIn = dragState.originCheckIn;
      let proposedCheckOut = dragState.originCheckOut;

      if (dragState.dragType === 'move') {
        proposedCheckIn = addDaysToIso(dragState.originCheckIn, daysShift);
        proposedCheckOut = addDaysToIso(dragState.originCheckOut, daysShift);
      } else if (dragState.dragType === 'resize-start') {
        proposedCheckIn = addDaysToIso(dragState.originCheckIn, daysShift);
        if (proposedCheckIn >= dragState.originCheckOut) {
          proposedCheckIn = addDaysToIso(dragState.originCheckOut, -1);
        }
      } else if (dragState.dragType === 'resize-end') {
        proposedCheckOut = addDaysToIso(dragState.originCheckOut, daysShift);
        if (proposedCheckOut <= dragState.originCheckIn) {
          proposedCheckOut = addDaysToIso(dragState.originCheckIn, 1);
        }
      }

      // Vertical movement changes the room, for moves only
      let proposedRoomId = dragState.originRoomId;
      if (dragState.dragType === 'move') {
        const rowsShift = Math.round(deltaY / ROW_HEIGHT);
        const currentIdx = filteredRooms.findIndex((r) => r.id === dragState.originRoomId);
        if (currentIdx !== -1) {
          const targetIdx = Math.max(0, Math.min(filteredRooms.length - 1, currentIdx + rowsShift));
          proposedRoomId = filteredRooms[targetIdx].id;
        }
      }

      const targetRoom = rooms.find((r) => r.id === proposedRoomId) || rooms[0];
      const valResult = validateReservationMove({
        reservation: res,
        targetRoom,
        proposedCheckIn,
        proposedCheckOut,
        allReservations: reservations,
      });

      setDragState((prev) =>
        prev
          ? {
            ...prev,
            isDragging: true,
            currentX: e.clientX,
            currentY: e.clientY,
            proposedRoomId,
            proposedCheckIn,
            proposedCheckOut,
            isValid: valResult.isValid,
            invalidReason: valResult.reason,
          }
          : null
      );
    };

    const onPointerUp = () => {
      if (!isPointerDownRef.current || !dragState) return;
      isPointerDownRef.current = false;

      const res = reservations.find((r) => r.id === dragState.reservationId);

      // A click without a real drag opens the detail modal
      if (!dragState.isDragging && res) {
        setActiveReservation(res);
        setDragState(null);
        return;
      }

      if (dragState.isDragging && res) {
        const hasDatesChanged =
          dragState.proposedCheckIn !== dragState.originCheckIn ||
          dragState.proposedCheckOut !== dragState.originCheckOut;
        const hasRoomChanged = dragState.proposedRoomId !== dragState.originRoomId;

        if (!hasDatesChanged && !hasRoomChanged) {
          setDragState(null);
          return;
        }

        const originalRoom = rooms.find((r) => r.id === dragState.originRoomId) || rooms[0];
        const proposedRoom = rooms.find((r) => r.id === dragState.proposedRoomId) || rooms[0];

        const valResult = validateReservationMove({
          reservation: res,
          targetRoom: proposedRoom,
          proposedCheckIn: dragState.proposedCheckIn,
          proposedCheckOut: dragState.proposedCheckOut,
          allReservations: reservations,
        });

        if (!valResult.isValid) {
          toast.error('Cannot Reallocate', { detail: valResult.reason });
          setDragState(null);
          return;
        }

        const change: ProposedReservationChange = {
          reservation: res,
          originalRoom,
          proposedRoom,
          originalCheckIn: dragState.originCheckIn,
          proposedCheckIn: dragState.proposedCheckIn,
          originalCheckOut: dragState.originCheckOut,
          proposedCheckOut: dragState.proposedCheckOut,
          originalNights: res.nights,
          proposedNights: countNights(dragState.proposedCheckIn, dragState.proposedCheckOut),
          originalTotal: res.totalAmount,
          proposedTotal: valResult.proposedTotal,
          priceDifference: valResult.priceDifference,
          type:
            hasRoomChanged && hasDatesChanged
              ? 'combined'
              : hasRoomChanged
                ? 'move-room'
                : dragState.dragType === 'resize-start'
                  ? 'resize-start'
                  : dragState.dragType === 'resize-end'
                    ? 'resize-end'
                    : 'move-date',
        };

        setPendingChange(change);
      }

      setDragState(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragState, reservations, filteredRooms, rooms, dayWidth]);

  // Apply the confirmed change and sync it back to the PMS store
  const handleConfirmChange = async (notifyGuest: boolean) => {
    if (!pendingChange) return;

    setIsSavingChange(true);
    await new Promise((resolve) => setTimeout(resolve, 350));

    const { reservation, proposedRoom, proposedCheckIn, proposedCheckOut, proposedNights, proposedTotal } =
      pendingChange;
    const backendId = reservation.backendId ?? reservation.id;

    try {
      store.updateReservation(backendId, {
        roomId: proposedRoom.id,
        roomNumber: proposedRoom.number,
        checkInDate: proposedCheckIn,
        checkOutDate: proposedCheckOut,
        nights: proposedNights,
        totalAmount: String(proposedTotal),
      });
      store.assignRoom(backendId, proposedRoom.id, reservation.roomLineId);
    } catch {
      // In-memory store only; the local state below still updates the view
    }

    setReservations((prev) =>
      prev.map((r) =>
        r.backendId === backendId
          ? {
            ...r,
            ...(r.id === reservation.id
              ? { roomId: proposedRoom.id, roomNumber: proposedRoom.number, roomType: proposedRoom.type }
              : {}),
            checkInDate: proposedCheckIn,
            checkOutDate: proposedCheckOut,
            nights: proposedNights,
            totalAmount: proposedNights * r.nightlyRate,
          }
          : r
      )
    );

    setIsSavingChange(false);
    setPendingChange(null);
    onReservationUpdated?.();

    toast.success('Reservation Updated & Synced', {
      detail: `${reservation.guestName} reassigned to Room ${proposedRoom.number} (${proposedCheckIn} → ${proposedCheckOut}). ${notifyGuest ? 'Simulated guest email & SMS queued.' : ''}`,
    });
  };

  const handleStatusUpdate = (resId: string, newStatus: CalendarReservationStatus) => {
    const selected = reservations.find((reservation) => reservation.id === resId);
    const backendId = selected?.backendId ?? resId;
    setReservations((prev) => prev.map((r) => (r.backendId === backendId ? { ...r, status: newStatus } : r)));
    try {
      if (newStatus === 'Checked-in') store.checkIn(backendId);
      else if (newStatus === 'Checked-out') store.checkOut(backendId);
      else if (newStatus === 'Cancelled') store.cancelReservation(backendId, 'Cancelled via calendar');
    } catch {
      // The store rejects some transitions; the local state already reflects the choice
    }
    onReservationUpdated?.();
  };

  const ghost = dragState?.isDragging
    ? barGeometry(dragState.proposedCheckIn, dragState.proposedCheckOut, firstDay, horizonEnd, dayWidth)
    : null;

  return (
    <div className="flex w-full flex-col gap-4 font-sans text-ink select-none">
      <section className="pms-card overflow-hidden" aria-label="Room reservation timeline">
        {/* Toolbar: window navigation, arrows at the left and right extremes */}
        <div className="flex items-center justify-between border-b border-divider px-3 py-2 sm:px-4">
          <IconButton
            variant="ghost"
            type="button"
            onClick={() => setStartOffset((o) => o - DAYS_IN_VIEW)}
            title={`Previous ${DAYS_IN_VIEW} days`}
            aria-label={`Previous ${DAYS_IN_VIEW} days`}
          >
            <Lucide.ChevronLeft size={16} />
          </IconButton>
          <IconButton
            variant="ghost"
            type="button"
            onClick={() => setStartOffset((o) => o + DAYS_IN_VIEW)}
            title={`Next ${DAYS_IN_VIEW} days`}
            aria-label={`Next ${DAYS_IN_VIEW} days`}
          >
            <Lucide.ChevronRight size={16} />
          </IconButton>
        </div>

        {/* The only scroller. Vertical scrolling stays inside the card; the header sticks to its top. */}
        <div ref={gridContainerRef} className="relative max-h-[72vh] overflow-auto">
          <div className="relative min-w-max" style={{ width: `${gridWidth}px` }}>
            {/* Dates and the per-day availability row share one sticky block, so they stay visible while scrolling */}
            <div className="sticky top-0 z-30 bg-surface">
              <div className="flex border-b border-border bg-surface">
                <div
                  className="sticky left-0 z-40 flex shrink-0 items-end border-r border-border bg-page px-3 pb-2 text-micro font-bold uppercase tracking-wider text-ink-secondary"
                  style={{ width: `${ROOM_COL_WIDTH}px` }}
                >
                  Room
                </div>
                {days.map((dateStr) => {
                  const isToday = dateStr === BUSINESS_DATE;
                  const info = formatCalendarDate(dateStr);
                  const isWeekend = info.isWeekend;
                  const log = dayLog[dateStr];
                  const enquiryCount = log?.enquiryCount ?? 0;
                  return (
                    <div
                      key={dateStr}
                      className="flex shrink-0 flex-col items-center gap-1.5 border-r border-border px-1 py-2.5"
                      style={{
                        width: `${dayWidth}px`,
                        background: isToday
                          ? 'color-mix(in srgb, var(--color-primary) 9%, var(--color-surface))'
                          : isWeekend
                            ? 'color-mix(in srgb, var(--color-muted-surface) 60%, var(--color-surface))'
                            : 'var(--color-surface)',
                        boxShadow: isToday ? 'inset 0 -2px 0 var(--color-primary)' : undefined,
                      }}
                    >
                      <span
                        className={`text-micro font-semibold uppercase leading-none tracking-wider ${isToday ? 'text-[var(--color-primary)]' : 'text-ink-secondary'}`}
                      >
                        {info.weekday}
                      </span>
                      <div className="flex w-full items-center justify-between">
                        <DayLogButton
                          icon={<Lucide.StickyNote size={11} aria-hidden="true" />}
                          label={`${log?.hasNote ? 'Note written' : 'No note'} for ${dateStr}`}
                          filled={Boolean(log?.hasNote)}
                          tone="warning"
                          onClick={() => setOpenLog({ date: dateStr, kind: 'note' })}
                        />
                        <span
                          className={`tnum flex h-7 w-7 items-center justify-center rounded-full text-body font-bold leading-none ${isToday ? 'bg-[var(--color-primary)] text-white' : 'text-ink'}`}
                        >
                          {info.dayNum}
                        </span>
                        <DayLogButton
                          icon={<Lucide.MessageSquareText size={11} aria-hidden="true" />}
                          label={`${enquiryCount} enquir${enquiryCount === 1 ? 'y' : 'ies'} for ${dateStr}`}
                          filled={enquiryCount > 0}
                          tone="info"
                          onClick={() => setOpenLog({ date: dateStr, kind: 'enquiries' })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex border-b border-border bg-surface" style={{ height: `${AVAIL_ROW_HEIGHT}px` }}>
                <div
                  className="sticky left-0 z-40 flex shrink-0 items-center border-r border-border bg-page px-3 text-micro font-bold uppercase tracking-wider text-ink-secondary"
                  style={{ width: `${ROOM_COL_WIDTH}px` }}
                >
                  Total
                </div>
                {availability.map(({ dateStr, free, total }) => (
                  <div
                    key={dateStr}
                    className="flex shrink-0 items-center justify-center border-r border-border"
                    style={{ width: `${dayWidth}px` }}
                  >
                    {free === 0 ? (
                      <span className="rounded-full bg-danger-bg px-2 py-0.5 text-micro font-bold text-danger-text">All Sold</span>
                    ) : (
                      <span
                        className="tnum rounded-full bg-success-bg px-2 py-0.5 text-micro font-bold text-success-text"
                        title={`${free} of ${total} rooms free`}
                      >
                        {free} AVL
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rooms */}
            {filteredRooms.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center gap-2 px-6 text-center" role="status">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-muted-surface)] text-[var(--color-ink-secondary)]">
                  <Lucide.SearchX size={18} />
                </span>
                <span className="text-body font-semibold text-ink">No rooms match these filters</span>
                <span className="text-label text-ink-secondary">Try a different room type, floor, or search.</span>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isOOO = room.status === 'Out-of-Order';
                const isTargetRow = dragState?.isDragging && dragState?.proposedRoomId === room.id;
                const roomReservations = reservations.filter(
                  (res) =>
                    (res.roomId === room.id || res.roomNumber === room.number) &&
                    matchesStatusFilter(res.status, filters.status) &&
                    (filters.source === 'All' || res.bookingSource === filters.source) &&
                    stayOverlapsRange(res.checkInDate, res.checkOutDate, filters.from, filters.to)
                );

                return (
                  <div
                    key={room.id}
                    className={`relative flex border-b border-border/80 transition-colors ${isTargetRow
                      ? dragState?.isValid
                        ? 'bg-[var(--color-muted-surface)] ring-1 ring-inset ring-[var(--color-primary)]/40'
                        : 'bg-[var(--color-danger-bg)] ring-1 ring-inset ring-[var(--color-danger-border)]'
                      : isOOO
                        ? 'bg-page/50'
                        : 'hover:bg-page/60'
                      }`}
                    style={{ height: `${ROW_HEIGHT}px` }}
                  >
                    <div
                      className="sticky left-0 z-20 flex shrink-0 items-center border-r border-border px-3 shadow-xs"
                      style={{
                        width: `${ROOM_COL_WIDTH}px`,
                        background: isTargetRow
                          ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))'
                          : isOOO
                            ? 'var(--color-muted-surface)'
                            : 'var(--color-surface)',
                      }}
                    >
                      <span className="text-label font-black tracking-tight text-ink">Rm {room.number}</span>
                    </div>

                    <div className="relative flex h-full" style={{ width: `${canvasWidth}px` }}>
                      {/* Day cells: click a free one to start a booking */}
                      {days.map((dateStr) => {
                        const isToday = dateStr === BUSINESS_DATE;
                        const info = formatCalendarDate(dateStr);
                        const isBooked = isRoomBookedOn(room, dateStr, reservations);
                        const canCreate = !isBooked && !isOOO;
                        return (
                          <div
                            key={dateStr}
                            role={canCreate ? 'button' : undefined}
                            tabIndex={canCreate ? 0 : undefined}
                            aria-label={canCreate ? `New reservation for room ${room.number} on ${dateStr}` : undefined}
                            title={canCreate ? `New reservation · Room ${room.number} · ${dateStr}` : undefined}
                            onClick={() => handleNewReservation(room, dateStr)}
                            onKeyDown={(e) => {
                              if ((e.key === 'Enter' || e.key === ' ') && canCreate) {
                                e.preventDefault();
                                handleNewReservation(room, dateStr);
                              }
                            }}
                            className={`group relative flex h-full shrink-0 items-center justify-center border-r border-border ${canCreate ? 'cursor-pointer' : ''}`}
                            style={{
                              width: `${dayWidth}px`,
                              background: isOOO
                                ? 'repeating-linear-gradient(45deg, var(--color-muted-surface), var(--color-muted-surface) 8px, var(--color-surface) 8px, var(--color-surface) 16px)'
                                : isToday
                                  ? 'color-mix(in srgb, var(--color-primary) 5%, var(--color-surface))'
                                  : info.isWeekend
                                    ? 'color-mix(in srgb, var(--color-muted-surface) 45%, var(--color-surface))'
                                    : 'var(--color-surface)',
                            }}
                          >
                            {canCreate && (
                              <span className="pointer-events-none flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 text-[var(--color-primary)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                <Lucide.Plus size={12} />
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {roomReservations.map((res) => {
                        const geometry = barGeometry(res.checkInDate, res.checkOutDate, firstDay, horizonEnd, dayWidth);
                        if (!geometry) return null;
                        return (
                          <ReservationBar
                            key={res.id}
                            res={res}
                            left={geometry.left}
                            width={geometry.width}
                            startedBefore={geometry.startedBefore}
                            endsAfter={geometry.endsAfter}
                            isDragging={Boolean(dragState?.isDragging && dragState?.reservationId === res.id)}
                            onPointerDown={(e, dragType) => handlePointerDown(e, res, dragType)}
                            onOpen={() => setActiveReservation(res)}
                          />
                        );
                      })}

                      {/* Ghost preview while a booking is being moved or resized */}
                      {isTargetRow && dragState && ghost && (
                        <div
                          className={`pointer-events-none absolute z-20 flex items-center justify-between rounded-xl border-2 border-dashed px-2.5 py-0.5 text-label font-bold shadow-xl ${dragState.isValid
                            ? 'border-surface bg-[var(--color-primary)]/90 text-white ring-2 ring-[var(--color-primary)]'
                            : 'border-surface bg-danger-text/90 text-white ring-2 ring-danger-text'
                            }`}
                          style={{ left: ghost.left, width: ghost.width, top: 6, bottom: 6 }}
                        >
                          <span className="truncate">
                            {dragState.isValid ? 'Move:' : 'Conflict:'} {dragState.proposedCheckIn} → {dragState.proposedCheckOut}
                          </span>
                          <span className="shrink-0 text-micro">
                            {dragState.isValid ? 'Drop to confirm' : (dragState.invalidReason ?? '').slice(0, 24)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {openLog?.kind === 'note' && (
        <DayNoteModal
          key={`note-${openLog.date}`}
          date={openLog.date}
          onClose={() => setOpenLog(null)}
          onChanged={() => setDayLogVersion((v) => v + 1)}
        />
      )}
      {openLog?.kind === 'enquiries' && (
        <DayEnquiriesModal
          key={`enquiries-${openLog.date}`}
          date={openLog.date}
          onClose={() => setOpenLog(null)}
          onChanged={() => setDayLogVersion((v) => v + 1)}
        />
      )}

      <ReservationChangeDialog
        change={pendingChange}
        onConfirm={handleConfirmChange}
        onCancel={() => setPendingChange(null)}
        isSaving={isSavingChange}
      />

      <ReservationDetailModal
        reservation={activeReservation}
        rooms={rooms}
        allReservations={reservations}
        onClose={() => setActiveReservation(null)}
        onInitiateChange={(change) => {
          setActiveReservation(null);
          setPendingChange(change);
        }}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}
