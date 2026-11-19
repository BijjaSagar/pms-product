import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { ConfirmDialog, Modal } from '../../components/overlays';
import { toast } from '../../utils/toast';
import type { NavTarget } from '../../config/navigation';
import type { Reservation, ReservationStatus } from '../../types';
import { Button, SelectField, TextField } from '../../components/primitives';
import { Badge } from '../../components/ui';
import { formatCurrency } from '../../utils/currency';
import { reservationTone } from '../../utils/status';

/* Reservation status as a badge; the tone comes from the shared status mapping. */
export function StatusPill({ status }: { status: ReservationStatus }) {
  return (
    <Badge tone={reservationTone(status) ?? 'neutral'} dot>
      {status}
    </Badge>
  );
}

const PAYMENT_METHODS = ['Cash', 'UPI / QR', 'Card', 'Bank transfer'];

/** Today in the browser's own calendar, as YYYY-MM-DD. */
function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

type Step = 'confirm' | 'check-in' | 'check-out' | 'no-show' | 'cancel';

export function ReservationDrawer({
  r,
  onClose,
  onStatus,
  onPayment,
  onEdit,
  go,
}: {
  r: Reservation;
  onClose: () => void;
  onStatus: (id: string, s: ReservationStatus) => Promise<boolean>;
  onPayment: (id: string, payment: { amount: string; method: string; reference?: string }) => Promise<boolean>;
  onEdit: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  go: (target: NavTarget) => void;
}) {
  const [step, setStep] = useState<Step | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editCheckIn, setEditCheckIn] = useState(r.checkInIso?.slice(0, 10) ?? '');
  const [editCheckOut, setEditCheckOut] = useState(r.checkOutIso?.slice(0, 10) ?? '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS[0]);
  const [payReference, setPayReference] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const money = (amount: number) => formatCurrency(amount, r.currencyCode ?? 'INR');
  const tax = r.taxAmount ?? 0;
  const charges = r.total - tax;
  const balance = Math.max(0, r.total - r.paid);
  const isLive = r.status === 'Pending' || r.status === 'Confirmed' || r.status === 'Checked-in';

  const handleSaveDates = async () => {
    if (!editCheckIn || !editCheckOut) {
      toast('Please enter both dates', { tone: 'warning' });
      return;
    }
    if (editCheckIn >= editCheckOut) {
      toast('Check-out date must be after check-in date', { tone: 'warning' });
      return;
    }
    setIsUpdating(true);
    const ok = await onEdit(r.backendId ?? r.id, { checkInDate: editCheckIn, checkOutDate: editCheckOut, version: r.version });
    setIsUpdating(false);
    if (ok) {
      toast('Stay dates updated', { detail: `${editCheckIn} to ${editCheckOut}`, tone: 'success' });
      setEditOpen(false);
    }
  };

  const openPayment = () => {
    setPayAmount(balance > 0 ? balance.toFixed(2) : '');
    setPayReference('');
    setPayOpen(true);
  };

  const handleSavePayment = async () => {
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast('Enter an amount above 0', { tone: 'warning' });
      return;
    }
    if (amount > balance + 0.001) {
      toast('Payment is more than the balance due', { detail: `Balance due is ${money(balance)}`, tone: 'warning' });
      return;
    }
    setIsPaying(true);
    const ok = await onPayment(r.id, { amount: amount.toFixed(2), method: payMethod, reference: payReference.trim() || undefined });
    setIsPaying(false);
    if (ok) {
      toast('Payment recorded', { detail: `${money(amount)} · ${payMethod}`, tone: 'success' });
      setPayOpen(false);
    }
  };

  /** What the confirmation dialog says for each step; risky steps name the risk. */
  const stepCopy = (s: Step): { title: string; body: string; label: string; danger?: boolean; status: ReservationStatus; done: string } => {
    switch (s) {
      case 'confirm':
        return { title: 'Confirm reservation?', body: `${r.id} · ${r.guest} will be confirmed.`, label: 'Confirm', status: 'Confirmed', done: 'Reservation confirmed' };
      case 'check-in': {
        const early = r.checkInIso && r.checkInIso > localToday();
        return {
          title: 'Check in guest?',
          body: early
            ? `${r.guest} is due on ${r.checkIn}, which is not today. Check in anyway?`
            : `${r.id} · ${r.guest} will be checked in.`,
          label: 'Check in',
          status: 'Checked-in',
          done: 'Guest checked in',
        };
      }
      case 'check-out':
        return {
          title: 'Check out guest?',
          body: balance > 0
            ? `${r.guest} still owes ${money(balance)}. Check out without settling it?`
            : `${r.id} · ${r.guest} will be checked out.`,
          label: 'Check out',
          danger: balance > 0,
          status: 'Checked-out',
          done: 'Guest checked out',
        };
      case 'no-show':
        return { title: 'Mark as no-show?', body: `${r.id} · ${r.guest} did not arrive. The rooms will be released.`, label: 'Mark no-show', danger: true, status: 'No-show', done: 'Marked as no-show' };
      case 'cancel':
        return { title: 'Cancel reservation?', body: `${r.id} · ${r.guest} will be marked Cancelled.`, label: 'Yes, cancel', danger: true, status: 'Cancelled', done: 'Reservation cancelled' };
    }
  };
  const copy = step ? stepCopy(step) : null;

  return (
    <>
      <div className="flex flex-col gap-4 text-label text-ink">
        <div className="flex items-center justify-between border-b pb-3 border-border">
          <div className="flex items-center gap-2">
            <span className="font-bold text-body text-ink">{r.guest}</span>
            <StatusPill status={r.status} />
          </div>
          <span className="font-bold text-body text-ink">{money(r.total)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-page p-3">
          <div>
            <span className="text-label text-ink-muted">Room</span>
            <p className="font-semibold text-ink">{r.roomSummary ?? (r.roomNumber ? `Room ${r.roomNumber} (${r.roomType})` : `Unassigned (${r.roomType})`)}</p>
          </div>
          <div>
            <span className="text-label text-ink-muted">Rate Plan</span>
            <p className="font-semibold text-ink">{r.ratePlan}</p>
          </div>
          <div>
            <span className="text-label text-ink-muted">Stay Dates</span>
            <p className="font-semibold text-ink">{r.checkIn} → {r.checkOut} ({r.nights}n)</p>
          </div>
          <div>
            <span className="text-label text-ink-muted">Guests</span>
            <p className="font-semibold text-ink">{r.adults + r.children} Guests</p>
          </div>
        </div>

        <div className="rounded-md border border-border p-3 flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span className="text-ink-secondary">Charges (before tax):</span>
            <span className="font-medium text-ink">{money(charges)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-secondary">Tax:</span>
            <span className="font-medium text-ink">{money(tax)}</span>
          </div>
          <div className="flex justify-between border-t border-divider pt-1">
            <span className="text-ink-secondary">Total:</span>
            <span className="font-medium text-ink">{money(r.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-secondary">Amount Paid:</span>
            <span className="font-medium text-success-text">{money(r.paid)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-divider pt-1">
            <span>Balance Due:</span>
            <span className={balance > 0 ? 'text-warning-text' : 'text-ink'}>{money(balance)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {r.status === 'Pending' && (
          <Button variant="primary" type="button" className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer" onClick={() => setStep('confirm')}>
            <Lucide.CheckCircle2 size={15} />
            <span>Confirm</span>
          </Button>
        )}
        {r.status === 'Confirmed' && (
          <Button variant="primary" type="button" className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer" onClick={() => setStep('check-in')}>
            <Lucide.LogIn size={15} />
            <span>Check in</span>
          </Button>
        )}
        {r.status === 'Checked-in' && (
          <Button variant="primary" type="button" className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer" onClick={() => setStep('check-out')}>
            <Lucide.LogOut size={15} />
            <span>Check out</span>
          </Button>
        )}
        {isLive && (
          <Button variant="secondary" type="button" className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer" onClick={openPayment} disabled={balance <= 0}>
            <Lucide.Wallet size={15} />
            <span>Add payment</span>
          </Button>
        )}
        {isLive && (
          <Button variant="secondary" type="button" className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer" onClick={() => setEditOpen(true)}>
            <Lucide.CalendarClock size={15} />
            <span>Modify Dates</span>
          </Button>
        )}
        {r.status === 'Checked-in' && (
          <Button variant="secondary" type="button" className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer" onClick={() => { go({ view: 'folios' }); onClose(); }}>
            <Lucide.Receipt size={15} />
            <span>Open Folio</span>
          </Button>
        )}
        {(r.status === 'Confirmed' || r.status === 'Pending') && (
          <Button variant="danger" type="button" className="flex items-center justify-center gap-1.5 cursor-pointer" onClick={() => setStep('no-show')}>
            <Lucide.UserX size={15} />
            <span>No-show</span>
          </Button>
        )}
        {(r.status === 'Confirmed' || r.status === 'Pending') && (
          <Button variant="danger" type="button" className="flex items-center justify-center gap-1.5 cursor-pointer" onClick={() => setStep('cancel')}>
            <Lucide.XCircle size={15} />
            <span>Cancel</span>
          </Button>
        )}
      </div>

      {/* Date amendment modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modify Stay Dates"
        subtitle={r.status === 'Checked-in' ? `${r.guest} has checked in, so only the check-out date can change` : `Update check-in and check-out dates for ${r.guest}`}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setEditOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button variant="primary" type="button" onClick={() => void handleSaveDates()} disabled={isUpdating}>
              {isUpdating ? 'Saving…' : 'Save Dates'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="block text-label font-semibold text-ink mb-1">Check-in Date</label>
            <TextField
              type="date"
              value={editCheckIn}
              onChange={(e) => setEditCheckIn(e.target.value)}
              disabled={r.status === 'Checked-in'}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-label font-semibold text-ink mb-1">Check-out Date</label>
            <TextField
              type="date"
              value={editCheckOut}
              onChange={(e) => setEditCheckOut(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </Modal>

      {/* Advance payment modal */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Add payment"
        subtitle={`Balance due ${money(balance)}`}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setPayOpen(false)} disabled={isPaying}>
              Cancel
            </Button>
            <Button variant="primary" type="button" onClick={() => void handleSavePayment()} disabled={isPaying}>
              {isPaying ? 'Saving…' : 'Record payment'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="block text-label font-semibold text-ink mb-1" htmlFor="pay-amount">Amount</label>
            <TextField id="pay-amount" type="number" min="0" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="block text-label font-semibold text-ink mb-1" htmlFor="pay-method">Method</label>
            <SelectField id="pay-method" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full">
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </SelectField>
          </div>
          <div>
            <label className="block text-label font-semibold text-ink mb-1" htmlFor="pay-ref">Reference (optional)</label>
            <TextField id="pay-ref" value={payReference} maxLength={120} onChange={(e) => setPayReference(e.target.value)} className="w-full" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={copy !== null}
        onClose={() => setStep(null)}
        onConfirm={() => {
          if (!copy) return;
          void onStatus(r.id, copy.status).then((ok) => {
            if (ok) {
              toast(copy.done, { detail: r.id, tone: copy.danger ? 'warning' : 'success' });
              if (step === 'cancel' || step === 'no-show') onClose();
            }
          });
          setStep(null);
        }}
        title={copy?.title ?? ''}
        body={copy?.body ?? ''}
        confirmLabel={copy?.label ?? ''}
        danger={copy?.danger}
      />
    </>
  );
}
