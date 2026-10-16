import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import type { Reservation } from '../types';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { reservationTone, roomTone } from '../components/status';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { toast } from '../components/toastStore';
import { frontDeskApi, inventoryApi, reservationApi } from '../lib/api/pms';
import { reservationFromApi, roomFromApi, roomTypeFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { formatCurrency } from '../lib/api/format';

const STEPS = ['Find', 'Verify', 'Guests', 'Room', 'Payment', 'Review', 'Done'] as const;

export function CheckIn({ initialQuery = '' }: { initialQuery?: string }) {
  const loadBoard = useCallback(async () => {
    const [arrivalResult, roomRows, typeRows] = await Promise.all([
      frontDeskApi.arrivals(),
      inventoryApi.rooms(),
      inventoryApi.roomTypes(),
    ]);
    const details = await Promise.all(arrivalResult.data.map((row) => reservationApi.get(row.id)));
    const roomTypes = typeRows.map((row) => roomTypeFromApi(row, roomRows));
    const arrivals = details.map((detail) => {
      const firstLine = detail.roomLines?.[0];
      const roomType = roomTypes.find((item) => item.id === firstLine?.roomTypeId);
      return reservationFromApi({
        ...detail,
        roomTypeName: roomType?.name,
        roomLines: detail.roomLines?.map((line) => ({ ...line, roomTypeName: roomType?.name })) ?? [],
      });
    });
    const rooms = roomRows.map((row) => {
      const type = roomTypes.find((item) => item.id === row.roomTypeId);
      return roomFromApi({ ...row, baseRate: type ? String(type.baseRate) : undefined });
    });
    return { arrivals, rooms };
  }, []);

  const resource = useApiResource(loadBoard);
  const reservations = useMemo(() => resource.data?.arrivals ?? [], [resource.data?.arrivals]);
  const rooms = useMemo(() => resource.data?.rooms ?? [], [resource.data?.rooms]);
  const [q, setQ] = useState(initialQuery);
  const [resId, setResId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [idChecked, setIdChecked] = useState(false);
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [roomNo, setRoomNo] = useState<string | null>(null);
  const [depositOk, setDepositOk] = useState(false);
  const [doneIds, setDoneIds] = useState<string[]>([]);

  const arrivals: Reservation[] = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return reservations.filter(
      (r) =>
        ['Confirmed', 'Pending'].includes(r.status) &&
        !doneIds.includes(r.id) &&
        (!needle || r.guest.toLowerCase().includes(needle) || r.id.toLowerCase().includes(needle)),
    );
  }, [q, doneIds, reservations]);

  const current = reservations.find((r) => r.id === resId) ?? null;
  const options = current
    ? rooms.filter((room) => room.roomTypeId === current.roomTypeId && ['Available', 'Inspected'].includes(room.status))
    : [];
  const room = rooms.find((r) => r.number === roomNo) ?? null;
  const balance = current ? current.total - current.paid : 0;

  const pick = (r: Reservation) => {
    setResId(r.id);
    setStep(1);
    setIdChecked(false);
    setAdults(r.adults);
    setChildren(r.children);
    const readyForStay = rooms.filter(
      (item) => item.roomTypeId === r.roomTypeId && ['Available', 'Inspected'].includes(item.status),
    );
    setRoomNo(r.roomNumber && readyForStay.some((x) => x.number === r.roomNumber) ? r.roomNumber : null);
    setDepositOk(true);
  };

  const reset = () => {
    setResId(null);
    setStep(0);
    setQ('');
    setRoomNo(null);
    resource.refresh();
  };

  const complete = async () => {
    if (!current?.backendId) return;
    const selectedRoom = options.find((item) => item.number === roomNo);
    if (!selectedRoom?.backendId) return;
    try {
      if (!current.roomNumber || current.roomNumber !== selectedRoom.number) {
        await reservationApi.assignRoom(current.backendId, selectedRoom.backendId);
      }
      await frontDeskApi.checkIn(current.backendId);
      setDoneIds((ids) => [...ids, current.id]);
      setStep(6);
      toast('Guest checked in', { detail: `${current.guest} · Room ${selectedRoom.number}.`, tone: 'success' });
    } catch (error) {
      toast('Check-in failed', { detail: displayApiError(error), tone: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.LogIn className="text-primary" size={26} />
            <span>Guest Check-in</span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Verify guest identities, assign inspected rooms, collect key deposits, and complete arrivals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-surface text-ink-secondary flex items-center gap-1.5">
            <Lucide.Users size={14} className="text-primary" />
            <span>{arrivals.length} Pending Arrival{arrivals.length === 1 ? '' : 's'}</span>
          </span>
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border"
            title="Refresh arrivals"
          >
            <Lucide.RefreshCw size={13} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-5">
        {resource.error ? (
          <div className="xl:col-span-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <Lucide.AlertCircle size={18} />
            <span>Could not load arrivals: {resource.error}</span>
          </div>
        ) : null}

      {/* Left Column: Arrival Queue */}
      <Card className="xl:col-span-2">
        <CardTitle
          title="Expected Arrivals"
          subtitle={resource.loading ? 'Loading arrivals…' : `${arrivals.length} pending check-ins today`}
        />
        <div className="relative mb-3">
          <Lucide.Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search booking ID, guest name…"
            aria-label="Find reservation"
            className={`${inputClass()} pl-9 w-full`}
          />
        </div>
        <ul className="flex max-h-[460px] flex-col gap-2 overflow-y-auto">
          {arrivals.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => pick(r)}
                aria-pressed={resId === r.id}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all"
                style={{
                  borderColor: resId === r.id ? 'var(--color-primary)' : 'var(--color-border)',
                  background: resId === r.id ? 'color-mix(in srgb, var(--color-primary) 6%, var(--color-surface))' : 'var(--color-surface)',
                  boxShadow: resId === r.id ? '0 0 0 1px var(--color-primary)' : 'none',
                }}
              >
                <Avatar name={r.guest} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold text-ink">{r.guest}</span>
                  <span className="tnum block text-[12px] text-ink-secondary">
                    {r.id} · {r.roomType} · {r.nights} night{r.nights === 1 ? '' : 's'}
                  </span>
                </span>
                <Badge tone={reservationTone(r.status)}>{r.status}</Badge>
              </button>
            </li>
          ))}
          {arrivals.length === 0 ? (
            <div className="py-8 text-center">
              <Lucide.UserCheck size={36} className="mx-auto text-ink-muted mb-2 opacity-40" />
              <p className="pms-helper">No pending arrivals matching criteria.</p>
            </div>
          ) : null}
        </ul>
      </Card>

      {/* Right Column: Step-by-step Check-in */}
      <Card className="xl:col-span-3">
        {/* Progress Steps */}
        <ol className="mb-5 flex flex-wrap items-center gap-2 border-b pb-4" style={{ borderColor: 'var(--color-border)' }} aria-label="Check-in progress">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className="flex items-center gap-1.5 text-[12px] font-semibold"
              style={{ color: i <= step ? 'var(--color-ink)' : 'var(--color-ink-muted)' }}
              aria-current={i === step ? 'step' : undefined}
            >
              <span
                className="tnum flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold transition-colors"
                style={{
                  border: '1px solid',
                  borderColor: i <= step ? 'var(--color-primary)' : 'var(--color-border)',
                  background: i < step ? 'var(--color-primary)' : i === step ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
                  color: i < step ? 'var(--color-primary-foreground)' : i === step ? 'var(--color-primary)' : 'inherit',
                }}
              >
                {i < step ? <Lucide.Check size={11} strokeWidth={3} /> : i + 1}
              </span>
              <span>{s}</span>
              {i < STEPS.length - 1 ? <Lucide.ChevronRight size={13} className="text-ink-muted mx-0.5" /> : null}
            </li>
          ))}
        </ol>

        {!current ? (
          <div className="py-16 text-center">
            <Lucide.LogIn size={40} className="mx-auto text-ink-muted mb-3 opacity-40" />
            <p className="font-semibold text-ink">No arrival selected</p>
            <p className="pms-helper mt-1">Select an expected arrival from the left queue to begin registration.</p>
          </div>
        ) : step === 6 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full shadow-md"
              style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}
              aria-hidden="true"
            >
              <Lucide.CheckCircle2 size={36} />
            </span>
            <h3 className="pms-section-title text-xl font-bold">{current.guest} is checked in!</h3>
            <p className="tnum text-[14px] text-ink-secondary">
              Room {roomNo} assigned · key cards ready · turnover task scheduled
            </p>
            <button
              type="button"
              className="pms-btn-primary mt-3 flex items-center gap-2 px-5 py-2.5 font-semibold"
              onClick={reset}
            >
              <Lucide.UserPlus size={16} />
              <span>Next arrival</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {step === 1 && (
              <div>
                <h3 className="pms-section-title mb-3">Verify Guest Identity</h3>
                <div className="grid grid-cols-1 gap-2.5 text-[13.5px] sm:grid-cols-2">
                  {[
                    ['Guest Name', current.guest],
                    ['Contact & Email', 'On file in reservation record'],
                    ['Stay Duration', `${current.checkIn} → ${current.checkOut} (${current.nights} nights)`],
                    ['Booking Channel', `${current.channel} · ${current.ratePlan}`],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-xl border p-3"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      <p className="text-xs text-ink-muted">{k}</p>
                      <p className="font-semibold text-ink mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border p-3.5 bg-black/[0.02]" style={{ borderColor: 'var(--color-border)' }}>
                  <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-ink">
                    <input
                      type="checkbox"
                      checked={idChecked}
                      onChange={(e) => setIdChecked(e.target.checked)}
                      className="h-4 w-4 accent-[var(--color-primary)] rounded"
                    />
                    <span>Government photo ID / passport physically verified at reception</span>
                  </label>
                  {!idChecked ? (
                    <p className="text-xs text-amber-600 mt-1 pl-6">ID verification is mandatory before issuing keys.</p>
                  ) : null}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 className="pms-section-title mb-3">Confirm Occupants & Stay Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Adults (18+)">
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={adults}
                      onChange={(e) => setAdults(Number(e.target.value))}
                      className={inputClass('tnum')}
                    />
                  </Field>
                  <Field label="Children">
                    <input
                      type="number"
                      min={0}
                      max={4}
                      value={children}
                      onChange={(e) => setChildren(Number(e.target.value))}
                      className={inputClass('tnum')}
                    />
                  </Field>
                </div>
                <p className="pms-helper mt-2 text-xs">
                  Booked details: {current.adults} adult(s){current.children ? `, ${current.children} child(ren)` : ''} · {current.checkIn} to {current.checkOut}.
                </p>
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 className="pms-section-title mb-1">Select Ready Room</h3>
                <p className="pms-helper mb-3 text-xs">
                  Only clean, inspected and available {current.roomType} rooms are displayed.
                </p>
                {options.length === 0 ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
                    <p className="font-bold flex items-center gap-1.5">
                      <Lucide.AlertTriangle size={16} />
                      <span>No ready {current.roomType} rooms right now</span>
                    </p>
                    <p className="text-xs mt-1 text-rose-700">Check Housekeeping queue or arrange a complimentary upgrade.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Ready rooms">
                    {options.map((r) => (
                      <button
                        key={r.number}
                        type="button"
                        role="radio"
                        aria-checked={roomNo === r.number}
                        onClick={() => setRoomNo(r.number)}
                        className="rounded-xl border p-3.5 text-left transition-all hover:scale-[1.02]"
                        style={{
                          borderColor: roomNo === r.number ? 'var(--color-primary)' : 'var(--color-border)',
                          background: roomNo === r.number ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' : 'var(--color-surface)',
                          boxShadow: roomNo === r.number ? '0 0 0 1px var(--color-primary)' : 'none',
                        }}
                      >
                        <span className="tnum block text-[20px] font-bold text-ink">Room {r.number}</span>
                        <span className="mt-1 block">
                          <Badge tone={roomTone(r.status)}>{r.status}</Badge>
                        </span>
                        <span className="tnum mt-1 block text-[12px] text-ink-secondary">
                          Floor {r.floor} · {formatCurrency(r.rate, current.currencyCode)}/night
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div>
                <h3 className="pms-section-title mb-3">Deposit & Folio Balance</h3>
                <ul className="rounded-xl border overflow-hidden text-[13.5px]" style={{ borderColor: 'var(--color-border)' }}>
                  <li className="pms-summary-row border-b px-3.5 py-2.5" style={{ borderColor: 'var(--color-divider)' }}>
                    <span className="text-ink-secondary">Stay Total</span>
                    <span className="tnum font-semibold text-ink">{formatCurrency(current.total, current.currencyCode)}</span>
                  </li>
                  <li className="pms-summary-row border-b px-3.5 py-2.5" style={{ borderColor: 'var(--color-divider)' }}>
                    <span className="text-ink-secondary">Prepayments Received</span>
                    <span className="tnum font-semibold text-emerald-600">{formatCurrency(current.paid, current.currencyCode)}</span>
                  </li>
                  <li className="pms-summary-row px-3.5 py-3" style={{ background: 'var(--color-muted-surface)' }}>
                    <span className="font-bold text-[14px] text-ink">Balance Due at Departure</span>
                    <span
                      className="tnum font-bold text-[18px]"
                      style={{ color: balance > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}
                    >
                      {formatCurrency(balance, current.currencyCode)}
                    </span>
                  </li>
                </ul>
                <div className="mt-3 rounded-xl border p-3.5 bg-black/[0.02]" style={{ borderColor: 'var(--color-border)' }}>
                  <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-ink">
                    <input
                      type="checkbox"
                      checked={depositOk}
                      onChange={(e) => setDepositOk(e.target.checked)}
                      className="h-4 w-4 accent-[var(--color-primary)] rounded"
                    />
                    <span>Card pre-authorization / incidentals guarantee secured</span>
                  </label>
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <h3 className="pms-section-title mb-3">Review & Authorize Registration</h3>
                <dl className="grid grid-cols-1 gap-2.5 text-[13.5px] sm:grid-cols-2">
                  {[
                    ['Guest Name', current.guest],
                    ['Registered Occupants', `${adults} adult(s)${children ? `, ${children} child(ren)` : ''}`],
                    ['Assigned Room', roomNo ? `${room?.type} Room ${roomNo}` : '— not selected —'],
                    ['Dates of Stay', `${current.checkIn} → ${current.checkOut}`],
                    ['Folio Balance', formatCurrency(balance, current.currencyCode)],
                    ['Special Instructions', current.specialRequests || 'None'],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-xl border p-3"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      <dt className="text-xs text-ink-muted">{k}</dt>
                      <dd className="font-semibold text-ink mt-0.5">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="flex gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                disabled={step === 1}
                onClick={() => setStep((s) => s - 1)}
                className="pms-btn-ghost flex-1 px-4 py-2.5 font-medium disabled:opacity-40"
              >
                Back
              </button>
              {step < 5 ? (
                <button
                  type="button"
                  disabled={(step === 1 && !idChecked) || (step === 3 && !roomNo) || (step === 4 && !depositOk)}
                  onClick={() => setStep((s) => s + 1)}
                  className="pms-btn-primary flex-[2] flex items-center justify-center gap-1.5 px-4 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>Continue</span>
                  <Lucide.ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!roomNo}
                  onClick={complete}
                  className="pms-btn-primary flex-[2] flex items-center justify-center gap-1.5 px-4 py-2.5 font-bold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Lucide.CheckCircle2 size={16} />
                  <span>Complete check-in</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}
