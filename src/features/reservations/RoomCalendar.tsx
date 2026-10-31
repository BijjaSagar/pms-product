import { useEffect, useMemo, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import { toast } from '../../utils/toast';
import type { NavTarget } from '../../config/navigation';
import { store } from '../../data/store';
import type { CalendarReservation, CalendarRoom, DragState, ProposedReservationChange, ReservationStatus as CalendarReservationStatus } from './room-calendar/types';
import { BUSINESS_DATE, addDaysToIso, countNights, formatCalendarDate, loadCalendarRooms, loadSyncedReservations } from './room-calendar/calendarData';
import { validateReservationMove } from './room-calendar/validation';
import { ReservationChangeDialog } from './room-calendar/ReservationChangeDialog';
import { ReservationDetailModal } from './room-calendar/ReservationDetailModal';
import { Badge } from '../../components/ui';
import { Button, IconButton, TextField } from '../../components/primitives';
import { type ReservationFilters } from './ReservationFilterBar';

// ================= ROOM CALENDAR TAPE CHART COMPONENT =================
const COL_WIDTH = 114; // keep in sync with the rendered date cells and drag calculations
const ROW_HEIGHT = 54; // keep in sync with the rendered room rows and drag calculations
const ROOM_COL_WIDTH = 110; // width of the sticky room allotment column in pixels

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

export function RoomCalendar({
  go,
  onReservationUpdated,
  filters,
}: {
  go?: (t: NavTarget) => void;
  onReservationUpdated?: () => void;
  filters: ReservationFilters;
}) {
  // Calendar base anchor date synced with the canonical PMS BUSINESS_DATE
  const [baseDate, setBaseDate] = useState(BUSINESS_DATE);
  const [viewHorizonDays, setViewHorizonDays] = useState<7 | 14 | 30>(14);

  // Master Data synchronized with central PMS store
  const [rooms] = useState<CalendarRoom[]>(loadCalendarRooms);
  const [reservations, setReservations] = useState<CalendarReservation[]>(() =>
    loadSyncedReservations()
  );

  // Detail Modal & Change Confirmation Modal
  const [activeReservation, setActiveReservation] = useState<CalendarReservation | null>(null);
  const [pendingChange, setPendingChange] = useState<ProposedReservationChange | null>(null);
  const [isSavingChange, setIsSavingChange] = useState(false);

  // Drag & Resize State
  const [dragState, setDragState] = useState<DragState | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const isPointerDownRef = useRef(false);

  // Generate Date Headers
  const calendarDates = useMemo(() => {
    const list: string[] = [];
    // Start from baseDate - 2 days to give immediate past context
    const startOffset = -2;
    for (let i = 0; i < viewHorizonDays; i++) {
      list.push(addDaysToIso(baseDate, startOffset + i));
    }
    return list;
  }, [baseDate, viewHorizonDays]);

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchType = filters.roomType === 'All' || r.type === filters.roomType;
      const matchSearch =
        !filters.q.trim() ||
        r.number.includes(filters.q.trim()) ||
        reservations.some(
          (res) =>
            res.roomId === r.id &&
            (res.guestName.toLowerCase().includes(filters.q.toLowerCase()) ||
              res.id.toLowerCase().includes(filters.q.toLowerCase()))
        );
      return matchType && matchSearch;
    });
  }, [rooms, filters.roomType, filters.q, reservations]);

  // Date Navigation
  const stepDate = (days: number) => {
    setBaseDate((prev) => addDaysToIso(prev, days));
  };

  const jumpToToday = () => {
    setBaseDate(BUSINESS_DATE);
    toast.info('Jumped to Today', { detail: `Calendar anchored on ${BUSINESS_DATE}` });
  };

  /**
   * Clicking a free cell on the room rack starts a new reservation pre-filled
   * with that room and that night (check-out defaults to the next day).
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
      toast.info('Room unavailable', {
        detail: `Room ${room.number} is out of order and cannot be booked.`,
      });
      return;
    }

    if (!go) {
      toast.info('New reservation', {
        detail: 'Open Reservations to create this booking.',
      });
      return;
    }

    const checkOut = addDaysToIso(checkIn, 1);
    go({
      view: 'new-reservation',
      draft: {
        roomId: room.id,
        roomNumber: room.number,
        roomType: room.type,
        checkIn,
        checkOut,
      },
    });
    toast.success('New reservation started', {
      detail: `Room ${room.number} · ${checkIn} → ${checkOut}`,
    });
  };

  // Occupancy metrics for the current visible horizon
  const stats = useMemo(() => {
    const totalRoomsCount = rooms.length;
    const todayIso = baseDate;
    const occupiedToday = reservations.filter(
      (r) =>
        r.status !== 'Cancelled' &&
        r.checkInDate <= todayIso &&
        todayIso < r.checkOutDate
    ).length;
    const oooCount = rooms.filter((r) => r.status === 'Out-of-Order').length;
    const availableToday = Math.max(0, totalRoomsCount - occupiedToday - oooCount);
    const occupancyRate = Math.round((occupiedToday / (totalRoomsCount - oooCount)) * 100) || 0;

    return { totalRoomsCount, occupiedToday, availableToday, oooCount, occupancyRate };
  }, [rooms, reservations, baseDate]);

  // ================= DRAG & DROP LOGIC =================

  const handlePointerDown = (
    e: React.PointerEvent,
    res: CalendarReservation,
    dragType: 'move' | 'resize-start' | 'resize-end'
  ) => {
    // Only left click or primary touch
    if (e.button !== 0) return;
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
      const isDragging = Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4;

      if (!isDragging) return;

      const res = reservations.find((r) => r.id === dragState.reservationId);
      if (!res) return;

      // Calculate days shifted horizontally
      const daysShift = Math.round(deltaX / COL_WIDTH);

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

      // Calculate target room vertically (only for 'move' type)
      let proposedRoomId = dragState.originRoomId;
      if (dragState.dragType === 'move' && gridContainerRef.current) {
        const rowsShift = Math.round(deltaY / ROW_HEIGHT);
        const currentIdx = filteredRooms.findIndex((r) => r.id === dragState.originRoomId);
        if (currentIdx !== -1) {
          const targetIdx = Math.max(0, Math.min(filteredRooms.length - 1, currentIdx + rowsShift));
          proposedRoomId = filteredRooms[targetIdx].id;
        }
      }

      const targetRoom = rooms.find((r) => r.id === proposedRoomId) || rooms[0];

      // Run real-time validation
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

      // If clicked without significant drag, open detail modal
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

        // Final validation check
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

        const proposedNights = countNights(dragState.proposedCheckIn, dragState.proposedCheckOut);

        const change: ProposedReservationChange = {
          reservation: res,
          originalRoom,
          proposedRoom,
          originalCheckIn: dragState.originCheckIn,
          proposedCheckIn: dragState.proposedCheckIn,
          originalCheckOut: dragState.originCheckOut,
          proposedCheckOut: dragState.proposedCheckOut,
          originalNights: res.nights,
          proposedNights,
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
  }, [dragState, reservations, filteredRooms, rooms]);

  // Apply Confirmed Change and sync back to PMS store
  const handleConfirmChange = async (notifyGuest: boolean) => {
    if (!pendingChange) return;

    setIsSavingChange(true);
    await new Promise((resolve) => setTimeout(resolve, 350));

    const { reservation, proposedRoom, proposedCheckIn, proposedCheckOut, proposedNights, proposedTotal } =
      pendingChange;
    const backendId = reservation.backendId ?? reservation.id;

    // 1. Update central PMS store for unified multi-page synchronization
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
      // In-memory fallback
    }

    // 2. Update local state
    setReservations((prev) =>
      prev.map((r) =>
        r.backendId === backendId
          ? {
            ...r,
            ...(r.id === reservation.id ? {
              roomId: proposedRoom.id,
              roomNumber: proposedRoom.number,
              roomType: proposedRoom.type,
            } : {}),
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

    // Notify parent to refresh List View
    onReservationUpdated?.();

    toast.success('Reservation Updated & Synced', {
      detail: `${reservation.guestName} reassigned to Room ${proposedRoom.number} (${proposedCheckIn} → ${proposedCheckOut}). ${notifyGuest ? 'Simulated guest email & SMS queued.' : ''
        }`,
    });
  };

  // Status update from Detail modal
  const handleStatusUpdate = (resId: string, newStatus: CalendarReservationStatus) => {
    const selected = reservations.find((reservation) => reservation.id === resId);
    const backendId = selected?.backendId ?? resId;
    setReservations((prev) =>
      prev.map((r) => (r.backendId === backendId ? { ...r, status: newStatus } : r))
    );
    try {
      if (newStatus === 'Checked-in') store.checkIn(backendId);
      else if (newStatus === 'Checked-out') store.checkOut(backendId);
      else if (newStatus === 'Cancelled') store.cancelReservation(backendId, 'Cancelled via calendar');
    } catch {
      // ignore
    }
    onReservationUpdated?.();
  };

  return (
    <div className="w-full flex flex-col gap-4 text-ink font-sans select-none">
      {/* ================= 1. ROOM CALENDAR TOOLBAR ================= */}
      <section className="pms-card flex flex-col gap-4 p-3.5 sm:p-4" aria-label="Room calendar controls">

        {/* Top Row: Date Step & View Horizon & Master Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">

          {/* Left: Date Stepper & Today */}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-border bg-page p-1 shadow-2xs">
              <IconButton variant="ghost"
                type="button"
                onClick={() => stepDate(-7)}
                title="Previous Week (-7 days)"
                aria-label="Previous week"
              >
                <Lucide.ChevronsLeft size={16} />
              </IconButton>
              <IconButton variant="ghost"
                type="button"
                onClick={() => stepDate(-1)}
                title="Previous Day (-1 day)"
                aria-label="Previous day"
              >
                <Lucide.ChevronLeft size={16} />
              </IconButton>

              <label className="relative flex min-h-[34px] md:min-h-[32px] cursor-pointer items-center gap-2 rounded-xl border border-border/80 bg-surface px-3 text-label font-semibold text-ink shadow-2xs focus-within:ring-2 focus-within:ring-[var(--color-primary)]/25">
                <Lucide.Calendar size={14} className="text-[var(--color-primary)]" />
                <span>
                  {formatCalendarDate(baseDate).month} {formatCalendarDate(baseDate).dayNum}, {formatCalendarDate(baseDate).year}
                </span>
                <TextField
                  type="date"
                  value={baseDate}
                  onChange={(e) => e.target.value && setBaseDate(e.target.value)}
                  aria-label="Choose calendar date"
                  className="absolute inset-0 w-full cursor-pointer opacity-0"
                />
              </label>

              <IconButton variant="ghost"
                type="button"
                onClick={() => stepDate(1)}
                title="Next Day (+1 day)"
                aria-label="Next day"
              >
                <Lucide.ChevronRight size={16} />
              </IconButton>
              <IconButton variant="ghost"
                type="button"
                onClick={() => stepDate(7)}
                title="Next Week (+7 days)"
                aria-label="Next week"
              >
                <Lucide.ChevronsRight size={16} />
              </IconButton>
            </div>

            <Button variant="secondary"
              type="button"
              onClick={jumpToToday}
              className="transition-colors cursor-pointer"
            >
              Today
            </Button>

            {/* Horizon Switcher (7 / 14 / 30 Days) */}
            <div className="flex items-center rounded-xl border border-border bg-page p-1 text-label font-semibold shadow-2xs" role="group" aria-label="Calendar range">
              {([7, 14, 30] as const).map((days) => (
                <Button
                  key={days}
                  variant="text"
                  type="button"
                  onClick={() => setViewHorizonDays(days)}
                  aria-pressed={viewHorizonDays === days}
                  className={`rounded-lg px-3 py-1 cursor-pointer ${viewHorizonDays === days ? 'bg-surface text-ink shadow-2xs' : 'text-ink-secondary hover:text-ink'}`}
                >
                  {days} Days
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">

              <Badge tone="neutral" size="sm">Rooms <span className="tabular-nums">{stats.totalRoomsCount}</span></Badge>
              <Badge tone="success" size="sm">Available <span className="tabular-nums">{stats.availableToday}</span></Badge>
              <Badge tone="info" size="sm">Occupied <span className="tabular-nums">{stats.occupiedToday} · {stats.occupancyRate}%</span></Badge>
              {stats.oooCount > 0 && (
                <Badge tone="danger" size="sm">Out of order <span className="tabular-nums">{stats.oooCount}</span></Badge>
              )}
            </div>
          </div>

        </div>

      </section>


      {/* ================= 3. MASTER INTERACTIVE ROOM RACK GRID ================= */}
      <section className="pms-card overflow-hidden" aria-label="Room reservation timeline">

        {/* Header Row: Room Label Column + Date Columns */}
        <div className="sticky top-0 z-20 flex border-b border-border bg-surface">
          {/* Sticky Top-Left Corner */}
          <div
            style={{ width: `${ROOM_COL_WIDTH}px` }}
            className="sticky left-0 z-30 flex shrink-0 items-center justify-between border-r border-border bg-page px-3 py-3 text-label font-bold uppercase tracking-wider text-ink-secondary shadow-xs"
          >
            <span>Room no</span>
          </div>

          {/* Date Columns Header */}
          <div className="flex" style={{ width: `${calendarDates.length * COL_WIDTH}px` }}>
            {calendarDates.map((dateStr) => {
              const isToday = dateStr === baseDate;
              const dateInfo = formatCalendarDate(dateStr);
              return (
                <div
                  key={dateStr}
                  style={{
                    width: `${COL_WIDTH}px`,
                    background: isToday
                      ? 'color-mix(in srgb, var(--color-primary) 9%, var(--color-surface))'
                      : dateInfo.isWeekend
                        ? 'color-mix(in srgb, var(--color-muted-surface) 60%, var(--color-surface))'
                        : 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    borderBottom: isToday ? '2px solid var(--color-primary)' : undefined,
                  }}
                  className="flex shrink-0 flex-col items-center justify-center border-r px-1 py-2 text-center transition-colors"
                >
                  <span
                    className={`text-micro font-bold uppercase tracking-wider ${isToday ? 'font-bold text-[var(--color-primary)]' : 'text-ink-secondary'
                      }`}
                  >
                    {dateInfo.weekday}
                  </span>
                  <span
                    className={`text-body leading-none mt-0.5 ${isToday
                      ? 'flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] font-bold text-white shadow-xs'
                      : 'font-bold text-ink'
                      }`}
                  >
                    {dateInfo.dayNum}
                  </span>
                  <span className="mt-0.5 text-micro font-medium text-ink-secondary">
                    {dateInfo.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>


        {/* Scrollable Container */}
        <div className="relative max-h-[72vh] overflow-auto py-2.5" ref={gridContainerRef}>
          <div
            className="flex flex-col min-w-max relative"
            style={{ width: `${ROOM_COL_WIDTH + calendarDates.length * COL_WIDTH}px` }}
          >


            {/* Room Rows (15 Rooms total across 3 floors) */}
            {filteredRooms.length === 0 ? (
              <div
                className="flex min-h-52 flex-col items-center justify-center gap-2 px-6 text-center"
                style={{ width: `${ROOM_COL_WIDTH + calendarDates.length * COL_WIDTH}px` }}
                role="status"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-muted-surface)] text-[var(--color-ink-secondary)]">
                  <Lucide.SearchX size={18} />
                </span>
                <span className="text-body font-semibold text-ink">No rooms match these filters</span>
                <span className="text-label text-ink-secondary">Try a different room type, floor, or search.</span>
              </div>
            ) : filteredRooms.map((room) => {
              const isOOO = room.status === 'Out-of-Order';
              const isTargetRow = dragState?.isDragging && dragState?.proposedRoomId === room.id;

              // Find reservations assigned to this room
              const roomReservations = reservations.filter(
                (res) =>
                  (res.roomId === room.id || res.roomNumber === room.number) &&
                  (filters.status === 'All' || res.status === filters.status) &&
                  (filters.source === 'All' || res.bookingSource === filters.source)
              );

              return (
                <div
                  key={room.id}
                  className={`flex border-b border-border/80 relative transition-colors ${isTargetRow
                    ? dragState?.isValid
                      ? 'bg-[var(--color-muted-surface)] ring-1 ring-inset ring-[var(--color-primary)]/40'
                      : 'bg-[var(--color-danger-bg)] ring-1 ring-inset ring-[var(--color-danger-border)]'
                    : isOOO
                      ? 'bg-page/50'
                      : 'hover:bg-page/60'
                    }`}
                  style={{ height: `${ROW_HEIGHT}px`, borderColor: 'var(--color-border)' }}
                >
                  {/* Sticky Left Room Card (Z-20, solid background, never overlapped) */}
                  <div
                    className="sticky left-0 z-10 flex shrink-0 select-none items-center justify-between border-r border-border px-3 py-2 shadow-xs"
                    style={{
                      width: `${ROOM_COL_WIDTH}px`,
                      background: isTargetRow
                        ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))'
                        : isOOO
                          ? 'var(--color-muted-surface)'
                          : 'var(--color-surface)',
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-label font-black text-ink tracking-tight">
                            Rm {room.number}
                          </span>

                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Timeline Canvas (Starts strictly after sticky room column) */}
                  <div
                    className="relative flex items-center h-full"
                    style={{ width: `${calendarDates.length * COL_WIDTH}px` }}
                  >
                    {/* Day background cells */}
                    {calendarDates.map((dateStr) => {
                      const isToday = dateStr === baseDate;
                      const dateInfo = formatCalendarDate(dateStr);
                      const isBooked = reservations.some(
                        (res) =>
                          (res.roomId === room.id || res.roomNumber === room.number) &&
                          res.status !== 'Cancelled' &&
                          res.status !== 'No-show' &&
                          res.checkInDate <= dateStr &&
                          dateStr < res.checkOutDate
                      );
                      const canCreate = !isBooked && !isOOO;
                      return (
                        <div
                          key={dateStr}
                          role={canCreate ? 'button' : undefined}
                          tabIndex={canCreate ? 0 : undefined}
                          aria-label={
                            canCreate
                              ? `New reservation for room ${room.number} on ${dateStr}`
                              : undefined
                          }
                          title={
                            canCreate
                              ? `New reservation · Room ${room.number} · ${dateStr}`
                              : undefined
                          }
                          onClick={() => handleNewReservation(room, dateStr)}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && canCreate) {
                              e.preventDefault();
                              handleNewReservation(room, dateStr);
                            }
                          }}
                          style={{
                            width: `${COL_WIDTH}px`,
                            borderColor: 'var(--color-border)',
                            background: isOOO
                              ? 'repeating-linear-gradient(45deg, var(--color-muted-surface), var(--color-muted-surface) 8px, var(--color-surface) 8px, var(--color-surface) 16px)'
                              : isToday
                                ? 'color-mix(in srgb, var(--color-primary) 5%, var(--color-surface))'
                                : dateInfo.isWeekend
                                  ? 'color-mix(in srgb, var(--color-muted-surface) 45%, var(--color-surface))'
                                  : 'var(--color-surface)',
                          }}
                          className={`group relative flex h-full shrink-0 items-center justify-center border-r ${canCreate ? 'cursor-pointer' : ''}`}
                        >
                          {canCreate ? (
                            <span className="pointer-events-none flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 text-[var(--color-primary)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                              <Lucide.Plus size={12} />
                            </span>
                          ) : null}
                        </div>
                      );
                    })}

                    {/* Reservation Bars: Clamped to timeline horizon */}
                    {roomReservations.map((res) => {
                      const firstDate = calendarDates[0];
                      const lastDate = calendarDates[calendarDates.length - 1];
                      const visibleHorizonEnd = addDaysToIso(lastDate, 1);

                      // Skip if completely out of visible calendar view
                      if (res.checkOutDate <= firstDate || res.checkInDate >= visibleHorizonEnd) {
                        return null;
                      }

                      const startedBefore = res.checkInDate < firstDate;
                      const endsAfter = res.checkOutDate > visibleHorizonEnd;

                      const visibleStart = startedBefore ? firstDate : res.checkInDate;
                      const visibleEnd = endsAfter ? visibleHorizonEnd : res.checkOutDate;

                      const offsetDays = countNights(firstDate, visibleStart);
                      const visibleNights = countNights(visibleStart, visibleEnd);

                      const barLeft = offsetDays * COL_WIDTH + 2;
                      const barWidth = Math.max(32, visibleNights * COL_WIDTH - 4);

                      const isBeingDragged =
                        dragState?.isDragging && dragState?.reservationId === res.id;

                      const barTone = RESERVATION_BAR_TONES[res.status];
                      const isInactive = res.status === 'Cancelled' || res.status === 'No-show';

                      return (
                        <div
                          key={res.id}
                          onPointerDown={(e) => handlePointerDown(e, res, 'move')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setActiveReservation(res);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`${res.guestName}, ${res.status}, Room ${room.number}, ${res.checkInDate} to ${res.checkOutDate}. Select for details.`}
                          style={{
                            left: `${barLeft}px`,
                            width: `${barWidth}px`,
                            top: '8px',
                            bottom: '8px',
                            background: barTone.background,
                            color: barTone.color,
                            borderColor: barTone.border,
                            borderLeft: `3px solid ${barTone.accent}`,
                          }}
                          className={`absolute ${startedBefore ? 'rounded-l-none' : 'rounded-l-xl'
                            } ${endsAfter ? 'rounded-r-none' : 'rounded-r-xl'
                            } z-10 group flex select-none items-center justify-between overflow-hidden border px-2 py-0.5 text-label font-semibold shadow-xs transition-all cursor-grab active:cursor-grabbing focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 ${isBeingDragged ? 'opacity-30' : 'hover:brightness-[0.98] hover:shadow-sm'
                            } ${isInactive ? 'opacity-75' : ''} ${res.status === 'Cancelled' ? 'cursor-not-allowed' : ''
                            }`}
                          title={`${res.guestName} (${res.id}) · ${res.checkInDate} to ${res.checkOutDate} (${res.nights}n) · ₹${res.totalAmount.toLocaleString('en-IN')}`}
                        >
                          {/* Left Resize Handle (only if check-in is within visible range) */}
                          {!startedBefore && res.status !== 'Cancelled' && (
                            <div
                              onPointerDown={(e) => handlePointerDown(e, res, 'resize-start')}
                              className="absolute bottom-0 left-0 top-0 z-10 flex w-3 cursor-ew-resize items-center justify-center bg-ink/10 opacity-40 transition-opacity group-hover:opacity-100"
                              title="Drag to adjust arrival date"
                            >
                              <span className="h-4 w-0.5 rounded-full bg-current/50" />
                            </div>
                          )}

                          {/* Bar Content */}
                          <div className="flex min-w-0 items-center gap-1 truncate pl-1 pr-1">
                            {startedBefore && (
                              <span className="text-micro opacity-75 font-mono">‹</span>
                            )}
                            <span className={`truncate text-label font-bold leading-tight ${isInactive ? 'line-through' : ''}`}>
                              {res.guestName}
                            </span>
                            <span
                              className="shrink-0 rounded border px-1 py-0.2 text-micro font-semibold"
                              style={{
                                background: `color-mix(in srgb, ${barTone.color} 9%, var(--color-surface))`,
                                borderColor: barTone.border,
                              }}
                            >
                              {res.nights}n
                            </span>
                            <span className="hidden truncate text-micro opacity-80 2xl:inline">
                              ₹{res.totalAmount.toLocaleString('en-IN')}
                            </span>
                            {endsAfter && (
                              <span className="text-micro opacity-75 font-mono">›</span>
                            )}
                          </div>

                          {/* Status Icon */}
                          <div className="flex shrink-0 items-center pl-1" aria-hidden="true">
                            {res.status === 'Checked-in' && <Lucide.Key size={12} />}
                            {res.status === 'Confirmed' && <Lucide.Check size={12} />}
                            {(res.status === 'Tentative' || res.status === 'Pending') && <Lucide.Clock size={12} />}
                            {(res.status === 'Cancelled' || res.status === 'No-show') && <Lucide.CircleX size={12} />}
                          </div>

                          {/* Right Resize Handle (only if check-out is within visible range) */}
                          {!endsAfter && res.status !== 'Cancelled' && (
                            <div
                              onPointerDown={(e) => handlePointerDown(e, res, 'resize-end')}
                              className="absolute bottom-0 right-0 top-0 z-10 flex w-3 cursor-ew-resize items-center justify-center bg-ink/10 opacity-40 transition-opacity group-hover:opacity-100"
                              title="Drag to adjust departure date"
                            >
                              <span className="h-4 w-0.5 rounded-full bg-current/50" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Ghost Bar Preview during Drag / Resize */}
                    {isTargetRow && (() => {
                      const firstDate = calendarDates[0];
                      const lastDate = calendarDates[calendarDates.length - 1];
                      const visibleHorizonEnd = addDaysToIso(lastDate, 1);

                      const startedBefore = dragState.proposedCheckIn < firstDate;
                      const endsAfter = dragState.proposedCheckOut > visibleHorizonEnd;

                      const visibleStart = startedBefore ? firstDate : dragState.proposedCheckIn;
                      const visibleEnd = endsAfter ? visibleHorizonEnd : dragState.proposedCheckOut;

                      const dStart = countNights(firstDate, visibleStart);
                      const nights = countNights(visibleStart, visibleEnd);

                      const ghostLeft = dStart * COL_WIDTH + 2;
                      const ghostWidth = Math.max(32, nights * COL_WIDTH - 4);
                      const totalNights = countNights(dragState.proposedCheckIn, dragState.proposedCheckOut);

                      return (
                        <div
                          style={{
                            left: `${ghostLeft}px`,
                            width: `${ghostWidth}px`,
                            top: '8px',
                            bottom: '8px',
                          }}
                          className={`absolute rounded-xl px-2.5 py-0.5 flex items-center justify-between text-label font-bold shadow-xl pointer-events-none z-30 transition-all border-2 border-dashed ${dragState.isValid
                            ? 'bg-[var(--color-primary)]/90 border-surface text-white ring-2 ring-[var(--color-primary)]'
                            : 'bg-danger-text/90 border-surface text-white ring-2 ring-danger-text'
                            }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span>
                              {dragState.isValid ? 'Move:' : 'Conflict:'} {dragState.proposedCheckIn} → {dragState.proposedCheckOut} ({totalNights}n)
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 text-micro">
                            {dragState.isValid ? (
                              <span className="bg-surface/25 px-1.5 py-0.5 rounded">Drop to Confirm</span>
                            ) : (
                              <span className="bg-ink/30 px-1.5 py-0.5 rounded text-warning-foreground">
                                {dragState.invalidReason?.substring(0, 24)}...
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </section>

      {/* ================= 4. CONFIRMATION & DETAIL OVERLAYS ================= */}

      {/* Move Confirmation Dialog (Portaled to body) */}
      <ReservationChangeDialog
        change={pendingChange}
        onConfirm={handleConfirmChange}
        onCancel={() => setPendingChange(null)}
        isSaving={isSavingChange}
      />

      {/* Reservation Details & Tap Reallocation Modal (Portaled to body) */}
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
