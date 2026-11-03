import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import type { NavTarget } from '../../config/navigation';
import { folioApi, frontDeskApi, operationsApi, reportsApi, reservationApi } from '../../lib/api/pms';
import { paymentFromApi, reservationFromApi } from '../../lib/api/adapters';
import { displayApiError } from '../../lib/api/client';
import { formatBusinessDate, useBusinessDate } from '../../lib/api/businessDate';
import { useApiResource } from '../../lib/api/useApiResource';
import { useAuth } from '../../features/auth/AuthContext';
import { inventoryApi, type PaymentRow, type ReservationRow, type RoomRow, type StayRow } from '../../lib/api/pms';
import { toast } from '../../utils/toast';
import { Avatar, Badge, TableActionBtn, TableContainer } from '../../components/ui';
import { Button } from '../../components/primitives';
import { buildTimeline } from './timeline';



/* One shared empty list, so a missing panel does not hand the memos a new array on every render. */
const NO_ROWS: never[] = [];
const NO_ROOM_STATUSES = new Map<string, string>();
/** Rooms a guest can be given on arrival: vacant, and clean or inspected. */
const READY_ROOM_STATUSES = ['VACANT_CLEAN', 'INSPECTED'];

export function Dashboard({ go }: { go: (t: NavTarget) => void }) {
  const { me, can } = useAuth();
  const businessDate = useBusinessDate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const [timelineTab, setTimelineTab] = useState<'all' | 'arrivals' | 'departures' | 'in-house'>('all');

  const loadDashboard = useCallback(async () => {
    // A failed panel shows its own error and empty content; the rest of the dashboard still loads.
    const panel = <T,>(what: string, load: () => Promise<T>, empty: T): Promise<T> =>
      load().catch((error: unknown) => {
        toast.error(`${what} not loaded`, { detail: displayApiError(error) });
        return empty;
      });
    const daily = await panel('Daily flash', () => reportsApi.dailyFlash(), null);
    const permissions = {
      reservations: can('reservation.read'),
      finance: can('report.read.financial'),
      payments: can('payment.read'),
    };
    const [housekeeping, roomRows, reservationPage, arrivalResult, departureResult, inHouseResult, revenue, payments] = await Promise.all([
      panel('Housekeeping summary', () => operationsApi.housekeepingSummary(), null),
      can('room.read') ? panel('Rooms', () => inventoryApi.rooms(), [] as RoomRow[]) : Promise.resolve([] as RoomRow[]),
      permissions.reservations ? panel('Reservations', () => reservationApi.list('', undefined, 1, 5), { data: [] as ReservationRow[], page: 1, pageSize: 5, hasMore: false }) : Promise.resolve({ data: [] as ReservationRow[], page: 1, pageSize: 5, hasMore: false }),
      permissions.reservations ? panel('Arrivals', () => frontDeskApi.arrivals(), { businessDate: '', data: [] as StayRow[] }) : Promise.resolve({ businessDate: '', data: [] as StayRow[] }),
      permissions.reservations ? panel('Departures', () => frontDeskApi.departures(), { businessDate: '', data: [] as StayRow[] }) : Promise.resolve({ businessDate: '', data: [] as StayRow[] }),
      permissions.reservations ? panel('In-house guests', () => frontDeskApi.inHouse(), { businessDate: '', data: [] as StayRow[] }) : Promise.resolve({ businessDate: '', data: [] as StayRow[] }),
      permissions.finance && daily ? panel('Revenue', () => reportsApi.revenue(daily.businessDate, daily.businessDate), null) : Promise.resolve(null),
      permissions.payments ? panel('Payments', () => folioApi.listPayments(), [] as PaymentRow[]) : Promise.resolve([] as PaymentRow[]),
    ]);
    return {
      daily,
      housekeeping,
      roomStatusByNumber: new Map(roomRows.map((room) => [room.roomNumber, room.status])),
      reservations: reservationPage.data.map(reservationFromApi),
      arrivals: arrivalResult.data,
      departures: departureResult.data,
      inHouse: inHouseResult.data,
      revenue,
      payments: payments.map(paymentFromApi),
    };
  }, [can]);

  const resource = useApiResource(loadDashboard);

  const arrivals = resource.data?.arrivals ?? NO_ROWS;
  const departures = resource.data?.departures ?? NO_ROWS;
  const inHouse = resource.data?.inHouse ?? NO_ROWS;
  const reservations = resource.data?.reservations ?? NO_ROWS;
  const payments = resource.data?.payments ?? NO_ROWS;
  const roomStatusByNumber = resource.data?.roomStatusByNumber ?? NO_ROOM_STATUSES;
  const roomReadiness = resource.data?.housekeeping?.rooms;
  const readyRooms = roomReadiness?.ready ?? 0;
  const totalRoomCount = roomReadiness?.total ?? 0;
  const readyPct = totalRoomCount > 0 ? Math.round((readyRooms / totalRoomCount) * 100) : 0;

  const timeline = useMemo(() => buildTimeline(arrivals, departures, inHouse), [arrivals, departures, inHouse]);
  const filteredTimeline = useMemo(
    () => (timelineTab === 'all' ? timeline : timeline.filter((item) => item.type === timelineTab)),
    [timeline, timelineTab],
  );

  const pendingCheckins = useMemo(
    () =>
      arrivals.slice(0, 5).map((a) => ({
        id: a.id,
        bookingCode: a.bookingCode || a.id,
        guest: a.guestName || 'Guest',
        isVip: false,
        vipTier: undefined as string | undefined,
        room: a.roomNumber || 'Unassigned',
        roomType: a.roomTypeName || '—',
        roomReady: READY_ROOM_STATUSES.includes(roomStatusByNumber.get(a.roomNumber ?? '') ?? ''),
        eta: '—',
        dates: `${a.checkInDate} – ${a.checkOutDate}`,
        nights: a.nights ?? 0,
        total: parseFloat(a.totalAmount || '0') || 0,
        balance: parseFloat(a.balance || '0') || 0,
        status: (a.status as 'Confirmed' | 'Pending' | 'Checked-in' | 'Checked-out' | 'Cancelled' | 'No-show') || 'Confirmed',
      })),
    [arrivals, roomStatusByNumber],
  );

  const pendingCheckouts = useMemo(
    () =>
      departures.slice(0, 5).map((d) => ({
        id: d.id,
        bookingCode: d.bookingCode || d.id,
        guest: d.guestName || 'Guest',
        room: d.roomNumber || 'Unassigned',
        roomType: d.roomTypeName || '—',
        outTime: '—',
        isLateCheckout: false,
        dates: `${d.checkInDate} – ${d.checkOutDate}`,
        nights: d.nights ?? 0,
        folioBalance: parseFloat(d.balance || '0') || 0,
        status: 'Due Out' as 'Due Out' | 'Late Checkout' | 'Inspected',
      })),
    [departures],
  );

  const recentReservations = useMemo(
    () =>
      reservations.slice(0, 5).map((r) => ({
        id: r.bookingCode || r.id,
        guest: r.guest,
        dates: `${r.checkIn} – ${r.checkOut}`,
        room: r.room || 'Unassigned',
        status: r.status,
        total: r.total,
      })),
    [reservations],
  );

  const recentPayments = useMemo(
    () =>
      payments.slice(0, 5).map((p) => ({
        date: p.date,
        ref: p.ref,
        guest: p.guest,
        method: p.method,
        amount: p.amount,
        status: p.status,
      })),
    [payments],
  );


  return (
    <div className="w-full text-label text-ink font-sans pb-8 flex flex-col gap-4">
      {/* ================= 1. PAGE HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Welcome Title */}
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-warning-bg text-warning-text shadow-2xs mt-0.5">
            <Lucide.Sun size={26} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-disp3 font-bold tracking-tight text-ink leading-tight">
              {greeting}, {me?.user.fullName ? me.user.fullName.split(' ')[0] : 'there'}
            </h1>
            <p className="text-label text-ink-secondary mt-1 font-normal">
              Here&apos;s what&apos;s happening at your hotel today <span className="text-ink-muted">•</span> {formatBusinessDate(businessDate)}
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
                    <h2 className="text-body font-bold text-ink tracking-tight">Today&apos;s Activity Timeline</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-label font-bold text-success-text border border-success-border/60">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-text opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-text"></span>
                      </span>
                      Live Feed
                    </span>
                  </div>
                  <p className="text-label text-ink-muted mt-0.5">Real-time guest movements & operations</p>
                </div>
              </div>

              <Button variant="link"
                type="button"
                onClick={() => go({ view: 'arrivals-departures' })}
              >
                <span>Front Desk</span>
                <Lucide.ArrowRight size={13} />
              </Button>
            </div>

            {/* Filter Tabs (Segmented Control) */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted-surface/80 mb-4 overflow-x-auto no-scrollbar">
              {[
                { key: 'all' as const, label: `All (${timeline.length})` },
                { key: 'arrivals' as const, label: `Arrivals (${timeline.filter((item) => item.type === 'arrival').length})` },
                { key: 'departures' as const, label: `Departures (${timeline.filter((item) => item.type === 'departure').length})` },
                { key: 'in-house' as const, label: `In-House (${timeline.filter((item) => item.type === 'in-house').length})` },
              ].map((tab) => (
                <Button variant="secondary"
                  key={tab.key}
                  type="button"
                  onClick={() => setTimelineTab(tab.key)}
                  className={`flex-1 min-w-[70px] transition-all cursor-pointer text-center ${timelineTab === tab.key
 ? 'bg-surface text-ink shadow-2xs border border-border/50'
 : 'text-ink-secondary hover:text-ink'
 }`}
                >
                  {tab.label}
                </Button>
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
                            <span className="font-mono text-label font-bold text-ink bg-muted-surface/90 border border-border/60 px-2 py-0.5 rounded-md shadow-2xs">
                              {item.time}
                            </span>
                            {item.room && (
                              <span className="text-label font-semibold text-ink bg-muted-surface/80 px-2 py-0.5 rounded-md">
                                {item.room}
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 text-label font-bold px-2 py-0.5 rounded-full border ${item.statusTone}`}>
                              {item.status}
                            </span>
                          </div>

                          <Button variant="secondary"
                            type="button"
                            onClick={() => {
                              go(item.target);
                            }}
                            className={`flex-none border shadow-2xs transition-all cursor-pointer hover:shadow-xs active:scale-95 flex items-center gap-1 ${item.actionTone}`}
                          >
                            <span>{item.actionLabel}</span>
                            <Lucide.ArrowRight size={12} />
                          </Button>
                        </div>

                        {/* Title & Detail */}
                        <div className="mt-1.5">
                          <h4 className="text-body font-bold text-ink group-hover:text-[var(--color-primary)] transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-label text-ink-secondary mt-0.5 truncate">
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
          <div className="pt-3.5 mt-3 border-t border-divider flex items-center justify-between text-label text-ink-secondary">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success-text" />
              <span className="text-label text-ink-secondary font-medium">
                Showing {filteredTimeline.slice(0, 5).length} of {filteredTimeline.length} operational activities
              </span>
            </div>
            <Button variant="link"
              type="button"
              onClick={() => go({ view: 'arrivals-departures' })}
            >
              <span>Movement report</span>
              <Lucide.ArrowRight size={12} />
            </Button>
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
                      <h2 className="text-body font-bold text-ink tracking-tight">Pending Check-ins</h2>
                      <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-label font-bold text-success-text border border-success-border/60">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-text opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-text"></span>
                        </span>
                        {pendingCheckins.length} Expected
                      </span>
                    </div>
                    <p className="text-label text-ink-muted mt-0.5">Today&apos;s arrivals awaiting front desk check-in</p>
                  </div>
                </div>

                <Button variant="secondary"
                  type="button"
                  onClick={() => go({ view: 'reservations' })}
                  className="cursor-pointer transition-colors flex items-center gap-1"
                  title="Open reservations"
                >
                  <span>Reservations</span>
                  <Lucide.ArrowUpRight size={14} className="text-ink-secondary" />
                </Button>
              </div>

              {/* Table Container */}
              <TableContainer>
                <table className="pms-table w-full min-w-[580px] [&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5">
                  <thead>
                    <tr>
                      <th className="text-center whitespace-nowrap text-label font-semibold">#</th>
                      <th className="whitespace-nowrap text-label ">Guest & Booking</th>
                      <th className="whitespace-nowrap text-label font-semibold">Assigned Room</th>
                      <th className="whitespace-nowrap text-label font-semibold">ETA & Stay</th>
                      <th className="text-right whitespace-nowrap pr-3.5 text-label font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCheckins.map((r, idx) => (
                      <tr key={r.id}>
                        <td className="text-center font-medium text-ink-secondary text-label whitespace-nowrap">
                          {idx + 1}
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Avatar name={r.guest} size={30} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-ink text-label truncate max-w-[130px]">{r.guest}</span>
                                {r.isVip && (
                                  <span className="px-1.5 py-0.5 rounded text-label font-semibold bg-primary/10 text-primary border border-primary/30">
                                    VIP
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-label text-ink-secondary block">{r.bookingCode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold text-label px-2 py-0.5 rounded-md border ${r.room === 'Unassigned'
                              ? 'text-warning-text bg-warning-bg border-warning-border/80'
                              : 'text-ink bg-muted-surface border-border/60'
                              }`}>
                              {r.room === 'Unassigned' ? 'Unassigned' : `Room ${r.room}`}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-label font-medium ${r.roomReady ? 'text-success-text' : 'text-warning-text'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${r.roomReady ? 'bg-success-text' : 'bg-warning-text'}`} />
                              {r.roomReady ? 'Ready' : 'Not ready'}
                            </span>
                          </div>
                          <span className="text-label text-ink-secondary block mt-0.5">{r.roomType}</span>
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="font-mono font-bold text-ink text-label block">{r.eta}</span>
                          <span className="text-label text-ink-secondary block">{r.dates} ({r.nights}n)</span>
                        </td>
                        <td className="text-right whitespace-nowrap pr-2">
                          <Button variant="success"
                            type="button"
                            onClick={() => go({ view: 'reservations', query: r.bookingCode })}
                            className="inline-flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>View booking</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/70 text-label text-ink-secondary">
              <span>Showing {pendingCheckins.length} expected arrivals today</span>
              <Button variant="link"
                type="button"
                onClick={() => go({ view: 'reservations' })}
              >
                <span>Open reservations</span>
                <Lucide.ArrowRight size={13} />
              </Button>
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
                      <h2 className="text-body font-bold text-ink tracking-tight">Pending Check-outs</h2>
                      <span className="flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-0.5 text-label font-bold text-warning-text border border-warning-border/60">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-text opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-warning-text"></span>
                        </span>
                        {pendingCheckouts.length} Due Out
                      </span>
                    </div>
                    <p className="text-label text-ink-muted mt-0.5">Departures scheduled today awaiting key return & folio balance</p>
                  </div>
                </div>

                <Button variant="secondary"
                  type="button"
                  onClick={() => go({ view: 'folios' })}
                  className="cursor-pointer transition-colors flex items-center gap-1"
                  title="Open folios"
                >
                  <span>Folios</span>
                  <Lucide.ArrowUpRight size={14} className="text-ink-secondary" />
                </Button>
              </div>

              {/* Table Container */}
              <TableContainer>
                <table className="pms-table w-full min-w-[580px] [&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5">
                  <thead>
                    <tr>
                      <th className="w-8 text-center whitespace-nowrap text-label font-semibold">#</th>
                      <th className="whitespace-nowrap text-label font-semibold">GUEST & BOOKING</th>
                      <th className="whitespace-nowrap text-label font-semibold">ASSIGNED ROOM</th>
                      <th className="whitespace-nowrap text-label font-semibold">OUT TIME & STAY</th>
                      <th className="text-right whitespace-nowrap pr-3.5 text-label font-semibold">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCheckouts.map((d, idx) => (
                      <tr key={d.id}>
                        <td className="text-center font-medium text-ink-secondary text-label whitespace-nowrap">
                          {idx + 1}
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Avatar name={d.guest} size={30} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-ink text-label truncate max-w-[130px]">{d.guest}</span>
                                {d.isLateCheckout && (
                                  <span className="px-1.5 py-0.5 rounded text-label font-semibold bg-primary/10 text-primary border border-primary/30">
                                    Late
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-label text-ink-secondary block">{d.bookingCode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-label px-2 py-0.5 rounded-md border text-ink bg-muted-surface border-border/60">
                              Room {d.room}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-label font-medium ${d.status === 'Inspected'
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
                          <span className="text-label text-ink-secondary block mt-0.5">{d.roomType}</span>
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="font-mono font-bold text-ink text-label block">{d.outTime}</span>
                          <span className="text-label text-ink-secondary block">{d.dates} ({d.nights}n)</span>
                        </td>
                        <td className="text-right whitespace-nowrap pr-3.5">
                          <Button variant="warning"
                            type="button"
                            onClick={() => {
                              if (d.folioBalance > 0) {
                                toast('Folio Balance Pending', { detail: `Collect ₹${d.folioBalance.toLocaleString('en-IN')} from ${d.guest} before closing the folio.`, tone: 'warning' });
                              }
                              go({ view: 'folios' });
                            }}
                            className="inline-flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>Open folio</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/70 text-label text-ink-secondary">
              <span>Showing {pendingCheckouts.length} departures pending today</span>
              <Button variant="link"
                type="button"
                onClick={() => go({ view: 'folios' })}
              >
                <span>Open folios</span>
                <Lucide.ArrowRight size={13} />
              </Button>
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
                    <h2 className="text-body font-bold text-ink tracking-tight">Recent Reservations</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-info-bg px-2.5 py-0.5 text-label font-bold text-info-text border border-info-border/60">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info-text opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-info-text"></span>
                      </span>
                      {recentReservations.length} Bookings
                    </span>
                  </div>
                  <p className="text-label text-ink-muted mt-0.5">Latest confirmed bookings & stays across property</p>
                </div>
              </div>

              <Button variant="secondary"
                type="button"
                onClick={() => go({ view: 'reservations' })}
                className="cursor-pointer transition-colors flex items-center gap-1"
                title="View all reservations"
              >
                <span>View all</span>
                <Lucide.ArrowRight size={14} className="text-ink-secondary" />
              </Button>
            </div>

            {/* Table Container */}
            <TableContainer>
              <table className="pms-table w-full min-w-[580px] [&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5">
                <thead>
                  <tr>
                    <th className="w-8 text-center whitespace-nowrap text-label font-semibold">#</th>
                    <th className="whitespace-nowrap text-label font-semibold">GUEST & BOOKING</th>
                    <th className="whitespace-nowrap text-label font-semibold">ROOM & DATES</th>
                    <th className="whitespace-nowrap text-center text-label font-semibold">STATUS</th>
                    <th className="text-right whitespace-nowrap text-label font-semibold">TOTAL</th>
                    <th className="text-right w-12 whitespace-nowrap pr-3.5 text-label font-semibold">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReservations.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="text-center font-medium text-ink-secondary text-label whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar name={r.guest} size={30} />
                          <div className="min-w-0">
                            <span className="font-semibold text-ink text-label block truncate max-w-[130px]">{r.guest}</span>
                            <span className="font-mono text-label text-ink-secondary block">{r.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="font-medium text-ink text-label block">{r.room}</span>
                        <span className="text-label text-ink-secondary block">{r.dates}</span>
                      </td>
                      <td className="whitespace-nowrap text-center">
                        <Badge tone={r.status === 'Confirmed' ? 'success' : r.status === 'Pending' ? 'warning' : 'neutral'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="text-right font-bold text-ink text-label font-mono whitespace-nowrap">
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
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/70 text-label text-ink-secondary">
            <span>Showing {recentReservations.length} recent bookings</span>
            <Button variant="link"
              type="button"
              onClick={() => go({ view: 'reservations' })}
            >
              <span>Manage all reservations</span>
              <Lucide.ArrowRight size={13} />
            </Button>
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
                    <h2 className="text-body font-bold text-ink tracking-tight">Recent Transactions</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-label font-bold text-primary border border-primary/30">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                      </span>
                      {recentPayments.length} Settlements
                    </span>
                  </div>
                  <p className="text-label text-ink-muted mt-0.5">Latest settled folios, payments & guest transactions</p>
                </div>
              </div>

              <Button variant="secondary"
                type="button"
                onClick={() => go({ view: 'payments' })}
                className="cursor-pointer transition-colors flex items-center gap-1"
                title="View all transactions"
              >
                <span>View all</span>
                <Lucide.ArrowRight size={14} className="text-ink-secondary" />
              </Button>
            </div>

            {/* Table Container */}
            <TableContainer>
              <table className="pms-table w-full min-w-[580px] [&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5">
                <thead>
                  <tr>
                    <th className="w-8 text-center whitespace-nowrap text-label font-semibold">#</th>
                    <th className="whitespace-nowrap text-label font-semibold">GUEST & REFERENCE</th>
                    <th className="whitespace-nowrap text-label font-semibold">DATE & METHOD</th>
                    <th className="whitespace-nowrap text-center text-label font-semibold">STATUS</th>
                    <th className="text-right whitespace-nowrap text-label font-semibold">AMOUNT</th>
                    <th className="text-right w-12 whitespace-nowrap pr-3.5 text-label font-semibold">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p, idx) => (
                    <tr key={p.ref}>
                      <td className="text-center font-medium text-ink-secondary text-label whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar name={p.guest} size={30} />
                          <div className="min-w-0">
                            <span className="font-semibold text-ink text-label block truncate max-w-[130px]">{p.guest}</span>
                            <span className="font-mono text-label text-ink-secondary block">{p.ref}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="font-medium text-ink text-label block">{p.date}</span>
                        <span className="text-label text-ink-secondary block">{p.method}</span>
                      </td>
                      <td className="whitespace-nowrap text-center">
                        <Badge tone={p.status === 'Paid' ? 'success' : 'warning'}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="text-right font-bold text-ink text-label font-mono whitespace-nowrap">
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
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/70 text-label text-ink-secondary">
            <span>Showing {recentPayments.length} recent settlements</span>
            <Button variant="link"
              type="button"
              onClick={() => go({ view: 'payments' })}
            >
              <span>Manage all transactions</span>
              <Lucide.ArrowRight size={13} />
            </Button>
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
                    <h2 className="text-body font-bold text-ink tracking-tight">Housekeeping Progress</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-info-bg px-2.5 py-0.5 text-label font-bold text-info-text border border-info-border/60">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info-text opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-info-text"></span>
                      </span>
                      Live Status
                    </span>
                  </div>
                  <p className="text-label text-ink-muted mt-0.5">Turnaround status & inspection</p>
                </div>
              </div>
              <Button variant="link"
                type="button"
                onClick={() => go({ view: 'room-overview' })}
              >
                <span>Room board</span>
                <Lucide.ArrowRight size={13} />
              </Button>
            </div>

            {/* Progress Summary */}
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-label font-bold text-ink">{readyPct}%</span>
                <span className="text-label text-ink-secondary font-normal">{readyRooms} of {totalRoomCount} rooms ready</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-muted-surface overflow-hidden mb-3.5">
              <div className="h-full rounded-full bg-[var(--color-primary)] w-[18%] transition-all" />
            </div>

            {/* 4 Stat Boxes */}
            <div className="grid grid-cols-4 gap-2 text-center mb-3.5">
              <div className="rounded-xl border border-success-border bg-success-bg/60 p-2">
                <span className="text-label font-medium text-success-text block">✓ Cleaned</span>
                <span className="text-label font-bold text-success-text mt-0.5 block">9</span>
              </div>
              <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-muted-surface)] p-2">
                <span className="text-label font-medium text-[var(--color-primary)] block">In progress</span>
                <span className="text-label font-bold text-[var(--color-primary-active)] mt-0.5 block">6</span>
              </div>
              <div className="rounded-xl border border-border/60 bg-page p-2">
                <span className="text-label font-medium text-ink-secondary block">● Pending</span>
                <span className="text-label font-bold text-ink mt-0.5 block">31</span>
              </div>
              <div className="rounded-xl border border-danger-border bg-danger-bg/60 p-2">
                <span className="text-label font-medium text-danger-text block">! Issues</span>
                <span className="text-label font-bold text-danger-text mt-0.5 block">4</span>
              </div>
            </div>

            {/* Priority Turnaround Queue */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-body font-semibold text-ink">
                <span>Priority Turnaround Queue</span>
                <span className="text-label text-ink-muted font-normal">Release for check-in</span>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-border/60 bg-page/50 hover:bg-page transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-warning-text flex-none" />
                  <div className="min-w-0">
                    <p className="text-label font-bold text-ink truncate">Room 201 · Deluxe King</p>
                    <p className="text-label text-ink-muted">Assigned: Anita S. · Turnover due 12:00 PM</p>
                  </div>
                </div>
                <Button variant="success"
                  type="button"
                  onClick={() => toast('Room 201 verified', { detail: 'Marked clean & ready for check-in.', tone: 'success' })}
                  className="flex-none cursor-pointer transition-colors"
                >
                  Mark Clean
                </Button>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-border/60 bg-page/50 hover:bg-page transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-primary flex-none" />
                  <div className="min-w-0">
                    <p className="text-label font-bold text-ink truncate">Room 304 · Executive Suite</p>
                    <p className="text-label text-ink-muted">VIP arrival 02:00 PM · Needs supervisor inspection</p>
                  </div>
                </div>
                <Button variant="secondary"
                  type="button"
                  onClick={() => toast('Inspection queued', { detail: 'Supervisor alerted for Room 304.', tone: 'info' })}
                  className="flex-none cursor-pointer transition-colors"
                >
                  Inspect
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 mt-3 border-t border-divider flex items-center justify-between text-label text-ink-secondary">
            <span className="text-label text-ink-muted">4 priority turnovers due before 2:00 PM</span>
            <Button variant="link"
              type="button"
              onClick={() => go({ view: 'room-overview' })}
            >
              <span>Room board</span>
              <Lucide.ArrowRight size={12} />
            </Button>
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
                    <h2 className="text-body font-bold text-ink tracking-tight">Department Tasks</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-label font-bold text-primary border border-primary/30">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                      </span>
                      {totalRoomCount - readyRooms} Actions
                    </span>
                  </div>
                  <p className="text-label text-ink-muted mt-0.5">Operational follow-ups & alerts</p>
                </div>
              </div>
            </div>

            {/* Room readiness from the housekeeping summary */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3 p-2 rounded-xl border border-border/60 bg-surface">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-warning-text mt-1.5 flex-none" />
                  <div className="min-w-0">
                    <p className="text-label font-bold text-ink leading-tight">{totalRoomCount - readyRooms} rooms not ready for guests</p>
                    <p className="text-label text-ink-muted mt-0.5 truncate">{readyRooms} of {totalRoomCount} rooms ready</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>



    </div>
  );
}
