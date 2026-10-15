import { useCallback } from 'react';
import { NOTICES } from '../data/mock';
import type { Payment, ReservationStatus } from '../data/mock';
import { Badge, Card, CardTitle, ProgressBar } from '../components/ui';
import { paymentTone, reservationTone, roomTone } from '../components/status';
import { StatCard } from '../components/controls';
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

export function Dashboard({ go }: { go: (t: NavTarget) => void }) {
  const { can } = useAuth();
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

  const stats: { label: string; value: string; hint?: string; spark?: readonly number[]; target?: NavTarget }[] = [
    { label: 'Total rooms', value: String(rooms.total), hint: 'Active property inventory', target: { view: 'room-inventory' } },
    { label: 'Available rooms', value: String(rooms.ready), hint: 'Ready to sell', target: { view: 'room-overview' } },
    { label: 'Occupied rooms', value: String(rooms.occupied), hint: `${daily?.inHouseCount ?? 0} in-house stays`, target: { view: 'in-house' } },
    { label: 'Dirty rooms', value: String(rooms.dirty), hint: 'Awaiting housekeeping', target: { view: 'housekeeping' } },
    { label: 'Out of service', value: String(rooms.outOfOrder), hint: 'Maintenance unavailable', target: { view: 'maintenance' } },
    { label: "Today's arrivals", value: String(arrivals.length), hint: daily?.businessDate ?? '', target: { view: 'check-in' } },
    { label: "Today's departures", value: String(departures.length), hint: daily?.businessDate ?? '', target: { view: 'check-out' } },
    { label: 'In-house guests', value: String(daily?.inHouseCount ?? 0), hint: 'Current checked-in stays', target: { view: 'in-house' } },
    { label: 'Occupancy', value: `${occupancy}%`, hint: 'Current occupied room share', target: { view: 'occupancy-report' } },
    { label: "Today's revenue", value: data?.revenue ? formatCurrency(Number(data.revenue.grossRevenue), data.revenue.currencyCode) : '—', hint: data?.revenue?.currencyCode ?? 'Not permitted / not reported', target: can('report.read.financial') ? { view: 'revenue-report' } : undefined },
    { label: 'Outstanding', value: '—', hint: 'No outstanding-balance aggregate endpoint', target: can('folio.read') ? { view: 'folios' } : undefined },
    { label: 'ADR', value: data?.revenue ? formatCurrency(Number(data.revenue.adr), data.revenue.currencyCode) : '—', hint: 'Average daily rate', target: can('report.read.financial') ? { view: 'revenue-report' } : undefined },
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {resource.error ? <p role="alert" className="pms-helper">Could not load dashboard data: {resource.error}</p> : null}
      <div className="pms-stagger grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} hint={s.hint} spark={s.spark} onClick={s.target ? () => go(s.target as NavTarget) : undefined} />
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 xl:grid-cols-5">
        <Card elevated className="xl:col-span-3">
          <CardTitle title="Recent reservations" subtitle={resource.loading ? 'Loading bookings…' : 'Latest bookings'} action={can('reservation.read') ? <button type="button" onClick={() => go({ view: 'reservations' })} className="pms-btn-ghost px-3 py-2">View all</button> : undefined} />
          <div className="overflow-x-auto">
            <table className="pms-table min-w-[560px] table-fixed">
              <colgroup>
                <col className="w-[23%]" />
                <col className="w-[20%]" />
                <col className="w-[25%]" />
                <col className="w-[17%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead><tr><th>Reference</th><th>Guest</th><th>Stay</th><th>Status</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {reservations.slice(0, 5).map((r) => (
                  <tr key={r.id}>
                    <td className="max-w-0 truncate tnum font-mono font-semibold" title={r.id}>{r.id}</td>
                    <td className="max-w-0 truncate" title={r.guest}>{r.guest}</td>
                    <td className="max-w-0 truncate tnum" style={{ color: 'var(--color-ink-secondary)' }}>{r.checkIn} → {r.checkOut}</td>
                    <td><Badge tone={reservationTone(r.status)}>{r.status}</Badge></td>
                    <td className="tnum whitespace-nowrap text-right font-semibold">{formatCurrency(r.total, r.currencyCode)}</td>
                  </tr>
                ))}
                {!resource.loading && reservations.length === 0 ? <tr><td colSpan={5} className="pms-helper py-8 text-center">No reservations found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="flex min-w-0 flex-col gap-4 sm:gap-5 xl:col-span-2">
          <Card>
            <CardTitle title="Pending check-ins" subtitle={`${arrivals.length} expected today`} action={can('stay.check-in') ? <button type="button" onClick={() => go({ view: 'check-in' })} className="pms-btn-primary px-3 py-2">Check-in desk</button> : undefined} />
            <ul className="flex flex-col gap-2">
              {arrivals.slice(0, 3).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border px-3 py-2.5" style={{ borderColor: 'var(--color-border)' }}>
                  <span>
                    <span className="block text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{r.guest}</span>
                    <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{r.id} · {r.roomType} · {r.nights}n</span>
                  </span>
                  <Badge tone={reservationTone(r.status)}>{r.status}</Badge>
                </li>
              ))}
            </ul>
            {arrivals.length > 3 ? (
              <button type="button" onClick={() => go({ view: 'check-in' })} className="pms-helper mt-2 w-full text-center underline" style={{ color: 'var(--color-primary)' }}>
                Showing 3 of {arrivals.length} · view all
              </button>
            ) : null}
          </Card>
          <Card>
            <CardTitle title="Pending check-outs" subtitle={`${departures.length} due out today`} action={can('stay.check-out') ? <button type="button" onClick={() => go({ view: 'check-out' })} className="pms-btn-primary px-3 py-2">Check-out desk</button> : undefined} />
            {departures.length === 0 ? (
              <p className="pms-helper py-4 text-center">No pending departures — all checked out.</p>
            ) : (
              <ul className="flex flex-col gap-2">
              {departures.slice(0, 3).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border px-3 py-2.5" style={{ borderColor: 'var(--color-border)' }}>
                    <span>
                      <span className="block text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{r.guest}</span>
                    <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{r.id} · {r.room} · {formatCurrency(r.balance, data?.revenue?.currencyCode)} due</span>
                    </span>
                    <Badge tone={reservationTone(r.status)}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
            {departures.length > 3 ? (
              <button type="button" onClick={() => go({ view: 'check-out' })} className="pms-helper mt-2 w-full text-center underline" style={{ color: 'var(--color-primary)' }}>
                Showing 3 of {departures.length} · view all
              </button>
            ) : null}
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardTitle title="Housekeeping progress" subtitle={`${hkDone} of ${taskTotal} tasks ready`} />
          <div className="mb-3">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="tnum text-[22px] font-bold leading-none" style={{ color: 'var(--color-ink)' }}>
                {taskTotal > 0 ? Math.round((hkDone / taskTotal) * 100) : 0}%
              </span>
              <span className="text-[11.5px] font-medium" style={{ color: 'var(--color-ink-secondary)' }}>tasks done</span>
            </div>
            <ProgressBar value={taskTotal > 0 ? (hkDone / taskTotal) * 100 : 0} />
          </div>
          <ul className="flex flex-col gap-1.5">
            {(['Available', 'Occupied', 'Dirty', 'Cleaning', 'Inspected', 'Out-of-service'] as const).map((s) => {
              const count = s === 'Available' ? rooms.ready : s === 'Occupied' ? rooms.occupied : s === 'Dirty' ? rooms.dirty : s === 'Out-of-service' ? rooms.outOfOrder : 0;
              const share = rooms.total > 0 ? (count / rooms.total) * 100 : 0;
              const barColor =
                roomTone(s) === 'success'
                  ? 'var(--color-success-text)'
                  : roomTone(s) === 'info'
                    ? 'var(--color-info-text)'
                    : roomTone(s) === 'warning'
                      ? 'var(--color-warning-text)'
                      : roomTone(s) === 'danger'
                        ? 'var(--color-danger-text)'
                        : 'var(--color-neutral-text)';
              return (
                <li key={s} className="rounded-control border px-2.5 py-2" style={{ borderColor: 'var(--color-border)', background: 'color-mix(in srgb, var(--color-muted-surface) 45%, transparent)' }}>
                  <span className="flex items-center justify-between gap-3 text-[13px]">
                    <Badge tone={roomTone(s)}>{s}</Badge>
                    <span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>{count} rooms</span>
                  </span>
                  <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--color-divider)' }} aria-hidden="true">
                    <span className="block h-full rounded-full" style={{ width: `${share}%`, background: barColor }} />
                  </span>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => go({ view: 'housekeeping' })} className="pms-btn-ghost mt-3 w-full px-3 py-2">Housekeeping dashboard</button>
        </Card>
        <Card className="xl:col-span-3">
          <CardTitle title="Alerts & operational tasks" subtitle="Needs attention now" />
          <ul className="flex flex-col gap-1">
            {NOTICES.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => go({ view: (n.target as NavTarget['view']) })} className="flex w-full items-start gap-2.5 rounded-control px-3 py-2.5 text-left">
                  <span className="mt-1.5 h-2 w-2 flex-none rounded-full" style={{ background: NOTICE_DOT[n.tone] }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--color-ink)' }}>{n.title}</span>
                      <span className="tnum flex-none text-[11px]" style={{ color: 'var(--color-ink-muted)' }}>{n.time}</span>
                    </span>
                    <span className="mt-0.5 block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{n.detail}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-5">
          <CardTitle title="Recent payments" subtitle="Latest receipts" action={can('payment.read') ? <button type="button" onClick={() => go({ view: 'payments' })} className="pms-btn-ghost px-3 py-2">Ledger</button> : undefined} />
          <div className="overflow-x-auto">
            <table className="pms-table min-w-[560px]">
              <thead><tr><th>Reference</th><th>Guest</th><th>Method</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {payments.slice(0, 4).map((p) => (
                  <tr key={p.ref}>
                    <td className="tnum font-mono font-semibold">{p.ref}</td>
                    <td>{p.guest}</td>
                    <td className="tnum" style={{ color: 'var(--color-ink-secondary)' }}>{p.method}</td>
                    <td><Badge tone={paymentTone(p.status)}>{p.status}</Badge></td>
                    <td className="tnum text-right font-semibold">{formatCurrency(p.amount, p.currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
