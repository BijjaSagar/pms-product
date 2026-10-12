import { useMemo, useState } from 'react';
import { FOLIOS, folioBalance, folioPaid, folioTotal, formatMoney } from '../data/mock';
import type { Folio } from '../data/mock';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { FilterChip } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Drawer } from '../components/overlays';
import { toast } from '../components/toastStore';

export function Billing() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'All' | 'Open' | 'Settled' | 'Owing'>('All');
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return FOLIOS.filter(
      (f) =>
        (filter === 'All' || (filter === 'Owing' ? (f.status === 'Open' && folioBalance(f) > 0) : f.status === filter)) &&
        (!needle || f.guest.toLowerCase().includes(needle) || f.id.toLowerCase().includes(needle) || f.room.includes(needle)),
    );
  }, [q, filter]);

  const open = FOLIOS.find((f) => f.id === openId) ?? null;
  const collected = FOLIOS.reduce((s, f) => s + folioPaid(f), 0);
  const owing = FOLIOS.filter((f) => f.status === 'Open').reduce((s, f) => s + folioBalance(f), 0);

  const folioDetail = (f: Folio) => (
    <div className="flex flex-col gap-3 text-[13.5px]">
      <div className="flex items-center gap-3">
        <Avatar name={f.guest} />
        <div className="flex-1">
          <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>{f.guest} · Room {f.room}</p>
          <p className="tnum text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{f.id} · {f.reservationId}</p>
        </div>
        <Badge tone={f.status === 'Settled' ? 'success' : folioBalance(f) > 0 ? 'warning' : 'success'}>{f.status}</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="pms-table min-w-[420px]">
          <thead><tr><th>Charge</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            {f.charges.map((c) => (
              <tr key={c.label}>
                <td><span className="block font-medium">{c.label}</span><span className="block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{c.detail}</span></td>
                <td className="tnum text-right font-semibold">${formatMoney(c.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul>
        {[
          ['Taxes', `$${formatMoney(f.tax)}`],
          ['Discounts', `−$${formatMoney(f.discount)}`],
          ['Total', `$${formatMoney(folioTotal(f))}`],
          ['Paid', `$${formatMoney(folioPaid(f))}`],
        ].map(([k, v]) => (
          <li key={k} className="flex justify-between border-b py-2" style={{ borderColor: 'var(--color-divider)' }}>
            <span style={{ color: 'var(--color-ink-secondary)' }}>{k}</span>
            <span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>{v}</span>
          </li>
        ))}
        <li className="flex justify-between py-2.5">
          <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>Balance due</span>
          <span className="tnum text-[18px] font-semibold" style={{ color: folioBalance(f) > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>${formatMoney(folioBalance(f))}</span>
        </li>
      </ul>
      {f.payments.length > 0 ? (
        <div>
          <p className="pms-label mb-1.5">Payments</p>
          {f.payments.map((p) => (
            <p key={p.ref} className="tnum text-[12.5px]" style={{ color: 'var(--color-ink-secondary)' }}>{p.ref} · {p.method} · ${formatMoney(p.amount)} · {p.date}</p>
          ))}
        </div>
      ) : <p className="pms-helper">No payments posted yet.</p>}
      <div className="flex gap-2">
        <button type="button" className="pms-btn-ghost flex-1 px-3 py-2.5" onClick={() => toast('Receipt printed (demo)', { detail: 'Sent to the demo printer queue.', tone: 'info' })}>Print receipt</button>
        <button type="button" className="pms-btn-primary flex-1 px-3 py-2.5" onClick={() => toast('Payment recorded (demo)', { detail: 'Simulated — no charge processed.', tone: 'info' })}>Record payment</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ['Collected', `$${formatMoney(collected)}`, 'Across all folios'],
          ['Outstanding', `$${formatMoney(owing)}`, 'Open balances'],
          ['Open folios', String(FOLIOS.filter((f) => f.status === 'Open').length), 'In-house + arrivals'],
        ].map(([k, v, h]) => (
          <section key={k} className="pms-card p-4">
            <p className="pms-label">{k}</p>
            <p className="pms-kpi-value tnum mt-1">{v}</p>
            <p className="pms-helper mt-1">{h}</p>
          </section>
        ))}
      </div>
      <Card>
        <CardTitle title="Guest folios" subtitle={`${rows.length} folios · simulated figures`} />
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Guest, folio or room…" aria-label="Search folios" className={inputClass()} />
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter folios">
            {(['All', 'Open', 'Owing', 'Settled'] as const).map((f) => <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</FilterChip>)}
          </div>
          <button type="button" className="pms-btn-ghost px-3 py-2.5" onClick={() => { setQ(''); setFilter('All'); }}>Clear</button>
        </div>
        <div className="overflow-x-auto">
          <table className="pms-table min-w-[720px]">
            <thead><tr><th>Folio</th><th>Guest · Room</th><th>Reservation</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Balance</th><th><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id}>
                  <td className="tnum font-mono font-semibold">{f.id}</td>
                  <td><span className="block font-medium">{f.guest}</span><span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>Room {f.room}</span></td>
                  <td className="tnum font-mono" style={{ color: 'var(--color-ink-secondary)' }}>{f.reservationId}</td>
                  <td><Badge tone={f.status === 'Settled' ? 'success' : 'warning'}>{f.status}</Badge></td>
                  <td className="tnum text-right font-semibold">${formatMoney(folioTotal(f))}</td>
                  <td className="tnum text-right font-semibold" style={{ color: folioBalance(f) > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>${formatMoney(folioBalance(f))}</td>
                  <td><button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => setOpenId(f.id)} aria-label={`Open ${f.id}`}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="pms-helper py-6 text-center">No folios match.</p> : null}
        </div>
      </Card>
      <Drawer open={open !== null} onClose={() => setOpenId(null)} title={open ? `Folio ${open.id}` : ''} subtitle="Charges, taxes, payments and balance">
        {open ? folioDetail(open) : null}
      </Drawer>
    </div>
  );
}
