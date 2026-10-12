import { FOLIOS, INVOICES, PAYMENTS, RESERVATIONS, TODAY, folioBalance, formatMoney } from '../data/mock';
import { Badge, Card, CardTitle } from '../components/ui';
import { paymentTone } from '../components/status';
import { BarChart, DonutChart } from '../components/charts';
import type { NavTarget } from '../components/nav';

export function Reports({ go }: { go: (t: NavTarget) => void }) {
  const outstanding = FOLIOS.filter((f) => f.status === 'Open').reduce((s, f) => s + folioBalance(f), 0);
  const collected = PAYMENTS.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);

  const tiles: { title: string; desc: string; target: NavTarget }[] = [
    { title: 'Occupancy Report', desc: 'Daily occupancy, mix and pace', target: { view: 'occupancy-report' } },
    { title: 'Revenue Report', desc: 'Revenue, ADR and RevPAR', target: { view: 'revenue-report' } },
    { title: 'Arrivals & Departures', desc: 'Movement and VIP watch', target: { view: 'arrivals-departures' } },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <button key={t.title} type="button" onClick={() => go(t.target)} className="pms-card pms-card-hover p-5 text-left">
            <p className="pms-section-title">{t.title}</p>
            <p className="pms-helper mt-1">{t.desc}</p>
            <p className="mt-3 text-[13px] font-semibold" style={{ color: 'var(--color-primary)' }}>Open report →</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardTitle title="This week at a glance" subtitle="Demo figures · filters live on each report" />
          <BarChart
            label="Weekly occupancy bars"
            data={[
              { label: 'Mon', value: 62 },
              { label: 'Tue', value: 70 },
              { label: 'Wed', value: 66 },
              { label: 'Thu', value: 74 },
              { label: 'Fri', value: 81, highlight: true },
              { label: 'Sat', value: 78 },
              { label: 'Sun', value: 78 },
            ]}
          />
        </Card>
        <Card className="xl:col-span-2">
          <CardTitle title="Collection snapshot" subtitle="Payments vs outstanding" />
          <DonutChart
            label="Collected versus outstanding"
            slices={[
              { label: 'Collected', value: collected, color: 'var(--color-primary)' },
              { label: 'Outstanding', value: outstanding, color: 'var(--color-warning-text)' },
            ]}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle title="Reservation sources" subtitle="Where bookings come from" />
          <ul className="flex flex-col gap-2">
            {['Direct', 'OTA', 'Corporate', 'Walk-in'].map((c) => {
              const list = RESERVATIONS.filter((r) => r.channel === c);
              const rev = list.reduce((s, r) => s + r.total, 0);
              return (
                <li key={c} className="flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{c} <span className="tnum font-normal" style={{ color: 'var(--color-ink-secondary)' }}>· {list.length} bookings</span></span>
                  <span className="tnum text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>${formatMoney(rev)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <CardTitle title="Payment collection" subtitle="Status across receipts and invoices" />
          <ul className="flex flex-col gap-2">
            {(['Paid', 'Pending', 'Overdue', 'Failed'] as const).map((s) => {
              const n = [...PAYMENTS.filter((p) => p.status === s)].length + INVOICES.filter((i) => i.status === s).length;
              return (
                <li key={s} className="flex items-center justify-between gap-2">
                  <Badge tone={paymentTone(s)}>{s}</Badge>
                  <span className="tnum text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{n} records</span>
                </li>
              );
            })}
          </ul>
          <p className="pms-helper mt-3">Outstanding balances: <span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>${formatMoney(outstanding + TODAY.outstanding - outstanding)}</span> property-wide (demo).</p>
        </Card>
      </div>
    </div>
  );
}
