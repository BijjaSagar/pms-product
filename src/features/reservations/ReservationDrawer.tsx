import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { ConfirmDialog, Modal } from '../../components/overlays';
import { toast } from '../../utils/toast';
import type { NavTarget } from '../../config/navigation';
import type { Reservation, ReservationStatus } from '../../types';
import { Button, TextField } from '../../components/primitives';
import { Badge } from '../../components/ui';
import { reservationTone } from '../../utils/status';

/* Reservation status as a badge; the tone comes from the shared status mapping. */
export function StatusPill({ status }: { status: ReservationStatus }) {
  return (
    <Badge tone={reservationTone(status) ?? 'neutral'} dot>
      {status}
    </Badge>
  );
}

export function ReservationDrawer({
  r,
  onClose,
  onStatus,
  onEdit,
  go,
}: {
  r: Reservation;
  onClose: () => void;
  onStatus: (id: string, s: ReservationStatus) => Promise<boolean>;
  onEdit: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  go: (target: NavTarget) => void;
}) {
  const [confirm, setConfirm] = useState<'cancel' | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editCheckIn, setEditCheckIn] = useState(r.checkInIso?.slice(0, 10) ?? '');
  const [editCheckOut, setEditCheckOut] = useState(r.checkOutIso?.slice(0, 10) ?? '');
  const [isUpdating, setIsUpdating] = useState(false);

  const roomCharges = r.nightlyRate * r.nights;
  const balance = r.total - r.paid;

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
    const ok = await onEdit(r.backendId ?? r.id, { checkInDate: editCheckIn, checkOutDate: editCheckOut });
    setIsUpdating(false);
    if (ok) {
      toast('Stay dates updated', { detail: `${editCheckIn} to ${editCheckOut}`, tone: 'success' });
      setEditOpen(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 text-label text-ink">
        <div className="flex items-center justify-between border-b pb-3 border-border">
          <div className="flex items-center gap-2">
            <span className="font-bold text-body text-ink">{r.guest}</span>
            <StatusPill status={r.status} />
          </div>
          <span className="font-bold text-body text-ink">₹{r.total.toLocaleString('en-IN')}.00</span>
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
            <span className="text-ink-secondary">Room Charges:</span>
            <span className="font-medium text-ink">₹{roomCharges.toLocaleString('en-IN')}.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-secondary">Amount Paid:</span>
            <span className="font-medium text-success-text">₹{r.paid.toLocaleString('en-IN')}.00</span>
          </div>
          <div className="flex justify-between font-bold border-t border-divider pt-1">
            <span>Balance Due:</span>
            <span className={balance > 0 ? 'text-warning-text' : 'text-ink'}>
              ₹{Math.max(0, balance).toLocaleString('en-IN')}.00
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {r.status === 'Checked-in' && (
          <Button variant="primary"
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer"
            onClick={() => { go({ view: 'folios' }); onClose(); }}
          >
            <Lucide.Receipt size={15} />
            <span>Open Folio</span>
          </Button>
        )}
        {(r.status === 'Confirmed' || r.status === 'Pending') && (
          <Button variant="secondary"
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer"
            onClick={() => setEditOpen(true)}
          >
            <Lucide.CalendarClock size={15} />
            <span>Modify Dates</span>
          </Button>
        )}
        {(r.status === 'Confirmed' || r.status === 'Pending') && (
          <Button variant="danger"
            type="button"
            className="flex items-center justify-center gap-1.5 cursor-pointer"
            onClick={() => setConfirm('cancel')}
          >
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
        subtitle={`Update check-in and check-out dates for ${r.guest}`}
        footer={
          <>
            <Button variant="secondary"
              type="button"
              onClick={() => setEditOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button variant="primary"
              type="button"
              onClick={() => void handleSaveDates()}
              disabled={isUpdating}
            >
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

      <ConfirmDialog
        open={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          void onStatus(r.id, 'Cancelled').then((ok) => {
            if (ok) {
              toast('Reservation cancelled', { detail: r.id, tone: 'warning' });
              onClose();
            }
          });
        }}
        title="Cancel reservation?"
        body={`${r.id} · ${r.guest} will be marked Cancelled.`}
        confirmLabel="Yes, cancel"
        danger
      />
    </>
  );
}
