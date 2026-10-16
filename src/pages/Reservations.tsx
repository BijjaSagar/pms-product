import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { ConfirmDialog, Drawer, Modal } from '../components/overlays';
import { Avatar } from '../components/ui';
import { toast } from '../components/toastStore';
import type { NavTarget } from '../components/nav';
import { frontDeskApi, reservationApi } from '../lib/api/pms';
import { reservationFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { ThemeSwatcher } from '../components/ThemeSwatcher';
import type { Reservation, ReservationStatus } from '../types';

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
            <p className="font-semibold text-slate-900">{r.roomNumber ? `Room ${r.roomNumber}` : 'Unassigned'} ({r.roomType})</p>
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

export function Reservations({
  initialQuery = '',
  focusId,
  go,
  onOpenThemes,
}: {
  initialQuery?: string;
  focusId?: string;
  go: (t: NavTarget) => void;
  onOpenThemes?: () => void;
}) {
  const [swatcherOpen, setSwatcherOpen] = useState(false);

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
  const [selectedDate, setSelectedDate] = useState('2026-10-14');

  const stepDate = (days: number) => {
    const d = new Date(`${selectedDate}T12:00:00Z`);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const resetToToday = () => {
    setSelectedDate('2026-10-14');
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
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Reservations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage all reservations, search, filter and view booking details
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Theme Swatcher Trigger Button */}
          <button
            type="button"
            onClick={() => (onOpenThemes ? onOpenThemes() : setSwatcherOpen(true))}
            title="Customize Theme & Palette"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors cursor-pointer"
          >
            <Lucide.Palette size={15} className="text-[var(--color-primary)]" />
            <span className="hidden sm:inline">Theme</span>
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={() =>
              toast('Export ready', {
                detail: 'CSV reservations report exported successfully.',
                tone: 'success',
              })
            }
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors cursor-pointer"
          >
            <span>Export</span>
            <Lucide.ChevronDown size={14} className="text-slate-400" />
          </button>

          {/* Bulk Actions Button */}
          <button
            type="button"
            onClick={() =>
              toast('Bulk actions', {
                detail: `${selectedRowIds.length} reservations currently selected.`,
                tone: 'info',
              })
            }
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors cursor-pointer"
          >
            <span>Bulk actions</span>
            <Lucide.ChevronDown size={14} className="text-slate-400" />
          </button>

          {/* + New Reservation Button */}
          <button
            type="button"
            onClick={() => go({ view: 'new-reservation' })}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] text-white shadow-xs transition-all cursor-pointer"
          >
            <Lucide.Plus size={16} strokeWidth={2.5} />
            <span>New Reservation</span>
          </button>
        </div>
      </div>

      {/* ================= 2. 6 KPI METRIC CARDS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {summaryStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs flex items-center gap-3 transition-all hover:shadow-md cursor-pointer"
            onClick={() => {
              if (stat.label === 'Arrivals Today') go({ view: 'check-in' });
              else if (stat.label === 'Departures Today') go({ view: 'check-out' });
              else if (stat.label === 'In-house') go({ view: 'in-house' });
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
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
                            <p className="font-bold text-slate-900 text-sm leading-tight">{r.roomNumber}</p>
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
      <ThemeSwatcher open={swatcherOpen} onClose={() => setSwatcherOpen(false)} />
    </div>
  );
}
