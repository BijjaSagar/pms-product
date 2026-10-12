import { useMemo, useState } from 'react';
import { PAYMENTS, formatMoney } from '../data/mock';
import type { Payment } from '../data/mock';
import { Badge, Card, CardTitle } from '../components/ui';
import { paymentTone } from '../components/status';
import { Field, FilterChip, Pagination } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Modal } from '../components/overlays';
import { toast } from '../components/toastStore';

const PAGE_SIZE = 6;
const METHODS = ['Card', 'Cash', 'Transfer', 'Invoice'];

export function Payments() {
  const [rows, setRows] = useState<Payment[]>(PAYMENTS);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(0);
  const [recording, setRecording] = useState(false);
  const [guest, setGuest] = useState('');
  const [booking, setBooking] = useState('');
  const [amount, setAmount] = useState(100);
  const [method, setMethod] = useState(METHODS[0]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (p) => (status === 'All' || p.status === status) && (!needle || p.guest.toLowerCase().includes(needle) || p.ref.toLowerCase().includes(needle) || p.bookingId.toLowerCase().includes(needle)),
    );
  }, [rows, q, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safe = Math.min(page, pages - 1);
  const slice = filtered.slice(safe * PAGE_SIZE, safe * PAGE_SIZE + PAGE_SIZE);
  const collected = rows.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);

  const record = () => {
    if (guest.trim().length < 2 || amount <= 0) {
      toast('Check the form', { detail: 'Guest name and an amount above $0 are required.', tone: 'warning' });
      return;
    }
    setRows((prev) => [{ ref: `PAY-${7820 + prev.length}`, guest: guest.trim(), bookingId: booking.trim() || '—', date: 'Oct 10', amount, method, status: 'Paid', txn: `TXN-${88500 + prev.length}` }, ...prev]);
    setRecording(false);
    setGuest(''); setBooking(''); setAmount(100);
    setPage(0);
    toast('Payment recorded (demo)', { detail: 'Simulated receipt — no real charge processed.', tone: 'success' });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ['Collected (demo)', `$${formatMoney(collected)}`, 'Paid receipts'],
          ['Pending', `$${formatMoney(rows.filter((p) => p.status === 'Pending').reduce((s, p) => s + p.amount, 0))}`, 'Awaiting capture'],
          ['Failed / overdue', String(rows.filter((p) => p.status === 'Failed' || p.status === 'Overdue').length), 'Needs follow-up'],
        ].map(([k, v, h]) => (
          <section key={k} className="pms-card p-4">
            <p className="pms-label">{k}</p>
            <p className="pms-kpi-value tnum mt-1">{v}</p>
            <p className="pms-helper mt-1">{h}</p>
          </section>
        ))}
      </div>
      <Card>
        <CardTitle
          title="Payment ledger"
          subtitle={`${filtered.length} records · mock transactions`}
          action={<button type="button" onClick={() => setRecording(true)} className="pms-btn-primary px-3.5 py-2.5">+ Record payment</button>}
        />
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Guest, reference or booking…" aria-label="Search payments" className={inputClass()} />
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
            {['All', 'Paid', 'Pending', 'Overdue', 'Failed'].map((s) => <FilterChip key={s} active={status === s} onClick={() => { setStatus(s); setPage(0); }}>{s}</FilterChip>)}
          </div>
          <button type="button" className="pms-btn-ghost px-3 py-2.5" onClick={() => { setQ(''); setStatus('All'); setPage(0); }}>Clear</button>
        </div>
        <div className="overflow-x-auto">
          <table className="pms-table min-w-[760px]">
            <thead><tr><th>Reference</th><th>Guest</th><th>Booking</th><th>Date</th><th>Method</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {slice.map((p) => (
                <tr key={p.ref}>
                  <td className="tnum font-mono font-semibold">{p.ref}<span className="tnum block font-mono text-[11px] font-normal" style={{ color: 'var(--color-ink-muted)' }}>{p.txn}</span></td>
                  <td className="font-medium">{p.guest}</td>
                  <td className="tnum font-mono" style={{ color: 'var(--color-ink-secondary)' }}>{p.bookingId}</td>
                  <td style={{ color: 'var(--color-ink-secondary)' }}>{p.date}</td>
                  <td style={{ color: 'var(--color-ink-secondary)' }}>{p.method}</td>
                  <td><Badge tone={paymentTone(p.status)}>{p.status}</Badge></td>
                  <td className="tnum text-right font-semibold">${formatMoney(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {slice.length === 0 ? <p className="pms-helper py-6 text-center">No payments match.</p> : null}
        </div>
        <div className="mt-3">
          <Pagination page={safe} totalPages={pages} onChange={setPage} summary={`Page ${safe + 1} of ${pages} · ${filtered.length} payments`} />
        </div>
      </Card>
      <Modal open={recording} onClose={() => setRecording(false)} title="Record payment" subtitle="Simulated — no real charge is processed">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Guest"><input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="Guest name" className={inputClass()} /></Field>
          <Field label="Booking ID"><input value={booking} onChange={(e) => setBooking(e.target.value)} placeholder="RSV-0000" className={inputClass()} /></Field>
          <Field label="Amount ($)"><input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputClass('tnum')} /></Field>
          <Field label="Method">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass()}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => setRecording(false)}>Cancel</button>
            <button type="button" className="pms-btn-primary flex-[2] px-4 py-2.5" onClick={record}>Record (demo)</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
