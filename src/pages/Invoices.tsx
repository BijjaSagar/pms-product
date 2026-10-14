import { useCallback, useMemo, useState } from 'react';
import { formatCurrency } from '../lib/api/format';
import type { Invoice } from '../data/mock';
import { Badge, Card, CardTitle } from '../components/ui';
import { paymentTone } from '../components/status';
import { FilterChip } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Drawer } from '../components/overlays';
import { toast } from '../components/toastStore';
import { folioApi } from '../lib/api/pms';
import { invoiceFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';

export function Invoices() {
  const loadInvoices = useCallback(async () => (await folioApi.listInvoices()).map(invoiceFromApi), []);
  const resource = useApiResource(loadInvoices);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [openId, setOpenId] = useState<string | null>(null);

  const rows: Invoice[] = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (resource.data ?? []).filter(
      (i) => (status === 'All' || i.status === status) && (!needle || i.guest.toLowerCase().includes(needle) || i.id.toLowerCase().includes(needle)),
    );
  }, [resource.data, q, status]);

  const open = rows.find((i) => i.id === openId) ?? null;
  const openBackendId = open?.backendId;
  const previewResource = useApiResource(() => openBackendId ? folioApi.invoice(openBackendId) : Promise.resolve(null), [openBackendId]);
  const preview = previewResource.data;

  const voidInvoice = async () => {
    if (!open?.backendId) return;
    const reason = window.prompt(`Reason for voiding ${open.id}:`);
    if (!reason?.trim()) return;
    try { await folioApi.voidInvoice(open.backendId, reason.trim()); resource.refresh(); setOpenId(null); toast('Invoice voided', { detail: open.id, tone: 'success' }); }
    catch (error) { toast('Could not void invoice', { detail: displayApiError(error), tone: 'danger' }); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ['Invoices', String(resource.data?.length ?? 0), 'Backend records'],
          ['Outstanding', '—', 'Invoice payment status is not aggregated by the API'],
          ['Paid', '—', 'Track settled amounts in folios and payments'],
        ].map(([k, v, h]) => (
          <section key={k} className="pms-card p-4">
            <p className="pms-label">{k}</p>
            <p className="pms-kpi-value tnum mt-1">{v}</p>
            <p className="pms-helper mt-1">{h}</p>
          </section>
        ))}
      </div>
      <Card>
        <CardTitle title="Invoices" subtitle={resource.loading ? 'Loading invoices…' : `${rows.length} documents`} />
        {resource.error ? <p role="alert" className="pms-helper mb-3">Could not load invoices: {resource.error}</p> : null}
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Guest or invoice number…" aria-label="Search invoices" className={inputClass()} />
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
            {['All', 'Issued', 'Draft', 'Void', 'Credited'].map((s) => <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>{s}</FilterChip>)}
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
                  <td className="tnum text-right font-semibold">{formatCurrency(i.amount, i.currencyCode)}</td>
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
                  <p className="font-brand text-[22px] font-bold" style={{ color: 'var(--color-ink)' }}>{preview?.property?.name ?? 'Property'}</p>
                  <p className="text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{[preview?.property?.addressLine1, preview?.property?.city, preview?.property?.countryCode].filter(Boolean).join(', ')}</p>
                </div>
                <div className="text-right">
                  <p className="tnum font-mono text-[15px] font-semibold" style={{ color: 'var(--color-ink)' }}>{open.id}</p>
                  <p className="text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>Issued {open.due}</p>
                  <p className="mt-1"><Badge tone={paymentTone(open.status)}>{open.status}</Badge></p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 py-4 text-[13px]">
                <div>
                  <p className="pms-label">Billed to</p>
                  <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>{open.guest}</p>
                   <p style={{ color: 'var(--color-ink-secondary)' }}>Booking {preview?.bookingCode ?? '—'}</p>
                </div>
                <div>
                  <p className="pms-label">Stay</p>
                   <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>Folio {preview?.folioNo ?? '—'}</p>
                   <p style={{ color: 'var(--color-ink-secondary)' }}>Guest invoice</p>
                </div>
              </div>
              <table className="pms-table">
                <thead><tr><th>Description</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {(preview?.lines ?? []).map((line) => <tr key={line.id}><td>{line.description}</td><td className="tnum text-right font-semibold">{formatCurrency(Number(line.totalAmount), preview?.currencyCode)}</td></tr>)}
                </tbody>
              </table>
              <div className="pms-summary-row mt-3 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>Balance due</span>
                <span className="tnum text-[20px] font-semibold" style={{ color: 'var(--color-ink)' }}>{formatCurrency(open.amount, open.currencyCode)}</span>
              </div>
              <p className="pms-helper mt-2">Invoice details are read from the issued folio document.</p>
            </div>
            <div className="no-print flex gap-2">
              <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => window.print()}>Print</button>
               {open.status === 'Issued' ? <button type="button" className="pms-btn-primary flex-1 px-4 py-2.5" onClick={() => void voidInvoice()}>Void invoice</button> : null}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
