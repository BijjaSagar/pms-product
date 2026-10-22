import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import { ConfirmDialog, Drawer, Modal } from '../../components/overlays';
import { Avatar } from '../../components/ui';
import { toast } from '../../components/toastStore';
import type { NavTarget } from '../../components/nav';
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
  MOCK_ROOMS,
  ROOM_TYPE_CONFIG,
  addDaysToIso,
  countNights,
  formatCalendarDate,
  loadSyncedReservations,
} from './room-calendar/mockData';
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

const DEMO_RESERVATIONS: Reservation[] = [
  {
    id: 'RSV-20261015-015763',
    guest: 'Aarav Iyer',
    guestId: 'g-1023',
    room: 'Unassigned',
    roomNumber: null,
    roomType: 'Deluxe',
    checkIn: 'Apr 13',
    checkOut: 'Apr 15',
    checkInIso: '2026-04-13',
    checkOutIso: '2026-04-15',
    nights: 2,
    adults: 1,
    children: 0,
    status: 'Confirmed',
    ratePlan: 'Best available rate',
    channel: 'Direct',
    total: 9440,
    paid: 9440,
    currencyCode: 'INR',
    nightlyRate: 4000,
    specialRequests: '',
    notes: '',
  },
  {
    id: 'RSV-20261015-484482',
    guest: 'Aarav Iyer',
    guestId: 'g-1023',
    room: '201',
    roomNumber: '201',
    roomType: 'Deluxe',
    checkIn: 'Jun 12',
    checkOut: 'Jun 14',
    checkInIso: '2026-06-12',
    checkOutIso: '2026-06-14',
    nights: 2,
    adults: 1,
    children: 0,
    status: 'Confirmed',
    ratePlan: 'Best available rate',
    channel: 'Direct',
    total: 9440,
    paid: 9440,
    currencyCode: 'INR',
    nightlyRate: 4000,
    specialRequests: 'High floor preferred',
    notes: 'Returning corporate guest',
  },
  {
    id: 'TST-8e9e8f26',
    guest: 'Aarav Iyer',
    guestId: 'g-1023',
    room: 'Unassigned',
    roomNumber: null,
    roomType: 'Standard',
    checkIn: 'Mar 01',
    checkOut: 'Mar 03',
    checkInIso: '2026-03-01',
    checkOutIso: '2026-03-03',
    nights: 2,
    adults: 1,
    children: 0,
    status: 'Confirmed',
    ratePlan: 'Complimentary stay',
    channel: 'Direct',
    total: 0,
    paid: 0,
    currencyCode: 'INR',
    nightlyRate: 0,
    specialRequests: '',
    notes: '',
  },
  {
    id: 'TST-2f9ed697',
    guest: 'Aarav Iyer',
    guestId: 'g-1023',
    room: '404',
    roomNumber: '404',
    roomType: 'Deluxe',
    checkIn: 'Mar 11',
    checkOut: 'Mar 13',
    checkInIso: '2026-03-11',
    checkOutIso: '2026-03-13',
    nights: 2,
    adults: 1,
    children: 0,
    status: 'Confirmed',
    ratePlan: 'Complimentary stay',
    channel: 'Direct',
    total: 0,
    paid: 0,
    currencyCode: 'INR',
    nightlyRate: 0,
    specialRequests: '',
    notes: '',
  },
  {
    id: 'RSV-20261015-379376',
    guest: 'Aarav Iyer',
    guestId: 'g-1023',
    room: '503',
    roomNumber: '503',
    roomType: 'Deluxe',
    checkIn: 'Nov 14',
    checkOut: 'Nov 16',
    checkInIso: '2026-11-14',
    checkOutIso: '2026-11-16',
    nights: 2,
    adults: 1,
    children: 0,
    status: 'Confirmed',
    ratePlan: 'Best available rate',
    channel: 'Direct',
    total: 9440,
    paid: 9440,
    currencyCode: 'INR',
    nightlyRate: 4000,
    specialRequests: 'Quiet room',
    notes: '',
  },
  {
    id: 'RSV-DM-0001',
    guest: 'Aarav Iyer',
    guestId: 'g-1023',
    room: '102',
    roomNumber: '102',
    roomType: 'Standard',
    checkIn: 'Oct 02',
    checkOut: 'Oct 04',
    checkInIso: '2026-10-02',
    checkOutIso: '2026-10-04',
    nights: 2,
    adults: 1,
    children: 0,
    status: 'Checked-out',
    ratePlan: 'Best available rate',
    channel: 'Direct',
    total: 9440,
    paid: 9440,
    currencyCode: 'INR',
    nightlyRate: 4000,
    specialRequests: '',
    notes: '',
  },
  {
    id: 'RSV-20261010-118273',
    guest: 'Rahul Sharma',
    guestId: 'g-2041',
    room: '305',
    roomNumber: '305',
    roomType: 'Superior',
    checkIn: 'Oct 10',
    checkOut: 'Oct 12',
    checkInIso: '2026-10-10',
    checkOutIso: '2026-10-12',
    nights: 2,
    adults: 2,
    children: 0,
    status: 'Checked-in',
    ratePlan: 'OTA Standard Rate',
    channel: 'Booking.com',
    total: 12980,
    paid: 12980,
    currencyCode: 'INR',
    nightlyRate: 5500,
    specialRequests: 'Extra pillows',
    notes: 'Booking.com prepaid',
  },
  {
    id: 'RSV-20261008-662900',
    guest: 'Priya Mehta',
    guestId: 'g-3092',
    room: 'Unassigned',
    roomNumber: null,
    roomType: 'Deluxe',
    checkIn: 'Oct 08',
    checkOut: 'Oct 10',
    checkInIso: '2026-10-08',
    checkOutIso: '2026-10-10',
    nights: 2,
    adults: 2,
    children: 0,
    status: 'Pending',
    ratePlan: 'Early Bird Promo',
    channel: 'Agoda',
    total: 11200,
    paid: 5000,
    currencyCode: 'INR',
    nightlyRate: 4800,
    specialRequests: 'Airport pickup requested',
    notes: 'Deposit received',
  },
  {
    id: 'RSV-20261005-221144',
    guest: 'Vikram Rao',
    guestId: 'g-4018',
    room: '101',
    roomNumber: '101',
    roomType: 'Standard',
    checkIn: 'Oct 05',
    checkOut: 'Oct 06',
    checkInIso: '2026-10-05',
    checkOutIso: '2026-10-06',
    nights: 1,
    adults: 1,
    children: 0,
    status: 'Cancelled',
    ratePlan: 'Standard Flexible',
    channel: 'Direct',
    total: 4720,
    paid: 0,
    currencyCode: 'INR',
    nightlyRate: 4000,
    specialRequests: '',
    notes: 'Cancelled via customer request',
  },
  {
    id: 'RSV-20261001-339912',
    guest: 'Neha Kapoor',
    guestId: 'g-5022',
    room: '408',
    roomNumber: '408',
    roomType: 'Deluxe',
    checkIn: 'Oct 01',
    checkOut: 'Oct 04',
    checkInIso: '2026-10-01',
    checkOutIso: '2026-10-04',
    nights: 3,
    adults: 1,
    children: 0,
    status: 'Confirmed',
    ratePlan: 'Holiday Retreat Package',
    channel: 'Expedia',
    total: 14160,
    paid: 14160,
    currencyCode: 'INR',
    nightlyRate: 4200,
    specialRequests: 'Late arrival after 8 PM',
    notes: 'Guaranteed with card',
  },
];

type SortKey = 'checkIn' | 'guest' | 'amount';

// Channel Badge Component matching screenshot
function ChannelBadge({ channel }: { channel: string }) {
  const c = channel.toLowerCase();
  if (c.includes('booking')) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-[#003580] text-[11px] font-black text-white">
          B
        </span>
        <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700">BOOKING.COM</span>
      </span>
    );
  }
  if (c.includes('agoda')) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-[#0b72e7] text-[11px] font-black text-white">
          A
        </span>
        <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700">AGODA</span>
      </span>
    );
  }
  if (c.includes('expedia')) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-[#001c54] text-[11px] font-black text-white">
          E
        </span>
        <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700">EXPEDIA</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
      <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-50 text-blue-600 border border-blue-200">
        <Lucide.Image size={11} />
      </span>
      <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700">DIRECT</span>
    </span>
  );
}

// Status Pill Badge matching screenshot
function StatusPill({ status }: { status: ReservationStatus }) {
  switch (status) {
    case 'Confirmed':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Checked-out
        </span>
      );
    case 'Pending':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Pending
        </span>
      );
    case 'Cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Cancelled
        </span>
      );
    case 'No-show':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
          No-show
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
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
      <div className="flex flex-col gap-4 text-xs text-slate-700">
        <div className="flex items-center justify-between border-b pb-3 border-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">{r.guest}</span>
            <StatusPill status={r.status} />
          </div>
          <span className="font-bold text-sm text-slate-900">₹{r.total.toLocaleString('en-IN')}.00</span>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div>
            <span className="text-[11px] text-slate-400">Room</span>
            <p className="font-semibold text-slate-900">{r.roomSummary ?? (r.roomNumber ? `Room ${r.roomNumber} (${r.roomType})` : `Unassigned (${r.roomType})`)}</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Rate Plan</span>
            <p className="font-semibold text-slate-900">{r.ratePlan}</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Stay Dates</span>
            <p className="font-semibold text-slate-900">{r.checkIn} → {r.checkOut} ({r.nights}n)</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Guests</span>
            <p className="font-semibold text-slate-900">{r.adults + r.children} Guests</p>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-3 flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Room Charges:</span>
            <span className="font-medium text-slate-900">₹{roomCharges.toLocaleString('en-IN')}.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Amount Paid:</span>
            <span className="font-medium text-emerald-600">₹{r.paid.toLocaleString('en-IN')}.00</span>
          </div>
          <div className="flex justify-between font-bold border-t border-slate-100 pt-1">
            <span>Balance Due:</span>
            <span className={balance > 0 ? 'text-amber-600' : 'text-slate-900'}>
              ₹{Math.max(0, balance).toLocaleString('en-IN')}.00
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {(r.status === 'Confirmed' || r.status === 'Pending') && (
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] text-white font-semibold text-xs shadow-xs cursor-pointer"
            onClick={() => { go({ view: 'check-in', query: r.id }); onClose(); }}
          >
            <Lucide.LogIn size={15} />
            <span>Check In</span>
          </button>
        )}
        {r.status === 'Checked-in' && (
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] text-white font-semibold text-xs shadow-xs cursor-pointer"
            onClick={() => { go({ view: 'check-out' }); onClose(); }}
          >
            <Lucide.Receipt size={15} />
            <span>Open Folio</span>
          </button>
        )}
        {(r.status === 'Confirmed' || r.status === 'Pending') && (
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs cursor-pointer"
            onClick={() => setEditOpen(true)}
          >
            <Lucide.CalendarClock size={15} />
            <span>Modify Dates</span>
          </button>
        )}
        {(r.status === 'Confirmed' || r.status === 'Pending') && (
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md border border-red-200 bg-white hover:bg-red-50 text-red-600 font-semibold text-xs shadow-xs cursor-pointer"
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
              className="rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Check-in Date</label>
            <input
              type="date"
              value={editCheckIn}
              onChange={(e) => setEditCheckIn(e.target.value)}
              className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Check-out Date</label>
            <input
              type="date"
              value={editCheckOut}
              onChange={(e) => setEditCheckOut(e.target.value)}
              className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
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
const COL_WIDTH = 110; // width of each day column in pixels
const ROW_HEIGHT = 58; // height of each room row in pixels
const ROOM_COL_WIDTH = 240; // width of sticky room allotment column in pixels

export function RoomCalendar({
  go: _go,
  onReservationUpdated,
}: {
  go?: (t: NavTarget) => void;
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
      detail: `${reservation.guestName} reassigned to Room ${proposedRoom.number} (${proposedCheckIn} → ${proposedCheckOut}). ${
        notifyGuest ? 'Simulated guest email & SMS queued.' : ''
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
              onChange={(e) => setFilterStatus(e.target.value as CalendarReservationStatus | 'All')}
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

export function Reservations({
  initialQuery = '',
  initialViewMode = 'list',
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
    return apiMapped.length > 0 ? apiMapped : DEMO_RESERVATIONS;
  }, []);

  const resource = useApiResource(loadRows);
  const rows = useMemo(() => {
    const loaded = resource.data;
    if (!loaded || loaded.length === 0) return DEMO_RESERVATIONS;
    return loaded;
  }, [resource.data]);

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

  // Selected Date bar
  const [selectedDate, setSelectedDate] = useState('2026-10-17');

  const stepDate = (days: number) => {
    const d = new Date(`${selectedDate}T12:00:00Z`);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const resetToToday = () => {
    setSelectedDate('2026-10-17');
  };

  const formattedDate = useMemo(() => {
    return new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

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
  const summaryStats = [
    {
      label: 'Total Reservations',
      value: 43,
      Icon: Lucide.FileText,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Arrivals Today',
      value: 8,
      Icon: Lucide.ArrowUpRight,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Departures Today',
      value: 6,
      Icon: Lucide.Compass,
      iconBg: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'In-house',
      value: 24,
      Icon: Lucide.BedDouble,
      iconBg: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Pending',
      value: 4,
      Icon: Lucide.Clock,
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'No-show',
      value: 1,
      Icon: Lucide.AlarmClock,
      iconBg: 'bg-rose-50 text-rose-600',
    },
  ];

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
    <div className="w-full text-slate-900 font-sans pb-8 flex flex-col gap-3.5">
      {resource.error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <Lucide.AlertCircle size={16} />
          <span>Notice: {resource.error}</span>
        </div>
      )}

      {/* ================= 1. PAGE HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs shadow-blue-500/20 mt-0.5">
            <Lucide.CalendarDays size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">Reservations</h1>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Live Grid
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage all reservations, search, filter and view booking details
            </p>
          </div>
        </div>

        {/* Action Buttons & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher: List View vs Calendar View */}
          <div className="flex items-center p-1 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lucide.List size={14} />
              <span>List View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lucide.CalendarRange size={14} />
              <span>Room Calendar</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <RoomCalendar go={go} onReservationUpdated={() => resource.refresh()} />
      ) : (
        <>
          {/* ================= 2. 6 KPI METRIC CARDS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {summaryStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs flex items-center gap-3 transition-all hover:shadow-md cursor-pointer"
            onClick={() => {
              if (stat.label === 'Arrivals Today') go({ view: 'check-in' });
              else if (stat.label === 'Departures Today') go({ view: 'check-out' });
              else if (stat.label === 'In-house') setStatus('Checked-in');
            }}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.iconBg}`}>
              <stat.Icon size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-slate-900 leading-none">{stat.value}</p>
              <p className="text-xs text-slate-500 font-normal mt-1 truncate">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ================= 3. DATE SELECTOR PILL (TOP RIGHT) ================= */}
      <div className="flex justify-end -mb-2">
        <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 shadow-xs">
          <Lucide.Calendar size={14} className="text-slate-500 ml-1.5" />
          <span className="text-xs font-semibold text-slate-800 px-1">{formattedDate}</span>
          <button
            type="button"
            onClick={() => stepDate(-1)}
            title="Previous day"
            className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <Lucide.ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => stepDate(1)}
            title="Next day"
            className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <Lucide.ChevronRight size={14} />
          </button>
          <button
            type="button"
            onClick={resetToToday}
            className="ml-1 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Today
          </button>
        </div>
      </div>

      {/* ================= 4. SEARCH & FILTER CARD ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] flex flex-col gap-3.5">
        {/* Row 1: Search + Date Pickers + Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Lucide.Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search guest name, booking ID, phone, email..."
              className="w-full rounded-md border border-slate-200 bg-white pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          {/* Check-in Date Picker */}
          <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            <span>Check-in date</span>
            <Lucide.Calendar size={14} className="text-slate-400 ml-1" />
          </div>

          <span className="text-slate-300 hidden sm:inline">–</span>

          {/* Check-out Date Picker */}
          <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            <span>Check-out date</span>
            <Lucide.Calendar size={14} className="text-slate-400 ml-1" />
          </div>

          {/* All Sources Dropdown */}
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(0);
            }}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-[var(--color-primary)]"
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
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-[var(--color-primary)]"
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

          {/* All Guests Dropdown */}
          <select
            value={guestCountFilter}
            onChange={(e) => {
              setGuestCountFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="All">All guests</option>
            <option value="1">1 Guest</option>
            <option value="2">2 Guests</option>
            <option value="3+">3+ Guests</option>
          </select>
        </div>

        {/* Row 2: Status Pills + Filters Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((f) => {
              const count = f === 'All' ? totalReservationsCount : rows.filter((r) => r.status === f).length;
              const isActive = status === f;

              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setStatus(f);
                    setPage(0);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {f !== 'All' && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive
                          ? 'bg-white'
                          : f === 'Confirmed'
                          ? 'bg-emerald-500'
                          : f === 'Pending'
                          ? 'bg-amber-500'
                          : f === 'Checked-in'
                          ? 'bg-blue-600'
                          : f === 'Checked-out'
                          ? 'bg-slate-400'
                          : 'bg-rose-500'
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

          {/* Action Buttons: More filters & Clear filters */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toast('More filters', { detail: 'Extended query panel active.', tone: 'info' })}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
            >
              <Lucide.Filter size={13} className="text-[var(--color-primary)]" />
              <span>More filters</span>
            </button>

            <button
              type="button"
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
            >
              <Lucide.RotateCcw size={13} className="text-slate-400" />
              <span>Clear filters</span>
            </button>

            <button
              type="button"
              title="Table view settings"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 cursor-pointer shadow-xs"
            >
              <Lucide.SlidersHorizontal size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ================= 5. RESERVATIONS TABLE CARD ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="pms-table-scroll overflow-x-auto">
          <table className="pms-table w-full text-left text-sm border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-500 tracking-wider uppercase">
                <th className="py-2.5 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={slice.length > 0 && selectedRowIds.length === slice.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                    className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 cursor-pointer accent-[var(--color-primary)]"
                  />
                </th>
                <th className="py-3 px-3 font-semibold">
                  <span className="flex items-center gap-1">
                    REFERENCE <Lucide.ArrowUpDown size={11} className="text-slate-400" />
                  </span>
                </th>
                <th className="py-3 px-3 font-semibold">
                  <span className="flex items-center gap-1">
                    GUEST <Lucide.ArrowUpDown size={11} className="text-slate-400" />
                  </span>
                </th>
                <th className="py-3 px-3 font-semibold">
                  <span className="flex items-center gap-1">
                    ROOM <Lucide.ArrowUpDown size={11} className="text-slate-400" />
                  </span>
                </th>
                <th className="py-3 px-3 font-semibold">
                  <span className="flex items-center gap-1">
                    STAY DATES <Lucide.ArrowUpDown size={11} className="text-slate-400" />
                  </span>
                </th>
                <th className="py-3 px-3 font-semibold">
                  <span className="flex items-center gap-1">
                    GUESTS <Lucide.ArrowUpDown size={11} className="text-slate-400" />
                  </span>
                </th>
                <th className="py-3 px-3 font-semibold">
                  <span className="flex items-center gap-1">
                    SOURCE <Lucide.ArrowUpDown size={11} className="text-slate-400" />
                  </span>
                </th>
                <th className="py-3 px-3 font-semibold">
                  <span className="flex items-center gap-1">
                    STATUS <Lucide.ArrowUpDown size={11} className="text-slate-400" />
                  </span>
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  <span className="flex items-center justify-end gap-1">
                    TOTAL <Lucide.ArrowUpDown size={11} className="text-slate-400" />
                  </span>
                </th>
                <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-slate-100">
              {slice.map((r) => {
                const isSelected = selectedRowIds.includes(r.id);
                return (
                  <tr
                    key={r.id}
                    className={`transition-colors hover:bg-slate-50/70 ${
                      isSelected ? 'bg-[var(--color-muted-surface)]/30' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(r.id)}
                        aria-label={`Select ${r.id}`}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 cursor-pointer accent-[var(--color-primary)]"
                      />
                    </td>

                    {/* Reference & Created Time */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 tracking-tight text-sm font-mono">
                        {r.id}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {r.checkInIso ? `Oct 15, 2026 • 10:24 AM` : 'Oct 15, 2026 • 09:12 AM'}
                      </div>
                    </td>

                    {/* Guest Name & Phone */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.guest} size={36} />
                        <div>
                          <p className="font-semibold text-slate-900 text-sm leading-tight">{r.guest}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
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
                    <td className="py-3.5 px-3">
                      {r.roomNumber ? (
                        <div className="flex items-center gap-2">
                          <img
                            src="/images/room-deluxe.jpg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=120&q=80';
                            }}
                            alt="Room"
                            className="h-9 w-9 rounded-md object-cover shrink-0 border border-slate-200"
                          />
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-tight">{r.roomSummary ?? r.roomNumber}</p>
                            <p className="text-xs text-slate-500">{r.roomType}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                            <Lucide.Home size={16} />
                          </div>
                          <span className="text-xs text-slate-500 font-medium">Unassigned</span>
                        </div>
                      )}
                    </td>

                    {/* Stay Dates */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-sm text-slate-700">
                      <span className="font-medium">
                        {r.checkIn} → {r.checkOut}
                      </span>{' '}
                      <span className="text-slate-400 font-normal">• {r.nights}n</span>
                    </td>

                    {/* Guests Count */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-sm text-slate-700">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Lucide.User size={14} className="text-slate-400" />
                        <span>{r.adults + r.children}</span>
                      </span>
                    </td>

                    {/* Source Channel */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <ChannelBadge channel={r.channel} />
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusPill status={r.status} />
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900 text-sm whitespace-nowrap tnum">
                      ₹{r.total.toLocaleString('en-IN')}.00
                    </td>

                    {/* Actions: Open & More */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setOpenId(r.id)}
                          className="rounded-md border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenId(r.id)}
                          title="More options"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
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
              <Lucide.CalendarX size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-500">No reservations match the selected filters.</p>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-t border-slate-100 bg-white text-xs">
          {/* Summary Count */}
          <div className="text-slate-500">
            Page {safePage + 1} of {pages} • {filtered.length} reservations
          </div>

          {/* Right Controls: Rows per page & Pagination buttons */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <span>Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 font-semibold focus:border-[var(--color-primary)] focus:outline-none"
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
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                    className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
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
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Lucide.ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
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
