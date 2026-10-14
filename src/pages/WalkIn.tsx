import { useCallback, useMemo, useState } from 'react';
import { Card, CardTitle } from '../components/ui';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { ConfirmDialog } from '../components/overlays';
import { toast } from '../components/toastStore';
import type { NavTarget } from '../components/nav';
import { frontDeskApi, guestApi, inventoryApi, reservationApi } from '../lib/api/pms';
import { roomFromApi, roomTypeFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { formatCurrency } from '../lib/api/format';
import { useAuth } from '../features/auth/AuthContext';

export function WalkIn({ go }: { go: (t: NavTarget) => void }) {
  const { me } = useAuth();
  const loadChoices = useCallback(async () => {
    const [typeRows, roomRows, day] = await Promise.all([inventoryApi.roomTypes(), inventoryApi.rooms(), frontDeskApi.arrivals()]);
    return { roomTypes: typeRows.map((row) => roomTypeFromApi(row, roomRows)), rooms: roomRows.map((row) => roomFromApi(row)), businessDate: day.businessDate as string };
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
  const [deposit, setDeposit] = useState(150);
  const [requests, setRequests] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingCode, setBookingCode] = useState('');

  const roomTypes = useMemo(() => choices.data?.roomTypes ?? [], [choices.data?.roomTypes]);
  const allRooms = useMemo(() => choices.data?.rooms ?? [], [choices.data?.rooms]);
  const businessDate = choices.data?.businessDate;
  const roomTypeId = selectedRoomTypeId || roomTypes.find((item) => item.active)?.id || roomTypes[0]?.id || '';
  const type = roomTypes.find((item) => item.id === roomTypeId) ?? roomTypes[0] ?? { id: '', name: 'Room type', baseRate: 0, maxOccupancy: 2, count: 0, active: false, description: '', beds: '', amenities: [] };
  const roomType = type.name;
  const currencyCode = me?.user.propertyMemberships.find((membership) => membership.propertyId === me.activePropertyId)?.property.currencyCode ?? 'INR';
  const loadAvailability = useCallback(() => {
    if (!roomTypeId || !businessDate) return Promise.resolve(null);
    const checkOut = new Date(`${businessDate}T12:00:00Z`);
    checkOut.setUTCDate(checkOut.getUTCDate() + nights);
    return inventoryApi.availability(businessDate, checkOut.toISOString().slice(0, 10), roomTypeId);
  }, [roomTypeId, nights, businessDate]);
  const availabilityResource = useApiResource(loadAvailability, [roomTypeId, nights, businessDate]);
  const availability = availabilityResource.data;
  const ready = useMemo(() => (availability?.available ?? []).map((availableRoom) => {
    const room = allRooms.find((item) => item.backendId === availableRoom.id);
    return room ? { ...room, number: availableRoom.roomNumber } : { number: availableRoom.roomNumber, backendId: availableRoom.id, type: roomType, rate: type.baseRate, status: 'Available' as const, floor: 0, hk: 'Clean' as const, guest: null, guestId: null, reservationId: null, checkIn: null, checkOut: null };
  }), [availability, allRooms, roomType, type.baseRate]);

  const room = ready.find((r) => r.number === roomNo) ?? null;
  const roomCharges = (room?.rate ?? type.baseRate) * nights;
  const total = roomCharges;
  const balance = total - Math.min(deposit, total);

  const validate = () => {
    const errs: string[] = [];
    if (name.trim().split(/\s+/).length < 2) errs.push('Enter both the guest first and last name.');
    if (phone.trim().length < 6) errs.push('Contact phone is required.');
    if (nights < 1) errs.push('Stay must be at least 1 night.');
    if (adults + children > type.maxOccupancy) errs.push(`${type.name} holds max ${type.maxOccupancy} guests.`);
    if (!room) errs.push('Select an available ready room.');
    if (deposit < 0 || deposit > total) errs.push('Deposit must be between $0 and the total.');
    setErrors(errs);
    return errs.length === 0;
  };

  const createWalkIn = async () => {
    if (!choices.data?.businessDate || !room?.backendId) return;
    setSubmitting(true);
    try {
      const parts = name.trim().split(/\s+/);
      const guest = await guestApi.create({ firstName: parts[0], lastName: parts.slice(1).join(' ') || 'Guest', phone: phone.trim() });
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
      });
      setBookingCode(created.bookingCode ?? created.id);
      setDone(true);
      toast('Walk-in reservation created', { detail: `${created.bookingCode} · Continue at the check-in desk.`, tone: 'success' });
    } catch (error) { toast('Could not register walk-in', { detail: displayApiError(error), tone: 'danger' }); }
    finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full text-[24px] font-bold" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }} aria-hidden="true">✓</span>
          <h3 className="pms-section-title">{name.trim()} is registered</h3>
          <p className="tnum text-[13.5px]" style={{ color: 'var(--color-ink-secondary)' }}>Booking {bookingCode} · Room {roomNo} · {nights} night(s). Check the guest in at the front desk.</p>
          <button type="button" className="pms-btn-primary mt-2 px-4 py-2.5" onClick={() => go({ view: 'check-in' })}>Back to check-in desk</button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <div className="flex min-w-0 flex-col gap-4 xl:col-span-3">
        <Card>
          <CardTitle title="Guest information" subtitle="No booking needed" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Miles" className={inputClass()} /></Field>
            <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 010 2030" inputMode="tel" className={inputClass()} /></Field>
            <Field label="Nights"><input type="number" min={1} max={14} value={nights} onChange={(e) => setNights(Number(e.target.value))} className={inputClass('tnum')} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Adults"><input type="number" min={1} max={6} value={adults} onChange={(e) => setAdults(Number(e.target.value))} className={inputClass('tnum')} /></Field>
              <Field label="Children"><input type="number" min={0} max={4} value={children} onChange={(e) => setChildren(Number(e.target.value))} className={inputClass('tnum')} /></Field>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle title="Available ready rooms" subtitle={choices.loading ? 'Loading property inventory…' : `Availability for ${choices.data?.businessDate ?? 'today'}`} />
          {choices.error ? <p role="alert" className="pms-helper mb-3">Could not load room inventory: {choices.error}</p> : null}
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Room type">
            {roomTypes.filter((t) => t.active).map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={roomTypeId === t.id} onClick={() => { setSelectedRoomTypeId(t.id); setRoomNo(null); }} className="min-w-0 rounded-[10px] border p-2.5 text-left" style={{ borderColor: roomTypeId === t.id ? 'var(--color-primary)' : 'var(--color-border)', background: roomTypeId === t.id ? 'var(--color-hover-surface)' : 'var(--color-surface)' }}>
                <span className="block text-[13px] font-semibold" style={{ color: 'var(--color-ink)' }}>{t.name}</span>
                <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{formatCurrency(t.baseRate, currencyCode)}/night</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Ready rooms">
            {ready.map((r) => (
              <button key={r.number} type="button" role="radio" aria-checked={roomNo === r.number} onClick={() => setRoomNo(r.number)} className="min-w-0 rounded-[10px] border p-3 text-left" style={{ borderColor: roomNo === r.number ? 'var(--color-primary)' : 'var(--color-border)', background: roomNo === r.number ? 'var(--color-hover-surface)' : 'var(--color-surface)' }}>
                <span className="tnum block text-[17px] font-semibold" style={{ color: 'var(--color-ink)' }}>{r.number}</span>
                <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{formatCurrency(r.rate, currencyCode)}/night · ready</span>
              </button>
            ))}
            {ready.length === 0 ? <p className="pms-helper col-span-full">No ready rooms of this type in the demo sample.</p> : null}
          </div>
        </Card>
        <Card>
          <CardTitle title="Payment & requests" subtitle="Payment details are not saved when creating a reservation" />
          <p className="pms-helper mb-3">The backend creates the guest and confirmed reservation. Record deposits on the folio after check-in.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Payment method">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass()}>{['Card', 'Cash', 'Transfer'].map((m) => <option key={m}>{m}</option>)}</select>
            </Field>
          <Field label={`Deposit estimate (${currencyCode})`}><input type="number" min={0} value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} className={inputClass('tnum')} /></Field>
            <Field label="Special requests"><input value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="Quiet side…" className={inputClass()} /></Field>
          </div>
        </Card>
      </div>
      <div className="min-w-0 xl:col-span-2 xl:self-start">
        <Card className="xl:sticky xl:top-24">
          <CardTitle title="Registration summary" subtitle="Review before completing" />
          <ul className="text-[13.5px]">
            {[
               [`Room ${roomNo ?? '—'} · ${type.name} × ${nights}n`, formatCurrency(roomCharges, currencyCode)],
              ['Tax', 'Calculated when folio charges are posted'],
            ].map(([k, v]) => (
              <li key={k} className="pms-summary-row border-b py-2" style={{ borderColor: 'var(--color-divider)' }}>
                <span style={{ color: 'var(--color-ink-secondary)' }}>{k}</span>
                <span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>{v}</span>
              </li>
            ))}
            <li className="pms-summary-row py-2.5"><span className="font-semibold" style={{ color: 'var(--color-ink)' }}>Room estimate</span><span className="tnum text-[18px] font-semibold" style={{ color: 'var(--color-ink)' }}>{formatCurrency(total, currencyCode)}</span></li>
            <li className="pms-summary-row"><span style={{ color: 'var(--color-ink-secondary)' }}>Deposit → balance estimate</span><span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>{formatCurrency(Math.min(deposit, total), currencyCode)} → {formatCurrency(balance, currencyCode)}</span></li>
          </ul>
          {errors.length > 0 ? (
            <ul className="mt-3 rounded-[10px] border p-3 text-[12.5px] font-medium" style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)' }} role="alert">
              {errors.map((e) => <li key={e}>• {e}</li>)}
            </ul>
          ) : null}
          <button type="button" className="pms-btn-primary mt-4 w-full px-4 py-2.5" onClick={() => { if (validate()) setConfirming(true); }}>Review & register</button>
        </Card>
      </div>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => { void createWalkIn(); }}
        title="Complete walk-in registration?"
        body={`${name.trim()} · Room ${roomNo} · ${nights} night(s) · ${formatCurrency(total, currencyCode)} via ${method}.`}
        confirmLabel={submitting ? 'Registering…' : 'Create reservation'}
      />
    </div>
  );
}
