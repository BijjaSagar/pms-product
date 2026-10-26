import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { formatCurrency } from '../../lib/api/format';
import type { Invoice } from '../../types';
import { Badge, Card, CardTitle, TableContainer, TableActionBtn } from '../../components/ui';
import { paymentTone } from '../../components/status';
import { FilterChip } from '../../components/controls';
import { inputClass } from '../../components/inputClass';
import { Drawer, PromptDialog } from '../../components/overlays';
import { toast } from '../../components/toastStore';
import { folioApi } from '../../lib/api/pms';
import { invoiceFromApi } from '../../lib/api/adapters';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';

export function Invoices() {
  const loadInvoices = useCallback(async () => (await folioApi.listInvoices()).map(invoiceFromApi), []);
  const resource = useApiResource(loadInvoices);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [openId, setOpenId] = useState<string | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);

  const rows: Invoice[] = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (resource.data ?? []).filter(
      (i) =>
        (status === 'All' || i.status === status) &&
        (!needle || i.guest.toLowerCase().includes(needle) || i.id.toLowerCase().includes(needle)),
    );
  }, [resource.data, q, status]);

  const open = rows.find((i) => i.id === openId) ?? null;
  const openBackendId = open?.backendId;
  const previewResource = useApiResource(
    () => (openBackendId ? folioApi.invoice(openBackendId) : Promise.resolve(null)),
    [openBackendId],
  );
  const preview = previewResource.data;

  const handleVoidSubmit = async (reason: string) => {
    if (!open?.backendId || !reason.trim()) return;
    try {
      await folioApi.voidInvoice(open.backendId, reason.trim());
      resource.refresh();
      setOpenId(null);
      setVoidOpen(false);
      toast('Invoice voided', { detail: open.id, tone: 'success' });
    } catch (error) {
      toast('Could not void invoice', { detail: displayApiError(error), tone: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-info-text to-dark-accent text-white shadow-xs shadow-info-text/20 mt-0.5">
            <Lucide.FileText size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[26px] font-bold tracking-tight text-ink leading-tight">
                Invoices & Billing Documents
              </h1>
              <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-[10px] font-bold text-success-text border border-success-border/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-text opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-text"></span>
                </span>
                Official Records
              </span>
            </div>
            <p className="text-xs text-ink-secondary mt-1">
              Official tax invoices, credit notes, guest billing records, and audit receipts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-surface text-ink hover:bg-page shadow-2xs cursor-pointer transition-colors"
            title="Refresh invoices"
          >
            <Lucide.RefreshCw size={13} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          { label: 'Total Invoices', val: String(resource.data?.length ?? 0), sub: 'Issued records', Icon: Lucide.FileText },
          { label: 'Issued Documents', val: String((resource.data ?? []).filter((i) => i.status === 'Issued').length), sub: 'Official invoices', Icon: Lucide.CheckCircle2 },
          { label: 'Voided Invoices', val: String((resource.data ?? []).filter((i) => i.status === 'Void').length), sub: 'Cancelled records', Icon: Lucide.FileX },
        ].map(({ label, val, sub, Icon }) => (
          <section key={label} className="pms-card p-3 sm:p-3.5 flex items-start justify-between">
            <div>
              <p className="pms-label">{label}</p>
              <p className="pms-kpi-value tnum mt-1 text-2xl font-bold">{val}</p>
              <p className="pms-helper mt-1">{sub}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink/[0.03] text-primary">
              <Icon size={20} />
            </div>
          </section>
        ))}
      </div>

      <Card>
        <CardTitle
          icon={Lucide.FileText}
          iconBg="bg-gradient-to-tr from-info-text to-dark-accent text-white shadow-xs shadow-info-text/20"
          title="Invoices"
          subtitle={resource.loading ? 'Loading invoices…' : `${rows.length} billing documents`}
          badge={
            <span className="flex items-center gap-1 rounded-full bg-info-bg px-2 py-0.5 text-[10px] font-bold text-info-text border border-info-border/60">
              {rows.length} Documents
            </span>
          }
        />
        {resource.error ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-4 text-sm text-danger-text">
            <Lucide.AlertCircle size={18} />
            <span>Could not load invoices: {resource.error}</span>
          </div>
        ) : null}

        <div className="mb-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
          <div className="relative">
            <Lucide.Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Guest name or invoice ID…"
              aria-label="Search invoices"
              className={`${inputClass()} pl-9 w-full`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
            {['All', 'Issued', 'Draft', 'Void', 'Credited'].map((s) => (
              <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
                {s}
              </FilterChip>
            ))}
          </div>
          <button
            type="button"
            className="pms-btn-ghost px-3 py-2 text-xs font-semibold"
            onClick={() => { setQ(''); setStatus('All'); }}
          >
            Reset
          </button>
        </div>

        <TableContainer>
          <table className="pms-table min-w-[760px]">
            <thead>
              <tr>
                <th className="w-12 text-center">#</th>
                <th>INVOICE</th>
                <th>GUEST & ROOM</th>
                <th>DUE DATE</th>
                <th>PAYMENT METHOD</th>
                <th>STATUS</th>
                <th className="text-right">AMOUNT</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i, idx) => (
                <tr key={i.id} className="transition-colors hover:bg-page/70">
                  <td className="text-center font-medium text-ink-muted text-xs">
                    {idx + 1}
                  </td>
                  <td className="tnum font-mono font-bold text-ink text-xs">{i.id}</td>
                  <td>
                    <span className="block font-semibold text-ink text-sm">{i.guest}</span>
                    <span className="tnum block text-xs text-ink-muted">Room {i.room}</span>
                  </td>
                  <td className="tnum text-xs text-ink-secondary">{i.due}</td>
                  <td>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted-surface text-ink">
                      {i.method}
                    </span>
                  </td>
                  <td>
                    <Badge tone={paymentTone(i.status)}>{i.status}</Badge>
                  </td>
                  <td className="tnum text-right font-bold text-ink text-sm">
                    {formatCurrency(i.amount, i.currencyCode)}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <TableActionBtn
                        icon={Lucide.FileText}
                        title={`Preview invoice ${i.id}`}
                        onClick={() => setOpenId(i.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="pms-helper py-8 text-center text-ink-muted">No invoices match.</p> : null}
        </TableContainer>
      </Card>

      {/* Invoice Drawer Preview */}
      <Drawer
        open={open !== null}
        onClose={() => setOpenId(null)}
        title={open ? `Invoice ${open.id}` : ''}
        subtitle="Formal guest invoice preview"
      >
        {open ? (
          <div className="flex flex-col gap-4">
            <div
              className="rounded-2xl border p-5 shadow-xs"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <div
                className="flex flex-wrap items-start justify-between gap-3 border-b pb-4"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div>
                  <p className="text-[20px] font-bold text-ink">
                    {preview?.property?.name ?? 'Grand Horizon Resort'}
                  </p>
                  <p className="text-[12px] text-ink-secondary mt-0.5">
                    {[preview?.property?.addressLine1, preview?.property?.city, preview?.property?.countryCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tnum font-mono text-[15px] font-bold text-primary">{open.id}</p>
                  <p className="text-[12px] text-ink-secondary">Issued {open.due}</p>
                  <p className="mt-1">
                    <Badge tone={paymentTone(open.status)}>{open.status}</Badge>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-4 text-[13px]">
                <div className="rounded-xl border p-2.5" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <p className="pms-label">Billed to</p>
                  <p className="font-bold text-ink mt-0.5">{open.guest}</p>
                  <p className="text-xs text-ink-secondary">Booking {preview?.bookingCode ?? '—'}</p>
                </div>
                <div className="rounded-xl border p-2.5" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <p className="pms-label">Stay reference</p>
                  <p className="font-bold text-ink mt-0.5">Folio {preview?.folioNo ?? '—'}</p>
                  <p className="text-xs text-ink-secondary">Room {open.room}</p>
                </div>
              </div>

              <div className="pms-table-scroll overflow-x-auto rounded-xl border mt-2" style={{ borderColor: 'var(--color-border)' }}>
                <table className="pms-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(preview?.lines ?? []).map((line) => (
                      <tr key={line.id}>
                        <td>{line.description}</td>
                        <td className="tnum text-right font-semibold">
                          {formatCurrency(Number(line.totalAmount), preview?.currencyCode)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                className="pms-summary-row mt-4 border-t pt-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span className="font-bold text-[15px] text-ink">Total Invoiced</span>
                <span className="tnum text-[22px] font-bold text-ink">
                  {formatCurrency(open.amount, open.currencyCode)}
                </span>
              </div>
            </div>

            <div className="no-print flex gap-2.5">
              <button
                type="button"
                className="pms-btn-ghost flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5"
                onClick={() => window.print()}
              >
                <Lucide.Printer size={16} />
                <span>Print</span>
              </button>
              {open.status === 'Issued' ? (
                <button
                  type="button"
                  className="pms-btn-danger flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5"
                  onClick={() => setVoidOpen(true)}
                >
                  <Lucide.FileX size={16} />
                  <span>Void invoice</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Void Invoice Dialog */}
      <PromptDialog
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        onSubmit={handleVoidSubmit}
        title={`Void Invoice ${open?.id}`}
        subtitle="This action will void this invoice record in hotel accounting."
        label="Reason for voiding"
        placeholder="e.g. Invoiced in error, duplicate billing"
        confirmLabel="Void Invoice"
        danger
      />
    </div>
  );
}
