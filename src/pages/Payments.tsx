import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { formatCurrency } from '../lib/api/format';
import type { Payment } from '../data/mock';
import { Avatar, Badge, Card, CardTitle, TableContainer } from '../components/ui';
import { paymentTone } from '../components/status';
import { FilterChip, Pagination } from '../components/controls';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Modal } from '../components/overlays';
import { toast } from '../components/toastStore';
import { folioApi } from '../lib/api/pms';
import { paymentFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { useAuth } from '../features/auth/AuthContext';

const PAGE_SIZE = 8;

export function Payments() {
  const loadPayments = useCallback(async () => (await folioApi.listPayments()).map(paymentFromApi), []);
  const resource = useApiResource(loadPayments);
  const rows = useMemo(() => resource.data ?? [], [resource.data]);
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(0);

  // Refund Modal State
  const [refundModal, setRefundModal] = useState<{ payment: Payment; amount: string; reason: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (p) =>
        (status === 'All' || p.status === status) &&
        (!needle ||
          p.guest.toLowerCase().includes(needle) ||
          p.ref.toLowerCase().includes(needle) ||
          p.bookingId.toLowerCase().includes(needle)),
    );
  }, [rows, q, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safe = Math.min(page, pages - 1);
  const slice = filtered.slice(safe * PAGE_SIZE, safe * PAGE_SIZE + PAGE_SIZE);
  const collected = rows.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const pendingAmount = rows.filter((p) => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);

  const handleRefundSubmit = async () => {
    if (!refundModal?.payment.backendId) return;
    const { payment, amount, reason } = refundModal;
    const backendId = payment.backendId;
    if (!backendId) return;
    const numAmount = Number(amount);
    if (!amount || numAmount <= 0 || numAmount > payment.amount) {
      toast(`Refund amount must be between 0.01 and ${payment.amount}`, { tone: 'warning' });
      return;
    }
    if (!reason.trim()) {
      toast('Please enter a reason for the refund', { tone: 'warning' });
      return;
    }
    setIsSubmitting(true);
    try {
      await folioApi.refund(backendId, amount, reason.trim());
      resource.refresh();
      toast('Refund processed', { detail: `${payment.ref} · ${formatCurrency(numAmount, payment.currencyCode)}`, tone: 'success' });
      setRefundModal(null);
    } catch (error) {
      toast('Refund failed', { detail: displayApiError(error), tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.CreditCard className="text-primary" size={26} />
            <span>Payments & Transactions</span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Track payment gateway transactions, process refunds, and review payment settlements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border"
            title="Refresh payments"
          >
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {[
          { label: 'Settled Payments', val: formatCurrency(collected, rows[0]?.currencyCode), sub: 'Collected revenue', Icon: Lucide.CheckCircle2 },
          { label: 'Pending Authorizations', val: formatCurrency(pendingAmount, rows[0]?.currencyCode), sub: 'Awaiting settlement', Icon: Lucide.Clock },
          { label: 'Exceptions / Failed', val: String(rows.filter((p) => p.status === 'Failed' || p.status === 'Overdue').length), sub: 'Requires staff follow-up', Icon: Lucide.AlertCircle },
        ].map(({ label, val, sub, Icon }) => (
          <section key={label} className="pms-card p-4 flex items-start justify-between">
            <div>
              <p className="pms-label">{label}</p>
              <p className="pms-kpi-value tnum mt-1 text-2xl font-bold">{val}</p>
              <p className="pms-helper mt-1">{sub}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.03] text-primary">
              <Icon size={20} />
            </div>
          </section>
        ))}
      </div>

      {/* Main Ledger Card */}
      <Card>
        <CardTitle
          title="Payment Ledger"
          subtitle={resource.loading ? 'Loading payment records…' : `${filtered.length} backend transactions`}
          action={
            <span className="pms-helper text-xs flex items-center gap-1">
              <Lucide.Info size={13} />
              <span>Payments are posted from guest folios</span>
            </span>
          }
        />
        {resource.error ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <Lucide.AlertCircle size={18} />
            <span>Could not load payments: {resource.error}</span>
          </div>
        ) : null}

        {/* Toolbar */}
        <div className="mb-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
          <div className="relative">
            <Lucide.Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder="Guest, ref number or folio ID…"
              aria-label="Search payments"
              className={`${inputClass()} pl-9 w-full`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
            {['All', 'Paid', 'Pending', 'Partially refunded', 'Refunded', 'Failed'].map((s) => (
              <FilterChip key={s} active={status === s} onClick={() => { setStatus(s); setPage(0); }}>
                {s}
              </FilterChip>
            ))}
          </div>
          <button
            type="button"
            className="pms-btn-ghost px-3 py-2 text-xs font-semibold"
            onClick={() => { setQ(''); setStatus('All'); setPage(0); }}
          >
            Reset
          </button>
        </div>

        {/* Table */}
        <TableContainer>
          <table className="pms-table min-w-[760px]">
            <thead>
              <tr>
                <th className="w-12 text-center">#</th>
                <th>REFERENCE</th>
                <th>GUEST</th>
                <th>FOLIO</th>
                <th>DATE</th>
                <th>METHOD</th>
                <th>STATUS</th>
                <th className="text-right">AMOUNT</th>
                {can('payment.refund') ? <th className="text-right">ACTION</th> : null}
              </tr>
            </thead>
            <tbody>
              {slice.map((p, idx) => (
                <tr key={p.ref} className="transition-colors hover:bg-slate-50/70">
                  <td className="text-center font-medium text-slate-400 text-xs">
                    {safe * PAGE_SIZE + idx + 1}
                  </td>
                  <td className="tnum font-mono font-bold text-slate-900 text-xs">
                    {p.ref}
                    <span className="tnum block font-mono text-[11px] text-slate-400 font-normal">
                      {p.txn}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={p.guest} size={36} />
                      <span className="font-semibold text-slate-900 text-sm">{p.guest}</span>
                    </div>
                  </td>
                  <td className="tnum font-mono text-slate-500 text-xs">{p.bookingId}</td>
                  <td className="tnum text-xs text-slate-500">{p.date}</td>
                  <td>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {p.method}
                    </span>
                  </td>
                  <td>
                    <Badge tone={paymentTone(p.status)}>{p.status}</Badge>
                  </td>
                  <td className="tnum text-right font-bold text-slate-900 text-sm">
                    {formatCurrency(p.amount, p.currencyCode)}
                  </td>
                  {can('payment.refund') ? (
                    <td className="text-right">
                      {['Paid', 'Partially refunded'].includes(p.status) ? (
                        <button
                          type="button"
                          className="pms-btn-ghost px-3 py-1 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200/60 rounded-lg font-semibold"
                          onClick={() =>
                            setRefundModal({
                              payment: p,
                              amount: p.amount.toFixed(2),
                              reason: '',
                            })
                          }
                        >
                          Refund
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {slice.length === 0 ? <p className="pms-helper py-8 text-center text-slate-400">No payment transactions match.</p> : null}
        </TableContainer>

        <div className="mt-4 pt-1">
          <Pagination
            page={safe}
            totalPages={pages}
            onChange={setPage}
            summary={`Showing ${filtered.length > 0 ? safe * PAGE_SIZE + 1 : 0} to ${Math.min((safe + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} payments`}
          />
        </div>
      </Card>

      {/* Refund Modal */}
      <Modal
        open={refundModal !== null}
        onClose={() => setRefundModal(null)}
        title="Issue Refund"
        subtitle={refundModal ? `Refund for ${refundModal.payment.guest} (${refundModal.payment.ref})` : ''}
        footer={
          <>
            <button
              type="button"
              onClick={() => setRefundModal(null)}
              className="pms-btn-ghost px-4 py-2.5"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleRefundSubmit()}
              className="pms-btn-danger px-4 py-2.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing…' : 'Process Refund'}
            </button>
          </>
        }
      >
        {refundModal ? (
          <div className="flex flex-col gap-4 py-2">
            <Field
              label="Refund Amount"
              hint={`Max available: ${formatCurrency(refundModal.payment.amount, refundModal.payment.currencyCode)}`}
            >
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={refundModal.payment.amount}
                value={refundModal.amount}
                onChange={(e) => setRefundModal({ ...refundModal, amount: e.target.value })}
                className={inputClass('tnum')}
                autoFocus
              />
            </Field>
            <Field label="Refund Reason" hint="Audit trail note for accounting">
              <input
                type="text"
                placeholder="e.g. Early departure, billing dispute, service complaint"
                value={refundModal.reason}
                onChange={(e) => setRefundModal({ ...refundModal, reason: e.target.value })}
                className={inputClass()}
              />
            </Field>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
