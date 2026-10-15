import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { folioBalance, folioPaid, folioTotal } from '../data/mock';
import type { Folio } from '../data/mock';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { paymentTone } from '../components/status';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { ConfirmDialog, PromptDialog } from '../components/overlays';
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
    const rows = await Promise.all(
      stays.data
        .filter((stay) => stay.folioId)
        .map(async (stay) => {
          const detail = await folioApi.detail(stay.folioId!);
          return folioFromApi(detail, stay);
        }),
    );
    return rows.filter((folio) => folio.status === 'Open');
  }, []);

  const resource = useApiResource(loadFolios);
  const folios = useMemo(() => resource.data ?? [], [resource.data]);
  const [q, setQ] = useState('');
  const [folioId, setFolioId] = useState<string | null>(null);
  const [method, setMethod] = useState(METHODS[0]);
  const [payNow, setPayNow] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [extendingFolio, setExtendingFolio] = useState<Folio | null>(null);
  const [doneList, setDoneList] = useState<string[]>([]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return folios.filter(
      (f) =>
        !needle ||
        f.guest.toLowerCase().includes(needle) ||
        f.room.includes(needle) ||
        f.id.toLowerCase().includes(needle),
    );
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
      setDoneList((items) => [
        ...items,
        `${folio.guest} · Room ${folio.room} — checked out${amount > 0 ? ` (${formatCurrency(amount, folio.currencyCode)} via ${method})` : ''}`,
      ]);
      toast('Guest checked out', { detail: `${folio.guest} · Room ${folio.room}.`, tone: 'success' });
      setFolioId(null);
      setPayNow(0);
      setConfirming(false);
      resource.refresh();
    } catch (error) {
      resource.refresh();
      toast('Check-out needs another step', {
        detail: `${displayApiError(error)} If room-night charges were posted, reload the folio and collect the updated balance before retrying.`,
        tone: 'warning',
      });
    }
  };

  const handleExtendSubmit = async (nextDate: string) => {
    if (!extendingFolio || !nextDate) return;
    try {
      await frontDeskApi.extend(extendingFolio.reservationId, nextDate);
      resource.refresh();
      toast('Stay extended', { detail: `${extendingFolio.guest} · ${nextDate}`, tone: 'success' });
      setExtendingFolio(null);
    } catch (error) {
      toast('Could not extend stay', { detail: displayApiError(error), tone: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.LogOut className="text-primary" size={26} />
            <span>Guest Check-out</span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Review folio balances, settle final payments, inspect rooms, and process departures
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-surface text-ink-secondary flex items-center gap-1.5">
            <Lucide.Users size={14} className="text-primary" />
            <span>{list.length} In-House Stay{list.length === 1 ? '' : 's'}</span>
          </span>
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border"
            title="Refresh folios"
          >
            <Lucide.RefreshCw size={13} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        {resource.error ? (
          <div className="xl:col-span-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <Lucide.AlertCircle size={18} />
            <span>Could not load open folios: {resource.error}</span>
          </div>
        ) : null}

      {/* In-House Guests List */}
      <Card className="xl:col-span-2">
        <CardTitle
          title="In-house folios"
          subtitle={resource.loading ? 'Loading open folios…' : `${list.length} staying`}
        />
        <div className="relative mb-3">
          <Lucide.Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Guest, room or folio ID…"
            aria-label="Search in-house guests"
            className={`${inputClass()} pl-9 w-full`}
          />
        </div>
        <ul className="flex max-h-[480px] flex-col gap-2 overflow-y-auto">
          {list.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => {
                  setFolioId(f.id);
                  setPayNow(folioBalance(f));
                }}
                aria-pressed={folioId === f.id}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all"
                style={{
                  borderColor: folioId === f.id ? 'var(--color-primary)' : 'var(--color-border)',
                  background: folioId === f.id ? 'color-mix(in srgb, var(--color-primary) 6%, var(--color-surface))' : 'var(--color-surface)',
                  boxShadow: folioId === f.id ? '0 0 0 1px var(--color-primary)' : 'none',
                }}
              >
                <Avatar name={f.guest} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold text-ink">
                    {f.guest} · Rm {f.room}
                  </span>
                  <span className="tnum block text-[12px] text-ink-secondary">
                    {f.id} · due {formatCurrency(folioBalance(f), f.currencyCode)}
                  </span>
                </span>
                <Badge tone={folioBalance(f) > 0 ? 'warning' : 'success'}>
                  {folioBalance(f) > 0 ? 'Balance' : 'Clear'}
                </Badge>
              </button>
            </li>
          ))}
          {list.length === 0 ? <p className="pms-helper py-6 text-center">No open folios match.</p> : null}
        </ul>

        {doneList.length > 0 ? (
          <div className="mt-4 rounded-xl border p-3" style={{ borderColor: 'var(--color-success-border)', background: 'var(--color-success-bg)' }}>
            <p className="text-[12.5px] font-bold text-success-text flex items-center gap-1.5">
              <Lucide.CheckCircle2 size={15} />
              <span>Checked out this session</span>
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-[12px] text-success-text">
              {doneList.map((d) => (
                <li key={d} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {/* Bill & Settlement Details */}
      <Card className="xl:col-span-3">
        {!folio ? (
          <div className="py-16 text-center">
            <Lucide.Receipt size={40} className="mx-auto text-ink-muted mb-3 opacity-40" />
            <p className="font-semibold text-ink">No folio selected</p>
            <p className="pms-helper mt-1">Select an in-house folio from the left to review the final bill and check out.</p>
          </div>
        ) : (
          <>
            <CardTitle
              title={`Folio ${folio.id}`}
              subtitle={`${folio.guest} · Room ${folio.room} · ${folio.reservationId}`}
            />
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
              <table className="pms-table min-w-[480px]">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Detail</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {folio.charges.map((c) => (
                    <tr key={c.label}>
                      <td className="font-medium">{c.label}</td>
                      <td className="text-ink-secondary">{c.detail}</td>
                      <td className="tnum text-right font-semibold">{formatCurrency(c.amount, folio.currencyCode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-3 text-[13.5px] rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              <li className="pms-summary-row border-b px-3.5 py-2.5" style={{ borderColor: 'var(--color-divider)' }}>
                <span className="text-ink-secondary">Taxes</span>
                <span className="tnum font-semibold text-ink">{formatCurrency(folio.tax, folio.currencyCode)}</span>
              </li>
              <li className="pms-summary-row border-b px-3.5 py-2.5" style={{ borderColor: 'var(--color-divider)' }}>
                <span className="text-ink-secondary">Discounts</span>
                <span className="tnum font-semibold text-ink">−{formatCurrency(folio.discount, folio.currencyCode)}</span>
              </li>
              <li className="pms-summary-row border-b px-3.5 py-2.5" style={{ borderColor: 'var(--color-divider)' }}>
                <span className="text-ink-secondary">Total Charges</span>
                <span className="tnum font-semibold text-ink">{formatCurrency(folioTotal(folio), folio.currencyCode)}</span>
              </li>
              <li className="pms-summary-row border-b px-3.5 py-2.5" style={{ borderColor: 'var(--color-divider)' }}>
                <span className="text-ink-secondary">Payments received ({formatCurrency(folioPaid(folio), folio.currencyCode)})</span>
                <span>
                  {folio.payments.length === 0 ? (
                    <Badge tone="warning">None yet</Badge>
                  ) : (
                    <Badge tone={paymentTone('Paid')}>
                      {folio.payments.length} receipt{folio.payments.length === 1 ? '' : 's'}
                    </Badge>
                  )}
                </span>
              </li>
              <li className="pms-summary-row px-3.5 py-3" style={{ background: 'var(--color-muted-surface)' }}>
                <span className="text-[15px] font-bold text-ink">Amount due</span>
                <span
                  className="tnum text-[20px] font-bold"
                  style={{ color: balance > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}
                >
                  {formatCurrency(balance, folio.currencyCode)}
                </span>
              </li>
            </ul>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Payment method">
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass()}>
                  {METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field
                label={`Collect now (${folio.currencyCode ?? 'INR'})`}
                hint={balance === 0 ? 'Nothing due — confirm check-out directly.' : 'Outstanding balance must be settled.'}
              >
                <input
                  type="number"
                  min={0}
                  max={balance}
                  value={payNow}
                  onChange={(e) => setPayNow(Number(e.target.value))}
                  className={inputClass('tnum')}
                />
              </Field>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                className="pms-btn-ghost flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5"
                onClick={() => window.print()}
              >
                <Lucide.Printer size={16} />
                <span>Print folio</span>
              </button>
              {can('stay.check-in') ? (
                <button
                  type="button"
                  className="pms-btn-ghost flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5"
                  onClick={() => setExtendingFolio(folio)}
                >
                  <Lucide.CalendarPlus size={16} />
                  <span>Extend stay</span>
                </button>
              ) : null}
              <button
                type="button"
                disabled={payNow < 0 || payNow > balance}
                onClick={() => setConfirming(true)}
                className="pms-btn-primary flex-[2] flex items-center justify-center gap-1.5 px-4 py-2.5 disabled:opacity-50"
              >
                <Lucide.CheckCircle2 size={16} />
                <span>
                  {balance === 0
                    ? 'Confirm check-out'
                    : `Collect ${formatCurrency(Math.min(Math.max(0, payNow), balance), folio.currencyCode)} & check out`}
                </span>
              </button>
            </div>
          </>
        )}
      </Card>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={settle}
        title="Complete check-out?"
        body={
          folio
            ? `${folio.guest} · Room ${folio.room} will be checked out. The backend will automatically trigger turnover housekeeping.`
            : ''
        }
        confirmLabel="Check out"
      />

      {/* Extend Stay Modal */}
      <PromptDialog
        open={extendingFolio !== null}
        onClose={() => setExtendingFolio(null)}
        onSubmit={handleExtendSubmit}
        title="Extend Stay"
        subtitle={`Update departure date for ${extendingFolio?.guest} (Room ${extendingFolio?.room})`}
        label="New check-out date (YYYY-MM-DD)"
        inputType="date"
        defaultValue={extendingFolio?.checkOutDate ?? ''}
        confirmLabel="Extend Stay"
      />
    </div>
  );
}
