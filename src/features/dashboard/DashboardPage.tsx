import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { PageSkeleton } from '../../components/feedback/Skeleton';
import type { NavTarget } from '../../config/navigation';
import { reservationApi } from '../../lib/api/pms';
import type { ReservationRow } from '../../lib/api/pms';
import { reservationFromApi } from '../../lib/api/adapters';
import { useApiResource } from '../../lib/api/useApiResource';
import { useAuth } from '../auth/AuthContext';
import { Avatar, Badge, TableActionBtn, TableContainer } from '../../components/ui/display';
import { Button } from '../../components/ui/primitives';

/*
 * Everything on this page is read from the backend for the active property: reservations (arrivals,
 * departures, in-house, recent) and the room inventory. Nothing is sample data; a property with no
 * bookings shows empty states.
 */

type Stay = ReturnType<typeof reservationFromApi>;

interface DashboardData {
  today: string;
  arrivals: ReservationRow[];
  departures: ReservationRow[];
  inHouse: ReservationRow[];
  recent: ReservationRow[];
}

/** Rows fetched per list; the dashboard shows at most five of each. */
const LIST_SIZE = 50;
const VISIBLE_ROWS = 5;

type TimelineKind = 'arrival' | 'departure' | 'in-house';
type TimelineTab = 'all' | 'arrivals' | 'departures' | 'in-house';

interface TimelineItem {
  id: string;
  kind: TimelineKind;
  stay: Stay;
  time: string | null;
}

const KIND_STYLE: Record<TimelineKind, { icon: Lucide.LucideIcon; iconBg: string; statusTone: string; status: string }> = {
  arrival: {
    icon: Lucide.DoorOpen,
    iconBg: 'bg-success-bg text-success-text border border-success-border',
    statusTone: 'bg-success-bg text-success-text border-success-border/60',
    status: 'Arriving',
  },
  departure: {
    icon: Lucide.DoorClosed,
    iconBg: 'bg-warning-bg text-warning-text border border-warning-border',
    statusTone: 'bg-warning-bg text-warning-text border-warning-border/60',
    status: 'Due out',
  },
  'in-house': {
    icon: Lucide.BedDouble,
    iconBg: 'bg-info-bg text-info-text border border-info-border',
    statusTone: 'bg-info-bg text-info-text border-info-border/60',
    status: 'In house',
  },
};

const pad = (value: number) => String(value).padStart(2, '0');
const localIsoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function money(amount: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

const balanceOf = (stay: Stay) => Math.max(0, stay.total - stay.paid);

function statusTone(status: string): 'success' | 'warning' | 'info' | 'neutral' {
  if (status === 'Confirmed') return 'success';
  if (status === 'Pending') return 'warning';
  if (status === 'Checked-in') return 'info';
  return 'neutral';
}

function Empty({ icon: Icon, title, hint }: { icon: Lucide.LucideIcon; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-page/50 px-4 py-8 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted-surface text-ink-muted">
        <Icon size={17} aria-hidden="true" />
      </span>
      <p className="text-label font-semibold text-ink">{title}</p>
      <p className="max-w-xs text-label text-ink-muted">{hint}</p>
    </div>
  );
}

/** A dashboard card: gradient icon, title with a count, and an action link on the right. */
function Panel({
  icon: Icon,
  gradient,
  title,
  count,
  subtitle,
  actionLabel,
  onAction,
  footer,
  children,
}: {
  icon: Lucide.LucideIcon;
  gradient: string;
  title: string;
  count: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  footer: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs sm:p-5">
      <div className="min-w-0">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-divider pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr text-white shadow-xs ${gradient}`}>
              <Icon size={17} strokeWidth={2.4} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-title font-bold tracking-tight text-ink">{title}</h2>
                <span className="rounded-full border border-border bg-muted-surface px-1.5 py-px text-micro font-bold text-ink-secondary">
                  {count}
                </span>
              </div>
              <p className="mt-0.5 text-label text-ink-muted">{subtitle}</p>
            </div>
          </div>
          <Button variant="secondary" type="button" onClick={onAction} className="flex cursor-pointer items-center gap-1 transition-colors">
            <span>{actionLabel}</span>
            <Lucide.ArrowRight size={14} className="text-ink-secondary" />
          </Button>
        </div>
        {children}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3 text-label text-ink-secondary">
        <span>{footer}</span>
      </div>
    </section>
  );
}

const TABLE_CLASS =
  'pms-table w-full min-w-[580px] [&_th]:px-3 [&_th]:py-2.5 [&_td]:px-3 [&_td]:py-2.5 [&_th:last-child]:pr-3.5 [&_td:last-child]:pr-3.5';

function GuestCell({ stay }: { stay: Stay }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar name={stay.guest} size={30} />
      <div className="min-w-0">
        <span className="block max-w-[150px] truncate text-label font-semibold text-ink">{stay.guest}</span>
        <span className="block font-mono text-label text-ink-secondary">{stay.bookingCode}</span>
      </div>
    </div>
  );
}

function RoomCell({ stay }: { stay: Stay }) {
  return (
    <>
      <span
        className={`rounded-md border px-1.5 py-px text-micro font-bold ${
          stay.roomNumber ? 'border-border/60 bg-muted-surface text-ink' : 'border-warning-border/80 bg-warning-bg text-warning-text'
        }`}
      >
        {stay.roomNumber ? `Room ${stay.roomNumber}` : 'Unassigned'}
      </span>
      <span className="mt-0.5 block text-label text-ink-secondary">{stay.roomType}</span>
    </>
  );
}

function BalanceCell({ stay }: { stay: Stay }) {
  const due = balanceOf(stay);
  return due > 0 ? (
    <Badge size="sm" tone="warning">Due {money(due, stay.currencyCode)}</Badge>
  ) : (
    <Badge size="sm" tone="success">Paid</Badge>
  );
}

export function Dashboard({ go }: { go: (t: NavTarget) => void }) {
  const { me, can } = useAuth();
  const [timelineTab, setTimelineTab] = useState<TimelineTab>('all');
  const canReadReservations = can('reservation.read');

  const loadDashboard = useCallback(async (): Promise<DashboardData> => {
    const today = localIsoDate(new Date());
    const none = { data: [] as ReservationRow[], total: 0 };
    const [arrivals, departures, inHouse, recent] = await Promise.all([
      canReadReservations
        ? reservationApi.list('', 'CONFIRMED', 1, LIST_SIZE, { checkInFrom: today, checkInTo: today })
        : none,
      // Anyone still checked in whose stay ends today or has already ended.
      canReadReservations ? reservationApi.list('', 'CHECKED_IN', 1, LIST_SIZE, { checkOutTo: today }) : none,
      canReadReservations ? reservationApi.list('', 'CHECKED_IN', 1, LIST_SIZE) : none,
      canReadReservations ? reservationApi.list('', undefined, 1, VISIBLE_ROWS) : none,
    ]);
    return {
      today,
      arrivals: arrivals.data,
      departures: departures.data,
      inHouse: inHouse.data,
      recent: recent.data,
    };
  }, [canReadReservations]);

  const resource = useApiResource(loadDashboard);
  const data = resource.data;

  const arrivals = useMemo(() => (data?.arrivals ?? []).map(reservationFromApi), [data]);
  const departures = useMemo(() => (data?.departures ?? []).map(reservationFromApi), [data]);
  const recent = useMemo(() => (data?.recent ?? []).map(reservationFromApi), [data]);

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!data) return [];
    const leavingToday = new Set(data.departures.map((row) => row.id));
    return [
      ...data.arrivals.map((row) => ({ id: `a-${row.id}`, kind: 'arrival' as const, stay: reservationFromApi(row), time: row.checkInTime ?? null })),
      ...data.departures.map((row) => ({ id: `d-${row.id}`, kind: 'departure' as const, stay: reservationFromApi(row), time: row.checkOutTime ?? null })),
      ...data.inHouse
        .filter((row) => !leavingToday.has(row.id))
        .map((row) => ({ id: `h-${row.id}`, kind: 'in-house' as const, stay: reservationFromApi(row), time: null })),
    ];
  }, [data]);

  const tabKinds: Record<Exclude<TimelineTab, 'all'>, TimelineKind> = {
    arrivals: 'arrival',
    departures: 'departure',
    'in-house': 'in-house',
  };
  const countOf = (kind: TimelineKind) => timeline.filter((item) => item.kind === kind).length;
  const visibleTimeline = timelineTab === 'all' ? timeline : timeline.filter((item) => item.kind === tabKinds[timelineTab]);

  if (resource.initialLoading) return <PageSkeleton />;

  const now = new Date();
  const firstName = me?.user.fullName?.trim().split(/\s+/)[0];

  if (resource.error || !data) {
    return (
      <div className="pms-page text-label">
        <Empty icon={Lucide.CloudOff} title="The dashboard could not be loaded" hint={resource.error ?? 'Try again in a moment.'} />
        <div className="flex justify-center">
          <Button variant="secondary" type="button" onClick={resource.refresh}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pms-page text-label">
      {/* ================= 1. PAGE HEADER ================= */}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-warning-bg text-warning-text shadow-2xs">
            <Lucide.Sun size={26} />
          </div>
          <div>
            <h1 className="text-disp3 font-bold leading-tight tracking-tight text-ink">
              {greeting(now)}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-1 text-label font-normal text-ink-secondary">
              Here&apos;s what&apos;s happening at your hotel today <span className="text-ink-muted">•</span>{' '}
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* ================= 2. TIMELINE & FRONT DESK ================= */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        {/* Today's movements */}
        <div className="flex h-full flex-col justify-between rounded-2xl border border-border/80 bg-surface p-5 shadow-xs lg:col-span-6">
          <div>
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-divider pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
                  <Lucide.Clock size={17} strokeWidth={2.4} />
                </div>
                <div>
                  <h2 className="text-title font-bold tracking-tight text-ink">Today&apos;s Activity</h2>
                  <p className="mt-0.5 text-label text-ink-muted">Arrivals, departures and guests in house</p>
                </div>
              </div>
              <Button variant="link" type="button" onClick={() => go({ view: 'arrivals-departures' })}>
                <span>Front Desk</span>
                <Lucide.ArrowRight size={13} />
              </Button>
            </div>

            <div className="no-scrollbar mb-4 flex items-center gap-1 overflow-x-auto rounded-xl bg-muted-surface/80 p-1">
              {([
                { key: 'all', label: `All (${timeline.length})` },
                { key: 'arrivals', label: `Arrivals (${countOf('arrival')})` },
                { key: 'departures', label: `Departures (${countOf('departure')})` },
                { key: 'in-house', label: `In-House (${countOf('in-house')})` },
              ] as const).map((tab) => (
                <Button
                  variant="secondary"
                  key={tab.key}
                  type="button"
                  onClick={() => setTimelineTab(tab.key)}
                  className={`min-w-[70px] flex-1 cursor-pointer text-center text-label transition-all ${
                    timelineTab === tab.key ? 'border border-border/50 bg-surface text-ink shadow-2xs' : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {visibleTimeline.length === 0 ? (
              <Empty icon={Lucide.CalendarCheck} title="Nothing scheduled" hint="Arrivals, departures and in-house guests will show here as bookings come in." />
            ) : (
              <div className="flex flex-col">
                {visibleTimeline.slice(0, VISIBLE_ROWS).map((item, index, shown) => {
                  const style = KIND_STYLE[item.kind];
                  const ItemIcon = style.icon;
                  const isLast = index === shown.length - 1;
                  return (
                    <div key={item.id} className="group relative flex items-start gap-3">
                      <div className="flex flex-none flex-col items-center">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl shadow-2xs ${style.iconBg}`}>
                          <ItemIcon size={15} strokeWidth={2.2} />
                        </div>
                        {!isLast && <div className="my-1.5 min-h-[34px] w-[2px] flex-1 bg-gradient-to-b from-border via-border to-muted-surface" />}
                      </div>
                      <div className={`min-w-0 flex-1 ${isLast ? 'pb-1' : 'pb-3.5'}`}>
                        <div className="rounded-xl border border-border/70 bg-surface p-3 transition-all duration-200 hover:border-ink-disabled hover:bg-page/50">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              {item.time && (
                                <span className="rounded-md border border-border/60 bg-muted-surface/90 px-1.5 py-px font-mono text-micro font-bold text-ink">{item.time}</span>
                              )}
                              <span className="rounded-md bg-muted-surface/80 px-1.5 py-px text-micro font-semibold text-ink">
                                {item.stay.roomNumber ? `Room ${item.stay.roomNumber}` : 'Unassigned'}
                              </span>
                              <span className={`inline-flex items-center rounded-full border px-1.5 py-px text-micro font-bold ${style.statusTone}`}>{style.status}</span>
                            </div>
                            <Button
                              variant="secondary"
                              type="button"
                              onClick={() => go({ view: 'reservations', query: item.stay.bookingCode })}
                              className="flex flex-none cursor-pointer items-center gap-1 text-label"
                            >
                              <span>View booking</span>
                              <Lucide.ArrowRight size={12} />
                            </Button>
                          </div>
                          <div className="mt-1.5">
                            <h4 className="text-label font-bold text-ink">{item.stay.guest}</h4>
                            <p className="mt-0.5 truncate text-label text-ink-secondary">{item.stay.bookingCode} • {item.stay.roomType}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-divider pt-3.5 text-label text-ink-secondary">
            <span className="font-medium">
              Showing {Math.min(visibleTimeline.length, VISIBLE_ROWS)} of {visibleTimeline.length} activities
            </span>
            <Button variant="link" type="button" onClick={() => go({ view: 'arrivals-departures' })}>
              <span>Movement report</span>
              <Lucide.ArrowRight size={12} />
            </Button>
          </div>
        </div>

        {/* Pending check-ins and check-outs */}
        <div className="flex h-full flex-col gap-5 lg:col-span-6">
          <Panel
            icon={Lucide.DoorOpen}
            gradient="from-success-text to-success-border shadow-success-text/20"
            title="Pending Check-ins"
            count={`${arrivals.length} Expected`}
            subtitle="Today's arrivals awaiting front desk check-in"
            actionLabel="Reservations"
            onAction={() => go({ view: 'reservations' })}
            footer={`Showing ${Math.min(arrivals.length, VISIBLE_ROWS)} of ${arrivals.length} expected arrivals today`}
          >
            {arrivals.length === 0 ? (
              <Empty icon={Lucide.DoorOpen} title="No arrivals today" hint="Confirmed bookings arriving today will show here." />
            ) : (
              <TableContainer>
                <table className={TABLE_CLASS}>
                  <thead>
                    <tr>
                      <th className="whitespace-nowrap text-center text-label font-semibold">#</th>
                      <th className="whitespace-nowrap text-label font-semibold">Guest &amp; Booking</th>
                      <th className="whitespace-nowrap text-label font-semibold">Room</th>
                      <th className="whitespace-nowrap text-label font-semibold">Stay</th>
                      <th className="whitespace-nowrap text-center text-label font-semibold">Balance</th>
                      <th className="whitespace-nowrap pr-3.5 text-right text-label font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arrivals.slice(0, VISIBLE_ROWS).map((stay, index) => (
                      <tr key={stay.backendId}>
                        <td className="whitespace-nowrap text-center text-label font-medium text-ink-secondary">{index + 1}</td>
                        <td className="whitespace-nowrap"><GuestCell stay={stay} /></td>
                        <td className="whitespace-nowrap"><RoomCell stay={stay} /></td>
                        <td className="whitespace-nowrap">
                          <span className="block text-label text-ink-secondary">{stay.checkIn} – {stay.checkOut} ({stay.nights}n)</span>
                        </td>
                        <td className="whitespace-nowrap text-center"><BalanceCell stay={stay} /></td>
                        <td className="whitespace-nowrap pr-2 text-right">
                          <Button variant="success" type="button" onClick={() => go({ view: 'reservations', query: stay.bookingCode })} className="inline-flex cursor-pointer items-center gap-1.5">
                            <span>View booking</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            )}
          </Panel>

          <Panel
            icon={Lucide.DoorClosed}
            gradient="from-warning-text to-warning-border shadow-warning-text/20"
            title="Pending Check-outs"
            count={`${departures.length} Due Out`}
            subtitle="Checked-in guests leaving today or already past their date"
            actionLabel="Reservations"
            onAction={() => go({ view: 'reservations' })}
            footer={`Showing ${Math.min(departures.length, VISIBLE_ROWS)} of ${departures.length} departures pending`}
          >
            {departures.length === 0 ? (
              <Empty icon={Lucide.DoorClosed} title="No departures pending" hint="Guests due to leave today will show here." />
            ) : (
              <TableContainer>
                <table className={TABLE_CLASS}>
                  <thead>
                    <tr>
                      <th className="whitespace-nowrap text-center text-label font-semibold">#</th>
                      <th className="whitespace-nowrap text-label font-semibold">Guest &amp; Booking</th>
                      <th className="whitespace-nowrap text-label font-semibold">Room</th>
                      <th className="whitespace-nowrap text-label font-semibold">Stay</th>
                      <th className="whitespace-nowrap text-center text-label font-semibold">Balance</th>
                      <th className="whitespace-nowrap pr-3.5 text-right text-label font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departures.slice(0, VISIBLE_ROWS).map((stay, index) => (
                      <tr key={stay.backendId}>
                        <td className="whitespace-nowrap text-center text-label font-medium text-ink-secondary">{index + 1}</td>
                        <td className="whitespace-nowrap"><GuestCell stay={stay} /></td>
                        <td className="whitespace-nowrap"><RoomCell stay={stay} /></td>
                        <td className="whitespace-nowrap">
                          <span className="block text-label text-ink-secondary">{stay.checkIn} – {stay.checkOut} ({stay.nights}n)</span>
                          {(stay.checkOutIso ?? '') < data.today && <span className="text-micro font-semibold text-danger-text">Past check-out date</span>}
                        </td>
                        <td className="whitespace-nowrap text-center"><BalanceCell stay={stay} /></td>
                        <td className="whitespace-nowrap pr-3.5 text-right">
                          <Button variant="warning" type="button" onClick={() => go({ view: 'reservations', query: stay.bookingCode })} className="inline-flex cursor-pointer items-center gap-1.5">
                            <span>View booking</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            )}
          </Panel>
        </div>
      </div>

      {/* ================= 3. RECENT RESERVATIONS ================= */}
      <Panel
        icon={Lucide.CalendarDays}
        gradient="from-info-text to-dark-accent shadow-info-text/20"
        title="Recent Reservations"
        count={`${recent.length} Latest`}
        subtitle="Most recently created bookings across the property"
        actionLabel="View all"
        onAction={() => go({ view: 'reservations' })}
        footer={`Showing ${recent.length} recent bookings`}
      >
        {recent.length === 0 ? (
          <Empty icon={Lucide.CalendarDays} title="No reservations yet" hint="New bookings will show here as soon as they are made." />
        ) : (
          <TableContainer>
            <table className={TABLE_CLASS}>
              <thead>
                <tr>
                  <th className="w-8 whitespace-nowrap text-center text-label font-semibold">#</th>
                  <th className="whitespace-nowrap text-label font-semibold">Guest &amp; Booking</th>
                  <th className="whitespace-nowrap text-label font-semibold">Room &amp; Dates</th>
                  <th className="whitespace-nowrap text-center text-label font-semibold">Status</th>
                  <th className="whitespace-nowrap text-right text-label font-semibold">Total</th>
                  <th className="w-12 whitespace-nowrap pr-3.5 text-right text-label font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((stay, index) => (
                  <tr key={stay.backendId}>
                    <td className="whitespace-nowrap text-center text-label font-medium text-ink-secondary">{index + 1}</td>
                    <td className="whitespace-nowrap"><GuestCell stay={stay} /></td>
                    <td className="whitespace-nowrap">
                      <span className="block text-label font-medium text-ink">{stay.room}</span>
                      <span className="block text-label text-ink-secondary">{stay.checkIn} – {stay.checkOut}</span>
                    </td>
                    <td className="whitespace-nowrap text-center">
                      <Badge size="sm" tone={statusTone(stay.status)}>{stay.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap text-right font-mono text-label font-bold text-ink">{money(stay.total, stay.currencyCode)}</td>
                    <td className="whitespace-nowrap pr-3.5 text-right">
                      <div className="flex items-center justify-end">
                        <TableActionBtn icon={Lucide.Eye} title="Open reservation" onClick={() => go({ view: 'reservations', query: stay.bookingCode })} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        )}
      </Panel>
    </div>
  );
}
