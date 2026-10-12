import { FOLIOS, NOTICES, PAYMENTS, RESERVATIONS, ROOMS, TASKS, TODAY, folioBalance, formatMoney } from '../data/mock';
import { Badge, Card, CardTitle, ProgressBar } from '../components/ui';
import { paymentTone, reservationTone, roomTone } from '../components/status';
import { StatCard } from '../components/controls';
import type { NavTarget } from '../components/nav';

const NOTICE_DOT: Record<string, string> = {
  warning: 'var(--color-warning-text)',
  info: 'var(--color-info-text)',
  danger: 'var(--color-danger-text)',
  success: 'var(--color-success-text)',
};

export function Dashboard({ go }: { go: (t: NavTarget) => void }) {
  const arrivals = RESERVATIONS.filter((r) => r.checkIn === 'Oct 10' && (r.status === 'Confirmed' || r.status === 'Pending'));
  const departures = RESERVATIONS.filter((r) => r.checkOut === 'Oct 10' && r.status !== 'Checked-out');
  const hkDone = TASKS.filter((t) => t.status === 'Done').length;
  const openFolios = FOLIOS.filter((f) => folioBalance(f) > 0);

  const stats: { label: string; value: string; hint?: string; spark?: readonly number[]; target?: NavTarget }[] = [
    { label: 'Total rooms', value: String(TODAY.totalRooms), hint: '5 floors · 5 room types', target: { view: 'room-inventory' } },
    { label: 'Available rooms', value: String(TODAY.available), hint: 'Ready to sell tonight', target: { view: 'room-overview' } },
    { label: 'Occupied rooms', value: String(TODAY.occupied), hint: '124 in-house guests', target: { view: 'in-house' } },
    { label: 'Dirty rooms', value: String(TODAY.dirty), hint: 'Awaiting turnover', target: { view: 'housekeeping' } },
    { label: 'Out of service', value: String(TODAY.outOfService), hint: 'WO-118 · Suite 503', target: { view: 'maintenance' } },
    { label: "Today's arrivals", value: String(TODAY.arrivals), hint: '6 VIP arrivals', target: { view: 'check-in' } },
    { label: "Today's departures", value: String(TODAY.departures), hint: '2 late check-outs', target: { view: 'check-out' } },
    { label: 'In-house guests', value: String(TODAY.inHouse), hint: 'Across 118 rooms', target: { view: 'in-house' } },
    { label: 'Occupancy', value: `${TODAY.occupancyPct}%`, hint: '+4.2 pts vs last week', spark: [62, 70, 66, 74, 81, 78, 78], target: { view: 'occupancy-report' } },
    { label: "Today's revenue", value: `$${formatMoney(TODAY.revenue)}`, hint: 'Rooms + extras', spark: [32, 38, 35, 44, 52, 48, 41], target: { view: 'revenue-report' } },
    { label: 'Outstanding', value: `$${formatMoney(TODAY.outstanding)}`, hint: `${openFolios.length} open folios`, target: { view: 'folios' } },
    { label: 'ADR', value: `$${TODAY.adr}`, hint: 'Avg daily rate', spark: [160, 168, 172, 165, 178, 182, 186], target: { view: 'revenue-report' } },
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div className="pms-stagger grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} hint={s.hint} spark={s.spark} onClick={s.target ? () => go(s.target as NavTarget) : undefined} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-5">
        <Card elevated className="lg:col-span-2 xl:col-span-3">
          <CardTitle title="Recent reservations" subtitle="Latest bookings" action={<button type="button" onClick={() => go({ view: 'reservations' })} className="pms-btn-ghost px-3 py-2">View all</button>} />
          <div className="overflow-x-auto">
            <table className="pms-table min-w-[560px]">
              <thead><tr><th>Reference</th><th>Guest</th><th>Stay</th><th>Status</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {RESERVATIONS.slice(0, 5).map((r) => (
                  <tr key={r.id}>
                    <td className="tnum font-mono font-semibold">{r.id}</td>
                    <td>{r.guest}</td>
                    <td className="tnum" style={{ color: 'var(--color-ink-secondary)' }}>{r.checkIn} → {r.checkOut}</td>
                    <td><Badge tone={reservationTone(r.status)}>{r.status}</Badge></td>
                    <td className="tnum text-right font-semibold">${formatMoney(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="flex flex-col gap-4 sm:gap-5 lg:col-span-2 xl:col-span-2">
          <Card>
            <CardTitle title="Pending check-ins" subtitle={`${arrivals.length} expected today`} action={<button type="button" onClick={() => go({ view: 'check-in' })} className="pms-btn-primary px-3 py-2">Check-in desk</button>} />
            <ul className="flex flex-col gap-2">
              {arrivals.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5" style={{ borderColor: 'var(--color-border)' }}>
                  <span>
                    <span className="block text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{r.guest}</span>
                    <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{r.id} · {r.roomType} · {r.nights}n</span>
                  </span>
                  <Badge tone={reservationTone(r.status)}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardTitle title="Pending check-outs" subtitle={`${departures.length} due out today`} action={<button type="button" onClick={() => go({ view: 'check-out' })} className="pms-btn-primary px-3 py-2">Check-out desk</button>} />
            {departures.length === 0 ? (
              <p className="pms-helper py-4 text-center">No pending departures — all checked out.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {departures.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5" style={{ borderColor: 'var(--color-border)' }}>
                    <span>
                      <span className="block text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{r.guest}</span>
                      <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{r.id} · {r.room} · ${formatMoney(r.total - r.paid)} due</span>
                    </span>
                    <Badge tone={reservationTone(r.status)}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardTitle title="Housekeeping progress" subtitle={`${hkDone} of ${TASKS.length} tasks complete`} />
          <div className="mb-3">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="tnum text-[22px] font-bold leading-none" style={{ color: 'var(--color-ink)' }}>
                {TASKS.length > 0 ? Math.round((hkDone / TASKS.length) * 100) : 0}%
              </span>
              <span className="text-[11.5px] font-medium" style={{ color: 'var(--color-ink-secondary)' }}>tasks done</span>
            </div>
            <ProgressBar value={TASKS.length > 0 ? (hkDone / TASKS.length) * 100 : 0} />
          </div>
          <ul className="flex flex-col gap-1.5">
            {(['Available', 'Occupied', 'Dirty', 'Cleaning', 'Inspected', 'Out-of-service'] as const).map((s) => {
              const count = ROOMS.filter((r) => r.status === s).length;
              const share = ROOMS.length > 0 ? (count / ROOMS.length) * 100 : 0;
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
                <li key={s} className="rounded-[10px] border px-2.5 py-2" style={{ borderColor: 'var(--color-border)', background: 'color-mix(in srgb, var(--color-muted-surface) 45%, transparent)' }}>
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
                <button type="button" onClick={() => go({ view: (n.target as NavTarget['view']) })} className="flex w-full items-start gap-2.5 rounded-[10px] px-3 py-2.5 text-left">
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
          <CardTitle title="Recent payments" subtitle="Latest receipts" action={<button type="button" onClick={() => go({ view: 'payments' })} className="pms-btn-ghost px-3 py-2">Ledger</button>} />
          <div className="overflow-x-auto">
            <table className="pms-table min-w-[560px]">
              <thead><tr><th>Reference</th><th>Guest</th><th>Method</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {PAYMENTS.slice(0, 4).map((p) => (
                  <tr key={p.ref}>
                    <td className="tnum font-mono font-semibold">{p.ref}</td>
                    <td>{p.guest}</td>
                    <td className="tnum" style={{ color: 'var(--color-ink-secondary)' }}>{p.method}</td>
                    <td><Badge tone={paymentTone(p.status)}>{p.status}</Badge></td>
                    <td className="tnum text-right font-semibold">${formatMoney(p.amount)}</td>
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
