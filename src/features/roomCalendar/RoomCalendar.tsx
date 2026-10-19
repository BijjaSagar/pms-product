import { useMemo, useRef, useState, useEffect } from 'react';
import * as Lucide from 'lucide-react';
import type {
  CalendarReservation,
  CalendarRoom,
  DragState,
  ProposedReservationChange,
  RoomType,
  ReservationStatus,
  BookingSource,
} from './types';
import {
  BUSINESS_DATE,
  MOCK_ROOMS,
  ROOM_TYPE_CONFIG,
  addDaysToIso,
  countNights,
  formatCalendarDate,
  loadSyncedReservations,
} from './mockData';
import { validateReservationMove } from './validation';
import { ReservationChangeDialog } from './ReservationChangeDialog';
import { ReservationDetailModal } from './ReservationDetailModal';
import { toast } from '../../components/toastStore';
import type { NavTarget } from '../../components/nav';
import { store } from '../../data/store';

const COL_WIDTH = 110; // width of each day column in pixels
const ROW_HEIGHT = 58; // height of each room row in pixels
const ROOM_COL_WIDTH = 240; // width of sticky room allotment column in pixels

export function RoomCalendar({
  go,
  onReservationUpdated,
}: {
  go: (t: NavTarget) => void;
  onReservationUpdated?: () => void;
}) {
  // Calendar base anchor date synced with the canonical PMS BUSINESS_DATE
  const [baseDate, setBaseDate] = useState(BUSINESS_DATE);
  const [viewHorizonDays, setViewHorizonDays] = useState<7 | 14 | 30>(14);

  // Master Data synchronized with central PMS store
  const [rooms] = useState<CalendarRoom[]>(MOCK_ROOMS);
  const [reservations, setReservations] = useState<CalendarReservation[]>(() =>
    loadSyncedReservations()
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<RoomType | 'All'>('All');
  const [filterFloor, setFilterFloor] = useState<number | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | 'All'>('All');
  const [filterSource, setFilterSource] = useState<BookingSource | 'All'>('All');

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
      const matchType = filterType === 'All' || r.type === filterType;
      const matchFloor = filterFloor === 'All' || r.floor === filterFloor;
      const matchSearch =
        !searchQuery.trim() ||
        r.number.includes(searchQuery.trim()) ||
        reservations.some(
          (res) =>
            res.roomId === r.id &&
            (res.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              res.id.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      return matchType && matchFloor && matchSearch;
    });
  }, [rooms, filterType, filterFloor, searchQuery, reservations]);

  // Date Navigation
  const stepDate = (days: number) => {
    setBaseDate((prev) => addDaysToIso(prev, days));
  };

  const jumpToToday = () => {
    setBaseDate(BUSINESS_DATE);
    toast.info('Jumped to Today', { detail: `Calendar anchored on ${BUSINESS_DATE}` });
  };

  const resetDataset = () => {
    setReservations(loadSyncedReservations());
    toast.success('PMS Data Synchronized', {
      detail: 'Rooms and reservations reloaded from central PMS store.',
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

    // 1. Update central PMS store for unified multi-page synchronization
    try {
      store.updateReservation(reservation.id, {
        roomId: proposedRoom.id,
        roomNumber: proposedRoom.number,
        checkInDate: proposedCheckIn,
        checkOutDate: proposedCheckOut,
        nights: proposedNights,
        totalAmount: String(proposedTotal),
      });
      store.assignRoom(reservation.id, proposedRoom.id);
    } catch {
      // In-memory fallback
    }

    // 2. Update local state
    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservation.id
          ? {
              ...r,
              roomId: proposedRoom.id,
              roomNumber: proposedRoom.number,
              roomType: proposedRoom.type,
              checkInDate: proposedCheckIn,
              checkOutDate: proposedCheckOut,
              nights: proposedNights,
              nightlyRate: proposedRoom.baseRate,
              totalAmount: proposedTotal,
            }
          : r
      )
    );

    setIsSavingChange(false);
    setPendingChange(null);

    // Notify parent to refresh List View
    onReservationUpdated?.();

    toast.success('Reservation Updated & Synced', {
      detail: `${reservation.guestName} reassigned to Room ${proposedRoom.number} (${proposedCheckIn} → ${proposedCheckOut}). ${
        notifyGuest ? 'Simulated guest email & SMS queued.' : ''
      }`,
    });
  };

  // Status update from Detail modal
  const handleStatusUpdate = (resId: string, newStatus: ReservationStatus) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status: newStatus } : r))
    );
    try {
      if (newStatus === 'Checked-in') store.checkIn(resId);
      else if (newStatus === 'Checked-out') store.checkOut(resId);
      else if (newStatus === 'Cancelled') store.cancelReservation(resId, 'Cancelled via calendar');
    } catch {
      // ignore
    }
    onReservationUpdated?.();
  };

  return (
    <div className="w-full flex flex-col gap-4 text-slate-900 font-sans select-none">
      
      {/* ================= 1. ROOM CALENDAR TOOLBAR ================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-4">
        
        {/* Top Row: Date Step & View Horizon & Master Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          
          {/* Left: Date Stepper & Today */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => stepDate(-7)}
                title="Previous Week (-7 days)"
                className="p-1.5 rounded-xl hover:bg-white text-slate-600 transition-colors cursor-pointer"
              >
                <Lucide.ChevronsLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => stepDate(-1)}
                title="Previous Day (-1 day)"
                className="p-1.5 rounded-xl hover:bg-white text-slate-600 transition-colors cursor-pointer"
              >
                <Lucide.ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                <Lucide.Calendar size={14} className="text-[var(--color-primary)]" />
                <span className="text-xs font-black text-slate-800">
                  {formatCalendarDate(baseDate).month} {formatCalendarDate(baseDate).dayNum}, {formatCalendarDate(baseDate).year}
                </span>
                <input
                  type="date"
                  value={baseDate}
                  onChange={(e) => e.target.value && setBaseDate(e.target.value)}
                  className="opacity-0 absolute w-6 cursor-pointer"
                  title="Pick Base Date"
                />
              </div>

              <button
                type="button"
                onClick={() => stepDate(1)}
                title="Next Day (+1 day)"
                className="p-1.5 rounded-xl hover:bg-white text-slate-600 transition-colors cursor-pointer"
              >
                <Lucide.ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => stepDate(7)}
                title="Next Week (+7 days)"
                className="p-1.5 rounded-xl hover:bg-white text-slate-600 transition-colors cursor-pointer"
              >
                <Lucide.ChevronsRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={jumpToToday}
              className="px-3.5 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
            >
              Today
            </button>

            {/* Horizon Switcher (7 / 14 / 30 Days) */}
            <div className="flex items-center p-1 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold shadow-2xs">
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setViewHorizonDays(days)}
                  className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                    viewHorizonDays === days
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          {/* Right: Master Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetDataset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Reset mock rooms & bookings dataset"
            >
              <Lucide.RotateCcw size={13} className="text-slate-400" />
              <span>Reload Mock Data</span>
            </button>

            <button
              type="button"
              onClick={() => go({ view: 'new-reservation-3' })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[var(--color-primary)] hover:opacity-95 text-white text-xs font-bold shadow-sm shadow-[var(--color-primary)]/20 transition-all cursor-pointer"
            >
              <Lucide.Plus size={15} strokeWidth={2.5} />
              <span>New Booking</span>
            </button>
          </div>

        </div>

        {/* Bottom Row: Search Box & Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1 border-t border-slate-100">
          
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Lucide.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest, ID, room..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-[var(--color-primary)] transition-all font-medium"
            />
          </div>

          {/* Room Type */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as RoomType | 'All')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="All">All Room Types</option>
              <option value="Standard">Standard</option>
              <option value="Deluxe">Deluxe</option>
              <option value="Superior">Superior</option>
              <option value="Executive">Executive</option>
              <option value="Family Suite">Family Suite</option>
              <option value="Panorama Suite">Panorama Suite</option>
            </select>
          </div>

          {/* Floor */}
          <div>
            <select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="All">All Floors (15 Rooms)</option>
              <option value="1">Floor 1 (Rooms 101–105)</option>
              <option value="2">Floor 2 (Rooms 201–205)</option>
              <option value="3">Floor 3 (Rooms 301–305)</option>
            </select>
          </div>

          {/* Reservation Status */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ReservationStatus | 'All')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked-in">Checked-in</option>
              <option value="Tentative">Tentative</option>
              <option value="Checked-out">Checked-out</option>
            </select>
          </div>

          {/* Booking Source */}
          <div>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as BookingSource | 'All')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="All">All Sources</option>
              <option value="Direct">Direct Desk</option>
              <option value="Booking.com">Booking.com</option>
              <option value="Agoda">Agoda</option>
              <option value="Expedia">Expedia</option>
              <option value="Corporate">Corporate</option>
              <option value="Walk-in">Walk-in</option>
            </select>
          </div>

        </div>

      </div>

      {/* ================= 2. LIVE METRICS & STATUS LEGEND ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        
        {/* KPI Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-slate-400 font-medium">Rooms:</span>
            <span className="font-extrabold text-slate-900">{stats.totalRoomsCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-2xs font-semibold">
            <span>Available Today:</span>
            <span className="font-extrabold font-mono">{stats.availableToday}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 shadow-2xs font-semibold">
            <span>Occupied Today:</span>
            <span className="font-extrabold font-mono">{stats.occupiedToday} ({stats.occupancyRate}%)</span>
          </div>

          {stats.oooCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 shadow-2xs font-semibold">
              <span>Out-of-Order:</span>
              <span className="font-extrabold font-mono">{stats.oooCount} (Rm 205)</span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-emerald-500 shadow-2xs" />
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-indigo-600 shadow-2xs" />
            <span>Checked-in</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-amber-500 shadow-2xs" />
            <span>Tentative</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-slate-500 shadow-2xs" />
            <span>Checked-out</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-rose-400 line-through text-slate-400" />
            <span>Cancelled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-slate-200 border border-slate-300" />
            <span>Out-of-Order</span>
          </div>
        </div>

      </div>

      {/* ================= 3. MASTER INTERACTIVE ROOM RACK GRID ================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.06)] overflow-hidden">
        
        {/* Instruction Banner */}
        <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Lucide.Hand size={14} className="text-[var(--color-primary)]" />
            <span>
              <strong>Tip:</strong> Drag a reservation bar to move room/dates. Drag left/right bar handles to extend or shorten stay. Click to view full folio.
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            {filteredRooms.length} Rooms Visible
          </span>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-x-auto relative" ref={gridContainerRef}>
          <div
            className="flex flex-col min-w-max relative"
            style={{ width: `${ROOM_COL_WIDTH + calendarDates.length * COL_WIDTH}px` }}
          >
            {/* Header Row: Room Label Column + Date Columns */}
            <div className="flex border-b border-slate-200 bg-slate-100/90 sticky top-0 z-20">
              {/* Sticky Top-Left Corner */}
              <div
                style={{ width: `${ROOM_COL_WIDTH}px` }}
                className="shrink-0 p-3 border-r border-slate-200 bg-slate-100 sticky left-0 z-30 font-extrabold text-xs text-slate-700 flex items-center justify-between shadow-[2px_0_5px_rgba(0,0,0,0.03)]"
              >
                <span>ROOM ALLOTMENT</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">TYPE / FLR</span>
              </div>

              {/* Date Columns Header */}
              <div className="flex" style={{ width: `${calendarDates.length * COL_WIDTH}px` }}>
                {calendarDates.map((dateStr) => {
                  const isToday = dateStr === baseDate;
                  const dateInfo = formatCalendarDate(dateStr);
                  return (
                    <div
                      key={dateStr}
                      style={{ width: `${COL_WIDTH}px` }}
                      className={`p-2 border-r border-slate-200/70 text-center flex flex-col items-center justify-center transition-colors shrink-0 ${
                        isToday
                          ? 'bg-indigo-50/80 border-b-2 border-b-[var(--color-primary)] font-black'
                          : dateInfo.isWeekend
                          ? 'bg-slate-50/60'
                          : 'bg-white'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isToday ? 'text-[var(--color-primary)] font-black' : 'text-slate-400'
                        }`}
                      >
                        {dateInfo.weekday}
                      </span>
                      <span
                        className={`text-sm leading-none mt-0.5 ${
                          isToday
                            ? 'h-6 w-6 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-black shadow-xs'
                            : 'font-extrabold text-slate-800'
                        }`}
                      >
                        {dateInfo.dayNum}
                      </span>
                      <span className="text-[9px] font-medium text-slate-400 mt-0.5">
                        {dateInfo.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Room Rows (15 Rooms total across 3 floors) */}
            {filteredRooms.map((room) => {
              const isOOO = room.status === 'Out-of-Order';
              const isTargetRow = dragState?.isDragging && dragState?.proposedRoomId === room.id;
              const typeCfg = ROOM_TYPE_CONFIG[room.type] || ROOM_TYPE_CONFIG.Standard;

              // Find reservations assigned to this room
              const roomReservations = reservations.filter(
                (res) =>
                  (res.roomId === room.id || res.roomNumber === room.number) &&
                  (filterStatus === 'All' || res.status === filterStatus) &&
                  (filterSource === 'All' || res.bookingSource === filterSource)
              );

              return (
                <div
                  key={room.id}
                  className={`flex border-b border-slate-200/80 relative transition-colors ${
                    isTargetRow
                      ? dragState?.isValid
                        ? 'bg-indigo-50/40 ring-1 ring-inset ring-[var(--color-primary)]/40'
                        : 'bg-rose-50/40 ring-1 ring-inset ring-rose-300'
                      : isOOO
                      ? 'bg-slate-50/40'
                      : 'hover:bg-slate-50/30'
                  }`}
                  style={{ height: `${ROW_HEIGHT}px` }}
                >
                  {/* Sticky Left Room Card (Z-20, solid background, never overlapped) */}
                  <div
                    style={{ width: `${ROOM_COL_WIDTH}px` }}
                    className={`shrink-0 p-2.5 px-3 border-r border-slate-200 sticky left-0 z-20 flex items-center justify-between shadow-[2px_0_5px_rgba(0,0,0,0.04)] select-none ${
                      isTargetRow
                        ? 'bg-indigo-50'
                        : isOOO
                        ? 'bg-slate-100'
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-slate-900 tracking-tight">
                            Rm {room.number}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${typeCfg.badgeBg}`}
                          >
                            {room.type}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Flr {room.floor} · ₹{room.baseRate.toLocaleString('en-IN')}/nt · Max {room.maxOccupancy}
                        </span>
                      </div>
                    </div>

                    {/* Operational Status Pill */}
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                        room.status === 'Available' || room.status === 'Clean'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : room.status === 'Inspected'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : room.status === 'Dirty'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : room.status === 'Occupied'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                      title={room.outOfOrderReason || room.status}
                    >
                      {room.status === 'Out-of-Order' ? 'OOO' : room.status}
                    </span>
                  </div>

                  {/* Timeline Canvas (Starts strictly after sticky room column) */}
                  <div
                    className="relative flex items-center h-full"
                    style={{ width: `${calendarDates.length * COL_WIDTH}px` }}
                  >
                    {/* Day background cells */}
                    {calendarDates.map((dateStr) => {
                      const isToday = dateStr === baseDate;
                      return (
                        <div
                          key={dateStr}
                          style={{ width: `${COL_WIDTH}px` }}
                          className={`h-full border-r border-slate-100 flex items-center justify-center relative shrink-0 ${
                            isOOO
                              ? 'bg-[repeating-linear-gradient(45deg,#f8fafc,#f8fafc_8px,#f1f5f9_8px,#f1f5f9_16px)]'
                              : isToday
                              ? 'bg-indigo-50/20'
                              : ''
                          }`}
                        />
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

                      let barGradient = 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/20';
                      if (res.status === 'Checked-in') {
                        barGradient = 'from-indigo-600 to-blue-600 text-white shadow-indigo-500/20';
                      } else if (res.status === 'Tentative' || res.status === 'Pending') {
                        barGradient = 'from-amber-500 to-orange-500 text-white shadow-amber-500/20';
                      } else if (res.status === 'Checked-out') {
                        barGradient = 'from-slate-600 to-slate-700 text-slate-100';
                      } else if (res.status === 'Cancelled' || res.status === 'No-show') {
                        barGradient = 'from-rose-500/80 to-rose-600/80 text-white line-through opacity-60';
                      }

                      return (
                        <div
                          key={res.id}
                          onPointerDown={(e) => handlePointerDown(e, res, 'move')}
                          style={{
                            left: `${barLeft}px`,
                            width: `${barWidth}px`,
                            top: '8px',
                            bottom: '8px',
                          }}
                          className={`absolute ${
                            startedBefore ? 'rounded-l-none' : 'rounded-l-xl'
                          } ${
                            endsAfter ? 'rounded-r-none' : 'rounded-r-xl'
                          } px-2 py-0.5 flex items-center justify-between text-xs font-semibold shadow-xs transition-all cursor-grab active:cursor-grabbing select-none z-10 group overflow-hidden bg-gradient-to-r ${barGradient} ${
                            isBeingDragged ? 'opacity-30' : 'hover:brightness-105 hover:shadow-md'
                          }`}
                          title={`${res.guestName} (${res.id}) · ${res.checkInDate} to ${res.checkOutDate} (${res.nights}n) · ₹${res.totalAmount.toLocaleString('en-IN')}`}
                        >
                          {/* Left Resize Handle (only if check-in is within visible range) */}
                          {!startedBefore && res.status !== 'Cancelled' && (
                            <div
                              onPointerDown={(e) => handlePointerDown(e, res, 'resize-start')}
                              className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/15 hover:bg-black/35 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Drag to adjust arrival date"
                            >
                              <span className="h-3 w-[1px] bg-white/80" />
                            </div>
                          )}

                          {/* Bar Content */}
                          <div className="flex items-center gap-1 min-w-0 pr-1 pl-1 truncate">
                            {startedBefore && (
                              <span className="text-[10px] opacity-75 font-mono">‹</span>
                            )}
                            <span className="font-extrabold text-xs truncate leading-tight">
                              {res.guestName}
                            </span>
                            <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-white/20 text-white shrink-0">
                              {res.nights}n
                            </span>
                            <span className="text-[10px] opacity-80 hidden md:inline truncate">
                              ₹{res.totalAmount.toLocaleString('en-IN')}
                            </span>
                            {endsAfter && (
                              <span className="text-[10px] opacity-75 font-mono">›</span>
                            )}
                          </div>

                          {/* Status Icon */}
                          <div className="shrink-0 flex items-center pl-1">
                            {res.status === 'Checked-in' && <Lucide.Key size={11} className="opacity-90" />}
                            {res.status === 'Confirmed' && <Lucide.Check size={11} className="opacity-90" />}
                            {(res.status === 'Tentative' || res.status === 'Pending') && <Lucide.Clock size={11} className="opacity-90" />}
                          </div>

                          {/* Right Resize Handle (only if check-out is within visible range) */}
                          {!endsAfter && res.status !== 'Cancelled' && (
                            <div
                              onPointerDown={(e) => handlePointerDown(e, res, 'resize-end')}
                              className="absolute right-0 top-0 bottom-0 w-2.5 bg-black/15 hover:bg-black/35 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Drag to adjust departure date"
                            >
                              <span className="h-3 w-[1px] bg-white/80" />
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
                          className={`absolute rounded-xl px-2.5 py-0.5 flex items-center justify-between text-xs font-bold shadow-xl pointer-events-none z-30 transition-all border-2 border-dashed ${
                            dragState.isValid
                              ? 'bg-[var(--color-primary)]/90 border-white text-white ring-2 ring-[var(--color-primary)]'
                              : 'bg-rose-600/90 border-white text-white ring-2 ring-rose-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span>
                              {dragState.isValid ? 'Move:' : 'Conflict:'} {dragState.proposedCheckIn} → {dragState.proposedCheckOut} ({totalNights}n)
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 text-[10px]">
                            {dragState.isValid ? (
                              <span className="bg-white/25 px-1.5 py-0.5 rounded">Drop to Confirm</span>
                            ) : (
                              <span className="bg-black/30 px-1.5 py-0.5 rounded text-amber-200">
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

      </div>

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
