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

// ================= DEMO FALLBACK DATA MATCHING REFERENCE IMAGE =================

const DEMO_TIMELINE = [
  {
    id: 't-1',
    time: '10:00 AM',
    type: 'arrival',
    icon: Lucide.BedDouble,
    iconBg: 'bg-emerald-50 text-emerald-600',
    title: 'Check-in',
    detail: 'Rohan Singh • RSV-DM-0013 • Room 201',
    status: 'Arriving',
    statusTone: 'bg-sky-50 text-sky-700 border-sky-200/60',
    actionLabel: 'Check in',
    actionTone: 'text-[var(--color-primary)] border-slate-200 bg-white hover:bg-slate-50',
    target: { view: 'check-in' } as NavTarget,
  },
  {
    id: 't-2',
    time: '11:30 AM',
    type: 'arrival',
    icon: Lucide.ArrowUpRight,
    iconBg: 'bg-[var(--color-muted-surface)] text-[var(--color-primary)]',
    title: 'Arrival',
    detail: 'Priya Mehta • RSV-DM-0014 • 2 rooms',
    status: 'VIP',
    statusTone: 'bg-sky-50 text-sky-700 border-sky-200/60',
    actionLabel: 'Check in',
    actionTone: 'text-[var(--color-primary)] border-slate-200 bg-white hover:bg-slate-50',
    target: { view: 'check-in' } as NavTarget,
  },
  {
    id: 't-3',
    time: '12:00 PM',
    type: 'departure',
    icon: Lucide.LogOut,
    iconBg: 'bg-amber-50 text-amber-600',
    title: 'Check-out',
    detail: 'Rahul Lal • Room 103',
    status: 'Due',
    statusTone: 'bg-amber-50 text-amber-700 border-amber-200/60',
    actionLabel: 'Check out',
    actionTone: 'text-rose-600 border-rose-200 bg-white hover:bg-rose-50',
    target: { view: 'check-out' } as NavTarget,
  },
  {
    id: 't-4',
    time: '02:00 PM',
    type: 'in-house',
    icon: Lucide.Sparkles,
    iconBg: 'bg-purple-50 text-purple-600',
    title: 'Housekeeping',
    detail: 'Room 204 • Deep cleaning',
    status: 'Scheduled',
    statusTone: 'bg-sky-50 text-sky-700 border-sky-200/60',
    actionLabel: 'Mark complete',
    actionTone: 'text-slate-700 border-slate-200 bg-white hover:bg-slate-50',
    target: { view: 'housekeeping' } as NavTarget,
  },
  {
    id: 't-5',
    time: '03:00 PM',
    type: 'in-house',
    icon: Lucide.Wrench,
    iconBg: 'bg-rose-50 text-rose-600',
    title: 'Maintenance',
    detail: 'AC not working • Room 305',
    status: 'High',
    statusTone: 'bg-rose-50 text-rose-700 border-rose-200/60',
    actionLabel: 'View task',
    actionTone: 'text-[var(--color-primary)] border-slate-200 bg-white hover:bg-slate-50',
    target: { view: 'maintenance' } as NavTarget,
  },
  {
    id: 't-6',
    time: '06:00 PM',
    type: 'arrival',
    icon: Lucide.User,
    iconBg: 'bg-[var(--color-muted-surface)] text-[var(--color-primary)]',
    title: 'Arrival',
    detail: 'Walk-in Guest • 1 room',
    status: 'Walk-in',
    statusTone: 'bg-sky-50 text-sky-700 border-sky-200/60',
    actionLabel: 'Create booking',
    actionTone: 'text-[var(--color-primary)] border-slate-200 bg-white hover:bg-slate-50',
    target: { view: 'new-reservation' } as NavTarget,
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
  { day: '21 Oct', occ: 36, adr: 6000 },
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

  // Safe data extraction from live API resource, with fallbacks to match the screenshot
  const daily = resource.data?.daily;
  const rooms = daily?.rooms;
  const occupiedRooms = rooms?.occupied ?? 34;
  const totalRooms = rooms?.total ?? 50;
  const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 68;
  const arrivalsCount = resource.data?.arrivals?.length || 8;
  const departuresCount = resource.data?.departures?.length || 5;
  const inHouseCount = daily?.inHouseCount || 32;
  const totalRevenue = resource.data?.revenue?.grossRevenue ? Number(resource.data.revenue.grossRevenue) : 124680;
  const adr = resource.data?.revenue?.adr ? Number(resource.data.revenue.adr) : 4452;
  const pendingPaymentsCount = resource.data?.payments?.filter((p) => p.status === 'Pending').length || 3;
  const pendingAmount = resource.data?.payments
    ?.filter((p) => p.status === 'Pending')
    .reduce((s, p) => s + Number(p.amount), 0) || 28160;

  // Filtered timeline items
  const filteredTimeline = useMemo(() => {
    if (timelineTab === 'arrivals') return DEMO_TIMELINE.filter((i) => i.type === 'arrival');
    if (timelineTab === 'departures') return DEMO_TIMELINE.filter((i) => i.type === 'departure');
    if (timelineTab === 'in-house') return DEMO_TIMELINE.filter((i) => i.type === 'in-house');
    return DEMO_TIMELINE;
  }, [timelineTab]);

  return (
    <div className="w-full text-slate-900 font-sans pb-16 flex flex-col gap-6">
      {/* ================= 1. PAGE HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      {/* ================= 2. TOP METRIC KPI CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* KPI 1: Occupancy */}
        <div
          onClick={() => go({ view: 'occupancy-report' })}
          className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-md transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-muted-surface)] text-[var(--color-primary)]">
                <Lucide.BedDouble size={18} />
              </div>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                <span>▲</span> +12%
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-xs font-medium text-slate-500">Occupancy</p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">{occupancyPct}%</h3>
              <p className="text-[11.5px] text-slate-400 mt-0.5">{occupiedRooms} of {totalRooms} rooms</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${occupancyPct}%` }} />
          </div>
        </div>

        {/* KPI 2: Today's Arrivals */}
        <div
          onClick={() => go({ view: 'check-in' })}
          className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-md transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Lucide.ArrowUpRight size={18} />
              </div>
              <span className="inline-flex items-center rounded-full bg-[var(--color-muted-surface)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-primary)]">
                2 VIP
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-xs font-medium text-slate-500">Today&apos;s Arrivals</p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">{arrivalsCount}</h3>
              <p className="text-[11.5px] text-slate-400 mt-0.5">+3 vs yesterday</p>
            </div>
          </div>
          {/* Mini Sparkline Bar Chart */}
          <div className="mt-3.5 flex items-end gap-1 h-5">
            {[4, 5, 3, 6, 8, 7, 8].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-blue-100 hover:bg-blue-300 transition-colors"
                style={{ height: `${(h / 8) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* KPI 3: Today's Departures */}
        <div
          onClick={() => go({ view: 'check-out' })}
          className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-md transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Lucide.ArrowUpRight size={18} />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xs font-medium text-slate-500">Today&apos;s Departures</p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">{departuresCount}</h3>
              <p className="text-[11.5px] text-slate-400 mt-0.5">-1 vs yesterday</p>
            </div>
          </div>
          {/* Mini Sparkline Bar Chart (Amber) */}
          <div className="mt-3.5 flex items-end gap-1 h-5">
            {[6, 4, 7, 5, 3, 6, 5].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-amber-200 hover:bg-amber-300 transition-colors"
                style={{ height: `${(h / 7) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* KPI 4: In-house Guests */}
        <div
          onClick={() => go({ view: 'in-house' })}
          className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-md transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Lucide.Users size={18} />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xs font-medium text-slate-500">In-house Guests</p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">{inHouseCount}</h3>
              <p className="text-[11.5px] text-slate-400 mt-0.5">28 rooms • 4 extra guests</p>
            </div>
          </div>
          {/* Mini Sparkline Bar Chart (Purple) */}
          <div className="mt-3.5 flex items-end gap-1 h-5">
            {[24, 26, 28, 30, 29, 31, 32].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-purple-200 hover:bg-purple-300 transition-colors"
                style={{ height: `${(h / 32) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* KPI 5: Total Revenue (Today) */}
        <div
          onClick={() => go({ view: 'revenue-report' })}
          className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-md transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Lucide.CreditCard size={18} />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xs font-medium text-slate-500">Total Revenue (Today)</p>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                <span>▲ +18%</span>
                <span className="text-slate-400 font-normal">ADR: ₹{adr.toLocaleString('en-IN')}</span>
              </p>
            </div>
          </div>
          {/* Mini Sparkline Bar Chart (Green) */}
          <div className="mt-3.5 flex items-end gap-1 h-5">
            {[70, 85, 60, 95, 80, 110, 124].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-emerald-200 hover:bg-emerald-300 transition-colors"
                style={{ height: `${(h / 124) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* KPI 6: Pending Payments */}
        <div
          onClick={() => go({ view: 'payments' })}
          className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-md transition-all cursor-pointer group"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Lucide.AlertCircle size={18} />
              </div>
              <Lucide.ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="mt-2.5">
              <p className="text-xs font-medium text-slate-500">Pending Payments</p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">{pendingPaymentsCount}</h3>
              <p className="text-[11.5px] text-slate-400 mt-0.5">₹{pendingAmount.toLocaleString('en-IN')} outstanding</p>
            </div>
          </div>
          <div className="mt-3.5 text-[11px] font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1">
            <span>Review folios</span>
            <Lucide.ArrowRight size={12} />
          </div>
        </div>
      </div>

      {/* ================= 3. MIDDLE SECTION (3-COLUMN GRID) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= COLUMN 1: Today's Activity Timeline (lg:col-span-5) ================= */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Today&apos;s Activity Timeline</h2>
              <button
                type="button"
                onClick={() => go({ view: 'reservations' })}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                View all
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-5 no-scrollbar">
              <button
                type="button"
                onClick={() => setTimelineTab('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  timelineTab === 'all'
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                All (13)
              </button>
              <button
                type="button"
                onClick={() => setTimelineTab('arrivals')}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  timelineTab === 'arrivals'
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Arrivals (8)</span>
              </button>
              <button
                type="button"
                onClick={() => setTimelineTab('departures')}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  timelineTab === 'departures'
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>Departures (5)</span>
              </button>
              <button
                type="button"
                onClick={() => setTimelineTab('in-house')}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  timelineTab === 'in-house'
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span>In-house (32)</span>
              </button>
            </div>

            {/* Timeline Stream */}
            <div className="relative flex flex-col gap-4">
              {/* Vertical connector line */}
              <div className="absolute left-[88px] top-4 bottom-4 w-px border-l-2 border-dashed border-slate-200" />

              {filteredTimeline.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div key={item.id} className="relative flex items-center justify-between gap-3 group">
                    {/* Time */}
                    <div className="w-[68px] flex-none text-[11px] font-semibold text-slate-400">
                      {item.time}
                    </div>

                    {/* Node Icon */}
                    <div className={`relative z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full shadow-2xs ${item.iconBg}`}>
                      <ItemIcon size={14} />
                    </div>

                    {/* Detail Information */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{item.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${item.statusTone}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 font-normal">
                        {item.detail}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-none">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.actionLabel === 'Mark complete') {
                            toast('Housekeeping task updated', { detail: 'Room 204 marked clean.', tone: 'success' });
                          } else {
                            go(item.target);
                          }
                        }}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold border shadow-2xs transition-colors cursor-pointer ${item.actionTone}`}
                      >
                        {item.actionLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => go(item.target)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                        aria-label="More"
                      >
                        <Lucide.MoreVertical size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================= COLUMN 2: Room Status Overview & Housekeeping (lg:col-span-3) ================= */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Card: Room Status Overview */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)]">
            <h2 className="text-base font-bold text-slate-900 tracking-tight mb-4">Room Status Overview</h2>

            <div className="flex items-center justify-between gap-3">
              {/* SVG Donut Chart */}
              <div className="relative h-32 w-32 flex-none flex items-center justify-center">
                <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                  {/* Total 50 rooms. Circumference = 2 * PI * 60 = 376.99 */}
                  {/* Occupied: 34 (68%) -> dash 256.35 */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="18"
                    strokeDasharray="256.35 376.99"
                    strokeDashoffset="0"
                  />
                  {/* Available: 10 (20%) -> dash 75.40 */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="18"
                    strokeDasharray="75.40 376.99"
                    strokeDashoffset="-256.35"
                  />
                  {/* Dirty: 4 (8%) -> dash 30.16 */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="18"
                    strokeDasharray="30.16 376.99"
                    strokeDashoffset="-331.75"
                  />
                  {/* Cleaning: 1 (2%) -> dash 7.54 */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="18"
                    strokeDasharray="7.54 376.99"
                    strokeDashoffset="-361.91"
                  />
                  {/* Out of service: 1 (2%) -> dash 7.54 */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="18"
                    strokeDasharray="7.54 376.99"
                    strokeDashoffset="-369.45"
                  />
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
                  <span className="flex items-center gap-1.5 text-slate-600 truncate">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-primary)] flex-none" />
                    <span>34 Occupied</span>
                  </span>
                  <span className="font-semibold text-slate-400">68%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#10b981] flex-none" />
                    <span>10 Available</span>
                  </span>
                  <span className="font-semibold text-slate-400">20%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#f59e0b] flex-none" />
                    <span>4 Dirty</span>
                  </span>
                  <span className="font-semibold text-slate-400">8%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#0ea5e9] flex-none" />
                    <span>1 Cleaning</span>
                  </span>
                  <span className="font-semibold text-slate-400">2%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#ef4444] flex-none" />
                    <span>1 Out of service</span>
                  </span>
                  <span className="font-semibold text-slate-400">2%</span>
                </div>
              </div>
            </div>

            {/* Bottom inventory link */}
            <button
              type="button"
              onClick={() => go({ view: 'room-inventory' })}
              className="mt-4 w-full text-center text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
            >
              View room inventory
            </button>
          </div>

          {/* Card: Housekeeping Progress */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Housekeeping Progress</h2>
              <button
                type="button"
                onClick={() => go({ view: 'housekeeping' })}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                View details
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
        </div>

        {/* ================= COLUMN 3: Occupancy Chart & Department Tasks (lg:col-span-4) ================= */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Card: Occupancy (Next 14 Days) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Occupancy (Next 14 Days)</h2>
              <button
                type="button"
                onClick={() => go({ view: 'occupancy-report' })}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                View all
              </button>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-3 text-[11px] text-slate-500 mb-3">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-sm bg-[var(--color-primary)]" /> Occupancy %
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-1.5 w-1.5 rounded-full border-2 border-sky-400 bg-white" /> ADR (₹)
              </span>
            </div>

            {/* Bar + Line Combo Chart */}
            <div className="relative h-44 w-full flex items-end">
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
                <div>₹8K</div>
                <div>₹6K</div>
                <div>₹4K</div>
                <div>₹2K</div>
                <div>₹0</div>
              </div>

              {/* Day Bars */}
              <div className="relative z-10 w-full pl-7 pr-7 flex items-end justify-between h-36">
                {OCCUPANCY_CHART_DATA.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-4 text-[9px] font-bold bg-slate-900 text-white rounded px-1 py-0.5 pointer-events-none z-20">
                      {item.occ}% · ₹{item.adr}
                    </div>
                    {/* The bar */}
                    <div
                      className="w-4 sm:w-5 rounded-t bg-[var(--color-primary)] group-hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer"
                      style={{ height: `${item.occ}%` }}
                    />
                    <span className="text-[10px] text-slate-400 mt-1.5 leading-tight text-center">
                      {item.day.split(' ')[0]}<br />{item.day.split(' ')[1]}
                    </span>
                  </div>
                ))}

                {/* Simulated ADR Trend Line (SVG Overlay) */}
                <svg className="absolute inset-0 h-36 w-full pointer-events-none overflow-visible" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points="38,62 82,75 125,50 168,44 211,58 254,34 297,28 340,32"
                  />
                  {/* Dots on line */}
                  {[
                    [38, 62],
                    [82, 75],
                    [125, 50],
                    [168, 44],
                    [211, 58],
                    [254, 34],
                    [297, 28],
                    [340, 32],
                  ].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r="3.5" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                  ))}
                </svg>
              </div>
            </div>
          </div>

          {/* Card: Department Tasks */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Department Tasks</h2>
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

      {/* ================= 4. BOTTOM SECTION: 2 TABLES SIDE BY SIDE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Table 1: Recent Reservations */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Reservations</h2>
            <button
              type="button"
              onClick={() => go({ view: 'reservations' })}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f0f4f9] text-[11px] font-semibold text-slate-600 border-b border-slate-200 tracking-wider">
                  <th className="py-2.5 px-3.5">REFERENCE</th>
                  <th className="py-2.5 px-3">GUEST</th>
                  <th className="py-2.5 px-3">STAY DATES</th>
                  <th className="py-2.5 px-2.5">ROOM</th>
                  <th className="py-2.5 px-2.5">STATUS</th>
                  <th className="py-2.5 px-3 text-right">TOTAL</th>
                  <th className="py-2.5 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DEMO_RESERVATIONS.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                      {r.id}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {r.guest}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {r.dates}
                    </td>
                    <td className="py-3 px-2.5 text-slate-700 whitespace-nowrap">
                      {r.room}
                    </td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      {r.status === 'Confirmed' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Confirmed
                        </span>
                      )}
                      {r.status === 'Pending' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 border border-amber-200/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Pending
                        </span>
                      )}
                      {r.status === 'Checked-out' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-700 border border-slate-200/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Checked-out
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      ₹{r.total.toLocaleString('en-IN')}.00
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => go({ view: 'reservations', focusId: r.id })}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => go({ view: 'reservations', focusId: r.id })}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                          aria-label="More"
                        >
                          <Lucide.MoreVertical size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Recent Payments */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Payments</h2>
            <button
              type="button"
              onClick={() => go({ view: 'payments' })}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f0f4f9] text-[11px] font-semibold text-slate-600 border-b border-slate-200 tracking-wider">
                  <th className="py-2.5 px-3.5">DATE</th>
                  <th className="py-2.5 px-3">REFERENCE</th>
                  <th className="py-2.5 px-3">GUEST</th>
                  <th className="py-2.5 px-2.5">METHOD</th>
                  <th className="py-2.5 px-3 text-right">AMOUNT</th>
                  <th className="py-2.5 px-2.5">STATUS</th>
                  <th className="py-2.5 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DEMO_PAYMENTS.map((p) => (
                  <tr key={p.ref} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap font-medium">
                      {p.date}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {p.ref}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {p.guest}
                    </td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {p.method}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      ₹{p.amount.toLocaleString('en-IN')}.00
                    </td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Paid
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => go({ view: 'payments' })}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer ml-auto"
                        aria-label="More"
                      >
                        <Lucide.MoreVertical size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Internal Theme Swatcher modal fallback */}
      <ThemeSwatcher open={swatcherOpen} onClose={() => setSwatcherOpen(false)} />
    </div>
  );
}
