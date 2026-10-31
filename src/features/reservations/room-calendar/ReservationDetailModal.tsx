import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as Lucide from 'lucide-react';
import type { CalendarReservation, CalendarRoom, ProposedReservationChange } from './types';
import { countNights, ROOM_TYPE_CONFIG } from './calendarData';
import { validateReservationMove } from './validation';
import { toast } from '../../../utils/toast';
import { lockAppScroll } from '../../../lib/scrollLock';

interface Props {
  reservation: CalendarReservation | null;
  rooms: CalendarRoom[];
  allReservations: CalendarReservation[];
  onClose: () => void;
  onInitiateChange: (change: ProposedReservationChange) => void;
  onStatusUpdate: (reservationId: string, newStatus: CalendarReservation['status']) => void;
}

export function ReservationDetailModal({
  reservation,
  rooms,
  allReservations,
  onClose,
  onInitiateChange,
  onStatusUpdate,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editRoomId, setEditRoomId] = useState('');
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');

  // Lock background scroll when modal is active
  useEffect(() => {
    if (!reservation) return;
    const releaseScroll = lockAppScroll();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      releaseScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [reservation, onClose]);

  if (!reservation) return null;

  const currentRoom = rooms.find((r) => r.id === reservation.roomId) || {
    id: reservation.roomId,
    number: reservation.roomNumber,
    floor: 1,
    type: reservation.roomType,
    maxOccupancy: 2,
    baseRate: reservation.nightlyRate,
    status: 'Clean' as const,
  };

  const startEditMode = () => {
    setEditRoomId(reservation.roomId);
    setEditCheckIn(reservation.checkInDate);
    setEditCheckOut(reservation.checkOutDate);
    setIsEditing(true);
  };

  const handleApplyEdit = () => {
    const targetRoom = rooms.find((r) => r.id === editRoomId);
    if (!targetRoom) {
      toast.error('Invalid Room', { detail: 'Please select a valid room.' });
      return;
    }

    const valResult = validateReservationMove({
      reservation,
      targetRoom,
      proposedCheckIn: editCheckIn,
      proposedCheckOut: editCheckOut,
      allReservations,
    });

    if (!valResult.isValid) {
      toast.error('Validation Conflict', { detail: valResult.reason });
      return;
    }

    const proposedNights = countNights(editCheckIn, editCheckOut);

    const change: ProposedReservationChange = {
      reservation,
      originalRoom: currentRoom,
      proposedRoom: targetRoom,
      originalCheckIn: reservation.checkInDate,
      proposedCheckIn: editCheckIn,
      originalCheckOut: reservation.checkOutDate,
      proposedCheckOut: editCheckOut,
      originalNights: reservation.nights,
      proposedNights,
      originalTotal: reservation.totalAmount,
      proposedTotal: valResult.proposedTotal,
      priceDifference: valResult.priceDifference,
      type:
        targetRoom.id !== currentRoom.id &&
        (editCheckIn !== reservation.checkInDate || editCheckOut !== reservation.checkOutDate)
          ? 'combined'
          : targetRoom.id !== currentRoom.id
          ? 'move-room'
          : 'move-date',
    };

    setIsEditing(false);
    onClose();
    onInitiateChange(change);
  };

  const typeConfig = ROOM_TYPE_CONFIG[currentRoom.type] || ROOM_TYPE_CONFIG.Standard;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-ink/65 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-3xl border border-border/90 shadow-2xl max-w-lg w-full p-6 sm:p-7 flex flex-col gap-4 text-ink font-sans my-auto relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-divider pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white font-extrabold shadow-sm">
              {reservation.guestName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-body font-extrabold text-ink">
                  {reservation.guestName}
                </h3>
                <span
                  className={`text-micro font-bold px-2 py-0.5 rounded-full ${
                    reservation.status === 'Confirmed'
                      ? 'bg-success-bg text-success-text border border-success-border'
                      : reservation.status === 'Checked-in'
                      ? 'bg-info-bg text-info-text border border-info-border'
                      : reservation.status === 'Tentative'
                      ? 'bg-warning-bg text-warning-text border border-warning-border'
                      : 'bg-muted-surface text-ink-secondary border border-border'
                  }`}
                >
                  {reservation.status}
                </span>
              </div>
              <p className="text-label text-ink-secondary font-mono mt-0.5">
                {reservation.id} · Channel: {reservation.bookingSource}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink-secondary p-1.5 rounded-xl hover:bg-muted-surface transition-colors cursor-pointer"
          >
            <Lucide.X size={18} />
          </button>
        </div>

        {/* View Details Mode vs Tap-based Edit Mode */}
        {!isEditing ? (
          <div className="flex flex-col gap-3.5 text-label">
            {/* Info Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-page border border-border/80">
                <span className="text-micro font-bold text-ink-muted uppercase tracking-wider block">Assigned Room</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-body font-extrabold text-ink">Room {currentRoom.number}</span>
                  <span className={`text-micro font-bold px-1.5 py-0.2 rounded border ${typeConfig.badgeBg}`}>
                    {currentRoom.type}
                  </span>
                </div>
                <span className="text-label text-ink-secondary mt-0.5 block">Floor {currentRoom.floor} · Max {currentRoom.maxOccupancy} Guests</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-page border border-border/80">
                <span className="text-micro font-bold text-ink-muted uppercase tracking-wider block">Stay Duration</span>
                <span className="text-body font-extrabold text-ink mt-1 block">
                  {reservation.nights} {reservation.nights === 1 ? 'Night' : 'Nights'}
                </span>
                <span className="text-label text-ink-secondary mt-0.5 block">
                  {reservation.checkInDate} → {reservation.checkOutDate}
                </span>
              </div>
            </div>

            {/* Financial Summary Strip */}
            <div className="p-3.5 rounded-2xl bg-page border border-border/80 flex items-center justify-between">
              <div>
                <span className="text-micro font-bold text-ink-muted uppercase tracking-wider block">Total Amount</span>
                <span className="text-body font-extrabold font-mono text-ink mt-0.5 block">
                  ₹{reservation.totalAmount.toLocaleString('en-IN')}.00
                </span>
              </div>
              <div className="text-right">
                <span className="text-micro font-bold text-ink-muted uppercase tracking-wider block">Payment</span>
                <span
                  className={`text-label font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                    reservation.paymentStatus === 'Paid'
                      ? 'bg-success-bg text-success-text border border-success-border'
                      : reservation.paymentStatus === 'Partial'
                      ? 'bg-warning-bg text-warning-text border border-warning-border'
                      : 'bg-danger-bg text-danger-text border border-danger-border'
                  }`}
                >
                  {reservation.paymentStatus}
                </span>
              </div>
            </div>

            {/* Guest Contact & Notes */}
            <div className="p-3.5 rounded-2xl bg-page/60 border border-border/70 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-ink-secondary">
                <span>Phone:</span>
                <strong className="text-ink">{reservation.guestPhone}</strong>
              </div>
              <div className="flex items-center justify-between text-ink-secondary">
                <span>Email:</span>
                <strong className="text-ink">{reservation.guestEmail}</strong>
              </div>
              <div className="flex items-center justify-between text-ink-secondary">
                <span>Occupancy:</span>
                <strong className="text-ink">{reservation.adults} Adults, {reservation.children} Kids</strong>
              </div>
              {reservation.specialRequests && (
                <div className="pt-1 border-t border-border/60 text-ink-secondary">
                  <span className="text-micro font-bold uppercase text-ink-muted block">Special Requests</span>
                  <p className="italic text-ink mt-0.5">{reservation.specialRequests}</p>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-divider flex-wrap">
              <div className="flex items-center gap-1.5">
                {reservation.status === 'Confirmed' && (
                  <button
                    type="button"
                    onClick={() => {
                      onStatusUpdate(reservation.id, 'Checked-in');
                      onClose();
                      toast.success('Guest Checked In', { detail: `${reservation.guestName} into Room ${reservation.roomNumber}` });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-info-bg text-info-text border border-info-border font-bold text-label hover:bg-info-bg cursor-pointer"
                  >
                    Check In
                  </button>
                )}
                {reservation.status === 'Checked-in' && (
                  <button
                    type="button"
                    onClick={() => {
                      onStatusUpdate(reservation.id, 'Checked-out');
                      onClose();
                      toast.success('Guest Checked Out', { detail: `${reservation.guestName} settled & departed` });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-muted-surface text-ink border border-border font-bold text-label hover:bg-border cursor-pointer"
                  >
                    Check Out
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startEditMode}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white font-bold text-label shadow-xs hover:opacity-95 cursor-pointer"
                  title="Reassign room or change dates directly without dragging"
                >
                  <Lucide.Sliders size={13} />
                  <span>Edit Room & Dates</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Tap / Form-Based Editing Alternative (Accessible / Mobile Friendly) */
          <div className="flex flex-col gap-3.5 text-label">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-label">
              <span className="font-bold block">Accessible Reallocation</span>
              <span className="text-label text-primary">
                Select a different room or stay dates using form controls. Full conflict validation is applied automatically.
              </span>
            </div>

            <div>
              <label className="block text-label font-bold text-ink-secondary uppercase tracking-wider mb-1">
                Target Room
              </label>
              <select
                value={editRoomId}
                onChange={(e) => setEditRoomId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-label text-ink font-bold cursor-pointer focus:outline-none focus:border-[var(--color-primary)]"
              >
                {rooms.map((r) => (
                  <option
                    key={r.id}
                    value={r.id}
                    disabled={r.status === 'Out-of-Order'}
                  >
                    Room {r.number} ({r.type} · Flr {r.floor} · ₹{r.baseRate}/nt) {r.status === 'Out-of-Order' ? '— [Out-of-Order]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-label font-bold text-ink-secondary uppercase tracking-wider mb-1">
                  Check-in Date
                </label>
                <input
                  type="date"
                  value={editCheckIn}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface p-2 text-label text-ink font-semibold"
                />
              </div>

              <div>
                <label className="block text-label font-bold text-ink-secondary uppercase tracking-wider mb-1">
                  Check-out Date
                </label>
                <input
                  type="date"
                  value={editCheckOut}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface p-2 text-label text-ink font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-border text-ink font-bold text-label hover:bg-page cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyEdit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white font-bold text-label hover:opacity-95 shadow-xs cursor-pointer"
              >
                <Lucide.Check size={14} />
                <span>Review & Confirm</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
