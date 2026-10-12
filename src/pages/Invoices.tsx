import { useMemo, useState } from 'react';
import { INVOICES, PROPERTY, formatMoney } from '../data/mock';
import type { Invoice } from '../data/mock';
import { Badge, Card, CardTitle } from '../components/ui';
import { paymentTone } from '../components/status';
import { FilterChip } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Drawer } from '../components/overlays';
import { toast } from '../components/toastStore';

export function Invoices() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [openId, setOpenId] = useState<string | null>(null);

  const rows: Invoice[] = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return INVOICES.filter(
      (i) => (status === 'All' || i.status === status) && (!needle || i.guest.toLowerCase().includes(needle) || i.id.toLowerCase().includes(needle)),
    );
  }, [q, status]);

  const open = INVOICES.find((i) => i.id === openId) ?? null;
  const outstanding = INVOICES.filter((i) => i.status === 'Overdue' || i.status === 'Failed').reduce((s, i) => s + i.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ['Issued (demo)', String(INVOICES.length), 'This period'],
          ['Outstanding', `$${formatMoney(outstanding)}`, 'Overdue + failed'],
          ['Paid', `$${formatMoney(INVOICES.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.amount, 0))}`, 'Settled'],
        ].map(([k, v, h]) => (
          <section key={k} className="pms-card p-4">
            <p className="pms-label">{k}</p>
            <p className="pms-kpi-value tnum mt-1">{v}</p>
            <p className="pms-helper mt-1">{h}</p>
          </section>
        ))}
      </div>
      <Card>
        <CardTitle title="Invoices" subtitle={`${rows.length} documents`} />
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Guest or invoice number…" aria-label="Search invoices" className={inputClass()} />
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
            {['All', 'Paid', 'Pending', 'Overdue', 'Failed'].map((s) => <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>{s}</FilterChip>)}
          </div>
          <button type="button" className="pms-btn-ghost px-3 py-2.5" onClick={() => { setQ(''); setStatus('All'); }}>Clear</button>
        </div>
        <div className="overflow-x-auto">
          <table className="pms-table min-w-[680px]">
            <thead><tr><th>Invoice</th><th>Guest · Room</th><th>Due</th><th>Method</th><th>Status</th><th className="text-right">Amount</th><th><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td className="tnum font-mono font-semibold">{i.id}</td>
                  <td><span className="block font-medium">{i.guest}</span><span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>Room {i.room}</span></td>
                  <td style={{ color: 'var(--color-ink-secondary)' }}>{i.due}</td>
                  <td style={{ color: 'var(--color-ink-secondary)' }}>{i.method}</td>
                  <td><Badge tone={paymentTone(i.status)}>{i.status}</Badge></td>
                  <td className="tnum text-right font-semibold">${formatMoney(i.amount)}</td>
                  <td><button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => setOpenId(i.id)} aria-label={`Preview ${i.id}`}>Preview</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="pms-helper py-6 text-center">No invoices match.</p> : null}
        </div>
      </Card>

      <Drawer open={open !== null} onClose={() => setOpenId(null)} title={open ? `Invoice ${open.id}` : ''} subtitle="Professional preview · print supported">
        {open ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-[12px] border p-5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <p className="font-brand text-[22px] font-bold" style={{ color: 'var(--color-ink)' }}>{PROPERTY.name}</p>
                  <p className="text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{PROPERTY.address} · {PROPERTY.phone}<br />{PROPERTY.email}</p>
                </div>
                <div className="text-right">
                  <p className="tnum font-mono text-[15px] font-semibold" style={{ color: 'var(--color-ink)' }}>{open.id}</p>
                  <p className="text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>Due {open.due}</p>
                  <p className="mt-1"><Badge tone={paymentTone(open.status)}>{open.status}</Badge></p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 py-4 text-[13px]">
                <div>
                  <p className="pms-label">Billed to</p>
                  <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>{open.guest}</p>
                  <p style={{ color: 'var(--color-ink-secondary)' }}>Room {open.room}</p>
                </div>
                <div>
                  <p className="pms-label">Stay</p>
                  <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>Room {open.room}</p>
                  <p style={{ color: 'var(--color-ink-secondary)' }}>Via {open.method}</p>
                </div>
              </div>
              <table className="pms-table">
                <thead><tr><th>Description</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  <tr><td>Accommodation — Room {open.room}</td><td className="tnum text-right font-semibold">${formatMoney(Math.round(open.amount / 1.12))}</td></tr>
                  <tr><td>Taxes & service ({PROPERTY.taxRate}%)</td><td className="tnum text-right font-semibold">${formatMoney(open.amount - Math.round(open.amount / 1.12))}</td></tr>
                </tbody>
              </table>
              <div className="mt-3 flex justify-between border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>Balance due</span>
                <span className="tnum text-[20px] font-semibold" style={{ color: 'var(--color-ink)' }}>${formatMoney(open.amount)}</span>
              </div>
              <p className="pms-helper mt-2">Payment terms: due on receipt. Thank you for staying with {PROPERTY.name}.</p>
            </div>
            <div className="no-print flex gap-2">
              <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => window.print()}>Print</button>
              <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => toast('Download queued (demo)', { detail: 'PDF export connects in the full build.', tone: 'info' })}>Download PDF</button>
              <button type="button" className="pms-btn-primary flex-1 px-4 py-2.5" onClick={() => toast('Reminder sent (demo)', { detail: `Payment reminder for ${open.id} simulated.`, tone: 'info' })}>Send reminder</button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
