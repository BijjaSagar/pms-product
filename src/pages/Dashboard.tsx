import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import type { NavTarget } from '../components/nav';
import { folioApi, frontDeskApi, operationsApi, reportsApi, reservationApi } from '../lib/api/pms';
import { paymentFromApi, reservationFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { useAuth } from '../features/auth/AuthContext';
import type { PaymentRow, ReservationRow, StayRow } from '../lib/api/pms';
import { toast } from '../components/toastStore';
import { ThemeSwatcher } from '../components/ThemeSwatcher';
import { Avatar, Badge, TableActionBtn, TableContainer } from '../components/ui';

// ================= DEMO FALLBACK DATA MATCHING REFERENCE IMAGE =================

interface ActivityItem {
  id: string;
  time: string;
  type: 'arrival' | 'departure' | 'in-house';
  icon: Lucide.LucideIcon;
  iconBg: string;
  title: string;
  subtitle: string;
  room?: string;
  status: string;
  statusTone: string;
  actionLabel: string;
  actionTone: string;
  target: NavTarget;
}

const DEMO_TIMELINE: ActivityItem[] = [
  {
    id: 't-1',
    time: '10:00 AM',
    type: 'arrival',
    icon: Lucide.DoorOpen,
    iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    title: 'Rohan Singh',
    subtitle: 'RSV-DM-0013 • Deluxe King',
    room: 'Room 201',
    status: 'Arriving',
    statusTone: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    actionLabel: 'Check in',
    actionTone: 'text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border-emerald-200',
    target: { view: 'check-in' } as NavTarget,
  },
  {
    id: 't-2',
    time: '11:30 AM',
    type: 'arrival',
    icon: Lucide.Sparkles,
    iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
    title: 'Priya Mehta',
    subtitle: 'RSV-DM-0014 • VIP Welcome Amenity',
    room: 'Room 302',
    status: 'VIP Elite',
    statusTone: 'bg-purple-50 text-purple-700 border-purple-200/60',
    actionLabel: 'Check in',
    actionTone: 'text-purple-700 bg-purple-50/80 hover:bg-purple-100 border-purple-200',
    target: { view: 'check-in' } as NavTarget,
  },
  {
    id: 't-3',
    time: '12:00 PM',
    type: 'departure',
    icon: Lucide.DoorClosed,
    iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
    title: 'Rahul Lal',
    subtitle: 'RSV-DM-0010 • Folio Settled',
    room: 'Room 103',
    status: 'Due Out',
    statusTone: 'bg-amber-50 text-amber-700 border-amber-200/60',
    actionLabel: 'Check out',
    actionTone: 'text-amber-800 bg-amber-50/80 hover:bg-amber-100 border-amber-200',
    target: { view: 'check-out' } as NavTarget,
  },
  {
    id: 't-4',
    time: '02:00 PM',
    type: 'in-house',
    icon: Lucide.Sparkles,
    iconBg: 'bg-sky-50 text-sky-600 border border-sky-100',
    title: 'Deep Cleaning & Sanitization',
    subtitle: 'Assigned: Anita S. • Due 02:45 PM',
    room: 'Room 204',
    status: 'Cleaning',
    statusTone: 'bg-sky-50 text-sky-700 border-sky-200/60',
    actionLabel: 'Mark Done',
    actionTone: 'text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200',
    target: { view: 'housekeeping' } as NavTarget,
  },
  {
    id: 't-5',
    time: '03:00 PM',
    type: 'in-house',
    icon: Lucide.Wrench,
    iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
    title: 'AC Thermostat Calibration',
    subtitle: 'Reported by Guest • Priority Urgent',
    room: 'Room 305',
    status: 'High Priority',
    statusTone: 'bg-rose-50 text-rose-700 border-rose-200/60',
    actionLabel: 'Assign Tech',
    actionTone: 'text-rose-700 bg-rose-50/80 hover:bg-rose-100 border-rose-200',
    target: { view: 'maintenance' } as NavTarget,
  },
];

const DEMO_PENDING_CHECKINS = [
  {
    id: 'RSV-DM-0013',
    bookingCode: 'RSV-DM-0013',
    guest: 'Rohan Singh',
    isVip: false,
    room: '201',
    roomType: 'Deluxe King',
    roomReady: true,
    eta: '10:00 AM',
    dates: 'Oct 14 – 16',
    nights: 2,
    total: 12980,
    balance: 0,
    status: 'Guaranteed',
  },
  {
    id: 'RSV-DM-0014',
    bookingCode: 'RSV-DM-0014',
    guest: 'Priya Mehta',
    isVip: true,
    vipTier: 'VIP Elite',
    room: '302',
    roomType: 'Executive Suite',
    roomReady: true,
    eta: '11:30 AM',
    dates: 'Oct 14 – 17',
    nights: 3,
    total: 25600,
    balance: 0,
    status: 'Confirmed',
  },
  {
    id: 'RSV-DM-0018',
    bookingCode: 'RSV-DM-0018',
    guest: 'Kavita Nair',
    isVip: false,
    room: '205',
    roomType: 'Deluxe Queen',
    roomReady: false,
    eta: '01:15 PM',
    dates: 'Oct 14 – 15',
    nights: 1,
    total: 6490,
    balance: 6490,
    status: 'Pending Deposit',
  },
  {
    id: 'RSV-DM-0019',
    bookingCode: 'RSV-DM-0019',
    guest: 'Arjun Verma',
    isVip: false,
    room: 'Unassigned',
    roomType: 'Superior Twin',
    roomReady: false,
    eta: '03:00 PM',
    dates: 'Oct 14 – 18',
    nights: 4,
    total: 21800,
    balance: 0,
    status: 'Guaranteed',
  },
  {
    id: 'RSV-DM-0020',
    bookingCode: 'RSV-DM-0020',
    guest: 'Sameer Sen',
    isVip: true,
    vipTier: 'VIP Diamond',
    room: '404',
    roomType: 'Presidential Suite',
    roomReady: true,
    eta: '04:30 PM',
    dates: 'Oct 14 – 16',
    nights: 2,
    total: 38400,
    balance: 10000,
    status: 'Confirmed',
  },
];

const DEMO_PENDING_CHECKOUTS = [
  {
    id: 'RSV-DM-0010',
    bookingCode: 'RSV-DM-0010',
    guest: 'Rahul Lal',
    room: '103',
    roomType: 'Standard Queen',
    outTime: '11:00 AM',
    isLateCheckout: false,
    dates: 'Oct 12 – 14',
    nights: 2,
    folioBalance: 0,
    status: 'Due Out' as const,
  },
  {
    id: 'RSV-DM-0008',
    bookingCode: 'RSV-DM-0008',
    guest: 'Aditya Nanda',
    room: '202',
    roomType: 'Deluxe King',
    outTime: '11:30 AM',
    isLateCheckout: false,
    dates: 'Oct 11 – 14',
    nights: 3,
    folioBalance: 1850,
    status: 'Due Out' as const,
  },
  {
    id: 'RSV-DM-0006',
    bookingCode: 'RSV-DM-0006',
    guest: 'Sunita Menon',
    room: '305',
    roomType: 'Executive Suite',
    outTime: '02:00 PM',
    isLateCheckout: true,
    dates: 'Oct 10 – 14',
    nights: 4,
    folioBalance: 0,
    status: 'Late Checkout' as const,
  },
  {
    id: 'RSV-DM-0005',
    bookingCode: 'RSV-DM-0005',
    guest: 'Manish Gupta',
    room: '107',
    roomType: 'Superior Twin',
    outTime: '12:00 PM',
    isLateCheckout: false,
    dates: 'Oct 13 – 14',
    nights: 1,
    folioBalance: 4200,
    status: 'Due Out' as const,
  },
  {
    id: 'RSV-DM-0004',
    bookingCode: 'RSV-DM-0004',
    guest: 'Elena Reddy',
    room: '401',
    roomType: 'Deluxe King',
    outTime: '11:00 AM',
    isLateCheckout: false,
    dates: 'Oct 12 – 14',
    nights: 2,
    folioBalance: 0,
    status: 'Inspected' as const,
  },
];

const DEMO_RESERVATIONS = [
  {
    id: 'RSV-DM-0013',
    guest: 'Rohan Singh',
    dates: 'Oct 14 – Oct 16',
    room: '201',
    status: 'Confirmed',
    total: 12980,
  },
  {
    id: 'RSV-DM-0014',
    guest: 'Priya Mehta',
    dates: 'Oct 14 – Oct 17',
    room: '2 Rooms',
    status: 'Confirmed',
    total: 25600,
  },
  {
    id: 'RSV-DM-0015',
    guest: 'Harsh Ali',
    dates: 'Oct 15 – Oct 17',
    room: '305',
    status: 'Pending',
    total: 8450,
  },
  {
    id: 'RSV-DM-0016',
    guest: 'Elena Reddy',
    dates: 'Oct 13 – Oct 14',
    room: '103',
    status: 'Checked-out',
    total: 6490,
  },
  {
    id: 'RSV-DM-0017',
    guest: 'Vikram Rao',
    dates: 'Oct 15 – Oct 18',
    room: '404',
    status: 'Confirmed',
    total: 18700,
  },
];

const DEMO_PAYMENTS = [
  {
    date: 'Oct 14, 10:22',
    ref: 'PAY-00045',
    guest: 'Rohan Singh',
    method: 'Card',
    amount: 8850,
    status: 'Paid',
  },
  {
    date: 'Oct 14, 09:10',
    ref: 'PAY-00044',
    guest: 'Priya Mehta',
    method: 'UPI',
    amount: 12000,
    status: 'Paid',
  },
  {
    date: 'Oct 13, 08:45',
    ref: 'PAY-00043',
    guest: 'Rahul Lal',
    method: 'Card',
    amount: 4720,
    status: 'Paid',
  },
  {
    date: 'Oct 13, 06:30',
    ref: 'PAY-00042',
    guest: 'Aditya Nanda',
    method: 'Cash',
    amount: 9440,
    status: 'Paid',
  },
  {
    date: 'Oct 12, 05:18',
    ref: 'PAY-00041',
    guest: 'Neha Kapoor',
    method: 'Card',
    amount: 14160,
    status: 'Paid',
  },
];

const OCCUPANCY_CHART_DATA = [
  { day: '14 Oct', occ: 88, adr: 4600 },
  { day: '15 Oct', occ: 62, adr: 4200 },
  { day: '16 Oct', occ: 40, adr: 5100 },
  { day: '17 Oct', occ: 92, adr: 5400 },
  { day: '18 Oct', occ: 70, adr: 4800 },
  { day: '19 Oct', occ: 60, adr: 5900 },
  { day: '20 Oct', occ: 78, adr: 6200 },
  { day: '21 Oct', occ: 55, adr: 5200 },
  { day: '22 Oct', occ: 68, adr: 5500 },
  { day: '23 Oct', occ: 74, adr: 5800 },
  { day: '24 Oct', occ: 95, adr: 6500 },
  { day: '25 Oct', occ: 88, adr: 6400 },
  { day: '26 Oct', occ: 72, adr: 5700 },
  { day: '27 Oct', occ: 58, adr: 5300 },
];

export function Dashboard({
  go,
  onOpenThemes,
}: {
  go: (t: NavTarget) => void;
  onOpenThemes?: () => void;
}) {
  const { me, can } = useAuth();
  const [timelineTab, setTimelineTab] = useState<'all' | 'arrivals' | 'departures' | 'in-house'>('all');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [swatcherOpen, setSwatcherOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [daily, housekeeping] = await Promise.all([
        reportsApi.dailyFlash().catch(() => null),
        operationsApi.housekeepingSummary().catch(() => null),
      ]);
      const permissions = {
        reservations: can('reservation.read'),
        finance: can('report.read.financial'),
        payments: can('payment.read'),
      };
      const [reservationPage, arrivalResult, departureResult, revenue, payments] = await Promise.all([
        permissions.reservations ? reservationApi.list('', undefined, 1, 5).catch(() => ({ data: [] })) : Promise.resolve({ data: [] as ReservationRow[] }),
        permissions.reservations ? frontDeskApi.arrivals().catch(() => ({ data: [] })) : Promise.resolve({ data: [] as StayRow[] }),
        permissions.reservations ? frontDeskApi.departures().catch(() => ({ data: [] })) : Promise.resolve({ data: [] as StayRow[] }),
        permissions.finance ? reportsApi.revenue(daily?.businessDate ?? '', daily?.businessDate ?? '').catch(() => null) : Promise.resolve(null),
        permissions.payments ? folioApi.listPayments().catch(() => []) : Promise.resolve([] as PaymentRow[]),
      ]);
      return {
        daily,
        housekeeping,
        reservations: reservationPage.data.map(reservationFromApi),
        arrivals: arrivalResult.data,
        departures: departureResult.data,
        revenue,
        payments: payments.map(paymentFromApi),
      };
    } catch {
      return null;
    }
  }, [can]);

  const resource = useApiResource(loadDashboard);

  // Filtered timeline items
  const filteredTimeline = useMemo(() => {
    if (timelineTab === 'arrivals') return DEMO_TIMELINE.filter((i) => i.type === 'arrival');
    if (timelineTab === 'departures') return DEMO_TIMELINE.filter((i) => i.type === 'departure');
    if (timelineTab === 'in-house') return DEMO_TIMELINE.filter((i) => i.type === 'in-house');
    return DEMO_TIMELINE;
  }, [timelineTab]);

  const pendingCheckins = useMemo(() => {
    if (resource.data?.arrivals && resource.data.arrivals.length > 0) {
      return resource.data.arrivals.slice(0, 5).map((a) => ({
        id: a.id,
        bookingCode: a.bookingCode || a.id,
        guest: a.guestName || 'Registered Guest',
        isVip: false,
        vipTier: undefined as string | undefined,
        room: a.roomNumber || 'Unassigned',
        roomType: a.roomTypeName || 'Standard Room',
        roomReady: a.roomReady ?? true,
        eta: '12:00 PM',
        dates: `${a.checkInDate} – ${a.checkOutDate}`,
        nights: a.nights ?? 1,
        total: parseFloat(a.totalAmount || '0') || 7500,
        balance: parseFloat(a.balance || '0') || 0,
        status: (a.status as any) || 'Confirmed',
      }));
    }
    return DEMO_PENDING_CHECKINS;
  }, [resource.data?.arrivals]);

  const pendingCheckouts = useMemo(() => {
    if (resource.data?.departures && resource.data.departures.length > 0) {
      return resource.data.departures.slice(0, 5).map((d) => ({
        id: d.id,
        bookingCode: d.bookingCode || d.id,
        guest: d.guestName || 'In-House Guest',
        room: d.roomNumber || '101',
        roomType: d.roomTypeName || 'Standard Room',
        outTime: '11:00 AM',
        isLateCheckout: false,
        dates: `${d.checkInDate} – ${d.checkOutDate}`,
        nights: d.nights ?? 1,
        folioBalance: parseFloat(d.balance || '0') || 0,
        status: 'Due Out' as const,
      }));
    }
    return DEMO_PENDING_CHECKOUTS;
  }, [resource.data?.departures]);

  const recentReservations = useMemo(() => {
    if (resource.data?.reservations && resource.data.reservations.length > 0) {
      return resource.data.reservations.slice(0, 5).map((r) => ({
        id: r.bookingCode || r.id,
        guest: r.guest,
        dates: `${r.checkIn} – ${r.checkOut}`,
        room: r.room || 'Unassigned',
        status: r.status,
        total: r.total,
      }));
    }
    return DEMO_RESERVATIONS;
  }, [resource.data?.reservations]);

  const recentPayments = useMemo(() => {
    if (resource.data?.payments && resource.data.payments.length > 0) {
      return resource.data.payments.slice(0, 5).map((p) => ({
        date: p.date,
        ref: p.ref,
        guest: p.guest,
        method: p.method,
        amount: p.amount,
        status: p.status,
      }));
    }
    return DEMO_PAYMENTS;
  }, [resource.data?.payments]);

  const adrPoints = useMemo(() => {
    const minAdr = 3500;
    const maxAdr = 7000;
    return OCCUPANCY_CHART_DATA.map((item, idx) => {
      const x = 40 + (idx / (OCCUPANCY_CHART_DATA.length - 1)) * 920;
      const norm = Math.max(0, Math.min(1, (item.adr - minAdr) / (maxAdr - minAdr)));
      const y = 120 - norm * 85;
      return { x: Math.round(x), y: Math.round(y) };
    });
  }, []);

  return (
    <div className="w-full text-slate-900 font-sans pb-8 flex flex-col gap-3.5">
      {/* ================= 1. PAGE HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Welcome Title */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-amber-50 text-amber-500 shadow-2xs mt-0.5">
            <Lucide.Sun size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-[25px] font-bold tracking-tight text-slate-900 leading-tight">
              Good morning, {me?.user.fullName ? me.user.fullName.split(' ')[0] : 'Admin'}
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5 font-normal">
              Here&apos;s what&apos;s happening at your hotel today <span className="text-slate-400">•</span> October 14, 2026
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* + New Reservation */}
          <button
            type="button"
            onClick={() => go({ view: 'new-reservation' })}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] text-white shadow-sm transition-all cursor-pointer"
          >
            <Lucide.Plus size={15} strokeWidth={2.5} />
            <span>New Reservation</span>
          </button>

          {/* Walk-in Guest */}
          <button
            type="button"
            onClick={() => go({ view: 'walk-in' })}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors cursor-pointer"
          >
            <Lucide.Footprints size={15} className="text-slate-500" />
            <span>Walk-in Guest</span>
          </button>

          {/* Check-in */}
          <button
            type="button"
            onClick={() => go({ view: 'check-in' })}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 shadow-xs transition-colors cursor-pointer"
          >
            <Lucide.DoorOpen size={15} className="text-emerald-600" />
            <span>Check-in</span>
          </button>

          {/* Check-out */}
          <button
            type="button"
            onClick={() => go({ view: 'check-out' })}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-800 shadow-xs transition-colors cursor-pointer"
          >
            <Lucide.DoorClosed size={15} className="text-amber-600" />
            <span>Check-out</span>
          </button>

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreMenuOpen((prev) => !prev)}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors cursor-pointer"
              aria-label="More options"
            >
              <span>••• More</span>
              <Lucide.ChevronDown size={14} className="text-slate-400" />
            </button>

            {moreMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 z-30 w-48 rounded-md border border-slate-200 bg-white p-1.5 shadow-xl text-xs animate-in fade-in zoom-in-95"
                onClick={() => setMoreMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => (onOpenThemes ? onOpenThemes() : setSwatcherOpen(true))}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  <Lucide.Palette size={14} className="text-[var(--color-primary)]" />
                  <span>Customize Theme</span>
                </button>
                <button
                  type="button"
                  onClick={() => go({ view: 'room-inventory' })}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  <Lucide.Boxes size={14} className="text-slate-500" />
                  <span>Room Inventory</span>
                </button>
                <button
                  type="button"
                  onClick={() => go({ view: 'reports' })}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  <Lucide.BarChart3 size={14} className="text-slate-500" />
                  <span>Daily Reports</span>
                </button>
                <button
                  type="button"
                  onClick={() => go({ view: 'folios' })}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  <Lucide.ReceiptText size={14} className="text-slate-500" />
                  <span>Guest Folios</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= 2. PERFORMANCE & INVENTORY: OCCUPANCY (col-8) & ROOM STATUS (col-4) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card: Occupancy (Next 14 Days) - col-8 */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-200/70 shadow-2xs">
                  <Lucide.BarChart3 size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Occupancy (Next 14 Days)</h2>
                  <p className="text-[11px] text-slate-400">Demand forecast and Average Daily Rate (ADR) projection</p>
                </div>
              </div>

              {/* Legend & Action */}
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200/60">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[var(--color-primary)]" />
                    <span>Occupancy %</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full border-2 border-sky-400 bg-white" />
                    <span>ADR (₹)</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => go({ view: 'occupancy-report' })}
                  className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                >
                  <span>Report</span>
                  <Lucide.ArrowRight size={12} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Bar + Line Combo Chart */}
            <div className="relative h-48 w-full flex items-end pt-3">
              {/* Y-axis left lines */}
              <div className="absolute inset-0 flex flex-col justify-between text-[9.5px] text-slate-400 pointer-events-none select-none">
                <div className="border-b border-dashed border-slate-100 pb-0.5">100%</div>
                <div className="border-b border-dashed border-slate-100 pb-0.5">80%</div>
                <div className="border-b border-dashed border-slate-100 pb-0.5">60%</div>
                <div className="border-b border-dashed border-slate-100 pb-0.5">40%</div>
                <div className="border-b border-dashed border-slate-100 pb-0.5">20%</div>
                <div className="border-b border-slate-200 pb-0.5">0%</div>
              </div>

              {/* Y-axis right labels */}
              <div className="absolute right-0 inset-y-0 flex flex-col justify-between text-[9.5px] text-slate-400 pointer-events-none select-none text-right">
                <div>₹7K</div>
                <div>₹6K</div>
                <div>₹5K</div>
                <div>₹4K</div>
                <div>₹3K</div>
                <div>₹0</div>
              </div>

              {/* 14 Day Bars */}
              <div className="relative z-10 w-full pl-7 pr-8 flex items-end justify-between h-40">
                {OCCUPANCY_CHART_DATA.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 text-[9.5px] font-bold bg-slate-900 text-white rounded px-1.5 py-0.5 pointer-events-none z-30 whitespace-nowrap shadow-md">
                      {item.day}: {item.occ}% · ₹{item.adr}
                    </div>
                    {/* The bar */}
                    <div
                      className="w-3.5 sm:w-5 md:w-6 rounded-t bg-[var(--color-primary)] group-hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-2xs"
                      style={{ height: `${item.occ}%` }}
                    />
                    <span className="text-[10px] text-slate-500 mt-2 leading-tight text-center font-medium">
                      {item.day.split(' ')[0]}<br />
                      <span className="text-slate-400 text-[9px]">{item.day.split(' ')[1]}</span>
                    </span>
                  </div>
                ))}

                {/* Simulated ADR Trend Line (SVG Overlay) */}
                <svg className="absolute inset-0 h-40 w-full pointer-events-none overflow-visible pl-7 pr-8" viewBox="0 0 1000 140" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={adrPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  />
                  {adrPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                  ))}
                </svg>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11.5px] text-slate-400">Peak demand: 24 Oct (95% Occupancy · ₹6,500 ADR)</span>
            <button
              type="button"
              onClick={() => go({ view: 'occupancy-report' })}
              className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>14-day projection report</span>
              <Lucide.ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Card: Room Status Overview - col-4 (rest col) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 shadow-2xs">
                  <Lucide.BedDouble size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Room Status Overview</h2>
                  <p className="text-[11px] text-slate-400">Current live inventory distribution</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
                50 Rooms
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-2">
              {/* SVG Donut Chart */}
              <div className="relative h-32 w-32 flex-none flex items-center justify-center">
                <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                  <circle cx="80" cy="80" r="60" fill="none" stroke="var(--color-primary)" strokeWidth="18" strokeDasharray="256.35 376.99" strokeDashoffset="0" />
                  <circle cx="80" cy="80" r="60" fill="none" stroke="#10b981" strokeWidth="18" strokeDasharray="75.40 376.99" strokeDashoffset="-256.35" />
                  <circle cx="80" cy="80" r="60" fill="none" stroke="#f59e0b" strokeWidth="18" strokeDasharray="30.16 376.99" strokeDashoffset="-331.75" />
                  <circle cx="80" cy="80" r="60" fill="none" stroke="#0ea5e9" strokeWidth="18" strokeDasharray="7.54 376.99" strokeDashoffset="-361.91" />
                  <circle cx="80" cy="80" r="60" fill="none" stroke="#ef4444" strokeWidth="18" strokeDasharray="7.54 376.99" strokeDashoffset="-369.45" />
                </svg>

                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-900 leading-none">50</span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">Total Rooms</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 truncate">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-primary)] flex-none" />
                    <span className="font-medium">34 Occupied</span>
                  </span>
                  <span className="font-bold text-slate-800">68%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#10b981] flex-none" />
                    <span className="font-medium">10 Available</span>
                  </span>
                  <span className="font-bold text-slate-800">20%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#f59e0b] flex-none" />
                    <span className="font-medium">4 Dirty</span>
                  </span>
                  <span className="font-bold text-slate-800">8%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#0ea5e9] flex-none" />
                    <span className="font-medium">1 Cleaning</span>
                  </span>
                  <span className="font-bold text-slate-800">2%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#ef4444] flex-none" />
                    <span className="font-medium">1 Out of order</span>
                  </span>
                  <span className="font-bold text-slate-800">2%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11.5px] text-slate-400">Available to sell: 10 units</span>
            <button
              type="button"
              onClick={() => go({ view: 'room-inventory' })}
              className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Room inventory</span>
              <Lucide.ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ================= 3. OPERATIONAL TIMELINE & DEPARTMENT TASKS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Today's Activity Timeline (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-xs shadow-indigo-500/20">
                  <Lucide.Clock size={17} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">Today&apos;s Activity Timeline</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      Live Feed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Real-time guest movements & operations</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => go({ view: 'arrivals-departures' })}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Front Desk</span>
                <Lucide.ArrowRight size={13} />
              </button>
            </div>

            {/* Filter Tabs (Segmented Control) */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 mb-4 overflow-x-auto no-scrollbar">
              {[
                { key: 'all' as const, label: 'All (5)' },
                { key: 'arrivals' as const, label: 'Arrivals (2)' },
                { key: 'departures' as const, label: 'Departures (1)' },
                { key: 'in-house' as const, label: 'In-House (2)' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTimelineTab(tab.key)}
                  className={`flex-1 min-w-[70px] py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center ${
                    timelineTab === tab.key
                      ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* True Timeline Stream with Connected Spine (Strictly limited to 5 records) */}
            <div className="flex flex-col">
              {filteredTimeline.slice(0, 5).map((item, index, arr) => {
                const ItemIcon = item.icon;
                const isLast = index === arr.length - 1;

                return (
                  <div key={item.id} className="relative flex items-start gap-3 group">
                    {/* Timeline spine track */}
                    <div className="flex flex-col items-center flex-none">
                      {/* Node squarcle */}
                      <div className={`flex h-8 w-8 items-center justify-center rounded-xl shadow-2xs transition-all duration-200 group-hover:scale-105 ${item.iconBg}`}>
                        <ItemIcon size={15} strokeWidth={2.2} />
                      </div>
                      {/* Connecting vertical rail */}
                      {!isLast && (
                        <div className="w-[2px] flex-1 my-1.5 bg-gradient-to-b from-slate-200 via-slate-200 to-slate-100 min-h-[34px]" />
                      )}
                    </div>

                    {/* Event Card */}
                    <div className={`flex-1 min-w-0 ${isLast ? 'pb-1' : 'pb-3.5'}`}>
                      <div className="p-3 rounded-xl border border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-2xs transition-all duration-200">
                        {/* Meta Row: Time, Room, Status, Action */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100/90 border border-slate-200/60 px-2 py-0.5 rounded-md shadow-2xs">
                              {item.time}
                            </span>
                            {item.room && (
                              <span className="text-[11px] font-semibold text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md">
                                {item.room}
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.statusTone}`}>
                              {item.status}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (item.actionLabel === 'Mark Done' || item.actionLabel === 'Mark Clean') {
                                toast('Housekeeping task updated', { detail: 'Room 204 marked clean.', tone: 'success' });
                              } else {
                                go(item.target);
                              }
                            }}
                            className={`flex-none text-xs font-semibold px-2.5 py-1 rounded-lg border shadow-2xs transition-all cursor-pointer hover:shadow-xs active:scale-95 flex items-center gap-1 ${item.actionTone}`}
                          >
                            <span>{item.actionLabel}</span>
                            <Lucide.ArrowRight size={12} />
                          </button>
                        </div>

                        {/* Title & Detail */}
                        <div className="mt-1.5">
                          <h4 className="text-[13px] font-bold text-slate-900 group-hover:text-[var(--color-primary)] transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-[11.5px] text-slate-500 mt-0.5 truncate">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Timeline Summary */}
          <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11.5px] text-slate-500 font-medium">
                Showing {filteredTimeline.slice(0, 5).length} of 5 operational activities
              </span>
            </div>
            <button
              type="button"
              onClick={() => go({ view: 'arrivals-departures' })}
              className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Movement report</span>
              <Lucide.ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Housekeeping & Department Tasks (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Card: Housekeeping Progress */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-200/60 shadow-2xs">
                  <Lucide.Sparkles size={16} strokeWidth={2.4} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Housekeeping Progress</h2>
                  <p className="text-[11px] text-slate-400">Turnaround status & inspection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => go({ view: 'housekeeping' })}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                View all
              </button>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl font-bold text-slate-900">18%</span>
              <span className="text-xs text-slate-500 font-normal">9 of 50 rooms cleaned</span>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-4">
              <div className="h-full rounded-full bg-[var(--color-primary)] w-[18%]" />
            </div>

            {/* 4 Stat Boxes */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2">
                <span className="text-[11px] font-medium text-emerald-800 block">✓ Cleaned</span>
                <span className="text-base font-bold text-emerald-900 mt-0.5 block">9</span>
              </div>
              <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-muted-surface)] p-2">
                <span className="text-[11px] font-medium text-[var(--color-primary)] block">In progress</span>
                <span className="text-base font-bold text-[var(--color-primary-active)] mt-0.5 block">6</span>
              </div>
              <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-2">
                <span className="text-[11px] font-medium text-slate-600 block">● Pending</span>
                <span className="text-base font-bold text-slate-800 mt-0.5 block">31</span>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-2">
                <span className="text-[11px] font-medium text-rose-800 block">! Issues</span>
                <span className="text-base font-bold text-rose-900 mt-0.5 block">4</span>
              </div>
            </div>
          </div>

          {/* Card: Department Tasks */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200/60 shadow-2xs">
                  <Lucide.ClipboardList size={16} strokeWidth={2.4} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Department Tasks</h2>
                  <p className="text-[11px] text-slate-400">Operational follow-ups & alerts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => go({ view: 'maintenance' })}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                View all
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Task 1 */}
              <div className="flex items-center justify-between gap-3 p-1 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-tight">4 rooms pending inspection</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">204, 305, 408, 501</p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-700 flex-none">
                  High
                </span>
              </div>

              {/* Task 2 */}
              <div className="flex items-center justify-between gap-3 p-1 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-tight">2 maintenance requests</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">AC issue · 305, TV issue · 118</p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-700 flex-none">
                  High
                </span>
              </div>

              {/* Task 3 */}
              <div className="flex items-center justify-between gap-3 p-1 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-tight">3 late check-outs</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">101, 305, 501</p>
                  </div>
                </div>
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10.5px] font-bold text-rose-700 flex-none">
                  Attention
                </span>
              </div>

              {/* Task 4 */}
              <div className="flex items-center justify-between gap-3 p-1 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-tight">1 VIP arrival today</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">Amelia Hart · Room 204</p>
                  </div>
                </div>
                <span className="rounded-full bg-[var(--color-muted-surface)] px-2.5 py-0.5 text-[10.5px] font-bold text-[var(--color-primary)] flex-none">
                  Info
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 4. FRONT DESK MOVEMENT: PENDING CHECK-INS & CHECK-OUTS ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 min-w-0">
        {/* Table 1: Pending Check-ins */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] p-4 sm:p-5 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 shadow-2xs">
                  <Lucide.DoorOpen size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Pending Check-ins</h2>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {pendingCheckins.length} Expected
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Today&apos;s arrivals awaiting front desk check-in</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => go({ view: 'check-in' })}
                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                title="Open Check-in Terminal"
              >
                <span>Terminal</span>
                <Lucide.ArrowUpRight size={13} className="text-slate-400" />
              </button>
            </div>

            {/* Table Container */}
            <TableContainer>
              <table className="pms-table w-full text-xs min-w-[580px] [&_th]:px-2.5 [&_th]:py-2.5 [&_td]:px-2.5 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5">
                <thead>
                  <tr>
                    <th className="w-8 text-center whitespace-nowrap">#</th>
                    <th className="whitespace-nowrap">GUEST & BOOKING</th>
                    <th className="whitespace-nowrap">ASSIGNED ROOM</th>
                    <th className="whitespace-nowrap">ETA & STAY</th>
                    <th className="whitespace-nowrap">FOLIO / TOTAL</th>
                    <th className="text-right whitespace-nowrap pr-3.5">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCheckins.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="text-center font-medium text-slate-400 text-xs whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar name={r.guest} size={30} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 text-xs truncate max-w-[125px]">{r.guest}</span>
                              {r.isVip && (
                                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  VIP
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10.5px] text-slate-400 block">{r.bookingCode}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-xs px-2 py-0.5 rounded-md border ${
                            r.room === 'Unassigned'
                              ? 'text-amber-800 bg-amber-50 border-amber-200/80'
                              : 'text-slate-800 bg-slate-100 border-slate-200/60'
                          }`}>
                            {r.room === 'Unassigned' ? 'Unassigned' : `Room ${r.room}`}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${r.roomReady ? 'text-emerald-600' : 'text-amber-600'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${r.roomReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {r.roomReady ? 'Ready' : 'Cleaning'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{r.roomType}</span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-700 text-xs block">{r.eta}</span>
                        <span className="text-[11px] text-slate-400 block">{r.dates} ({r.nights}n)</span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-xs font-mono block">
                          ₹{r.total.toLocaleString('en-IN')}.00
                        </span>
                        {r.balance === 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            <Lucide.CheckCircle2 size={10} /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Due ₹{r.balance.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>
                      <td className="text-right whitespace-nowrap pr-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            toast('Check-in Initiated', { detail: `Ready to check in ${r.guest} for Room ${r.room}.`, tone: 'success' });
                            go({ view: 'check-in' });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                        >
                          <Lucide.DoorOpen size={13} />
                          <span>Check in</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>Showing {pendingCheckins.length} expected arrivals today</span>
            <button
              type="button"
              onClick={() => go({ view: 'check-in' })}
              className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Open Check-in Terminal</span>
              <Lucide.ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Table 2: Pending Check-outs */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] p-4 sm:p-5 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 shadow-2xs">
                  <Lucide.DoorClosed size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Pending Check-outs</h2>
                    <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {pendingCheckouts.length} Due Out
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Departures scheduled today awaiting key return & folio balance</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => go({ view: 'check-out' })}
                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                title="Open Check-out Terminal"
              >
                <span>Terminal</span>
                <Lucide.ArrowUpRight size={13} className="text-slate-400" />
              </button>
            </div>

            {/* Table Container */}
            <TableContainer>
              <table className="pms-table w-full text-xs min-w-[580px] [&_th]:px-2.5 [&_th]:py-2.5 [&_td]:px-2.5 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5">
                <thead>
                  <tr>
                    <th className="w-8 text-center whitespace-nowrap">#</th>
                    <th className="whitespace-nowrap">GUEST & ROOM</th>
                    <th className="whitespace-nowrap">OUT TIME & STAY</th>
                    <th className="whitespace-nowrap">FOLIO BALANCE</th>
                    <th className="whitespace-nowrap text-center">STATUS</th>
                    <th className="text-right whitespace-nowrap pr-3.5">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCheckouts.map((d, idx) => (
                    <tr key={d.id}>
                      <td className="text-center font-medium text-slate-400 text-xs whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar name={d.guest} size={30} />
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 text-xs block truncate max-w-[130px]">{d.guest}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-bold text-slate-800 text-[11px] bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60">
                                Room {d.room}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate max-w-[110px]">{d.roomType}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-slate-700 text-xs block">{d.outTime}</span>
                          {d.isLateCheckout && (
                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Late
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{d.dates} ({d.nights}n)</span>
                      </td>
                      <td className="whitespace-nowrap">
                        {d.folioBalance === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                            <Lucide.CheckCircle2 size={12} />
                            <span>Settled (₹0)</span>
                          </span>
                        ) : (
                          <div>
                            <span className="font-bold text-rose-600 text-xs font-mono block">
                              ₹{d.folioBalance.toLocaleString('en-IN')}.00
                            </span>
                            <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5">
                              <Lucide.AlertCircle size={10} /> Pending balance
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-center">
                        <Badge tone={d.status === 'Inspected' ? 'success' : d.status === 'Late Checkout' ? 'info' : 'warning'}>
                          {d.status}
                        </Badge>
                      </td>
                      <td className="text-right whitespace-nowrap pr-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (d.folioBalance > 0) {
                              toast('Folio Balance Pending', { detail: `Collect ₹${d.folioBalance.toLocaleString('en-IN')} from ${d.guest} before closing folio.`, tone: 'warning' });
                            } else {
                              toast('Check-out Completed', { detail: `${d.guest} checked out from Room ${d.room}. Housekeeping alerted.`, tone: 'success' });
                            }
                            go({ view: 'check-out' });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                        >
                          <Lucide.DoorClosed size={13} />
                          <span>Check out</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>Showing {pendingCheckouts.length} departures pending today</span>
            <button
              type="button"
              onClick={() => go({ view: 'check-out' })}
              className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Open Check-out Terminal</span>
              <Lucide.ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ================= 5. RECENT ACTIVITY: RECENT RESERVATIONS & RECENT TRANSACTIONS ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 min-w-0">
        {/* Table 3: Recent Reservations */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] p-4 sm:p-5 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 shadow-2xs">
                  <Lucide.CalendarDays size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Reservations</h2>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
                      {recentReservations.length} Bookings
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Latest confirmed bookings & stays across property</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => go({ view: 'reservations' })}
                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>View all</span>
                <Lucide.ArrowRight size={13} className="text-slate-400" />
              </button>
            </div>

            {/* Table Container */}
            <TableContainer>
              <table className="pms-table w-full text-xs min-w-[580px] [&_th]:px-2.5 [&_th]:py-2.5 [&_td]:px-2.5 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5">
                <thead>
                  <tr>
                    <th className="w-8 text-center whitespace-nowrap">#</th>
                    <th className="whitespace-nowrap">GUEST & BOOKING</th>
                    <th className="whitespace-nowrap">ROOM & DATES</th>
                    <th className="whitespace-nowrap text-center">STATUS</th>
                    <th className="text-right whitespace-nowrap">TOTAL</th>
                    <th className="text-right w-12 whitespace-nowrap pr-3.5">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReservations.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="text-center font-medium text-slate-400 text-xs whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar name={r.guest} size={30} />
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 text-xs block truncate max-w-[130px]">{r.guest}</span>
                            <span className="font-mono text-[10.5px] text-slate-400 block">{r.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="font-medium text-slate-800 text-xs block">{r.room}</span>
                        <span className="text-[11px] text-slate-400 block">{r.dates}</span>
                      </td>
                      <td className="whitespace-nowrap text-center">
                        <Badge tone={r.status === 'Confirmed' ? 'success' : r.status === 'Pending' ? 'warning' : 'neutral'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="text-right font-bold text-slate-900 text-xs font-mono whitespace-nowrap">
                        ₹{r.total.toLocaleString('en-IN')}.00
                      </td>
                      <td className="text-right whitespace-nowrap pr-3.5">
                        <div className="flex items-center justify-end">
                          <TableActionBtn
                            icon={Lucide.Eye}
                            title="Open reservation"
                            onClick={() => go({ view: 'reservations', focusId: r.id })}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>Showing {recentReservations.length} recent bookings</span>
            <button
              type="button"
              onClick={() => go({ view: 'reservations' })}
              className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Manage all reservations</span>
              <Lucide.ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Table 4: Recent Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] p-4 sm:p-5 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200/70 shadow-2xs">
                  <Lucide.ReceiptText size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Transactions</h2>
                    <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200/60">
                      {recentPayments.length} Settlements
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Latest settled folios, payments & guest transactions</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => go({ view: 'payments' })}
                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
              >
                <span>View all</span>
                <Lucide.ArrowRight size={13} className="text-slate-400" />
              </button>
            </div>

            {/* Table Container */}
            <TableContainer>
              <table className="pms-table w-full text-xs min-w-[580px] [&_th]:px-2.5 [&_th]:py-2.5 [&_td]:px-2.5 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5">
                <thead>
                  <tr>
                    <th className="w-8 text-center whitespace-nowrap">#</th>
                    <th className="whitespace-nowrap">GUEST & REFERENCE</th>
                    <th className="whitespace-nowrap">DATE & METHOD</th>
                    <th className="whitespace-nowrap text-center">STATUS</th>
                    <th className="text-right whitespace-nowrap">AMOUNT</th>
                    <th className="text-right w-12 whitespace-nowrap pr-3.5">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p, idx) => (
                    <tr key={p.ref}>
                      <td className="text-center font-medium text-slate-400 text-xs whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar name={p.guest} size={30} />
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 text-xs block truncate max-w-[130px]">{p.guest}</span>
                            <span className="font-mono text-[10.5px] text-slate-400 block">{p.ref}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="font-medium text-slate-800 text-xs block">{p.date}</span>
                        <span className="text-[11px] text-slate-400 block">{p.method}</span>
                      </td>
                      <td className="whitespace-nowrap text-center">
                        <Badge tone={p.status === 'Paid' ? 'success' : 'warning'}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="text-right font-bold text-slate-900 text-xs font-mono whitespace-nowrap">
                        ₹{p.amount.toLocaleString('en-IN')}.00
                      </td>
                      <td className="text-right whitespace-nowrap pr-3.5">
                        <div className="flex items-center justify-end">
                          <TableActionBtn
                            icon={Lucide.FileText}
                            title="View transaction"
                            onClick={() => go({ view: 'payments' })}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>Showing {recentPayments.length} recent settlements</span>
            <button
              type="button"
              onClick={() => go({ view: 'payments' })}
              className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Manage all transactions</span>
              <Lucide.ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Internal Theme Swatcher modal fallback */}
      <ThemeSwatcher open={swatcherOpen} onClose={() => setSwatcherOpen(false)} />
    </div>
  );
}
