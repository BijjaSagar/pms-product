import { useCallback, useMemo, useState } from 'react';
import { formatCurrency } from '../lib/api/format';
import type { Payment } from '../data/mock';
import { Badge, Card, CardTitle } from '../components/ui';
import { paymentTone } from '../components/status';
import { FilterChip, Pagination } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { toast } from '../components/toastStore';
import { folioApi } from '../lib/api/pms';
import { paymentFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { useAuth } from '../features/auth/AuthContext';

const PAGE_SIZE = 6;
export function Payments() {
  const loadPayments = useCallback(async () => (await folioApi.listPayments()).map(paymentFromApi), []);
  const resource = useApiResource(loadPayments);
  const rows = useMemo(() => resource.data ?? [], [resource.data]);
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(0);
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

  const refund = async (payment: Payment) => {
    if (!payment.backendId) return;
    const amount = window.prompt(`Refund amount (up to ${payment.amount}):`, payment.amount.toFixed(2));
    if (!amount) return;
    const reason = window.prompt('Refund reason:');
    if (!reason?.trim()) return;
    try {
      await folioApi.refund(payment.backendId, amount, reason.trim());
      resource.refresh();
      toast('Refund recorded', { detail: payment.ref, tone: 'success' });
    } catch (error) { toast('Refund failed', { detail: displayApiError(error), tone: 'danger' }); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ['Collected', formatCurrency(collected, rows[0]?.currencyCode), 'Settled receipts'],
          ['Pending', formatCurrency(rows.filter((p) => p.status === 'Pending').reduce((s, p) => s + p.amount, 0), rows[0]?.currencyCode), 'Awaiting capture'],
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
          subtitle={resource.loading ? 'Loading payment ledger…' : `${filtered.length} backend payment records`}
          action={<span className="pms-helper">Record a payment from its open folio</span>}
        />
        {resource.error ? <p role="alert" className="pms-helper mb-3">Could not load payments: {resource.error}</p> : null}
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Guest, reference or booking…" aria-label="Search payments" className={inputClass()} />
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
            {['All', 'Paid', 'Pending', 'Partially refunded', 'Refunded', 'Failed'].map((s) => <FilterChip key={s} active={status === s} onClick={() => { setStatus(s); setPage(0); }}>{s}</FilterChip>)}
          </div>
          <button type="button" className="pms-btn-ghost px-3 py-2.5" onClick={() => { setQ(''); setStatus('All'); setPage(0); }}>Clear</button>
        </div>
        <div className="overflow-x-auto">
          <table className="pms-table min-w-[760px]">
            <thead><tr><th>Reference</th><th>Guest / folio</th><th>Folio</th><th>Date</th><th>Method</th><th>Status</th><th className="text-right">Amount</th>{can('payment.refund') ? <th>Action</th> : null}</tr></thead>
            <tbody>
              {slice.map((p) => (
                <tr key={p.ref}>
                  <td className="tnum font-mono font-semibold">{p.ref}<span className="tnum block font-mono text-[11px] font-normal" style={{ color: 'var(--color-ink-muted)' }}>{p.txn}</span></td>
                  <td className="font-medium">{p.guest}</td>
                  <td className="tnum font-mono" style={{ color: 'var(--color-ink-secondary)' }}>{p.bookingId}</td>
                  <td style={{ color: 'var(--color-ink-secondary)' }}>{p.date}</td>
                  <td style={{ color: 'var(--color-ink-secondary)' }}>{p.method}</td>
                  <td><Badge tone={paymentTone(p.status)}>{p.status}</Badge></td>
                  <td className="tnum text-right font-semibold">{formatCurrency(p.amount, p.currencyCode)}</td>
                  {can('payment.refund') ? <td>{['Paid', 'Partially refunded'].includes(p.status) ? <button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => void refund(p)}>Refund</button> : null}</td> : null}
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
    </div>
  );
}
