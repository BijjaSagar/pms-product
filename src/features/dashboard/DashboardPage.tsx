import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import type { NavTarget } from '../../config/navigation';
import { folioApi, frontDeskApi, operationsApi, reportsApi, reservationApi } from '../../lib/api/pms';
import { paymentFromApi, reservationFromApi } from '../../lib/api/adapters';
import { useApiResource } from '../../lib/api/useApiResource';
import { useAuth } from '../../features/auth/AuthContext';
import type { PaymentRow, ReservationRow, StayRow } from '../../lib/api/pms';
import { toast } from '../../utils/toast';
import { Avatar, Badge, TableActionBtn, TableContainer } from '../../components/ui';

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
    iconBg: 'bg-success-bg text-success-text border border-success-border',
    title: 'Rohan Singh',
    subtitle: 'RSV-DM-0013 • Deluxe King',
    room: 'Room 201',
    status: 'Arriving',
    statusTone: 'bg-success-bg text-success-text border-success-border/60',
    actionLabel: 'View booking',
    actionTone: 'text-success-text bg-success-bg/80 hover:bg-success-bg border-success-border',
    target: { view: 'reservations' },
  },
  {
    id: 't-2',
    time: '11:30 AM',
    type: 'arrival',
    icon: Lucide.Sparkles,
    iconBg: 'bg-primary/10 text-primary border border-primary/30',
    title: 'Priya Mehta',
    subtitle: 'RSV-DM-0014 • VIP Welcome Amenity',
    room: 'Room 302',
    status: 'VIP Elite',
    statusTone: 'bg-primary/10 text-primary border-primary/30',
    actionLabel: 'View booking',
    actionTone: 'text-primary bg-primary/10 hover:bg-primary/10 border-primary/30',
    target: { view: 'reservations' },
  },
  {
    id: 't-3',
    time: '12:00 PM',
    type: 'departure',
    icon: Lucide.DoorClosed,
    iconBg: 'bg-warning-bg text-warning-text border border-warning-border',
    title: 'Rahul Lal',
    subtitle: 'RSV-DM-0010 • Folio Settled',
    room: 'Room 103',
    status: 'Due Out',
    statusTone: 'bg-warning-bg text-warning-text border-warning-border/60',
    actionLabel: 'Open folio',
    actionTone: 'text-warning-text bg-warning-bg/80 hover:bg-warning-bg border-warning-border',
    target: { view: 'folios' },
  },
  {
    id: 't-4',
    time: '02:00 PM',
    type: 'in-house',
    icon: Lucide.Sparkles,
    iconBg: 'bg-info-bg text-info-text border border-info-border',
    title: 'Deep Cleaning & Sanitization',
    subtitle: 'Assigned: Anita S. • Due 02:45 PM',
    room: 'Room 204',
    status: 'Cleaning',
    statusTone: 'bg-info-bg text-info-text border-info-border/60',
    actionLabel: 'Mark Done',
    actionTone: 'text-ink bg-page hover:bg-muted-surface border-border',
    target: { view: 'room-overview' } as NavTarget,
  },
  {
    id: 't-5',
    time: '03:00 PM',
    type: 'in-house',
    icon: Lucide.Wrench,
    iconBg: 'bg-danger-bg text-danger-text border border-danger-border',
    title: 'AC Thermostat Calibration',
    subtitle: 'Reported by Guest • Priority Urgent',
    room: 'Room 305',
    status: 'High Priority',
    statusTone: 'bg-danger-bg text-danger-text border-danger-border/60',
    actionLabel: 'Assign Tech',
    actionTone: 'text-danger-text bg-danger-bg/80 hover:bg-danger-bg border-danger-border',
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


export function Dashboard({ go }: { go: (t: NavTarget) => void }) {
  const { me, can } = useAuth();
  const [timelineTab, setTimelineTab] = useState<'all' | 'arrivals' | 'departures' | 'in-house'>('all');

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

  const arrivals = resource.data?.arrivals;
  const departures = resource.data?.departures;
  const reservations = resource.data?.reservations;
  const payments = resource.data?.payments;
  const roomReadiness = resource.data?.housekeeping?.rooms;
  const readyRooms = roomReadiness?.ready ?? 0;
  const totalRoomCount = roomReadiness?.total ?? 0;
  const readyPct = totalRoomCount > 0 ? Math.round((readyRooms / totalRoomCount) * 100) : 0;

  const pendingCheckins = useMemo(() => {
    if (arrivals && arrivals.length > 0) {
      return arrivals.slice(0, 5).map((a) => ({
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
        status: (a.status as 'Confirmed' | 'Pending' | 'Checked-in' | 'Checked-out' | 'Cancelled' | 'No-show') || 'Confirmed',
      }));
    }
    return DEMO_PENDING_CHECKINS;
  }, [arrivals]);

  const pendingCheckouts = useMemo(() => {
    if (departures && departures.length > 0) {
      return departures.slice(0, 5).map((d) => ({
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
  }, [departures]);

  const recentReservations = useMemo(() => {
    if (reservations && reservations.length > 0) {
      return reservations.slice(0, 5).map((r) => ({
        id: r.bookingCode || r.id,
        guest: r.guest,
        dates: `${r.checkIn} – ${r.checkOut}`,
        room: r.room || 'Unassigned',
        status: r.status,
        total: r.total,
      }));
    }
    return DEMO_RESERVATIONS;
  }, [reservations]);

  const recentPayments = useMemo(() => {
    if (payments && payments.length > 0) {
      return payments.slice(0, 5).map((p) => ({
        date: p.date,
        ref: p.ref,
        guest: p.guest,
        method: p.method,
        amount: p.amount,
        status: p.status,
      }));
    }
    return DEMO_PAYMENTS;
  }, [payments]);


  return (
    <div className="w-full text-xs text-ink font-sans pb-8 flex flex-col gap-4">
      {/* ================= 1. PAGE HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Welcome Title */}
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-warning-bg text-warning-text shadow-2xs mt-0.5">
            <Lucide.Sun size={26} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-ink leading-tight">
              Good morning, {me?.user.fullName ? me.user.fullName.split(' ')[0] : 'Admin'}
            </h1>
            <p className="text-xs text-ink-secondary mt-1 font-normal">
              Here&apos;s what&apos;s happening at your hotel today <span className="text-ink-muted">•</span> October 14, 2026
            </p>
          </div>
        </div>

      </div>


      {/* ================= 3. OPERATIONAL TIMELINE & DEPARTMENT TASKS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Today's Activity Timeline (lg:col-span-6) */}
        <div className="lg:col-span-6 bg-surface rounded-2xl border border-border/80 p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-divider">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
                  <Lucide.Clock size={17} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[14px] font-bold text-ink tracking-tight">Today&apos;s Activity Timeline</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-bold text-success-text border border-success-border/60">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-text opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-text"></span>
                      </span>
                      Live Feed
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">Real-time guest movements & operations</p>
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
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted-surface/80 mb-4 overflow-x-auto no-scrollbar">
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
                  className={`flex-1 min-w-[70px] py-1.5 text-[12px] font-semibold rounded-lg transition-all cursor-pointer text-center ${timelineTab === tab.key
                    ? 'bg-surface text-ink shadow-2xs font-bold border border-border/50'
                    : 'text-ink-secondary hover:text-ink'
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
                        <div className="w-[2px] flex-1 my-1.5 bg-gradient-to-b from-border via-border to-muted-surface min-h-[34px]" />
                      )}
                    </div>

                    {/* Event Card */}
                    <div className={`flex-1 min-w-0 ${isLast ? 'pb-1' : 'pb-3.5'}`}>
                      <div className="p-3 rounded-xl border border-border/70 bg-surface hover:border-ink-disabled hover:bg-page/50 hover:shadow-2xs transition-all duration-200">
                        {/* Meta Row: Time, Room, Status, Action */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="font-mono text-xs font-bold text-ink bg-muted-surface/90 border border-border/60 px-2 py-0.5 rounded-md shadow-2xs">
                              {item.time}
                            </span>
                            {item.room && (
                              <span className="text-xs font-semibold text-ink bg-muted-surface/80 px-2 py-0.5 rounded-md">
                                {item.room}
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${item.statusTone}`}>
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
                          <h4 className="text-[13px] font-bold text-ink group-hover:text-[var(--color-primary)] transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-xs text-ink-secondary mt-0.5 truncate">
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
          <div className="pt-3.5 mt-3 border-t border-divider flex items-center justify-between text-xs text-ink-secondary">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success-text" />
              <span className="text-xs text-ink-secondary font-medium">
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

        {/* Housekeeping & Department Tasks (lg:col-span-6) */}
        <div className="lg:col-span-6 flex flex-col gap-5 h-full">

          <div className="bg-surface rounded-2xl border border-border shadow-xs p-4 sm:p-5 flex flex-col justify-between min-w-0">
            <div className="min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-divider">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-success-text to-success-border text-white shadow-xs shadow-success-text/20">
                    <Lucide.DoorOpen size={17} strokeWidth={2.4} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[14px] font-bold text-ink tracking-tight">Pending Check-ins</h2>
                      <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-bold text-success-text border border-success-border/60">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-text opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-text"></span>
                        </span>
                        {pendingCheckins.length} Expected
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">Today&apos;s arrivals awaiting front desk check-in</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => go({ view: 'reservations' })}
                  className="rounded-lg border border-border bg-surface hover:bg-muted-surface px-3 py-1.5 text-xs font-medium text-ink cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                  title="Open reservations"
                >
                  <span>Reservations</span>
                  <Lucide.ArrowUpRight size={14} className="text-ink-secondary" />
                </button>
              </div>

              {/* Table Container */}
              <TableContainer>
                <table className="pms-table w-full min-w-[580px] [&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5">
                  <thead>
                    <tr>
                      <th className="text-center whitespace-nowrap text-[12px] font-semibold">#</th>
                      <th className="whitespace-nowrap text-[12px] ">Guest & Booking</th>
                      <th className="whitespace-nowrap text-[12px] font-semibold">Assigned Room</th>
                      <th className="whitespace-nowrap text-[12px] font-semibold">ETA & Stay</th>
                      <th className="text-right whitespace-nowrap pr-3.5 text-[12px] font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCheckins.map((r, idx) => (
                      <tr key={r.id}>
                        <td className="text-center font-medium text-ink-secondary text-xs whitespace-nowrap">
                          {idx + 1}
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Avatar name={r.guest} size={30} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-ink text-xs truncate max-w-[130px]">{r.guest}</span>
                                {r.isVip && (
                                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
                                    VIP
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-xs text-ink-secondary block">{r.bookingCode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold text-xs px-2 py-0.5 rounded-md border ${r.room === 'Unassigned'
                              ? 'text-warning-text bg-warning-bg border-warning-border/80'
                              : 'text-ink bg-muted-surface border-border/60'
                              }`}>
                              {r.room === 'Unassigned' ? 'Unassigned' : `Room ${r.room}`}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${r.roomReady ? 'text-success-text' : 'text-warning-text'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${r.roomReady ? 'bg-success-text' : 'bg-warning-text'}`} />
                              {r.roomReady ? 'Ready' : 'Cleaning'}
                            </span>
                          </div>
                          <span className="text-xs text-ink-secondary block mt-0.5">{r.roomType}</span>
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="font-mono font-bold text-ink text-xs block">{r.eta}</span>
                          <span className="text-xs text-ink-secondary block">{r.dates} ({r.nights}n)</span>
                        </td>
                        <td className="text-right whitespace-nowrap pr-2">
                          <button
                            type="button"
                            onClick={() => go({ view: 'reservations', query: r.bookingCode })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-success-text hover:bg-success-text text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                          >
                            <span>View booking</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/70 text-xs text-ink-secondary">
              <span>Showing {pendingCheckins.length} expected arrivals today</span>
              <button
                type="button"
                onClick={() => go({ view: 'reservations' })}
                className="font-semibold text-xs text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open reservations</span>
                <Lucide.ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Table 2: Pending Check-outs */}
          <div className="bg-surface rounded-2xl border border-border shadow-xs p-4 sm:p-5 flex flex-col justify-between min-w-0">
            <div className="min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-divider">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-warning-text to-warning-border text-white shadow-xs shadow-warning-text/20">
                    <Lucide.DoorClosed size={17} strokeWidth={2.4} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[14px] font-bold text-ink tracking-tight">Pending Check-outs</h2>
                      <span className="flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-bold text-warning-text border border-warning-border/60">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-text opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-warning-text"></span>
                        </span>
                        {pendingCheckouts.length} Due Out
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">Departures scheduled today awaiting key return & folio balance</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => go({ view: 'folios' })}
                  className="rounded-lg border border-border bg-surface hover:bg-muted-surface px-3 py-1.5 text-xs font-medium text-ink cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                  title="Open folios"
                >
                  <span>Folios</span>
                  <Lucide.ArrowUpRight size={14} className="text-ink-secondary" />
                </button>
              </div>

              {/* Table Container */}
              <TableContainer>
                <table className="pms-table w-full min-w-[580px] [&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5">
                  <thead>
                    <tr>
                      <th className="w-8 text-center whitespace-nowrap text-[12px] font-semibold">#</th>
                      <th className="whitespace-nowrap text-[12px] font-semibold">GUEST & BOOKING</th>
                      <th className="whitespace-nowrap text-[12px] font-semibold">ASSIGNED ROOM</th>
                      <th className="whitespace-nowrap text-[12px] font-semibold">OUT TIME & STAY</th>
                      <th className="text-right whitespace-nowrap pr-3.5 text-[12px] font-semibold">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCheckouts.map((d, idx) => (
                      <tr key={d.id}>
                        <td className="text-center font-medium text-ink-secondary text-xs whitespace-nowrap">
                          {idx + 1}
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Avatar name={d.guest} size={30} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-ink text-xs truncate max-w-[130px]">{d.guest}</span>
                                {d.isLateCheckout && (
                                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
                                    Late
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-xs text-ink-secondary block">{d.bookingCode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs px-2 py-0.5 rounded-md border text-ink bg-muted-surface border-border/60">
                              Room {d.room}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${d.status === 'Inspected'
                              ? 'text-success-text'
                              : d.status === 'Late Checkout'
                                ? 'text-primary'
                                : 'text-warning-text'
                              }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${d.status === 'Inspected'
                                ? 'bg-success-text'
                                : d.status === 'Late Checkout'
                                  ? 'bg-primary'
                                  : 'bg-warning-text'
                                }`} />
                              {d.status}
                            </span>
                          </div>
                          <span className="text-xs text-ink-secondary block mt-0.5">{d.roomType}</span>
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="font-mono font-bold text-ink text-xs block">{d.outTime}</span>
                          <span className="text-xs text-ink-secondary block">{d.dates} ({d.nights}n)</span>
                        </td>
                        <td className="text-right whitespace-nowrap pr-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (d.folioBalance > 0) {
                                toast('Folio Balance Pending', { detail: `Collect ₹${d.folioBalance.toLocaleString('en-IN')} from ${d.guest} before closing the folio.`, tone: 'warning' });
                              }
                              go({ view: 'folios' });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-warning-text hover:bg-warning-text text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                          >
                            <span>Open folio</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/70 text-xs text-ink-secondary">
              <span>Showing {pendingCheckouts.length} departures pending today</span>
              <button
                type="button"
                onClick={() => go({ view: 'folios' })}
                className="font-semibold text-xs text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open folios</span>
                <Lucide.ArrowRight size={13} />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ================= 5. RECENT ACTIVITY: RECENT RESERVATIONS & RECENT TRANSACTIONS ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-w-0">
        {/* Table 3: Recent Reservations */}
        <div className="bg-surface rounded-2xl border border-border shadow-xs p-4 sm:p-5 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-divider">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-info-text to-dark-accent text-white shadow-xs shadow-info-text/20">
                  <Lucide.CalendarDays size={17} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[14px] font-bold text-ink tracking-tight">Recent Reservations</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-info-bg px-2.5 py-0.5 text-xs font-bold text-info-text border border-info-border/60">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info-text opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-info-text"></span>
                      </span>
                      {recentReservations.length} Bookings
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">Latest confirmed bookings & stays across property</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => go({ view: 'reservations' })}
                className="rounded-lg border border-border bg-surface hover:bg-muted-surface px-3 py-1.5 text-xs font-medium text-ink cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                title="View all reservations"
              >
                <span>View all</span>
                <Lucide.ArrowRight size={14} className="text-ink-secondary" />
              </button>
            </div>

            {/* Table Container */}
            <TableContainer>
              <table className="pms-table w-full min-w-[580px] [&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5">
                <thead>
                  <tr>
                    <th className="w-8 text-center whitespace-nowrap text-[12px] font-semibold">#</th>
                    <th className="whitespace-nowrap text-[12px] font-semibold">GUEST & BOOKING</th>
                    <th className="whitespace-nowrap text-[12px] font-semibold">ROOM & DATES</th>
                    <th className="whitespace-nowrap text-center text-[12px] font-semibold">STATUS</th>
                    <th className="text-right whitespace-nowrap text-[12px] font-semibold">TOTAL</th>
                    <th className="text-right w-12 whitespace-nowrap pr-3.5 text-[12px] font-semibold">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReservations.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="text-center font-medium text-ink-secondary text-xs whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar name={r.guest} size={30} />
                          <div className="min-w-0">
                            <span className="font-semibold text-ink text-xs block truncate max-w-[130px]">{r.guest}</span>
                            <span className="font-mono text-xs text-ink-secondary block">{r.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="font-medium text-ink text-xs block">{r.room}</span>
                        <span className="text-xs text-ink-secondary block">{r.dates}</span>
                      </td>
                      <td className="whitespace-nowrap text-center">
                        <Badge tone={r.status === 'Confirmed' ? 'success' : r.status === 'Pending' ? 'warning' : 'neutral'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="text-right font-bold text-ink text-xs font-mono whitespace-nowrap">
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
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/70 text-xs text-ink-secondary">
            <span>Showing {recentReservations.length} recent bookings</span>
            <button
              type="button"
              onClick={() => go({ view: 'reservations' })}
              className="font-semibold text-xs text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Manage all reservations</span>
              <Lucide.ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Table 4: Recent Transactions */}
        <div className="bg-surface rounded-2xl border border-border shadow-xs p-4 sm:p-5 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-divider">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
                  <Lucide.ReceiptText size={17} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[14px] font-bold text-ink tracking-tight">Recent Transactions</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/30">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                      </span>
                      {recentPayments.length} Settlements
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">Latest settled folios, payments & guest transactions</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => go({ view: 'payments' })}
                className="rounded-lg border border-border bg-surface hover:bg-muted-surface px-3 py-1.5 text-xs font-medium text-ink cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                title="View all transactions"
              >
                <span>View all</span>
                <Lucide.ArrowRight size={14} className="text-ink-secondary" />
              </button>
            </div>

            {/* Table Container */}
            <TableContainer>
              <table className="pms-table w-full min-w-[580px] [&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5">
                <thead>
                  <tr>
                    <th className="w-8 text-center whitespace-nowrap text-[12px] font-semibold">#</th>
                    <th className="whitespace-nowrap text-[12px] font-semibold">GUEST & REFERENCE</th>
                    <th className="whitespace-nowrap text-[12px] font-semibold">DATE & METHOD</th>
                    <th className="whitespace-nowrap text-center text-[12px] font-semibold">STATUS</th>
                    <th className="text-right whitespace-nowrap text-[12px] font-semibold">AMOUNT</th>
                    <th className="text-right w-12 whitespace-nowrap pr-3.5 text-[12px] font-semibold">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p, idx) => (
                    <tr key={p.ref}>
                      <td className="text-center font-medium text-ink-secondary text-xs whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar name={p.guest} size={30} />
                          <div className="min-w-0">
                            <span className="font-semibold text-ink text-xs block truncate max-w-[130px]">{p.guest}</span>
                            <span className="font-mono text-xs text-ink-secondary block">{p.ref}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="font-medium text-ink text-xs block">{p.date}</span>
                        <span className="text-xs text-ink-secondary block">{p.method}</span>
                      </td>
                      <td className="whitespace-nowrap text-center">
                        <Badge tone={p.status === 'Paid' ? 'success' : 'warning'}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="text-right font-bold text-ink text-xs font-mono whitespace-nowrap">
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
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/70 text-xs text-ink-secondary">
            <span>Showing {recentPayments.length} recent settlements</span>
            <button
              type="button"
              onClick={() => go({ view: 'payments' })}
              className="font-semibold text-xs text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Manage all transactions</span>
              <Lucide.ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>


      {/* ================= 4. FRONT DESK MOVEMENT: PENDING CHECK-INS & CHECK-OUTS ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-w-0">
        {/* Table 1: Pending Check-ins */}
        {/* Card: Housekeeping Progress */}
        <div className="flex-1 bg-surface rounded-2xl border border-border/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-divider">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-info-text to-info-border text-white shadow-xs shadow-info-text/20">
                  <Lucide.Sparkles size={17} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[14px] font-bold text-ink tracking-tight">Housekeeping Progress</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-info-bg px-2.5 py-0.5 text-xs font-bold text-info-text border border-info-border/60">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info-text opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-info-text"></span>
                      </span>
                      Live Status
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">Turnaround status & inspection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => go({ view: 'room-overview' })}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Room board</span>
                <Lucide.ArrowRight size={13} />
              </button>
            </div>

            {/* Progress Summary */}
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-ink">{readyPct}%</span>
                <span className="text-xs text-ink-secondary font-normal">{readyRooms} of {totalRoomCount} rooms ready</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-muted-surface overflow-hidden mb-3.5">
              <div className="h-full rounded-full bg-[var(--color-primary)] w-[18%] transition-all" />
            </div>

            {/* 4 Stat Boxes */}
            <div className="grid grid-cols-4 gap-2 text-center mb-3.5">
              <div className="rounded-xl border border-success-border bg-success-bg/60 p-2">
                <span className="text-xs font-medium text-success-text block">✓ Cleaned</span>
                <span className="text-xs font-bold text-success-text mt-0.5 block">9</span>
              </div>
              <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-muted-surface)] p-2">
                <span className="text-xs font-medium text-[var(--color-primary)] block">In progress</span>
                <span className="text-xs font-bold text-[var(--color-primary-active)] mt-0.5 block">6</span>
              </div>
              <div className="rounded-xl border border-border/60 bg-page p-2">
                <span className="text-xs font-medium text-ink-secondary block">● Pending</span>
                <span className="text-xs font-bold text-ink mt-0.5 block">31</span>
              </div>
              <div className="rounded-xl border border-danger-border bg-danger-bg/60 p-2">
                <span className="text-xs font-medium text-danger-text block">! Issues</span>
                <span className="text-xs font-bold text-danger-text mt-0.5 block">4</span>
              </div>
            </div>

            {/* Priority Turnaround Queue */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[14px] font-semibold text-ink">
                <span>Priority Turnaround Queue</span>
                <span className="text-xs text-ink-muted font-normal">Release for check-in</span>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-border/60 bg-page/50 hover:bg-page transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-warning-text flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink truncate">Room 201 · Deluxe King</p>
                    <p className="text-xs text-ink-muted">Assigned: Anita S. · Turnover due 12:00 PM</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toast('Room 201 verified', { detail: 'Marked clean & ready for check-in.', tone: 'success' })}
                  className="flex-none text-xs font-semibold text-success-text bg-success-bg hover:bg-success-bg border border-success-border px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                >
                  Mark Clean
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-border/60 bg-page/50 hover:bg-page transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-primary flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink truncate">Room 304 · Executive Suite</p>
                    <p className="text-xs text-ink-muted">VIP arrival 02:00 PM · Needs supervisor inspection</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toast('Inspection queued', { detail: 'Supervisor alerted for Room 304.', tone: 'info' })}
                  className="flex-none text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                >
                  Inspect
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 mt-3 border-t border-divider flex items-center justify-between text-xs text-ink-secondary">
            <span className="text-xs text-ink-muted">4 priority turnovers due before 2:00 PM</span>
            <button
              type="button"
              onClick={() => go({ view: 'room-overview' })}
              className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Room board</span>
              <Lucide.ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Card: Department Tasks */}
        <div className="flex-1 bg-surface rounded-2xl border border-border/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-divider">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
                  <Lucide.ClipboardList size={17} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[14px] font-bold text-ink tracking-tight">Department Tasks</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/30">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                      </span>
                      4 Actions
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">Operational follow-ups & alerts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => go({ view: 'maintenance' })}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <Lucide.ArrowRight size={13} />
              </button>
            </div>

            {/* Tasks List */}
            <div className="flex flex-col gap-2.5">
              {/* Task 1 */}
              <div className="flex items-center justify-between gap-3 p-2 rounded-xl border border-border/60 bg-surface hover:bg-page/60 transition-colors">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-warning-text mt-1.5 flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink leading-tight">4 rooms pending inspection</p>
                    <p className="text-xs text-ink-muted mt-0.5 truncate">Rooms 204, 305, 408, 501 · Ready for release</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-bold text-warning-text">
                    High
                  </span>
                  <button
                    type="button"
                    onClick={() => toast('Inspection alert sent', { detail: 'Floor supervisor notified.', tone: 'info' })}
                    className="text-xs font-semibold text-ink-secondary hover:text-ink bg-muted-surface hover:bg-border px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                  >
                    Release
                  </button>
                </div>
              </div>

              {/* Task 2 */}
              <div className="flex items-center justify-between gap-3 p-2 rounded-xl border border-border/60 bg-surface hover:bg-page/60 transition-colors">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-danger-text mt-1.5 flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink leading-tight">2 maintenance requests</p>
                    <p className="text-xs text-ink-muted mt-0.5 truncate">AC thermostat in 305 · TV issue in 118</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className="rounded-full bg-danger-bg px-2 py-0.5 text-xs font-bold text-danger-text">
                    Urgent
                  </span>
                  <button
                    type="button"
                    onClick={() => go({ view: 'maintenance' })}
                    className="text-xs font-semibold text-danger-text hover:text-danger-text bg-danger-bg hover:bg-danger-bg px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                  >
                    Assign
                  </button>
                </div>
              </div>

              {/* Task 3 */}
              <div className="flex items-center justify-between gap-3 p-2 rounded-xl border border-border/60 bg-surface hover:bg-page/60 transition-colors">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-warning-text mt-1.5 flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink leading-tight">3 late check-out requests</p>
                    <p className="text-xs text-ink-muted mt-0.5 truncate">101 (1:00 PM), 305 (2:00 PM), 501 (1:30 PM)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-bold text-warning-text">
                    Attention
                  </span>
                  <button
                    type="button"
                    onClick={() => go({ view: 'folios' })}
                    className="text-xs font-semibold text-ink-secondary hover:text-ink bg-muted-surface hover:bg-border px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                  >
                    Review
                  </button>
                </div>
              </div>

              {/* Task 4 */}
              <div className="flex items-center justify-between gap-3 p-2 rounded-xl border border-border/60 bg-surface hover:bg-page/60 transition-colors">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-info-text mt-1.5 flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink leading-tight">1 VIP arrival today</p>
                    <p className="text-xs text-ink-muted mt-0.5 truncate">Amelia Hart · Deluxe Suite 204 · Amenity set</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className="rounded-full bg-[var(--color-muted-surface)] px-2 py-0.5 text-xs font-bold text-[var(--color-primary)]">
                    VIP Elite
                  </span>
                  <button
                    type="button"
                    onClick={() => go({ view: 'arrivals-departures' })}
                    className="text-xs font-semibold text-primary hover:text-primary bg-primary/10 hover:bg-primary/10 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                  >
                    Prepare
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 mt-3 border-t border-divider flex items-center justify-between text-xs text-ink-secondary">
            <span className="text-xs text-ink-muted">5 active tickets · 2 high priority</span>
            <button
              type="button"
              onClick={() => go({ view: 'maintenance' })}
              className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Task manager</span>
              <Lucide.ArrowRight size={12} />
            </button>
          </div>
        </div>

      </div>



    </div>
  );
}
