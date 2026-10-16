import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Card, CardTitle } from '../components/ui';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { ConfirmDialog } from '../components/overlays';
import { toast } from '../components/toastStore';
import type { NavTarget } from '../components/nav';
import { frontDeskApi, guestApi, holdApi, inventoryApi, reservationApi } from '../lib/api/pms';
import { roomFromApi, roomTypeFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { useAvailabilityStream } from '../lib/api/availabilityStream';
import { displayApiError, newIdempotencyKey } from '../lib/api/client';
import { formatCurrency } from '../lib/api/format';
import { useAuth } from '../features/auth/AuthContext';

/** The active selection-time hold on the chosen ready room. */
interface HoldState {
  holdId: string;
  roomId: string;
  expiresAt: string;
  idempotencyKey: string;
}

function formatHoldCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function WalkIn({ go }: { go: (t: NavTarget) => void }) {
  const { me } = useAuth();
  const loadChoices = useCallback(async () => {
    const [typeRows, roomRows, day] = await Promise.all([
      inventoryApi.roomTypes(),
      inventoryApi.rooms(),
      frontDeskApi.arrivals(),
    ]);
    return {
      roomTypes: typeRows.map((row) => roomTypeFromApi(row, roomRows)),
      rooms: roomRows.map((row) => roomFromApi(row)),
      businessDate: day.businessDate as string,
    };
  }, []);

  const choices = useApiResource(loadChoices);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nights, setNights] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
  const [roomNo, setRoomNo] = useState<string | null>(null);
  const [method, setMethod] = useState('Card');
  const [deposit, setDeposit] = useState(0);
  const [requests, setRequests] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingCode, setBookingCode] = useState('');

  // The selection-time hold on the chosen ready room.
  const [hold, setHold] = useState<HoldState | null>(null);
  const holdRef = useRef<HoldState | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const roomTypes = useMemo(() => choices.data?.roomTypes ?? [], [choices.data?.roomTypes]);
  const allRooms = useMemo(() => choices.data?.rooms ?? [], [choices.data?.rooms]);
  const businessDate = choices.data?.businessDate;
  const roomTypeId = selectedRoomTypeId || roomTypes.find((item) => item.active)?.id || roomTypes[0]?.id || '';
  const type =
    roomTypes.find((item) => item.id === roomTypeId) ??
    roomTypes[0] ?? {
      id: '',
      name: 'Room type',
      baseRate: 0,
      maxOccupancy: 2,
      count: 0,
      active: false,
      description: '',
      beds: '',
      amenities: [],
    };
  const currencyCode =
    me?.user.propertyMemberships.find((membership) => membership.propertyId === me.activePropertyId)?.property
      .currencyCode ?? 'INR';

  const checkOutIso = useMemo(() => {
    if (!businessDate) return '';
    const d = new Date(`${businessDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + nights);
    return d.toISOString().slice(0, 10);
  }, [businessDate, nights]);

  const loadAvailability = useCallback(() => {
    if (!roomTypeId || !businessDate || !checkOutIso) return Promise.resolve(null);
    return inventoryApi.availability(businessDate, checkOutIso, roomTypeId);
  }, [roomTypeId, businessDate, checkOutIso]);

  const availabilityResource = useApiResource(loadAvailability, [roomTypeId, businessDate, checkOutIso, refreshTick]);
  const availability = availabilityResource.data;

  // Live availability: another user's hold or booking drops the room at once.
  useAvailabilityStream((event) => {
    if (event.type === 'ping') return;
    if (event.userId && event.userId === me?.user.id) return;
    setRefreshTick((t) => t + 1);
  });

  useEffect(() => {
    holdRef.current = hold;
  }, [hold]);

  // Countdown for the active hold.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const holdRemainingMs = hold ? new Date(hold.expiresAt).getTime() - nowMs : 0;
  const holdExpired = hold !== null && holdRemainingMs <= 0;

  useEffect(
    () => () => {
      const current = holdRef.current;
      if (current) void holdApi.release(current.holdId).catch(() => undefined);
    },
    [],
  );

  const releaseHold = useCallback(async () => {
    const current = holdRef.current;
    if (!current) return;
    try {
      await holdApi.release(current.holdId);
    } catch {
      // Best-effort release
    } finally {
      if (holdRef.current?.holdId === current.holdId) {
        holdRef.current = null;
        setHold(null);
      }
    }
  }, []);

  const ready = useMemo(() => {
    const readyOnFloor = allRooms.filter((r) => r.type === type.name && ['Available', 'Inspected'].includes(r.status));
    if (!availability) return readyOnFloor;
    const availableNumbers = new Set(availability.available.map((candidate) => candidate.roomNumber));
    return readyOnFloor.filter((r) => availableNumbers.has(r.number) || r.number === roomNo);
  }, [allRooms, type.name, availability, roomNo]);

  const selectRoom = async (candidate: { number: string; backendId?: string }) => {
    if (!candidate.backendId || !businessDate || !checkOutIso) return;
    if (roomNo === candidate.number && hold && !holdExpired) return;

    await releaseHold();
    const idempotencyKey = newIdempotencyKey(`walkin-hold:${candidate.backendId}`);
    try {
      const response = await holdApi.acquire(candidate.backendId, businessDate, checkOutIso);
      setRoomNo(candidate.number);
      setHold({
        holdId: response.holdId,
        roomId: candidate.backendId,
        expiresAt: response.expiresAt,
        idempotencyKey,
      });
      toast('Room held for walk-in', { detail: `Room ${candidate.number} held for 10 minutes.`, tone: 'info' });
    } catch (error) {
      toast('Could not hold room', { detail: displayApiError(error), tone: 'danger' });
      setRefreshTick((t) => t + 1);
    }
  };

  const room = allRooms.find((r) => r.number === roomNo) ?? null;
  const roomCharges = type.baseRate * nights;
  const total = roomCharges;
  const balance = Math.max(0, total - deposit);

  const validate = (): boolean => {
    const errs: string[] = [];
    if (name.trim().length < 2) errs.push('Full guest name is required.');
    if (phone.trim().length < 6) errs.push('Phone number is required.');
    if (!roomNo) errs.push('Select an available room.');
    if (adults < 1) errs.push('At least 1 adult required.');
    if (holdExpired) errs.push('Your hold expired. Select the room again.');
    setErrors(errs);
    return errs.length === 0;
  };

  const createWalkIn = async () => {
    if (!choices.data?.businessDate || !room?.backendId) return;
    if (!hold || holdExpired) {
      toast('Hold expired', { detail: 'Select the room again to re-hold it.', tone: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      const parts = name.trim().split(/\s+/);
      const guest = await guestApi.create({
        firstName: parts[0],
        lastName: parts.slice(1).join(' ') || 'Guest',
        phone: phone.trim(),
      });
      const checkOutDate = new Date(`${choices.data.businessDate}T12:00:00Z`);
      checkOutDate.setUTCDate(checkOutDate.getUTCDate() + nights);
      const created = await reservationApi.create({
        primaryGuestId: guest.id,
        checkInDate: choices.data.businessDate,
        checkOutDate: checkOutDate.toISOString().slice(0, 10),
        adults,
        children,
        roomTypeId: type.id,
        roomId: room.backendId,
        source: 'WALK_IN',
        specialRequests: requests,
        holdId: hold.holdId,
        idempotencyKey: hold.idempotencyKey,
      });
      holdRef.current = null;
      setHold(null);
      setBookingCode(created.bookingCode ?? created.id);
      setDone(true);
      toast('Walk-in reservation created', { detail: `${created.bookingCode} · Continue at check-in.`, tone: 'success' });
    } catch (error) {
      toast('Could not register walk-in', { detail: displayApiError(error), tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full shadow-md"
            style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}
            aria-hidden="true"
          >
            <Lucide.CheckCircle2 size={36} />
          </span>
          <h3 className="pms-section-title text-xl font-bold">{name.trim()} is registered!</h3>
          <p className="tnum text-[14px] text-ink-secondary max-w-md">
            Booking reference <span className="font-bold text-ink">{bookingCode}</span> · Room {roomNo} · {nights} night(s). Ready for direct key issuance at front desk.
          </p>
          <button
            type="button"
            className="pms-btn-primary mt-3 flex items-center gap-2 px-5 py-2.5 font-semibold"
            onClick={() => go({ view: 'check-in' })}
          >
            <Lucide.LogIn size={16} />
            <span>Proceed to check-in</span>
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.UserPlus className="text-primary" size={26} />
            <span>Walk-In Registration</span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Fast-track same-day check-in, immediate room assignment, and key deposit collection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go({ view: 'check-in' })}
            className="pms-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md border border-border"
          >
            <Lucide.LogIn size={14} />
            <span>Check-in Desk</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-3">
        {/* Guest Information */}
        <Card>
          <CardTitle title="Guest Information" subtitle="Immediate walk-in registration" />
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 mt-2">
            <Field label="Guest full name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jordan Miles"
                className={inputClass()}
                autoFocus
              />
            </Field>
            <Field label="Contact phone">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                inputMode="tel"
                className={inputClass()}
              />
            </Field>
            <Field label="Nights">
              <input
                type="number"
                min={1}
                max={14}
                value={nights}
                onChange={(e) => {
                  setNights(Number(e.target.value));
                  setRoomNo(null);
                  void releaseHold();
                }}
                className={inputClass('tnum')}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Adults">
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
          </div>
        </Card>

        {/* Room Selection */}
        <Card>
          <CardTitle
            title="Available Ready Rooms"
            subtitle={choices.loading ? 'Loading property inventory…' : `Real-time availability for ${choices.data?.businessDate ?? 'today'}`}
          />
          {choices.error ? (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <Lucide.AlertCircle size={18} />
              <span>Could not load room inventory: {choices.error}</span>
            </div>
          ) : null}

          {/* Room Type Selector */}
          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="radiogroup" aria-label="Room type">
            {roomTypes.filter((t) => t.active).map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={roomTypeId === t.id}
                onClick={() => {
                  setSelectedRoomTypeId(t.id);
                  setRoomNo(null);
                  void releaseHold();
                }}
                className="rounded-md border p-3 text-left transition-all"
                style={{
                  borderColor: roomTypeId === t.id ? 'var(--color-primary)' : 'var(--color-border)',
                  background: roomTypeId === t.id ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' : 'var(--color-surface)',
                  boxShadow: roomTypeId === t.id ? '0 0 0 1px var(--color-primary)' : 'none',
                }}
              >
                <span className="block text-[13px] font-bold text-ink">{t.name}</span>
                <span className="tnum block text-[12px] text-ink-secondary mt-0.5">
                  {formatCurrency(t.baseRate, currencyCode)}/nt
                </span>
              </button>
            ))}
          </div>

          {/* Ready Room Units */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="radiogroup" aria-label="Ready rooms">
            {ready.map((r) => (
              <button
                key={r.number}
                type="button"
                role="radio"
                aria-checked={roomNo === r.number}
                onClick={() => selectRoom({ number: r.number, backendId: r.backendId })}
                className="rounded-md border p-3.5 text-left transition-all hover:scale-[1.02]"
                style={{
                  borderColor: roomNo === r.number ? 'var(--color-primary)' : 'var(--color-border)',
                  background: roomNo === r.number ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' : 'var(--color-surface)',
                  boxShadow: roomNo === r.number ? '0 0 0 1px var(--color-primary)' : 'none',
                }}
              >
                <span className="tnum block text-[18px] font-bold text-ink">Room {r.number}</span>
                <span className="tnum block text-[12px] text-emerald-600 font-medium mt-0.5">
                  Clean & ready
                </span>
              </button>
            ))}
            {ready.length === 0 ? (
              <p className="pms-helper col-span-full py-6 text-center">
                No ready rooms of this type currently available.
              </p>
            ) : null}
          </div>
        </Card>

        {/* Payment & Preferences */}
        <Card>
          <CardTitle title="Settlement & Special Requests" subtitle="Initial payment method and room preferences" />
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3 mt-2">
            <Field label="Payment method">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass()}>
                {['Card', 'Cash', 'Transfer'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label={`Deposit collected (${currencyCode})`}>
              <input
                type="number"
                min={0}
                value={deposit}
                onChange={(e) => setDeposit(Number(e.target.value))}
                className={inputClass('tnum')}
              />
            </Field>
            <Field label="Special requests">
              <input
                value={requests}
                onChange={(e) => setRequests(e.target.value)}
                placeholder="e.g. Quiet floor, early checkout"
                className={inputClass()}
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* Right Column: Pricing & Registration Sticky Summary */}
      <div className="min-w-0 xl:col-span-2 xl:self-start">
        <Card className="xl:sticky xl:top-24">
          <CardTitle title="Registration Summary" subtitle="Verify charges before creating" />
          <ul className="rounded-md border overflow-hidden text-[13.5px] mt-2" style={{ borderColor: 'var(--color-border)' }}>
            <li className="pms-summary-row border-b px-3.5 py-2.5" style={{ borderColor: 'var(--color-divider)' }}>
              <span className="text-ink-secondary">
                Room {roomNo ?? '—'} · {type.name} × {nights}n
              </span>
              <span className="tnum font-semibold text-ink">{formatCurrency(roomCharges, currencyCode)}</span>
            </li>
            <li className="pms-summary-row border-b px-3.5 py-2.5" style={{ borderColor: 'var(--color-divider)' }}>
              <span className="text-ink-secondary">Taxes</span>
              <span className="text-xs text-ink-muted">Calculated on folio</span>
            </li>
            <li className="pms-summary-row px-3.5 py-3" style={{ background: 'var(--color-muted-surface)' }}>
              <span className="font-bold text-[14px] text-ink">Estimated Stay Total</span>
              <span className="tnum font-bold text-[20px] text-ink">{formatCurrency(total, currencyCode)}</span>
            </li>
            <li className="pms-summary-row px-3.5 py-2.5 border-t" style={{ borderColor: 'var(--color-divider)' }}>
              <span className="text-ink-secondary">Deposit → Balance Due</span>
              <span className="tnum font-semibold text-ink">
                {formatCurrency(Math.min(deposit, total), currencyCode)} → {formatCurrency(balance, currencyCode)}
              </span>
            </li>
          </ul>

          {hold && !holdExpired ? (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
              <Lucide.Clock size={14} className="animate-spin-slow" />
              <span>
                Room temporarily held: <strong>{formatHoldCountdown(holdRemainingMs)}</strong> remaining
              </span>
            </div>
          ) : null}

          {holdExpired ? (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700" role="alert">
              <Lucide.AlertCircle size={14} />
              <span>Room hold expired. Select room again to re-hold.</span>
            </div>
          ) : null}

          {errors.length > 0 ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">
              <ul className="flex flex-col gap-1">
                {errors.map((e) => (
                  <li key={e} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-red-500" />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <button
            type="button"
            className="pms-btn-primary mt-4 w-full flex items-center justify-center gap-2 py-3 font-bold rounded-md shadow-sm"
            onClick={() => {
              if (validate()) setConfirming(true);
            }}
          >
            <Lucide.UserCheck size={18} />
            <span>Review & Complete Registration</span>
          </button>
        </Card>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          void createWalkIn();
        }}
        title="Complete Walk-in Registration?"
        body={`${name.trim()} · Room ${roomNo} · ${nights} night(s) · ${formatCurrency(total, currencyCode)} via ${method}.`}
        confirmLabel={submitting ? 'Registering…' : 'Create reservation'}
      />
      </div>
    </div>
  );
}
