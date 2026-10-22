import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as Lucide from 'lucide-react';
import type { ProposedReservationChange } from './types';
import { ROOM_TYPE_CONFIG } from './mockData';

interface Props {
  change: ProposedReservationChange | null;
  onConfirm: (notifyGuest: boolean) => Promise<void> | void;
  onCancel: () => void;
  isSaving: boolean;
}

export function ReservationChangeDialog({
  change,
  onConfirm,
  onCancel,
  isSaving,
}: Props) {
  const [notifyGuest, setNotifyGuest] = useState(true);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (!change) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [change, isSaving, onCancel]);

  if (!change) return null;

  const {
    reservation,
    originalRoom,
    proposedRoom,
    originalCheckIn,
    proposedCheckIn,
    originalCheckOut,
    proposedCheckOut,
    originalNights,
    proposedNights,
    originalTotal,
    proposedTotal,
    priceDifference,
    type,
  } = change;

  const isRoomChanged = originalRoom.id !== proposedRoom.id;
  const isDatesChanged =
    originalCheckIn !== proposedCheckIn || originalCheckOut !== proposedCheckOut;

  const origTypeConfig = ROOM_TYPE_CONFIG[originalRoom.type] || ROOM_TYPE_CONFIG.Standard;
  const propTypeConfig = ROOM_TYPE_CONFIG[proposedRoom.type] || ROOM_TYPE_CONFIG.Standard;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/65 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={() => !isSaving && onCancel()}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_25px_70px_-15px_rgba(15,23,42,0.35)] max-w-lg w-full p-6 sm:p-7 flex flex-col gap-5 text-slate-900 font-sans my-auto relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-[var(--color-primary)] border border-indigo-100">
              <Lucide.CalendarClock size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Confirm Reservation Adjustment
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {type === 'move-room' ? 'Room Transfer' : type === 'move-date' ? 'Date Reschedule' : 'Room & Date Change'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review proposed alterations for <strong className="text-slate-800">{reservation.guestName}</strong> ({reservation.id})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Lucide.X size={18} />
          </button>
        </div>

        {/* Before & After Comparison Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          
          {/* Current Booking State */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col gap-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-400 font-bold text-[10px] uppercase tracking-wider">
              <span>Original Allocation</span>
              <Lucide.History size={13} />
            </div>

            <div>
              <span className="text-[11px] text-slate-500">Assigned Room</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-extrabold text-slate-800">Room {originalRoom.number}</span>
                <span className={`text-[10px] font-bold px-2 py-0.2 rounded border ${origTypeConfig.badgeBg}`}>
                  {originalRoom.type}
                </span>
              </div>
            </div>

            <div className="h-[1px] bg-slate-200/70" />

            <div>
              <span className="text-[11px] text-slate-500">Stay Duration</span>
              <p className="font-bold text-slate-800 mt-0.5">
                {originalCheckIn} → {originalCheckOut}
              </p>
              <span className="text-[10px] text-slate-500">({originalNights} {originalNights === 1 ? 'night' : 'nights'})</span>
            </div>

            <div className="h-[1px] bg-slate-200/70" />

            <div>
              <span className="text-[11px] text-slate-500">Total Billed</span>
              <p className="text-sm font-bold font-mono text-slate-800 mt-0.5">
                ₹{originalTotal.toLocaleString('en-IN')}.00
              </p>
            </div>
          </div>

          {/* Proposed Booking State */}
          <div className="p-4 rounded-2xl border-2 border-indigo-500/80 bg-indigo-50/20 flex flex-col gap-2.5 text-xs shadow-xs relative">
            <div className="flex items-center justify-between text-[var(--color-primary)] font-bold text-[10px] uppercase tracking-wider">
              <span>Proposed Allocation</span>
              <Lucide.Sparkles size={13} />
            </div>

            <div>
              <span className="text-[11px] text-slate-500">New Room</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-sm font-black ${isRoomChanged ? 'text-[var(--color-primary)]' : 'text-slate-800'}`}>
                  Room {proposedRoom.number}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.2 rounded border ${propTypeConfig.badgeBg}`}>
                  {proposedRoom.type}
                </span>
              </div>
            </div>

            <div className="h-[1px] bg-indigo-100" />

            <div>
              <span className="text-[11px] text-slate-500">New Stay Dates</span>
              <p className={`font-bold mt-0.5 ${isDatesChanged ? 'text-[var(--color-primary)]' : 'text-slate-800'}`}>
                {proposedCheckIn} → {proposedCheckOut}
              </p>
              <span className="text-[10px] text-slate-500 font-semibold">
                ({proposedNights} {proposedNights === 1 ? 'night' : 'nights'})
              </span>
            </div>

            <div className="h-[1px] bg-indigo-100" />

            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">New Total</span>
                {priceDifference !== 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      priceDifference > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {priceDifference > 0 ? `+₹${priceDifference.toLocaleString('en-IN')}` : `-₹${Math.abs(priceDifference).toLocaleString('en-IN')}`}
                  </span>
                )}
              </div>
              <p className="text-sm font-black font-mono text-slate-900 mt-0.5">
                ₹{proposedTotal.toLocaleString('en-IN')}.00
              </p>
            </div>
          </div>

        </div>

        {/* Pricing Delta Summary Pill */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Lucide.Receipt size={16} className="text-slate-400" />
            <span className="text-slate-600 font-medium">Estimated Folio Adjustment:</span>
          </div>
          <span className="font-extrabold font-mono text-slate-900">
            {priceDifference === 0
              ? 'No Price Change (₹0.00)'
              : priceDifference > 0
              ? `Additional ₹${priceDifference.toLocaleString('en-IN')}.00 due`
              : `Refund / Credit of ₹${Math.abs(priceDifference).toLocaleString('en-IN')}.00`}
          </span>
        </div>

        {/* Simulated Notification Toggle */}
        <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={notifyGuest}
            onChange={(e) => setNotifyGuest(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
          />
          <div>
            <span className="font-bold text-slate-900 block">Queue simulated guest notification</span>
            <span className="text-[11px] text-slate-500">
              Mock notification email & SMS with updated confirmation slip dispatched to {reservation.guestPhone}
            </span>
          </div>
        </label>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Cancel & Revert
          </button>
          
          <button
            type="button"
            onClick={() => onConfirm(notifyGuest)}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-[var(--color-primary)]/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Lucide.Loader2 size={15} className="animate-spin" />
                <span>Saving Allocation...</span>
              </>
            ) : (
              <>
                <Lucide.CheckCircle2 size={15} />
                <span>Confirm Change</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
