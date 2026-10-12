import { useMemo, useState } from 'react';
import { FOLIOS, folioBalance, folioPaid, folioTotal, formatMoney } from '../data/mock';
import type { Folio } from '../data/mock';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { paymentTone } from '../components/status';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { ConfirmDialog } from '../components/overlays';
import { toast } from '../components/toastStore';

const METHODS = ['Card', 'Cash', 'Transfer', 'Invoice'];

export function CheckOut() {
  const [folios, setFolios] = useState<Folio[]>(FOLIOS.filter((f) => f.status === 'Open'));
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

  const settle = () => {
    if (!folio) return;
    const amount = Math.min(Math.max(0, payNow), balance);
    const updated: Folio = {
      ...folio,
      payments: amount > 0 ? [...folio.payments, { ref: `PAY-${7820 + doneList.length}`, method, amount, date: 'Oct 10' }] : folio.payments,
      status: 'Settled',
    };
    setFolios((prev) => prev.map((f) => (f.id === folio.id ? updated : f)));
    setFolios((prev) => prev.filter((f) => f.id !== folio.id));
    setDoneList((d) => [...d, `${folio.guest} · Room ${folio.room} — settled${amount > 0 ? ` ($${formatMoney(amount)} via ${method})` : ''}, room flagged Dirty for housekeeping`]);
    toast('Checked out (demo)', { detail: `${folio.guest} settled; room ${folio.room} now needs housekeeping.` });
    setFolioId(null);
    setPayNow(0);
    setConfirming(false);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardTitle title="In-house folios" subtitle={`${list.length} open`} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Guest, room or folio…" aria-label="Search in-house guests" className={inputClass() + ' mb-3'} />
        <ul className="flex max-h-[460px] flex-col gap-2 overflow-y-auto">
          {list.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => { setFolioId(f.id); setPayNow(folioBalance(f)); }}
                aria-pressed={folioId === f.id}
                className="flex w-full items-center gap-3 rounded-[10px] border p-3 text-left"
                style={{ borderColor: folioId === f.id ? 'var(--color-primary)' : 'var(--color-border)', background: folioId === f.id ? 'var(--color-hover-surface)' : 'var(--color-surface)' }}
              >
                <Avatar name={f.guest} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{f.guest} · Rm {f.room}</span>
                  <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{f.id} · due ${formatMoney(folioBalance(f))}</span>
                </span>
                <Badge tone={folioBalance(f) > 0 ? 'warning' : 'success'}>{folioBalance(f) > 0 ? 'Balance' : 'Clear'}</Badge>
              </button>
            </li>
          ))}
          {list.length === 0 ? <p className="pms-helper py-4 text-center">No open folios match.</p> : null}
        </ul>
        {doneList.length > 0 ? (
          <div className="mt-3 rounded-[10px] border p-3" style={{ borderColor: 'var(--color-success-border)', background: 'var(--color-success-bg)' }}>
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
                      <td className="tnum text-right font-semibold">${formatMoney(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-2 text-[13.5px]">
              <li className="flex justify-between border-b py-2" style={{ borderColor: 'var(--color-divider)' }}><span style={{ color: 'var(--color-ink-secondary)' }}>Taxes</span><span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>${formatMoney(folio.tax)}</span></li>
              <li className="flex justify-between border-b py-2" style={{ borderColor: 'var(--color-divider)' }}><span style={{ color: 'var(--color-ink-secondary)' }}>Discounts</span><span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>−${formatMoney(folio.discount)}</span></li>
              <li className="flex justify-between border-b py-2" style={{ borderColor: 'var(--color-divider)' }}><span style={{ color: 'var(--color-ink-secondary)' }}>Subtotal</span><span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>${formatMoney(folioTotal(folio))}</span></li>
              <li className="flex justify-between border-b py-2" style={{ borderColor: 'var(--color-divider)' }}><span style={{ color: 'var(--color-ink-secondary)' }}>Payments received (${formatMoney(folioPaid(folio))})</span><span>{folio.payments.length === 0 ? <Badge tone="warning">None yet</Badge> : <Badge tone={paymentTone('Paid')}>{folio.payments.length} receipt{folio.payments.length === 1 ? '' : 's'}</Badge>}</span></li>
              <li className="flex justify-between py-2.5"><span className="text-[15px] font-semibold" style={{ color: 'var(--color-ink)' }}>Amount due</span><span className="tnum text-[20px] font-semibold" style={{ color: balance > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>${formatMoney(balance)}</span></li>
            </ul>
            {folio.payments.map((p) => (
              <p key={p.ref} className="tnum text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{p.ref} · {p.method} · ${formatMoney(p.amount)} · {p.date}</p>
            ))}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Payment method">
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass()}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
              </Field>
              <Field label="Collect now ($)" hint={balance === 0 ? 'Nothing due — confirm check-out directly.' : 'Simulated; no real charge.'}>
                <input type="number" min={0} max={balance} value={payNow} onChange={(e) => setPayNow(Number(e.target.value))} className={inputClass('tnum')} />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => toast('Invoice preview (demo)', { detail: 'Open Invoices for the printable bill.', tone: 'info' })}>Invoice preview</button>
              <button type="button" disabled={payNow < 0 || payNow > balance} onClick={() => setConfirming(true)} className="pms-btn-primary flex-[2] px-4 py-2.5 disabled:opacity-50">
                {balance === 0 ? 'Confirm check-out' : `Collect $${formatMoney(Math.min(Math.max(0, payNow), balance))} & check out`}
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
        body={folio ? `${folio.guest} · Room ${folio.room} will be marked checked-out and flagged Dirty for housekeeping. Demo only.` : ''}
        confirmLabel="Check out"
      />
    </div>
  );
}
