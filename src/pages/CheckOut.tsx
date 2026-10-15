import { useCallback, useMemo, useState } from 'react';
import { folioBalance, folioPaid, folioTotal } from '../data/mock';
import type { Folio } from '../data/mock';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { paymentTone } from '../components/status';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { ConfirmDialog } from '../components/overlays';
import { toast } from '../components/toastStore';
import { folioApi, frontDeskApi } from '../lib/api/pms';
import { folioFromApi, paymentMethodToApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { useAuth } from '../features/auth/AuthContext';
import { formatCurrency } from '../lib/api/format';

const METHODS = ['Card', 'Cash', 'Transfer', 'Invoice'];

export function CheckOut() {
  const { can } = useAuth();
  const loadFolios = useCallback(async () => {
    const stays = await frontDeskApi.inHouse();
    const rows = await Promise.all(stays.data.filter((stay) => stay.folioId).map(async (stay) => {
      const detail = await folioApi.detail(stay.folioId!);
      return folioFromApi(detail, stay);
    }));
    return rows.filter((folio) => folio.status === 'Open');
  }, []);
  const resource = useApiResource(loadFolios);
  const folios = useMemo(() => resource.data ?? [], [resource.data]);
  const [q, setQ] = useState('');
  const [folioId, setFolioId] = useState<string | null>(null);
  const [method, setMethod] = useState(METHODS[0]);
  const [payNow, setPayNow] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [doneList, setDoneList] = useState<string[]>([]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return folios.filter((f) => !needle || f.guest.toLowerCase().includes(needle) || f.room.includes(needle) || f.id.toLowerCase().includes(needle));
  }, [folios, q]);

  const folio = folios.find((f) => f.id === folioId) ?? null;
  const balance = folio ? folioBalance(folio) : 0;

  const settle = async () => {
    if (!folio?.backendId) return;
    const amount = Math.min(Math.max(0, payNow), balance);
    if (balance > 0 && amount < balance) {
      toast('Full balance required', { detail: 'The backend will not check out a guest with an outstanding folio balance.', tone: 'warning' });
      return;
    }
    try {
      if (amount > 0) {
        await folioApi.payment(folio.backendId, {
          amount: amount.toFixed(2),
          method: paymentMethodToApi(method),
          idempotencyKey: `checkout:${folio.backendId}:${amount.toFixed(2)}`,
        });
      }
      await frontDeskApi.checkOut(folio.reservationId);
      if (can('invoice.issue')) {
        try {
          const invoice = await folioApi.issueInvoice(folio.backendId);
          toast('Invoice issued', { detail: invoice.invoiceNo ?? 'Invoice created.', tone: 'success' });
        } catch (invoiceError) {
          toast('Check-out complete; invoice not issued', { detail: displayApiError(invoiceError), tone: 'warning' });
        }
      }
      setDoneList((items) => [...items, `${folio.guest} · Room ${folio.room} — checked out${amount > 0 ? ` (${formatCurrency(amount, folio.currencyCode)} via ${method})` : ''}`]);
      toast('Guest checked out', { detail: `${folio.guest} · Room ${folio.room}.`, tone: 'success' });
      setFolioId(null);
      setPayNow(0);
      setConfirming(false);
      resource.refresh();
    } catch (error) {
      resource.refresh();
      toast('Check-out needs another step', { detail: `${displayApiError(error)} If room-night charges were posted, reload the folio and collect the updated balance before retrying.`, tone: 'warning' });
    }
  };

  const extendStay = async (selected: Folio) => {
    const nextDate = window.prompt('New check-out date (YYYY-MM-DD):', selected.checkOutDate);
    if (!nextDate) return;
    try {
      await frontDeskApi.extend(selected.reservationId, nextDate);
      resource.refresh();
      toast('Stay extended', { detail: `${selected.guest} · ${nextDate}`, tone: 'success' });
    } catch (error) { toast('Could not extend stay', { detail: displayApiError(error), tone: 'danger' }); }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      {resource.error ? <p role="alert" className="pms-helper xl:col-span-5">Could not load open folios: {resource.error}</p> : null}
      <Card className="xl:col-span-2">
        <CardTitle title="In-house folios" subtitle={resource.loading ? 'Loading open folios…' : `${list.length} open`} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Guest, room or folio…" aria-label="Search in-house guests" className={inputClass() + ' mb-3'} />
        <ul className="flex max-h-[460px] flex-col gap-2 overflow-y-auto">
          {list.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => { setFolioId(f.id); setPayNow(folioBalance(f)); }}
                aria-pressed={folioId === f.id}
                className="flex w-full items-center gap-3 rounded-control border p-3 text-left"
                style={{ borderColor: folioId === f.id ? 'var(--color-primary)' : 'var(--color-border)', background: folioId === f.id ? 'var(--color-hover-surface)' : 'var(--color-surface)' }}
              >
                <Avatar name={f.guest} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{f.guest} · Rm {f.room}</span>
                  <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{f.id} · due {formatCurrency(folioBalance(f), f.currencyCode)}</span>
                </span>
                <Badge tone={folioBalance(f) > 0 ? 'warning' : 'success'}>{folioBalance(f) > 0 ? 'Balance' : 'Clear'}</Badge>
              </button>
            </li>
          ))}
          {list.length === 0 ? <p className="pms-helper py-4 text-center">No open folios match.</p> : null}
        </ul>
        {doneList.length > 0 ? (
          <div className="mt-3 rounded-control border p-3" style={{ borderColor: 'var(--color-success-border)', background: 'var(--color-success-bg)' }}>
            <p className="text-[12.5px] font-semibold" style={{ color: 'var(--color-success-text)' }}>Completed this session (demo)</p>
            <ul className="mt-1 flex flex-col gap-1 text-[12px]" style={{ color: 'var(--color-success-text)' }}>
              {doneList.map((d) => <li key={d}>✓ {d}</li>)}
            </ul>
          </div>
        ) : null}
      </Card>

      <Card className="xl:col-span-3">
        {!folio ? (
          <p className="pms-helper py-10 text-center">Select an in-house folio to review the final bill.</p>
        ) : (
          <>
            <CardTitle title={`Folio ${folio.id}`} subtitle={`${folio.guest} · Room ${folio.room} · ${folio.reservationId}`} />
            <div className="overflow-x-auto">
              <table className="pms-table min-w-[480px]">
                <thead><tr><th>Item</th><th>Detail</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {folio.charges.map((c) => (
                    <tr key={c.label}>
                      <td className="font-medium">{c.label}</td>
                      <td style={{ color: 'var(--color-ink-secondary)' }}>{c.detail}</td>
                      <td className="tnum text-right font-semibold">{formatCurrency(c.amount, folio.currencyCode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-2 text-[13.5px]">
              <li className="pms-summary-row border-b py-2" style={{ borderColor: 'var(--color-divider)' }}><span style={{ color: 'var(--color-ink-secondary)' }}>Taxes</span><span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>{formatCurrency(folio.tax, folio.currencyCode)}</span></li>
              <li className="pms-summary-row border-b py-2" style={{ borderColor: 'var(--color-divider)' }}><span style={{ color: 'var(--color-ink-secondary)' }}>Discounts</span><span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>−{formatCurrency(folio.discount, folio.currencyCode)}</span></li>
              <li className="pms-summary-row border-b py-2" style={{ borderColor: 'var(--color-divider)' }}><span style={{ color: 'var(--color-ink-secondary)' }}>Total</span><span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>{formatCurrency(folioTotal(folio), folio.currencyCode)}</span></li>
              <li className="pms-summary-row border-b py-2" style={{ borderColor: 'var(--color-divider)' }}><span style={{ color: 'var(--color-ink-secondary)' }}>Payments received ({formatCurrency(folioPaid(folio), folio.currencyCode)})</span><span>{folio.payments.length === 0 ? <Badge tone="warning">None yet</Badge> : <Badge tone={paymentTone('Paid')}>{folio.payments.length} receipt{folio.payments.length === 1 ? '' : 's'}</Badge>}</span></li>
              <li className="pms-summary-row py-2.5"><span className="text-[15px] font-semibold" style={{ color: 'var(--color-ink)' }}>Amount due</span><span className="tnum text-[20px] font-semibold" style={{ color: balance > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>{formatCurrency(balance, folio.currencyCode)}</span></li>
            </ul>
            {folio.payments.map((p) => (
              <p key={p.ref} className="tnum text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{p.ref} · {p.method} · {formatCurrency(p.amount, folio.currencyCode)} · {p.date}</p>
            ))}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Payment method">
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass()}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
              </Field>
              <Field label={`Collect now (${folio.currencyCode ?? 'INR'})`} hint={balance === 0 ? 'Nothing due — confirm check-out directly.' : 'The full outstanding balance must be collected.'}>
                <input type="number" min={0} max={balance} value={payNow} onChange={(e) => setPayNow(Number(e.target.value))} className={inputClass('tnum')} />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => window.print()}>Print folio</button>
              {can('stay.check-in') ? <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => void extendStay(folio)}>Extend stay</button> : null}
              <button type="button" disabled={payNow < 0 || payNow > balance} onClick={() => setConfirming(true)} className="pms-btn-primary flex-[2] px-4 py-2.5 disabled:opacity-50">
                {balance === 0 ? 'Confirm check-out' : `Collect ${formatCurrency(Math.min(Math.max(0, payNow), balance), folio.currencyCode)} & check out`}
              </button>
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={settle}
        title="Complete check-out?"
        body={folio ? `${folio.guest} · Room ${folio.room} will be checked out. The backend will create a turnover housekeeping task.` : ''}
        confirmLabel="Check out"
      />
    </div>
  );
}
