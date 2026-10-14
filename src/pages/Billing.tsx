import { useCallback, useMemo, useState } from 'react';
import { folioBalance, folioPaid, folioTotal } from '../data/mock';
import type { Folio } from '../data/mock';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { FilterChip } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Drawer } from '../components/overlays';
import { toast } from '../components/toastStore';
import { folioApi, frontDeskApi } from '../lib/api/pms';
import { folioFromApi, paymentMethodToApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { newIdempotencyKey } from '../lib/api/client';
import { useAuth } from '../features/auth/AuthContext';
import { formatCurrency } from '../lib/api/format';

export function Billing() {
  const loadFolios = useCallback(async () => {
    const stays = await frontDeskApi.inHouse();
    return Promise.all(stays.data.filter((stay) => stay.folioId).map(async (stay) => folioFromApi(await folioApi.detail(stay.folioId!), stay)));
  }, []);
  const resource = useApiResource(loadFolios);
  const folios = useMemo(() => resource.data ?? [], [resource.data]);
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'All' | 'Open' | 'Settled' | 'Owing'>('All');
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return folios.filter(
      (f) =>
        (filter === 'All' || (filter === 'Owing' ? (f.status === 'Open' && folioBalance(f) > 0) : f.status === filter)) &&
        (!needle || f.guest.toLowerCase().includes(needle) || f.id.toLowerCase().includes(needle) || f.room.includes(needle)),
    );
  }, [folios, q, filter]);

  const open = folios.find((f) => f.id === openId) ?? null;
  const collected = folios.reduce((s, f) => s + folioPaid(f), 0);
  const owing = folios.filter((f) => f.status === 'Open').reduce((s, f) => s + folioBalance(f), 0);

  const recordPayment = async (folio: Folio) => {
    if (!folio.backendId) return;
    const amount = window.prompt('Payment amount:', folioBalance(folio).toFixed(2));
    if (!amount) return;
    const method = window.prompt('Payment method (Card, Cash, Transfer, Invoice):', 'Card');
    if (!method) return;
    try {
      await folioApi.payment(folio.backendId, { amount, method: paymentMethodToApi(method), idempotencyKey: newIdempotencyKey(`folio-payment:${folio.backendId}`) });
      resource.refresh();
      toast('Payment recorded', { detail: `${folio.id} · ${amount}`, tone: 'success' });
    } catch (error) { toast('Payment failed', { detail: displayApiError(error), tone: 'danger' }); }
  };

  const postCharge = async (folio: Folio) => {
    if (!folio.backendId) return;
    const description = window.prompt('Charge description:');
    if (!description?.trim()) return;
    const amount = window.prompt('Charge amount:', '0.00');
    if (!amount) return;
    try {
      await folioApi.postItem(folio.backendId, { type: 'INCIDENTAL', description: description.trim(), quantity: '1', unitAmount: amount, idempotencyKey: newIdempotencyKey(`folio-charge:${folio.backendId}`) });
      resource.refresh();
      toast('Charge posted', { detail: folio.id, tone: 'success' });
    } catch (error) { toast('Could not post charge', { detail: displayApiError(error), tone: 'danger' }); }
  };

  const voidCharge = async (folio: Folio, chargeId?: string) => {
    if (!chargeId) return;
    const reason = window.prompt('Reason for voiding this charge:');
    if (!reason?.trim()) return;
    try {
      await folioApi.voidItem(chargeId, reason.trim());
      resource.refresh();
      toast('Charge voided', { detail: folio.id, tone: 'success' });
    } catch (error) { toast('Could not void charge', { detail: displayApiError(error), tone: 'danger' }); }
  };

  const closeFolio = async (folio: Folio) => {
    if (!folio.backendId || folioBalance(folio) > 0) return;
    try { await folioApi.close(folio.backendId); resource.refresh(); toast('Folio closed', { detail: folio.id, tone: 'success' }); }
    catch (error) { toast('Could not close folio', { detail: displayApiError(error), tone: 'danger' }); }
  };

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
          <thead><tr><th>Charge</th><th className="text-right">Amount</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {f.charges.map((c) => (
              <tr key={c.label}>
                <td><span className="block font-medium">{c.label}</span><span className="block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{c.detail}</span></td>
                <td className="tnum text-right font-semibold">{formatCurrency(c.amount, f.currencyCode)}</td>
                <td>{can('folio.item.void') && c.backendId ? <button type="button" className="pms-btn-ghost px-2 py-1" onClick={() => void voidCharge(f, c.backendId)}>Void</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul>
        {[
          ['Taxes', formatCurrency(f.tax, f.currencyCode)],
          ['Discounts', `−${formatCurrency(f.discount, f.currencyCode)}`],
          ['Total', formatCurrency(folioTotal(f), f.currencyCode)],
          ['Paid', formatCurrency(folioPaid(f), f.currencyCode)],
        ].map(([k, v]) => (
          <li key={k} className="pms-summary-row border-b py-2" style={{ borderColor: 'var(--color-divider)' }}>
            <span style={{ color: 'var(--color-ink-secondary)' }}>{k}</span>
            <span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>{v}</span>
          </li>
        ))}
        <li className="pms-summary-row py-2.5">
          <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>Balance due</span>
          <span className="tnum text-[18px] font-semibold" style={{ color: folioBalance(f) > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>{formatCurrency(folioBalance(f), f.currencyCode)}</span>
        </li>
      </ul>
      {f.payments.length > 0 ? (
        <div>
          <p className="pms-label mb-1.5">Payments</p>
          {f.payments.map((p) => (
            <p key={p.ref} className="tnum text-[12.5px]" style={{ color: 'var(--color-ink-secondary)' }}>{p.ref} · {p.method} · {formatCurrency(p.amount, f.currencyCode)} · {p.date}</p>
          ))}
        </div>
      ) : <p className="pms-helper">No payments posted yet.</p>}
      <div className="flex gap-2">
        <button type="button" className="pms-btn-ghost flex-1 px-3 py-2.5" onClick={() => window.print()}>Print receipt</button>
        {f.status === 'Open' ? <>
          {can('folio.item.post') ? <button type="button" className="pms-btn-ghost flex-1 px-3 py-2.5" onClick={() => void postCharge(f)}>Post charge</button> : null}
          {can('payment.record') ? <button type="button" className="pms-btn-primary flex-1 px-3 py-2.5" onClick={() => void recordPayment(f)}>Record payment</button> : null}
          {can('folio.close') && folioBalance(f) === 0 ? <button type="button" className="pms-btn-ghost flex-1 px-3 py-2.5" onClick={() => void closeFolio(f)}>Close folio</button> : null}
        </> : null}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ['Collected', formatCurrency(collected, folios[0]?.currencyCode), 'Across all folios'],
          ['Outstanding', formatCurrency(owing, folios[0]?.currencyCode), 'Open balances'],
          ['Open folios', String(folios.filter((f) => f.status === 'Open').length), 'Currently in-house'],
        ].map(([k, v, h]) => (
          <section key={k} className="pms-card p-4">
            <p className="pms-label">{k}</p>
            <p className="pms-kpi-value tnum mt-1">{v}</p>
            <p className="pms-helper mt-1">{h}</p>
          </section>
        ))}
      </div>
      <Card>
        <CardTitle title="Guest folios" subtitle={resource.loading ? 'Loading in-house folios…' : `${rows.length} in-house folios`} />
        {resource.error ? <p role="alert" className="pms-helper mb-3">Could not load folios: {resource.error}</p> : null}
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
                  <td className="tnum text-right font-semibold">{formatCurrency(folioTotal(f), f.currencyCode)}</td>
                  <td className="tnum text-right font-semibold" style={{ color: folioBalance(f) > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>{formatCurrency(folioBalance(f), f.currencyCode)}</td>
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
