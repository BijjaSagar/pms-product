import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import type { NavTarget } from '../../components/nav';
import { folioApi, frontDeskApi, operationsApi, reportsApi, reservationApi } from '../../lib/api/pms';
import { paymentFromApi, reservationFromApi } from '../../lib/api/adapters';
import { useApiResource } from '../../lib/api/useApiResource';
import { useAuth } from '../../features/auth/AuthContext';
import type { PaymentRow, ReservationRow, StayRow } from '../../lib/api/pms';
import { toast } from '../../components/toastStore';
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
    <div className="w-full text-slate-900 font-sans pb-8 flex flex-col gap-4">
      {/* ================= 1. PAGE HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Welcome Title */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-amber-50 text-amber-500 shadow-2xs mt-0.5">
            <Lucide.Sun size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900 leading-tight">
              Good morning, {me?.user.fullName ? me.user.fullName.split(' ')[0] : 'Admin'}
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-normal">
              Here&apos;s what&apos;s happening at your hotel today <span className="text-slate-400">•</span> October 14, 2026
            </p>
          </div>
        </div>

      </div>


      {/* ================= 3. OPERATIONAL TIMELINE & DEPARTMENT TASKS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Today's Activity Timeline (lg:col-span-6) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
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
                  className={`flex-1 min-w-[70px] py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center ${timelineTab === tab.key
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

        {/* Housekeeping & Department Tasks (lg:col-span-6) */}
        <div className="lg:col-span-6 flex flex-col gap-5 h-full">

          <div className="bg-surface rounded-2xl border border-border shadow-xs p-4 sm:p-5 flex flex-col justify-between min-w-0">
            <div className="min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-xs shadow-emerald-500/20">
                    <Lucide.DoorOpen size={17} strokeWidth={2.4} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">Pending Check-ins</h2>
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        {pendingCheckins.length} Expected
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Today&apos;s arrivals awaiting front desk check-in</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => go({ view: 'check-in' })}
                  className="rounded-lg border border-border bg-surface hover:bg-muted-surface px-3 py-1.5 text-sm font-medium text-ink cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                  title="Open Check-in Terminal"
                >
                  <span>Terminal</span>
                  <Lucide.ArrowUpRight size={14} className="text-ink-secondary" />
                </button>
              </div>

              {/* Table Container */}
              <TableContainer>
                <table className="pms-table w-full min-w-[580px] [&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5">
                  <thead>
                    <tr>
                      <th className="w-8 text-center whitespace-nowrap text-xs font-semibold">#</th>
                      <th className="whitespace-nowrap text-xs font-semibold">GUEST & BOOKING</th>
                      <th className="whitespace-nowrap text-xs font-semibold">ASSIGNED ROOM</th>
                      <th className="whitespace-nowrap text-xs font-semibold">ETA & STAY</th>
                      <th className="whitespace-nowrap text-xs font-semibold">FOLIO / TOTAL</th>
                      <th className="text-right whitespace-nowrap pr-3.5 text-xs font-semibold">ACTION</th>
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
                                <span className="font-semibold text-ink text-sm truncate max-w-[130px]">{r.guest}</span>
                                {r.isVip && (
                                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
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
                              ? 'text-amber-800 bg-amber-50 border-amber-200/80'
                              : 'text-slate-800 bg-slate-100 border-slate-200/60'
                              }`}>
                              {r.room === 'Unassigned' ? 'Unassigned' : `Room ${r.room}`}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${r.roomReady ? 'text-emerald-600' : 'text-amber-600'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${r.roomReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              {r.roomReady ? 'Ready' : 'Cleaning'}
                            </span>
                          </div>
                          <span className="text-xs text-ink-secondary block mt-0.5">{r.roomType}</span>
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="font-mono font-bold text-ink text-sm block">{r.eta}</span>
                          <span className="text-xs text-ink-secondary block">{r.dates} ({r.nights}n)</span>
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="font-bold text-ink text-sm font-mono block">
                            ₹{r.total.toLocaleString('en-IN')}.00
                          </span>
                          {r.balance === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <Lucide.CheckCircle2 size={12} /> Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                          >
                            <Lucide.DoorOpen size={14} />
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
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/70 text-xs text-ink-secondary">
              <span>Showing {pendingCheckins.length} expected arrivals today</span>
              <button
                type="button"
                onClick={() => go({ view: 'check-in' })}
                className="font-semibold text-xs text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open Check-in Terminal</span>
                <Lucide.ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Table 2: Pending Check-outs */}
          <div className="bg-surface rounded-2xl border border-border shadow-xs p-4 sm:p-5 flex flex-col justify-between min-w-0">
            <div className="min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-xs shadow-amber-500/20">
                    <Lucide.DoorClosed size={17} strokeWidth={2.4} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">Pending Check-outs</h2>
                      <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/60">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                        </span>
                        {pendingCheckouts.length} Due Out
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Departures scheduled today awaiting key return & folio balance</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => go({ view: 'check-out' })}
                  className="rounded-lg border border-border bg-surface hover:bg-muted-surface px-3 py-1.5 text-sm font-medium text-ink cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                  title="Open Check-out Terminal"
                >
                  <span>Terminal</span>
                  <Lucide.ArrowUpRight size={14} className="text-ink-secondary" />
                </button>
              </div>

              {/* Table Container */}
              <TableContainer>
                <table className="pms-table w-full min-w-[580px] [&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5">
                  <thead>
                    <tr>
                      <th className="w-8 text-center whitespace-nowrap text-xs font-semibold">#</th>
                      <th className="whitespace-nowrap text-xs font-semibold">GUEST & BOOKING</th>
                      <th className="whitespace-nowrap text-xs font-semibold">ASSIGNED ROOM</th>
                      <th className="whitespace-nowrap text-xs font-semibold">OUT TIME & STAY</th>
                      <th className="whitespace-nowrap text-xs font-semibold">FOLIO BALANCE</th>
                      <th className="text-right whitespace-nowrap pr-3.5 text-xs font-semibold">ACTION</th>
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
                                <span className="font-semibold text-ink text-sm truncate max-w-[130px]">{d.guest}</span>
                                {d.isLateCheckout && (
                                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
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
                            <span className="font-bold text-xs px-2 py-0.5 rounded-md border text-slate-800 bg-slate-100 border-slate-200/60">
                              Room {d.room}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${d.status === 'Inspected'
                              ? 'text-emerald-600'
                              : d.status === 'Late Checkout'
                                ? 'text-purple-600'
                                : 'text-amber-600'
                              }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${d.status === 'Inspected'
                                ? 'bg-emerald-500'
                                : d.status === 'Late Checkout'
                                  ? 'bg-purple-500'
                                  : 'bg-amber-500'
                                }`} />
                              {d.status}
                            </span>
                          </div>
                          <span className="text-xs text-ink-secondary block mt-0.5">{d.roomType}</span>
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="font-mono font-bold text-ink text-sm block">{d.outTime}</span>
                          <span className="text-xs text-ink-secondary block">{d.dates} ({d.nights}n)</span>
                        </td>
                        <td className="whitespace-nowrap">
                          <span className={`font-bold text-sm font-mono block ${d.folioBalance === 0 ? 'text-ink' : 'text-rose-600'}`}>
                            ₹{d.folioBalance.toLocaleString('en-IN')}.00
                          </span>
                          {d.folioBalance === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <Lucide.CheckCircle2 size={12} /> Settled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              Due ₹{d.folioBalance.toLocaleString('en-IN')}
                            </span>
                          )}
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                          >
                            <Lucide.DoorClosed size={14} />
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
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/70 text-xs text-ink-secondary">
              <span>Showing {pendingCheckouts.length} departures pending today</span>
              <button
                type="button"
                onClick={() => go({ view: 'check-out' })}
                className="font-semibold text-xs text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open Check-out Terminal</span>
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
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-xs shadow-blue-500/20">
                  <Lucide.CalendarDays size={17} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Reservations</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                      </span>
                      {recentReservations.length} Bookings
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Latest confirmed bookings & stays across property</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => go({ view: 'reservations' })}
                className="rounded-lg border border-border bg-surface hover:bg-muted-surface px-3 py-1.5 text-sm font-medium text-ink cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
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
                    <th className="w-8 text-center whitespace-nowrap text-xs font-semibold">#</th>
                    <th className="whitespace-nowrap text-xs font-semibold">GUEST & BOOKING</th>
                    <th className="whitespace-nowrap text-xs font-semibold">ROOM & DATES</th>
                    <th className="whitespace-nowrap text-center text-xs font-semibold">STATUS</th>
                    <th className="text-right whitespace-nowrap text-xs font-semibold">TOTAL</th>
                    <th className="text-right w-12 whitespace-nowrap pr-3.5 text-xs font-semibold">ACTION</th>
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
                            <span className="font-semibold text-ink text-sm block truncate max-w-[130px]">{r.guest}</span>
                            <span className="font-mono text-xs text-ink-secondary block">{r.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="font-medium text-ink text-sm block">{r.room}</span>
                        <span className="text-xs text-ink-secondary block">{r.dates}</span>
                      </td>
                      <td className="whitespace-nowrap text-center">
                        <Badge tone={r.status === 'Confirmed' ? 'success' : r.status === 'Pending' ? 'warning' : 'neutral'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="text-right font-bold text-ink text-sm font-mono whitespace-nowrap">
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
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-500 to-violet-600 text-white shadow-xs shadow-purple-500/20">
                  <Lucide.ReceiptText size={17} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Transactions</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200/60">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
                      </span>
                      {recentPayments.length} Settlements
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Latest settled folios, payments & guest transactions</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => go({ view: 'payments' })}
                className="rounded-lg border border-border bg-surface hover:bg-muted-surface px-3 py-1.5 text-sm font-medium text-ink cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
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
                    <th className="w-8 text-center whitespace-nowrap text-xs font-semibold">#</th>
                    <th className="whitespace-nowrap text-xs font-semibold">GUEST & REFERENCE</th>
                    <th className="whitespace-nowrap text-xs font-semibold">DATE & METHOD</th>
                    <th className="whitespace-nowrap text-center text-xs font-semibold">STATUS</th>
                    <th className="text-right whitespace-nowrap text-xs font-semibold">AMOUNT</th>
                    <th className="text-right w-12 whitespace-nowrap pr-3.5 text-xs font-semibold">ACTION</th>
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
                            <span className="font-semibold text-ink text-sm block truncate max-w-[130px]">{p.guest}</span>
                            <span className="font-mono text-xs text-ink-secondary block">{p.ref}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="font-medium text-ink text-sm block">{p.date}</span>
                        <span className="text-xs text-ink-secondary block">{p.method}</span>
                      </td>
                      <td className="whitespace-nowrap text-center">
                        <Badge tone={p.status === 'Paid' ? 'success' : 'warning'}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="text-right font-bold text-ink text-sm font-mono whitespace-nowrap">
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
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-600 text-white shadow-xs shadow-sky-500/20">
                  <Lucide.Sparkles size={17} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">Housekeeping Progress</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200/60">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
                      </span>
                      Live Status
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Turnaround status & inspection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => go({ view: 'housekeeping' })}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <Lucide.ArrowRight size={13} />
              </button>
            </div>

            {/* Progress Summary */}
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-900">18%</span>
                <span className="text-xs text-slate-500 font-normal">9 of 50 rooms cleaned</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">Target: 85% by 2:00 PM</span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mb-3.5">
              <div className="h-full rounded-full bg-[var(--color-primary)] w-[18%] transition-all" />
            </div>

            {/* 4 Stat Boxes */}
            <div className="grid grid-cols-4 gap-2 text-center mb-3.5">
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

            {/* Priority Turnaround Queue */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Priority Turnaround Queue</span>
                <span className="text-[10.5px] text-slate-400 font-normal">Release for check-in</span>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-amber-500 flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">Room 201 · Deluxe King</p>
                    <p className="text-[10.5px] text-slate-400">Assigned: Anita S. · Turnover due 12:00 PM</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toast('Room 201 verified', { detail: 'Marked clean & ready for check-in.', tone: 'success' })}
                  className="flex-none text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                >
                  Mark Clean
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-purple-500 flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">Room 304 · Executive Suite</p>
                    <p className="text-[10.5px] text-slate-400">VIP arrival 02:00 PM · Needs supervisor inspection</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toast('Inspection queued', { detail: 'Supervisor alerted for Room 304.', tone: 'info' })}
                  className="flex-none text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                >
                  Inspect
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11.5px] text-slate-400">4 priority turnovers due before 2:00 PM</span>
            <button
              type="button"
              onClick={() => go({ view: 'housekeeping' })}
              className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Housekeeping board</span>
              <Lucide.ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Card: Department Tasks */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-xs shadow-indigo-500/20">
                  <Lucide.ClipboardList size={17} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">Department Tasks</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                      </span>
                      4 Actions
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Operational follow-ups & alerts</p>
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
              <div className="flex items-center justify-between gap-3 p-2 rounded-xl border border-slate-200/60 bg-white hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-tight">4 rooms pending inspection</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">Rooms 204, 305, 408, 501 · Ready for release</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    High
                  </span>
                  <button
                    type="button"
                    onClick={() => toast('Inspection alert sent', { detail: 'Floor supervisor notified.', tone: 'info' })}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                  >
                    Release
                  </button>
                </div>
              </div>

              {/* Task 2 */}
              <div className="flex items-center justify-between gap-3 p-2 rounded-xl border border-slate-200/60 bg-white hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-tight">2 maintenance requests</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">AC thermostat in 305 · TV issue in 118</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                    Urgent
                  </span>
                  <button
                    type="button"
                    onClick={() => go({ view: 'maintenance' })}
                    className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                  >
                    Assign
                  </button>
                </div>
              </div>

              {/* Task 3 */}
              <div className="flex items-center justify-between gap-3 p-2 rounded-xl border border-slate-200/60 bg-white hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-tight">3 late check-out requests</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">101 (1:00 PM), 305 (2:00 PM), 501 (1:30 PM)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    Attention
                  </span>
                  <button
                    type="button"
                    onClick={() => go({ view: 'check-out' })}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                  >
                    Review
                  </button>
                </div>
              </div>

              {/* Task 4 */}
              <div className="flex items-center justify-between gap-3 p-2 rounded-xl border border-slate-200/60 bg-white hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-sky-500 mt-1.5 flex-none" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-tight">1 VIP arrival today</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">Amelia Hart · Deluxe Suite 204 · Amenity set</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className="rounded-full bg-[var(--color-muted-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">
                    VIP Elite
                  </span>
                  <button
                    type="button"
                    onClick={() => go({ view: 'arrivals-departures' })}
                    className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                  >
                    Prepare
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11.5px] text-slate-400">5 active tickets · 2 high priority</span>
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
