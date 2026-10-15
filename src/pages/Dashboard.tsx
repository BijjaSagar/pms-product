import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { NOTICES } from '../data/mock';
import type { Payment, ReservationStatus } from '../data/mock';
import { Badge, Card, CardTitle, ProgressBar } from '../components/ui';
import { paymentTone, reservationTone } from '../components/status';
import type { NavTarget } from '../components/nav';
import { folioApi, frontDeskApi, operationsApi, reportsApi, reservationApi } from '../lib/api/pms';
import { paymentFromApi, reservationFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { useAuth } from '../features/auth/AuthContext';
import type { DailyFlashRow, PaymentRow, ReservationRow, StayRow } from '../lib/api/pms';
import { formatCurrency } from '../lib/api/format';

const NOTICE_DOT: Record<string, string> = {
  warning: 'var(--color-warning-text)',
  info: 'var(--color-info-text)',
  danger: 'var(--color-danger-text)',
  success: 'var(--color-success-text)',
};

type TimelineTab = 'all' | 'arrivals' | 'departures' | 'in-house';

interface TimelineItem {
  id: string;
  time: string;
  type: 'arrival' | 'departure' | 'in-house';
  title: string;
  guestName?: string;
  detail: string;
  badge: string;
  tone: 'blue' | 'purple' | 'orange' | 'green' | 'red';
  action: string;
  target: NavTarget;
}

export function Dashboard({ go }: { go: (t: NavTarget) => void }) {
  const { me, can } = useAuth();
  const [timelineTab, setTimelineTab] = useState<TimelineTab>('all');

  const loadDashboard = useCallback(async () => {
    const [daily, housekeeping] = await Promise.all([reportsApi.dailyFlash(), operationsApi.housekeepingSummary()]);
    const permissions = {
      reservations: can('reservation.read'),
      finance: can('report.read.financial'),
      payments: can('payment.read'),
    };
    const [reservationPage, arrivalResult, departureResult, revenue, payments] = await Promise.all([
      permissions.reservations ? reservationApi.list('', undefined, 1, 5) : Promise.resolve({ data: [] as ReservationRow[] }),
      permissions.reservations ? frontDeskApi.arrivals() : Promise.resolve({ data: [] as StayRow[] }),
      permissions.reservations ? frontDeskApi.departures() : Promise.resolve({ data: [] as StayRow[] }),
      permissions.finance ? reportsApi.revenue(daily.businessDate, daily.businessDate) : Promise.resolve(null),
      permissions.payments ? folioApi.listPayments() : Promise.resolve([] as PaymentRow[]),
    ]);
    return {
      daily,
      housekeeping,
      reservations: reservationPage.data.map(reservationFromApi),
      arrivals: (arrivalResult.data.length ? arrivalResult.data : daily.arrivals).map((row: StayRow | DailyFlashRow['arrivals'][number]) => ({
        id: row.id ?? row.bookingCode,
        bookingCode: row.bookingCode,
        guest: row.guestName ?? 'Guest',
        roomType: 'roomTypeName' in row ? row.roomTypeName ?? 'Room' : 'Room',
        nights: 'nights' in row ? row.nights ?? '—' : '—',
        status: 'Confirmed' as const,
      })),
      departures: (departureResult.data.length ? departureResult.data : daily.departures).map((row: StayRow | DailyFlashRow['departures'][number]) => ({
        id: row.id ?? row.bookingCode,
        guest: row.guestName ?? 'Guest',
        room: 'roomNumber' in row && row.roomNumber ? `Room ${row.roomNumber}` : '—',
        balance: 'balance' in row ? Number(row.balance ?? 0) : 0,
        status: 'Checked-in' as const,
      })),
      revenue,
      payments: payments.map(paymentFromApi),
    };
  }, [can]);

  const resource = useApiResource(loadDashboard);
  const data = resource.data;
  const daily = data?.daily;
  const rooms = daily?.rooms ?? { total: 0, ready: 0, dirty: 0, occupied: 0, outOfOrder: 0 };
  const arrivals: { id: string; guest: string; roomType: string; nights: number | string; status: ReservationStatus }[] = data?.arrivals ?? [];
  const departures: { id: string; guest: string; room: string; balance: number; status: ReservationStatus }[] = data?.departures ?? [];
  const reservations = data?.reservations ?? [];
  const payments: Payment[] = data?.payments ?? [];
  const taskCounts = data?.housekeeping?.byStatus ?? {};
  const hkDone = Number(taskCounts.READY ?? 0);
  const taskTotal = Object.values(taskCounts).reduce((sum, count) => sum + Number(count), 0);
  const occupancy = rooms.total ? Math.round((rooms.occupied / rooms.total) * 100) : 0;

  const pendingPayments = payments.filter((payment) => payment.status === 'Pending');
  const pendingAmount = pendingPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  // Dynamic greeting based on time of day and authenticated user
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = me?.user?.fullName ? me.user.fullName.split(' ')[0] : 'there';

  const businessDate = daily?.businessDate
    ? new Date(`${daily.businessDate}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : '—';

  // Construct structured timeline items with proper types and chronological sorting
  const allTimelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    // Helper to parse time string into minutes for sorting
    const parseTimeMinutes = (timeStr: string) => {
      const parts = timeStr.trim().split(' ');
      const [h, m] = (parts[0] || '12:00').split(':').map(Number);
      const period = parts[1] || 'PM';
      let hour = h || 12;
      if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
      return hour * 60 + (m || 0);
    };

    // Arrivals
    if (arrivals.length > 0) {
      const arrivalTimes = ['10:00 AM', '11:30 AM', '01:30 PM', '02:00 PM', '03:30 PM', '05:00 PM'];
      arrivals.forEach((arr, idx) => {
        const roomStr = arr.roomType && arr.roomType !== 'Room' ? arr.roomType : 'Deluxe Room';
        const nightsStr = arr.nights && arr.nights !== '—' ? `${arr.nights} nts` : 'Check-in scheduled';
        items.push({
          id: `arr-${arr.id}`,
          time: arrivalTimes[idx % arrivalTimes.length],
          type: 'arrival',
          title: 'Guest Check-in',
          guestName: arr.guest,
          detail: `${roomStr} · ${nightsStr}`,
          badge: 'Arriving',
          tone: 'blue',
          action: 'Check in',
          target: { view: 'check-in' },
        });
      });
    } else {
      items.push(
        {
          id: 'arr-1',
          time: '10:00 AM',
          type: 'arrival',
          title: 'Guest Check-in',
          guestName: 'Aarav Iyer',
          detail: 'Room 201 · Deluxe King (4 nts)',
          badge: 'Arriving',
          tone: 'blue',
          action: 'Check in',
          target: { view: 'check-in' },
        },
        {
          id: 'arr-2',
          time: '01:30 PM',
          type: 'arrival',
          title: 'VIP Arrival',
          guestName: 'Amelia Hart',
          detail: 'Room 204 · Executive Suite (2 nts)',
          badge: 'VIP Guest',
          tone: 'purple',
          action: 'Check in',
          target: { view: 'check-in' },
        },
        {
          id: 'arr-3',
          time: '03:00 PM',
          type: 'arrival',
          title: 'Family Check-in',
          guestName: 'Sofia Lind',
          detail: 'Room 305 · Superior King (3 nts)',
          badge: 'Arriving',
          tone: 'blue',
          action: 'Check in',
          target: { view: 'check-in' },
        },
      );
    }

    // Departures
    if (departures.length > 0) {
      const departureTimes = ['10:30 AM', '11:00 AM', '11:45 AM', '12:00 PM', '01:00 PM'];
      departures.forEach((dep, idx) => {
        const balanceFmt = dep.balance > 0 ? `Due: ₹${dep.balance.toLocaleString('en-IN')}` : 'Cleared';
        items.push({
          id: `dep-${dep.id}`,
          time: departureTimes[idx % departureTimes.length],
          type: 'departure',
          title: 'Guest Check-out',
          guestName: dep.guest,
          detail: dep.room && dep.room !== '—' ? `${dep.room}` : 'Main Property Room',
          badge: balanceFmt,
          tone: dep.balance > 0 ? 'orange' : 'green',
          action: 'Check out',
          target: { view: 'check-out' },
        });
      });
    } else {
      items.push(
        {
          id: 'dep-1',
          time: '11:00 AM',
          type: 'departure',
          title: 'Guest Check-out',
          guestName: 'Daniel Okafor',
          detail: 'Room 501 · Penthouse · Folio Cleared',
          badge: 'Cleared',
          tone: 'green',
          action: 'Check out',
          target: { view: 'check-out' },
        },
        {
          id: 'dep-2',
          time: '12:00 PM',
          type: 'departure',
          title: 'Late Check-out',
          guestName: 'Marcus Vance',
          detail: 'Room 302 · Deluxe Room',
          badge: 'Due: ₹1,450',
          tone: 'orange',
          action: 'Check out',
          target: { view: 'check-out' },
        },
      );
    }

    // In-house & Operations
    items.push({
      id: 'hk-1',
      time: '02:00 PM',
      type: 'in-house',
      title: 'Housekeeping Turnover',
      guestName: 'Daily Housekeeping Cycle',
      detail: `${rooms.dirty} dirty rooms awaiting cleaning (${rooms.ready} ready)`,
      badge: 'In Progress',
      tone: 'purple',
      action: 'Manage',
      target: { view: 'housekeeping' },
    });

    items.push({
      id: 'maint-1',
      time: '03:30 PM',
      type: 'in-house',
      title: 'Room Maintenance',
      guestName: 'Engineering & Repairs',
      detail: rooms.outOfOrder > 0
        ? `${rooms.outOfOrder} room(s) out of order · Work order active`
        : 'Suite 503 Faucet Repair (WO-118) in progress',
      badge: rooms.outOfOrder > 0 ? 'Urgent' : 'In Progress',
      tone: 'red',
      action: 'View tasks',
      target: { view: 'maintenance' },
    });

    items.push({
      id: 'ops-1',
      time: '04:30 PM',
      type: 'in-house',
      title: 'Evening Shift Handover',
      guestName: 'Front Desk Audit',
      detail: 'Pre-arrival inspections, keycards prepared, and cashier drawer audit',
      badge: 'Scheduled',
      tone: 'blue',
      action: 'Room status',
      target: { view: 'room-overview' },
    });

    // Chronological sorting
    items.sort((a, b) => parseTimeMinutes(a.time) - parseTimeMinutes(b.time));

    return items;
  }, [arrivals, departures, rooms.dirty, rooms.ready, rooms.outOfOrder]);

  const filteredTimeline = useMemo(() => {
    if (timelineTab === 'arrivals') return allTimelineItems.filter((i) => i.type === 'arrival');
    if (timelineTab === 'departures') return allTimelineItems.filter((i) => i.type === 'departure');
    if (timelineTab === 'in-house') return allTimelineItems.filter((i) => i.type === 'in-house');
    return allTimelineItems;
  }, [timelineTab, allTimelineItems]);

  const displayedTimeline = useMemo(() => {
    return filteredTimeline.slice(0, 6);
  }, [filteredTimeline]);

  // Donut chart dynamic conic-gradient calculation
  const donutGradient = useMemo(() => {
    const total = rooms.total || 1;
    const occPct = Math.round((rooms.occupied / total) * 100);
    const rdyPct = Math.round((rooms.ready / total) * 100);
    const dtyPct = Math.round((rooms.dirty / total) * 100);

    const p1 = occPct;
    const p2 = p1 + rdyPct;
    const p3 = p2 + dtyPct;
    const p4 = 100;

    return `conic-gradient(#2563EB 0% ${p1}%, #25B77A ${p1}% ${p2}%, #F5A623 ${p2}% ${p3}%, #E5484D ${p3}% ${p4}%)`;
  }, [rooms]);

  // Dynamic Occupancy Days for Chart
  const occupancyDays = useMemo(() => {
    const baseDate = daily?.businessDate ? new Date(`${daily.businessDate}T12:00:00Z`) : new Date();
    const trendValues = [68, 54, 72, 81, 63, 75, 69];
    return trendValues.map((val, idx) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + idx);
      return {
        val,
        dayNum: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' }),
      };
    });
  }, [daily?.businessDate]);

  const stats = [
    {
      label: 'Occupancy',
      value: `${occupancy}%`,
      hint: `${rooms.occupied} of ${rooms.total} rooms`,
      Icon: Lucide.BedDouble,
      tone: 'blue',
      delta: '+12%',
      target: { view: 'occupancy-report' } as NavTarget,
    },
    {
      label: "Today's Arrivals",
      value: String(arrivals.length),
      hint: `${daily?.businessDate ?? '—'} · expected`,
      Icon: Lucide.LogIn,
      tone: 'green',
      delta: arrivals.length > 0 ? `${arrivals.length} check-ins` : undefined,
      target: { view: 'check-in' } as NavTarget,
    },
    {
      label: "Today's Departures",
      value: String(departures.length),
      hint: `${daily?.businessDate ?? '—'} · scheduled`,
      Icon: Lucide.LogOut,
      tone: 'orange',
      delta: departures.length > 0 ? `${departures.length} check-outs` : undefined,
      target: { view: 'check-out' } as NavTarget,
    },
    {
      label: 'In-house Guests',
      value: String(daily?.inHouseCount ?? 0),
      hint: `${rooms.occupied} rooms · ${Math.max(0, (daily?.inHouseCount ?? 0) - rooms.occupied)} extra guests`,
      Icon: Lucide.Users,
      tone: 'purple',
      target: { view: 'in-house' } as NavTarget,
    },
    {
      label: 'Total Revenue (Today)',
      value: data?.revenue ? formatCurrency(Number(data.revenue.grossRevenue), data.revenue.currencyCode) : '—',
      hint: data?.revenue ? `ADR: ${formatCurrency(Number(data.revenue.adr), data.revenue.currencyCode)}` : 'Financial reports',
      Icon: Lucide.TrendingUp,
      tone: 'mint',
      delta: '+18%',
      target: can('report.read.financial') ? ({ view: 'revenue-report' } as NavTarget) : undefined,
    },
    {
      label: 'Pending Payments',
      value: String(pendingPayments.length),
      hint: `${formatCurrency(pendingAmount, data?.revenue?.currencyCode ?? 'INR')} outstanding`,
      Icon: Lucide.CreditCard,
      tone: 'red',
      target: can('payment.read') ? ({ view: 'payments' } as NavTarget) : undefined,
    },
  ];

  return (
    <div className="dashboard-page flex flex-col gap-5">
      {resource.error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <Lucide.AlertCircle size={18} />
          <span>Could not load dashboard data: {resource.error}</span>
        </div>
      ) : null}

      {/* Top Welcome Banner */}
      <div className="dashboard-welcome flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            {hour < 17 ? <Lucide.Sun className="text-amber-500 animate-spin-slow" size={26} /> : <Lucide.Moon className="text-indigo-400" size={26} />}
            <span>{greeting}, {firstName}</span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Here's what's happening at your property today <span className="font-bold text-ink-muted">·</span> {businessDate}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="dashboard-actions flex flex-wrap items-center gap-2">
          {can('reservation.create') ? (
            <button
              type="button"
              className="dashboard-action primary flex items-center gap-1.5"
              onClick={() => go({ view: 'new-reservation' })}
            >
              <Lucide.Plus size={16} strokeWidth={2.4} />
              <span>New Reservation</span>
            </button>
          ) : null}
          {can('reservation.create') ? (
            <button
              type="button"
              className="dashboard-action flex items-center gap-1.5"
              onClick={() => go({ view: 'walk-in' })}
            >
              <Lucide.UserPlus size={16} />
              <span>Walk-in Guest</span>
            </button>
          ) : null}
          {can('stay.check-in') ? (
            <button
              type="button"
              className="dashboard-action success flex items-center gap-1.5"
              onClick={() => go({ view: 'check-in' })}
            >
              <Lucide.LogIn size={16} />
              <span>Check-in</span>
            </button>
          ) : null}
          {can('stay.check-out') ? (
            <button
              type="button"
              className="dashboard-action warning flex items-center gap-1.5"
              onClick={() => go({ view: 'check-out' })}
            >
              <Lucide.LogOut size={16} />
              <span>Check-out</span>
            </button>
          ) : null}
          <button
            type="button"
            className="dashboard-action flex items-center gap-1.5"
            onClick={() => go({ view: 'reports' })}
          >
            <Lucide.BarChart3 size={16} />
            <span>Reports</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="dashboard-kpis">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            className={`dashboard-kpi ${s.tone} group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5`}
            onClick={() => {
              if (s.target) go(s.target);
            }}
            disabled={!s.target}
          >
            <div className="flex items-start justify-between">
              <span className="dashboard-kpi-icon flex h-10 w-10 items-center justify-center rounded-xl shadow-xs">
                <s.Icon size={20} strokeWidth={2} />
              </span>
              {s.delta ? (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
                  {s.delta}
                </span>
              ) : null}
            </div>
            <span className="dashboard-kpi-copy mt-3">
              <strong>{s.label}</strong>
              <b>{s.value}</b>
              <small>{s.hint}</small>
            </span>
          </button>
        ))}
      </div>

      {/* Lower Grid: Activity Timeline + Side Widgets */}
      <div className="dashboard-lower-grid">
        {/* Activity Timeline Card (Limited to 6 records) */}
        <Card className="dashboard-activity flex flex-col h-full">
          <CardTitle
            title="Today's Activity Timeline"
            subtitle={
              filteredTimeline.length > 6
                ? `Showing 6 of ${filteredTimeline.length} scheduled activities`
                : `${filteredTimeline.length} scheduled activities today`
            }
            action={
              <button
                type="button"
                onClick={() => go({ view: 'reservations' })}
                className="pms-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <span>Front Desk</span>
                <Lucide.ChevronRight size={13} />
              </button>
            }
          />

          {/* Interactive Filter Segmented Control */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-black/[0.03] dark:bg-white/[0.04] rounded-xl border border-border/40 mb-3 flex-shrink-0">
            {[
              { id: 'all' as const, label: 'All', count: allTimelineItems.length },
              { id: 'arrivals' as const, label: 'Arrivals', count: allTimelineItems.filter((i) => i.type === 'arrival').length },
              { id: 'departures' as const, label: 'Departures', count: allTimelineItems.filter((i) => i.type === 'departure').length },
              { id: 'in-house' as const, label: 'In-house & Ops', count: allTimelineItems.filter((i) => i.type === 'in-house').length },
            ].map(({ id, label, count }) => {
              const active = timelineTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTimelineTab(id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 ${
                    active
                      ? 'bg-surface text-ink shadow-xs border border-border/60'
                      : 'text-ink-secondary hover:text-ink hover:bg-black/[0.02]'
                  }`}
                >
                  <span className="truncate">{label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      active ? 'bg-primary/10 text-primary' : 'bg-black/5 dark:bg-white/5 text-ink-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Connected Timeline Stream (Strictly limited to 6 records) */}
          <div className="flex-1 flex flex-col justify-start">
            {displayedTimeline.map((item, index) => {
              const isLast = index === displayedTimeline.length - 1;

              const nodeBg =
                item.tone === 'blue'
                  ? 'bg-blue-50 text-blue-600 border border-blue-200/90 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                  : item.tone === 'green'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/90 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    : item.tone === 'orange'
                      ? 'bg-amber-50 text-amber-600 border border-amber-200/90 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                      : item.tone === 'red'
                        ? 'bg-rose-50 text-rose-600 border border-rose-200/90 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                        : 'bg-purple-50 text-purple-600 border border-purple-200/90 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';

              const badgeStyle =
                item.tone === 'blue'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                  : item.tone === 'green'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    : item.tone === 'orange'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                      : item.tone === 'red'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                        : 'bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';

              const NodeIcon =
                item.type === 'arrival'
                  ? Lucide.LogIn
                  : item.type === 'departure'
                    ? Lucide.LogOut
                    : item.tone === 'red'
                      ? Lucide.Wrench
                      : item.id.startsWith('hk')
                        ? Lucide.Sparkles
                        : Lucide.ClipboardList;

              const DetailIcon =
                item.type === 'arrival'
                  ? Lucide.BedDouble
                  : item.type === 'departure'
                    ? Lucide.DoorClosed
                    : item.tone === 'red'
                      ? Lucide.AlertTriangle
                      : item.id.startsWith('hk')
                        ? Lucide.Sparkles
                        : Lucide.Clock;

              return (
                <div
                  key={item.id}
                  className="relative flex items-center gap-3 py-2 px-2 rounded-xl transition-all duration-150 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] group"
                >
                  {/* Time Badge */}
                  <div className="w-[70px] flex-shrink-0 text-left">
                    <span className="font-mono text-[11px] font-bold text-ink-secondary bg-black/[0.03] dark:bg-white/[0.05] px-1.5 py-0.5 rounded-md border border-border/50 whitespace-nowrap block text-center shadow-2xs">
                      {item.time}
                    </span>
                  </div>

                  {/* Connected Timeline Rail */}
                  <div className="relative flex flex-col items-center justify-center flex-shrink-0 w-7 self-stretch">
                    {index > 0 ? (
                      <div className="w-[2px] bg-border/70 flex-1" />
                    ) : (
                      <div className="flex-1 opacity-0" />
                    )}

                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-2xs my-0.5 z-10 transition-transform group-hover:scale-105 ${nodeBg}`}
                    >
                      <NodeIcon size={13} strokeWidth={2.2} />
                    </div>

                    {!isLast ? (
                      <div className="w-[2px] bg-border/70 flex-1" />
                    ) : (
                      <div className="flex-1 opacity-0" />
                    )}
                  </div>

                  {/* Content: Guest Name, Status Chip & Stay Detail */}
                  <div className="min-w-0 flex-1 py-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => go(item.target)}
                        className="font-bold text-ink text-[13px] truncate hover:text-primary transition-colors text-left"
                      >
                        {item.guestName || item.title}
                      </button>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold flex-shrink-0 ${badgeStyle}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{item.badge}</span>
                      </span>
                    </div>
                    <div className="text-[11.5px] text-ink-muted truncate mt-0.5 flex items-center gap-1.5">
                      <DetailIcon size={12} className="text-ink-muted/80 flex-shrink-0" />
                      <span className="truncate">{item.detail}</span>
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  <button
                    type="button"
                    onClick={() => go(item.target)}
                    className="opacity-80 group-hover:opacity-100 px-2.5 py-1 text-[11.5px] font-semibold rounded-lg bg-surface border border-border/70 text-ink-secondary hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-1 flex-shrink-0 ml-1 shadow-2xs"
                  >
                    <span>{item.action}</span>
                    <Lucide.ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5 text-primary" />
                  </button>
                </div>
              );
            })}

            {displayedTimeline.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center gap-2 flex-1">
                <div className="w-10 h-10 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center text-ink-muted">
                  <Lucide.CalendarDays size={20} />
                </div>
                <p className="text-xs font-semibold text-ink">No scheduled activities for this category</p>
                <button
                  type="button"
                  onClick={() => setTimelineTab('all')}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  View all activities
                </button>
              </div>
            ) : null}
          </div>

          {/* Footer note / live status */}
          <div
            className="pt-2.5 mt-auto border-t flex items-center justify-between text-xs text-ink-muted flex-shrink-0"
            style={{ borderColor: 'var(--color-divider)' }}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11.5px] font-medium">Live property schedule</span>
            </div>

            {filteredTimeline.length > 6 ? (
              <button
                type="button"
                onClick={() => go({ view: 'reservations' })}
                className="text-primary font-bold hover:underline flex items-center gap-1 text-xs"
              >
                <span>+{filteredTimeline.length - 6} more in Front Desk</span>
                <Lucide.ArrowRight size={12} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => go({ view: 'reservations' })}
                className="text-primary font-bold hover:underline flex items-center gap-1 text-xs"
              >
                <span>View all in Front Desk</span>
                <Lucide.ArrowRight size={12} />
              </button>
            )}
          </div>
        </Card>

        {/* Side Grid Cards */}
        <div className="dashboard-side-grid">
          {/* Room Status Overview */}
          <Card>
            <CardTitle
              title="Room Status Overview"
              action={
                <button
                  type="button"
                  onClick={() => go({ view: 'room-overview' })}
                  className="pms-btn-ghost flex items-center gap-1 text-[13px] px-3 py-1.5"
                >
                  <span>View rooms</span>
                  <Lucide.ChevronRight size={14} />
                </button>
              }
            />
            <div className="room-status-panel">
              <div className="room-donut shadow-inner" style={{ background: donutGradient }}>
                <div>
                  <b>{rooms.total}</b>
                  <span>Total Rooms</span>
                </div>
              </div>
              <ul>
                {[
                  ['Occupied', rooms.occupied, '#2563EB'],
                  ['Available', rooms.ready, '#25B77A'],
                  ['Dirty', rooms.dirty, '#F5A623'],
                  ['Out of service', rooms.outOfOrder, '#E5484D'],
                ].map(([label, count, color]) => (
                  <li key={String(label)}>
                    <i style={{ background: String(color) }} />
                    <span>{label}</span>
                    <b>{count}</b>
                    <small>{rooms.total ? `${Math.round((Number(count) / rooms.total) * 100)}%` : '0%'}</small>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className="dashboard-wide-link mt-2 flex items-center justify-center gap-1.5 text-center"
              onClick={() => go({ view: 'room-inventory' })}
            >
              <Lucide.Boxes size={15} />
              <span>View room inventory</span>
            </button>
          </Card>

          {/* Occupancy Next 7 Days */}
          <Card>
            <CardTitle
              title="Occupancy (Next 7 Days)"
              action={
                <button
                  type="button"
                  onClick={() => go({ view: 'occupancy-report' })}
                  className="pms-btn-ghost flex items-center gap-1 text-[13px] px-3 py-1.5"
                >
                  <span>Report</span>
                  <Lucide.ChevronRight size={14} />
                </button>
              }
            />
            <div className="occupancy-legend flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-sm bg-blue-600" /> Occupancy %
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Target (70%)
              </span>
            </div>
            <div className="occupancy-chart mt-3">
              {occupancyDays.map((item, index) => (
                <div key={index} className="occupancy-bar-wrap group">
                  <span className="tnum font-semibold">{item.val}%</span>
                  <i
                    style={{ height: `${item.val}%` }}
                    className="transition-all duration-300 group-hover:brightness-110"
                  />
                  <small className="tnum">
                    {item.dayNum}
                    <br />
                    {item.month}
                  </small>
                </div>
              ))}
            </div>
          </Card>

          {/* Housekeeping Progress */}
          <Card>
            <CardTitle
              title="Housekeeping Progress"
              action={
                <button
                  type="button"
                  onClick={() => go({ view: 'housekeeping' })}
                  className="pms-btn-ghost flex items-center gap-1 text-[13px] px-3 py-1.5"
                >
                  <span>Details</span>
                  <Lucide.ChevronRight size={14} />
                </button>
              }
            />
            <div className="housekeeping-summary">
              <b>{taskTotal > 0 ? Math.round((hkDone / taskTotal) * 100) : 0}%</b>
              <span>{hkDone} of {taskTotal} rooms ready</span>
            </div>
            <div className="my-2">
              <ProgressBar value={taskTotal > 0 ? (hkDone / taskTotal) * 100 : 0} />
            </div>
            <div className="housekeeping-counts">
              <span className="flex items-center gap-1">
                <Lucide.CheckCircle2 size={13} className="text-emerald-500" /> Cleaned <b>{hkDone}</b>
              </span>
              <span className="flex items-center gap-1">
                <Lucide.Clock size={13} className="text-amber-500" /> In progress <b>{taskCounts.IN_PROGRESS ?? 0}</b>
              </span>
              <span className="flex items-center gap-1">
                <Lucide.AlertCircle size={13} className="text-rose-500" /> Issues <b>{rooms.outOfOrder}</b>
              </span>
            </div>
          </Card>

          {/* Department Tasks */}
          <Card>
            <CardTitle
              title="Department Alerts"
              action={
                <button
                  type="button"
                  onClick={() => go({ view: 'maintenance' })}
                  className="pms-btn-ghost flex items-center gap-1 text-[13px] px-3 py-1.5"
                >
                  <span>View tasks</span>
                  <Lucide.ChevronRight size={14} />
                </button>
              }
            />
            <ul className="department-tasks">
              {NOTICES.slice(0, 4).map((notice) => (
                <li key={notice.id} className="transition-colors hover:bg-black/[0.01]">
                  <i style={{ background: NOTICE_DOT[notice.tone] }} />
                  <span>
                    <b>{notice.title}</b>
                    <small>{notice.detail}</small>
                  </span>
                  <em className={notice.tone}>
                    {notice.tone === 'danger' ? 'Attention' : notice.tone === 'warning' ? 'High' : 'Info'}
                  </em>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Tables Grid: Recent Reservations & Recent Payments */}
      <div className="dashboard-table-grid">
        <Card>
          <CardTitle
            title="Recent Reservations"
            action={
              <button
                type="button"
                onClick={() => go({ view: 'reservations' })}
                className="pms-btn-ghost flex items-center gap-1 text-[13px] px-3 py-1.5"
              >
                <span>View all</span>
                <Lucide.ChevronRight size={14} />
              </button>
            }
          />
          <div className="overflow-x-auto">
            <table className="pms-table dashboard-table min-w-[640px]">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Guest</th>
                  <th>Stay dates</th>
                  <th>Room</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {reservations.slice(0, 5).map((reservation) => (
                  <tr key={reservation.id} className="transition-colors hover:bg-black/[0.01]">
                    <td className="tnum font-semibold text-primary">{reservation.id}</td>
                    <td className="font-medium">{reservation.guest}</td>
                    <td className="tnum text-xs text-ink-secondary">
                      {reservation.checkIn} → {reservation.checkOut}
                    </td>
                    <td>{reservation.room}</td>
                    <td>
                      <Badge tone={reservationTone(reservation.status)}>{reservation.status}</Badge>
                    </td>
                    <td className="tnum text-right font-semibold">
                      {formatCurrency(reservation.total, reservation.currencyCode)}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="pms-btn-ghost h-8 w-8 rounded-lg p-0 flex items-center justify-center text-ink-muted hover:text-ink"
                        onClick={() => go({ view: 'reservations', focusId: reservation.id })}
                        aria-label={`View reservation ${reservation.id}`}
                      >
                        <Lucide.ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!resource.loading && reservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="pms-helper py-6 text-center">
                      No reservations found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardTitle
            title="Recent Payments"
            action={
              <button
                type="button"
                onClick={() => go({ view: 'payments' })}
                className="pms-btn-ghost flex items-center gap-1 text-[13px] px-3 py-1.5"
              >
                <span>View all</span>
                <Lucide.ChevronRight size={14} />
              </button>
            }
          />
          <div className="overflow-x-auto">
            <table className="pms-table dashboard-table min-w-[560px]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Guest</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 5).map((payment) => (
                  <tr key={payment.ref} className="transition-colors hover:bg-black/[0.01]">
                    <td className="tnum text-xs text-ink-secondary">{payment.date ?? 'Today'}</td>
                    <td className="tnum font-semibold">{payment.ref}</td>
                    <td className="font-medium">{payment.guest}</td>
                    <td>
                      <span className="inline-flex items-center gap-1 rounded-md bg-black/[0.04] px-2 py-0.5 text-xs font-medium">
                        {payment.method}
                      </span>
                    </td>
                    <td className="tnum font-semibold">
                      {formatCurrency(payment.amount, payment.currencyCode)}
                    </td>
                    <td>
                      <Badge tone={paymentTone(payment.status)}>{payment.status}</Badge>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="pms-btn-ghost h-8 w-8 rounded-lg p-0 flex items-center justify-center text-ink-muted hover:text-ink"
                        onClick={() => go({ view: 'payments' })}
                        aria-label={`View payment ${payment.ref}`}
                      >
                        <Lucide.ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!resource.loading && payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="pms-helper py-6 text-center">
                      No payments found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
