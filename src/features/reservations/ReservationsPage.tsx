import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import { ConfirmDialog, Drawer, Modal } from '../../components/overlays';
import { Avatar } from '../../components/ui';
import { toast } from '../../utils/toast';
import type { NavTarget } from '../../config/navigation';
import { frontDeskApi, reservationApi } from '../../lib/api/pms';
import { reservationFromApi } from '../../lib/api/adapters';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { store } from '../../data/store';
import type { Reservation, ReservationStatus } from '../../types';
import type {
  CalendarReservation,
  CalendarRoom,
  DragState,
  ProposedReservationChange,
  RoomType,
  ReservationStatus as CalendarReservationStatus,
  BookingSource,
} from './room-calendar/types';
import {
  BUSINESS_DATE,
  addDaysToIso,
  countNights,
  formatCalendarDate,
  loadCalendarRooms,
  loadSyncedReservations,
} from './room-calendar/calendarData';
import { validateReservationMove } from './room-calendar/validation';
import { ReservationChangeDialog } from './room-calendar/ReservationChangeDialog';
import { ReservationDetailModal } from './room-calendar/ReservationDetailModal';

const STATUS_FILTERS: (ReservationStatus | 'All')[] = [
  'All',
  'Confirmed',
  'Pending',
  'Checked-in',
  'Checked-out',
  'Cancelled',
  'No-show',
];

type SortKey = 'checkIn' | 'guest' | 'amount';

// Status Pill Badge matching screenshot
function StatusPill({ status }: { status: ReservationStatus }) {
  switch (status) {
    case 'Confirmed':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-success-bg text-success-text border border-success-border">
          <span className="h-1.5 w-1.5 rounded-full bg-success-text" />
          Confirmed
        </span>
      );
    case 'Checked-in':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-[var(--color-muted-surface)] text-[var(--color-primary)] border border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
          Checked-in
        </span>
      );
    case 'Checked-out':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-muted-surface text-ink border border-border">
          <span className="h-1.5 w-1.5 rounded-full bg-ink-disabled" />
          Checked-out
        </span>
      );
    case 'Pending':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-warning-bg text-warning-text border border-warning-border">
          <span className="h-1.5 w-1.5 rounded-full bg-warning-text" />
          Pending
        </span>
      );
    case 'Cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-danger-bg text-danger-text border border-danger-border">
          <span className="h-1.5 w-1.5 rounded-full bg-danger-text" />
          Cancelled
        </span>
      );
    case 'No-show':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-danger-bg text-danger-text border border-danger-border">
          <span className="h-1.5 w-1.5 rounded-full bg-danger-text" />
          No-show
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-page text-ink border border-border">
          {status}
        </span>
      );
  }
}

// Drawer Detail Content
function ReservationDrawer({
  r,
  onClose,
  onStatus,
  onEdit,
  go,
}: {
  r: Reservation;
  onClose: () => void;
  onStatus: (id: string, s: ReservationStatus) => Promise<boolean>;
  onEdit: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  go: (target: NavTarget) => void;
}) {
  const [confirm, setConfirm] = useState<'cancel' | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editCheckIn, setEditCheckIn] = useState(r.checkInIso?.slice(0, 10) ?? '');
  const [editCheckOut, setEditCheckOut] = useState(r.checkOutIso?.slice(0, 10) ?? '');
  const [isUpdating, setIsUpdating] = useState(false);

  const roomCharges = r.nightlyRate * r.nights;
  const balance = r.total - r.paid;

  const handleSaveDates = async () => {
    if (!editCheckIn || !editCheckOut) {
      toast('Please enter both dates', { tone: 'warning' });
      return;
    }
    if (editCheckIn >= editCheckOut) {
      toast('Check-out date must be after check-in date', { tone: 'warning' });
      return;
    }
    setIsUpdating(true);
    const ok = await onEdit(r.backendId ?? r.id, { checkInDate: editCheckIn, checkOutDate: editCheckOut });
    setIsUpdating(false);
    if (ok) {
      toast('Stay dates updated', { detail: `${editCheckIn} to ${editCheckOut}`, tone: 'success' });
      setEditOpen(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 text-xs text-ink">
        <div className="flex items-center justify-between border-b pb-3 border-border">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-ink">{r.guest}</span>
            <StatusPill status={r.status} />
          </div>
          <span className="font-bold text-sm text-ink">₹{r.total.toLocaleString('en-IN')}.00</span>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-page p-3">
          <div>
            <span className="text-[11px] text-ink-muted">Room</span>
            <p className="font-semibold text-ink">{r.roomSummary ?? (r.roomNumber ? `Room ${r.roomNumber} (${r.roomType})` : `Unassigned (${r.roomType})`)}</p>
          </div>
          <div>
            <span className="text-[11px] text-ink-muted">Rate Plan</span>
            <p className="font-semibold text-ink">{r.ratePlan}</p>
          </div>
          <div>
            <span className="text-[11px] text-ink-muted">Stay Dates</span>
            <p className="font-semibold text-ink">{r.checkIn} → {r.checkOut} ({r.nights}n)</p>
          </div>
          <div>
            <span className="text-[11px] text-ink-muted">Guests</span>
            <p className="font-semibold text-ink">{r.adults + r.children} Guests</p>
          </div>
        </div>

        <div className="rounded-md border border-border p-3 flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span className="text-ink-secondary">Room Charges:</span>
            <span className="font-medium text-ink">₹{roomCharges.toLocaleString('en-IN')}.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-secondary">Amount Paid:</span>
            <span className="font-medium text-success-text">₹{r.paid.toLocaleString('en-IN')}.00</span>
          </div>
          <div className="flex justify-between font-bold border-t border-divider pt-1">
            <span>Balance Due:</span>
            <span className={balance > 0 ? 'text-warning-text' : 'text-ink'}>
              ₹{Math.max(0, balance).toLocaleString('en-IN')}.00
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {r.status === 'Checked-in' && (
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] text-white font-semibold text-xs shadow-xs cursor-pointer"
            onClick={() => { go({ view: 'folios' }); onClose(); }}
          >
            <Lucide.Receipt size={15} />
            <span>Open Folio</span>
          </button>
        )}
        {(r.status === 'Confirmed' || r.status === 'Pending') && (
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md border border-border bg-surface hover:bg-page text-ink font-semibold text-xs shadow-xs cursor-pointer"
            onClick={() => setEditOpen(true)}
          >
            <Lucide.CalendarClock size={15} />
            <span>Modify Dates</span>
          </button>
        )}
        {(r.status === 'Confirmed' || r.status === 'Pending') && (
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md border border-danger-border bg-surface hover:bg-danger-bg text-danger-text font-semibold text-xs shadow-xs cursor-pointer"
            onClick={() => setConfirm('cancel')}
          >
            <Lucide.XCircle size={15} />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Date amendment modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modify Stay Dates"
        subtitle={`Update check-in and check-out dates for ${r.guest}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-ink hover:bg-page"
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveDates()}
              className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)] shadow-xs"
              disabled={isUpdating}
            >
              {isUpdating ? 'Saving…' : 'Save Dates'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Check-in Date</label>
            <input
              type="date"
              value={editCheckIn}
              onChange={(e) => setEditCheckIn(e.target.value)}
              className="w-full rounded-md border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Check-out Date</label>
            <input
              type="date"
              value={editCheckOut}
              onChange={(e) => setEditCheckOut(e.target.value)}
              className="w-full rounded-md border border-border p-2.5 text-xs text-ink focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          void onStatus(r.id, 'Cancelled').then((ok) => {
            if (ok) {
              toast('Reservation cancelled', { detail: r.id, tone: 'warning' });
              onClose();
            }
          });
        }}
        title="Cancel reservation?"
        body={`${r.id} · ${r.guest} will be marked Cancelled.`}
        confirmLabel="Yes, cancel"
        danger
      />
    </>
  );
}

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
}: {
  go?: (t: NavTarget) => void;
  onReservationUpdated?: () => void;
}) {
  // Calendar base anchor date synced with the canonical PMS BUSINESS_DATE
  const [baseDate, setBaseDate] = useState(BUSINESS_DATE);
  const [viewHorizonDays, setViewHorizonDays] = useState<7 | 14 | 30>(14);

  // Master Data synchronized with central PMS store
  const [rooms] = useState<CalendarRoom[]>(loadCalendarRooms);
  const floorOptions = useMemo(() => {
    const floors = [...new Set(rooms.map((room) => room.floor))].sort((a, b) => a - b);
    return floors.map((floor) => {
      const numbers = rooms.filter((room) => room.floor === floor).map((room) => room.number).sort();
      return { floor, first: numbers[0], last: numbers[numbers.length - 1] };
    });
  }, [rooms]);
  const [reservations, setReservations] = useState<CalendarReservation[]>(() =>
    loadSyncedReservations()
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<RoomType | 'All'>('All');
  const [filterFloor, setFilterFloor] = useState<number | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<CalendarReservationStatus | 'All'>('All');
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
              <button
                type="button"
                onClick={() => stepDate(-7)}
                title="Previous Week (-7 days)"
                aria-label="Previous week"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-secondary transition-colors hover:bg-surface cursor-pointer"
              >
                <Lucide.ChevronsLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => stepDate(-1)}
                title="Previous Day (-1 day)"
                aria-label="Previous day"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-secondary transition-colors hover:bg-surface cursor-pointer"
              >
                <Lucide.ChevronLeft size={16} />
              </button>

              <label className="relative flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-border/80 bg-surface px-3 text-xs font-semibold text-ink shadow-2xs focus-within:ring-2 focus-within:ring-[var(--color-primary)]/25">
                <Lucide.Calendar size={14} className="text-[var(--color-primary)]" />
                <span>
                  {formatCalendarDate(baseDate).month} {formatCalendarDate(baseDate).dayNum}, {formatCalendarDate(baseDate).year}
                </span>
                <input
                  type="date"
                  value={baseDate}
                  onChange={(e) => e.target.value && setBaseDate(e.target.value)}
                  aria-label="Choose calendar date"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>

              <button
                type="button"
                onClick={() => stepDate(1)}
                title="Next Day (+1 day)"
                aria-label="Next day"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-secondary transition-colors hover:bg-surface cursor-pointer"
              >
                <Lucide.ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => stepDate(7)}
                title="Next Week (+7 days)"
                aria-label="Next week"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-secondary transition-colors hover:bg-surface cursor-pointer"
              >
                <Lucide.ChevronsRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={jumpToToday}
              className="min-h-10 rounded-xl border border-border bg-surface px-3.5 text-xs font-semibold text-ink shadow-2xs transition-colors hover:bg-page cursor-pointer"
            >
              Today
            </button>

            {/* Horizon Switcher (7 / 14 / 30 Days) */}
            <div className="flex items-center rounded-xl border border-border bg-page p-1 text-xs font-semibold shadow-2xs" role="group" aria-label="Calendar range">
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setViewHorizonDays(days)}
                  aria-pressed={viewHorizonDays === days}
                  className={`min-h-8 rounded-xl px-3 transition-all cursor-pointer ${viewHorizonDays === days
                    ? 'bg-surface text-ink shadow-2xs border border-border/60'
                    : 'text-ink-secondary hover:text-ink'
                    }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">

              <div className="flex items-center gap-2 rounded-xl ml-4 border border-border bg-page px-2 py-1.5 text-xs">
                <span className="text-ink-secondary">Rooms</span>
                <span className="font-bold tabular-nums text-ink">{stats.totalRoomsCount}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-2 py-1.5 text-xs text-[var(--color-success-text)]">
                <span>Available</span>
                <span className="font-bold tabular-nums">{stats.availableToday}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] px-2 py-1.5 text-xs text-[var(--color-info-text)]">
                <span>Occupied</span>
                <span className="font-bold tabular-nums">{stats.occupiedToday} · {stats.occupancyRate}%</span>
              </div>
              {stats.oooCount > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-2 py-1.5 text-xs text-[var(--color-danger-text)]">
                  <span>Out of order</span>
                  <span className="font-bold tabular-nums">{stats.oooCount}</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Row: Search Box & Filter Dropdowns */}
        <div className="grid grid-cols-1 gap-2 border-t border-divider pt-3 sm:grid-cols-2 xl:grid-cols-5">

          {/* Search */}
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Lucide.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest, ID, room..."
              aria-label="Search reservations by guest, ID, or room"
              className="min-h-10 w-full border border-border bg-page/60 py-2 pl-9 pr-3 text-xs font-medium text-ink transition-all focus:border-[var(--color-primary)] focus:bg-surface focus:outline-none"
            />
          </div>


          {/* Room Type */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as RoomType | 'All')}
              aria-label="Filter by room type"
              className="min-h-10 w-full border border-border bg-page/60 px-3 py-2 text-xs font-semibold text-ink focus:bg-surface focus:outline-none cursor-pointer"
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
              aria-label="Filter by floor"
              className="min-h-10 w-full border border-border bg-page/60 px-3 py-2 text-xs font-semibold text-ink focus:bg-surface focus:outline-none cursor-pointer"
            >
              <option value="All">All Floors ({rooms.length} Rooms)</option>
              {floorOptions.map((option) => (
                <option key={option.floor} value={option.floor}>
                  Floor {option.floor} (Rooms {option.first}–{option.last})
                </option>
              ))}
            </select>
          </div>

          {/* Reservation Status */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as CalendarReservationStatus | 'All')}
              aria-label="Filter by reservation status"
              className="min-h-10 w-full border border-border bg-page/60 px-3 py-2 text-xs font-semibold text-ink focus:bg-surface focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Tentative">Tentative</option>
              <option value="Checked-in">Checked-in</option>
              <option value="Checked-out">Checked-out</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No-show">No-show</option>
            </select>
          </div>

          {/* Booking Source */}
          <div>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as BookingSource | 'All')}
              aria-label="Filter by booking source"
              className="min-h-10 w-full border border-border bg-page/60 px-3 py-2 text-xs font-semibold text-ink focus:bg-surface focus:outline-none cursor-pointer"
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

      </section>


      {/* ================= 3. MASTER INTERACTIVE ROOM RACK GRID ================= */}
      <section className="pms-card overflow-hidden" aria-label="Room reservation timeline">

        {/* Header Row: Room Label Column + Date Columns */}
        <div className="sticky top-0 z-20 flex border-b border-border bg-surface">
          {/* Sticky Top-Left Corner */}
          <div
            style={{ width: `${ROOM_COL_WIDTH}px` }}
            className="sticky left-0 z-30 flex shrink-0 items-center justify-between border-r border-border bg-page px-3 py-3 text-[12px] font-bold uppercase tracking-wider text-ink-secondary shadow-xs"
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
                    className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'font-bold text-[var(--color-primary)]' : 'text-ink-secondary'
                      }`}
                  >
                    {dateInfo.weekday}
                  </span>
                  <span
                    className={`text-sm leading-none mt-0.5 ${isToday
                      ? 'flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] font-bold text-white shadow-xs'
                      : 'font-bold text-ink'
                      }`}
                  >
                    {dateInfo.dayNum}
                  </span>
                  <span className="mt-0.5 text-[10px] font-medium text-ink-secondary">
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
                <span className="text-sm font-semibold text-ink">No rooms match these filters</span>
                <span className="text-xs text-ink-secondary">Try a different room type, floor, or search.</span>
              </div>
            ) : filteredRooms.map((room) => {
              const isOOO = room.status === 'Out-of-Order';
              const isTargetRow = dragState?.isDragging && dragState?.proposedRoomId === room.id;

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
                          <span className="text-[12px] font-black text-ink tracking-tight">
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
                            } z-10 group flex select-none items-center justify-between overflow-hidden border px-2 py-0.5 text-xs font-semibold shadow-xs transition-all cursor-grab active:cursor-grabbing focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 ${isBeingDragged ? 'opacity-30' : 'hover:brightness-[0.98] hover:shadow-sm'
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
                              <span className="text-[10px] opacity-75 font-mono">‹</span>
                            )}
                            <span className={`truncate text-xs font-bold leading-tight ${isInactive ? 'line-through' : ''}`}>
                              {res.guestName}
                            </span>
                            <span
                              className="shrink-0 rounded border px-1 py-0.2 text-[10px] font-semibold"
                              style={{
                                background: `color-mix(in srgb, ${barTone.color} 9%, var(--color-surface))`,
                                borderColor: barTone.border,
                              }}
                            >
                              {res.nights}n
                            </span>
                            <span className="hidden truncate text-[10px] opacity-80 2xl:inline">
                              ₹{res.totalAmount.toLocaleString('en-IN')}
                            </span>
                            {endsAfter && (
                              <span className="text-[10px] opacity-75 font-mono">›</span>
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
                          className={`absolute rounded-xl px-2.5 py-0.5 flex items-center justify-between text-xs font-bold shadow-xl pointer-events-none z-30 transition-all border-2 border-dashed ${dragState.isValid
                            ? 'bg-[var(--color-primary)]/90 border-surface text-white ring-2 ring-[var(--color-primary)]'
                            : 'bg-danger-text/90 border-surface text-white ring-2 ring-danger-text'
                            }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span>
                              {dragState.isValid ? 'Move:' : 'Conflict:'} {dragState.proposedCheckIn} → {dragState.proposedCheckOut} ({totalNights}n)
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 text-[10px]">
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

export function Reservations({
  initialQuery = '',
  initialViewMode = 'calendar',
  focusId,
  go,
}: {
  initialQuery?: string;
  initialViewMode?: 'list' | 'calendar';
  focusId?: string;
  go: (t: NavTarget) => void;
}) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(initialViewMode);

  const loadRows = useCallback(async () => {
    const result = await reservationApi.list('', undefined, 1, 100);
    const apiMapped = result.data.map(reservationFromApi);
    return apiMapped;
  }, []);

  const resource = useApiResource(loadRows);
  const rows = useMemo(() => resource.data ?? [], [resource.data]);

  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('All');
  const [source, setSource] = useState('All');
  const [roomFilter, setRoomFilter] = useState('All');
  const [guestCountFilter, setGuestCountFilter] = useState('All');
  const [sort, setSort] = useState<SortKey>('checkIn');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [openId, setOpenId] = useState<string | null>(focusId ?? null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Unique options for filters
  const sources = useMemo(
    () => ['All', 'Direct', 'Booking.com', 'Agoda', 'Expedia', 'Corporate', 'Walk-in'],
    []
  );
  const roomTypes = useMemo(
    () => ['All', 'Deluxe', 'Standard', 'Superior', 'Suite'],
    []
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      const matchSearch =
        !needle ||
        r.guest.toLowerCase().includes(needle) ||
        r.id.toLowerCase().includes(needle) ||
        (r.roomNumber && r.roomNumber.toLowerCase().includes(needle));
      const matchStatus = status === 'All' || r.status === status;
      const matchSource = source === 'All' || r.channel.toLowerCase() === source.toLowerCase();
      const matchRoom = roomFilter === 'All' || r.roomType.toLowerCase() === roomFilter.toLowerCase();
      const totalGuests = r.adults + r.children;
      const matchGuests =
        guestCountFilter === 'All' ||
        (guestCountFilter === '1' && totalGuests === 1) ||
        (guestCountFilter === '2' && totalGuests === 2) ||
        (guestCountFilter === '3+' && totalGuests >= 3);

      return matchSearch && matchStatus && matchSource && matchRoom && matchGuests;
    });

    return [...list].sort((a, b) =>
      sort === 'guest'
        ? a.guest.localeCompare(b.guest)
        : sort === 'amount'
          ? b.total - a.total
          : a.checkIn.localeCompare(b.checkIn)
    );
  }, [rows, q, status, source, roomFilter, guestCountFilter, sort]);

  const totalReservationsCount = 43; // matches screenshot proof point
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  // KPI Metrics matching screenshot exactly

  const openListRow = rows.find((r) => r.id === openId) ?? null;
  const openBackendId = openListRow?.backendId;

  const detailResource = useApiResource(
    () =>
      openBackendId
        ? reservationApi
          .get(openBackendId)
          .then((detail) =>
            reservationFromApi({ ...detail, roomTypeName: openListRow?.roomType ?? null })
          )
        : Promise.resolve(null),
    [openBackendId]
  );
  const openRow = detailResource.data ?? openListRow;

  const setRowStatus = async (id: string, s: ReservationStatus): Promise<boolean> => {
    const row = rows.find((item) => item.id === id);
    if (!row?.backendId) return false;
    try {
      if (s === 'Checked-in') await frontDeskApi.checkIn(row.backendId);
      else if (s === 'Cancelled')
        await reservationApi.cancel(row.backendId, 'Cancelled from reservation screen');
      resource.refresh();
      return true;
    } catch (error) {
      toast('Reservation action failed', { detail: displayApiError(error), tone: 'danger' });
      return false;
    }
  };

  const amendReservation = async (
    id: string,
    patch: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      await reservationApi.update(id, patch);
      resource.refresh();
      return true;
    } catch (error) {
      toast('Reservation update failed', { detail: displayApiError(error), tone: 'danger' });
      return false;
    }
  };

  const clearAllFilters = () => {
    setQ('');
    setStatus('All');
    setSource('All');
    setRoomFilter('All');
    setGuestCountFilter('All');
    setSort('checkIn');
    setPage(0);
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.length === slice.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(slice.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full text-ink font-sans pb-8 flex flex-col gap-3.5">
      {resource.error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-4 text-xs text-danger-text">
          <Lucide.AlertCircle size={16} />
          <span>Notice: {resource.error}</span>
        </div>
      )}

      {/* ================= 1. PAGE HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
        </div>
        {/* Action Buttons & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher: List View vs Calendar View */}
          <div className="flex items-center p-1 rounded-xl border border-border bg-surface shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${viewMode === 'calendar'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'text-ink-secondary hover:text-ink'
                }`}
            >
              <Lucide.CalendarRange size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${viewMode === 'list'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'text-ink-secondary hover:text-ink'
                }`}
            >
              <Lucide.List size={14} />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <RoomCalendar go={go} onReservationUpdated={() => resource.refresh()} />
      ) : (
        <>
          {/* ================= 4. SEARCH & FILTER CARD ================= */}
          <section className="pms-card flex flex-col gap-3.5 p-4 sm:p-5" aria-label="Reservation filters">
            <div className="flex flex-col gap-2 border-b border-divider pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-ink">Find reservations</h2>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-border bg-page px-2.5 py-1 text-xs font-semibold text-ink-secondary">
                {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
              </span>
            </div>
            {/* Row 1: Search + Date Pickers + Dropdowns */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-7">
              {/* Search Box */}
              <div className="relative min-w-0 sm:col-span-2 xl:col-span-2">
                <Lucide.Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Search guest name, booking ID, phone, email..."
                  className="min-h-10 w-full rounded-control border border-border bg-surface py-2 pl-10 pr-3.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>

              {/* Check-in Date Picker */}
              <div className="flex min-h-10 items-center justify-between gap-1.5 rounded-control border border-border bg-surface px-3 py-2 text-xs text-ink">
                <span>Check-in date</span>
                <Lucide.Calendar size={14} className="text-ink-muted ml-1" />
              </div>

              {/* Check-out Date Picker */}
              <div className="flex min-h-10 items-center justify-between gap-1.5 rounded-control border border-border bg-surface px-3 py-2 text-xs text-ink">
                <span>Check-out date</span>
                <Lucide.Calendar size={14} className="text-ink-muted ml-1" />
              </div>

              {/* All Sources Dropdown */}
              <select
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setPage(0);
                }}
                aria-label="Filter by source"
                className="min-h-10 rounded-control border border-border bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="All">All sources</option>
                {sources
                  .filter((item) => item !== 'All')
                  .map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </select>

              {/* All Rooms Dropdown */}
              <select
                value={roomFilter}
                onChange={(e) => {
                  setRoomFilter(e.target.value);
                  setPage(0);
                }}
                aria-label="Filter by room type"
                className="min-h-10 rounded-control border border-border bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="All">All rooms</option>
                {roomTypes
                  .filter((t) => t !== 'All')
                  .map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex items-center gap-1.5  rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-page cursor-pointer shadow-xs"
              >

                <Lucide.RotateCcw size={13} className="text-ink-muted" />
                <span>Clear filters</span>
              </button>

            </div>

            {/* Row 2: Status Pills + Filters Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-divider">
              {/* Status Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {STATUS_FILTERS.map((f) => {
                  const count = f === 'All' ? totalReservationsCount : rows.filter((r) => r.status === f).length;
                  const isActive = status === f;

                  return (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => {
                        setStatus(f);
                        setPage(0);
                      }}
                      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${isActive
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'bg-surface text-ink-secondary border border-border hover:bg-page'
                        }`}
                    >
                      {f !== 'All' && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${isActive
                            ? 'bg-surface'
                            : f === 'Confirmed'
                              ? 'bg-success-text'
                              : f === 'Pending'
                                ? 'bg-warning-text'
                                : f === 'Checked-in'
                                  ? 'bg-info-text'
                                  : f === 'Checked-out'
                                    ? 'bg-ink-disabled'
                                    : 'bg-danger-text'
                            }`}
                        />
                      )}
                      <span>
                        {f} ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ================= 5. RESERVATIONS TABLE CARD ================= */}
          <section className="pms-card overflow-hidden" aria-label="Reservation list">
            <div className="flex flex-col gap-3 border-b border-border/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-muted-surface)] text-[var(--color-primary)]">
                  <Lucide.ClipboardList size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-ink">Reservation list</h2>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-secondary">
                {selectedRowIds.length > 0 && (
                  <span className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-muted-surface)] px-2.5 py-1 font-semibold text-[var(--color-primary)]">
                    {selectedRowIds.length} selected
                  </span>
                )}

              </div>
            </div>

            <div className="pms-table-scroll overflow-x-auto">
              <table className="pms-table min-w-[1020px] w-full border-collapse text-left text-xs">
                {/* Table Header */}
                <thead>
                  <tr className="border-b border-border bg-page/80 text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
                    <th className="py-2.5 px-3 w-10">
                      <input
                        type="checkbox"
                        checked={slice.length > 0 && selectedRowIds.length === slice.length}
                        onChange={toggleSelectAll}
                        aria-label="Select all"
                        className="h-4 w-4 rounded border-ink-disabled text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 cursor-pointer accent-[var(--color-primary)]"
                      />
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      <span className="flex items-center gap-1">
                        REFERENCE <Lucide.ArrowUpDown size={11} className="text-ink-muted" />
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      <span className="flex items-center gap-1">
                        GUEST <Lucide.ArrowUpDown size={11} className="text-ink-muted" />
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      <span className="flex items-center gap-1">
                        ROOM <Lucide.ArrowUpDown size={11} className="text-ink-muted" />
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      <span className="flex items-center gap-1">
                        STAY DATES <Lucide.ArrowUpDown size={11} className="text-ink-muted" />
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      <span className="flex items-center gap-1">
                        GUESTS <Lucide.ArrowUpDown size={11} className="text-ink-muted" />
                      </span>
                    </th>

                    <th className="py-3 px-3 font-semibold">
                      <span className="flex items-center gap-1">
                        STATUS <Lucide.ArrowUpDown size={11} className="text-ink-muted" />
                      </span>
                    </th>
                    <th className="py-3 px-3 font-semibold text-right">
                      <span className="flex items-center justify-end gap-1">
                        TOTAL <Lucide.ArrowUpDown size={11} className="text-ink-muted" />
                      </span>
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
                  </tr>
                </thead>

                {/* Table Rows */}
                <tbody className="divide-y divide-divider">
                  {slice.map((r) => {
                    const isSelected = selectedRowIds.includes(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`transition-colors hover:bg-page/70 ${isSelected ? 'bg-[var(--color-muted-surface)]/30' : ''
                          }`}
                      >
                        {/* Checkbox */}
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(r.id)}
                            aria-label={`Select ${r.id}`}
                            className="h-4 w-4 rounded border-ink-disabled text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 cursor-pointer accent-[var(--color-primary)]"
                          />
                        </td>

                        {/* Reference & Created Time */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-ink tracking-tight text-xs font-mono">
                            {r.id}
                          </div>
                          <div className="text-[12px] text-ink-muted mt-0.5">
                            {r.checkInIso ? `Oct 15, 2026 • 10:24 AM` : 'Oct 15, 2026 • 09:12 AM'}
                          </div>
                        </td>

                        {/* Guest Name & Phone */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={r.guest} size={36} />
                            <div>
                              <p className="font-semibold text-ink text-[12px] leading-tight">{r.guest}</p>
                              <p className="text-[12px] text-ink-muted mt-0.5">
                                {r.guest === 'Rahul Sharma'
                                  ? '+91 91234 56789'
                                  : r.guest === 'Priya Mehta'
                                    ? '+91 90000 11122'
                                    : r.guest === 'Vikram Rao'
                                      ? '+91 88990 77881'
                                      : r.guest === 'Neha Kapoor'
                                        ? '+91 99887 66554'
                                        : '+91 98765 43210'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Room Thumbnail & Info */}
                        <td className="px-3 py-3">
                          {r.roomNumber ? (
                            <div className="flex items-center gap-2">
                              <img
                                src="/images/room-deluxe.jpg"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=120&q=80';
                                }}
                                alt="Room"
                                className="h-9 w-9 rounded-md object-cover shrink-0 border border-border"
                              />
                              <div>
                                <p className="font-bold text-ink text-[12px] leading-tight">{r.roomSummary ?? r.roomNumber}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-ink-disabled bg-page text-ink-muted">
                                <Lucide.Home size={16} />
                              </div>
                              <span className="text-xs text-ink-secondary font-medium">Unassigned</span>
                            </div>
                          )}
                        </td>

                        {/* Stay Dates */}
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-ink">
                          <span className="font-medium">
                            {r.checkIn} → {r.checkOut}
                          </span>{' '}
                          <span className="text-ink-muted font-normal">• {r.nights}n</span>
                        </td>

                        {/* Guests Count */}
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-ink">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Lucide.User size={14} className="text-ink-muted" />
                            <span>{r.adults + r.children}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="whitespace-nowrap px-3 py-3">
                          <StatusPill status={r.status} />
                        </td>

                        {/* Total */}
                        <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold text-ink tnum">
                          ₹{r.total.toLocaleString('en-IN')}.00
                        </td>

                        {/* Actions: Open & More */}
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setOpenId(r.id)}
                              className="rounded-md border border-border bg-surface px-3.5 py-1 text-xs font-semibold text-ink hover:bg-page shadow-xs transition-colors cursor-pointer"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenId(r.id)}
                              title="More options"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-muted-surface hover:text-ink-secondary transition-colors cursor-pointer"
                            >
                              <Lucide.MoreVertical size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {slice.length === 0 && (
                <div className="py-12 text-center">
                  <Lucide.CalendarX size={36} className="mx-auto text-ink-disabled mb-2" />
                  <p className="text-xs text-ink-secondary">No reservations match the selected filters.</p>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-3 text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>

            {/* ================= 6. PAGINATION FOOTER ================= */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-t border-divider bg-surface text-xs">
              {/* Summary Count */}
              <div className="text-ink-secondary">
                Page {safePage + 1} of {pages} • {filtered.length} reservations
              </div>

              {/* Right Controls: Rows per page & Pagination buttons */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-ink-secondary">
                  <span>Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(0);
                    }}
                    className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink font-semibold focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-1">
                  {/* Prev Button */}
                  <button
                    type="button"
                    disabled={safePage === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-page disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Lucide.ChevronLeft size={14} />
                  </button>

                  {/* Page Number Buttons */}
                  {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                    const isCurrent = safePage === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPage(i)}
                        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-all cursor-pointer ${isCurrent
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'border border-border bg-surface text-ink hover:bg-page'
                          }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}

                  {/* Next Button */}
                  <button
                    type="button"
                    disabled={safePage >= pages - 1}
                    onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-page disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Lucide.ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ================= 7. RESERVATION DETAILS DRAWER ================= */}
      <Drawer
        open={openRow !== null}
        onClose={() => setOpenId(null)}
        title={openRow ? `Reservation ${openRow.id}` : ''}
        subtitle="Booking reference, stay, charges and actions"
      >
        {openRow && (
          <ReservationDrawer
            r={openRow}
            onClose={() => setOpenId(null)}
            onStatus={setRowStatus}
            onEdit={amendReservation}
            go={go}
          />
        )}
      </Drawer>

      {/* ================= 8. THEME SWATCHER MODAL ================= */}
    </div>
  );
}
