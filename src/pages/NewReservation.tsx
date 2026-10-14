import { useCallback, useMemo, useState } from 'react';
import { Badge, Card, CardTitle } from '../components/ui';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { ConfirmDialog } from '../components/overlays';
import { toast } from '../components/toastStore';
import { roomTone } from '../components/status';
import type { NavTarget } from '../components/nav';
import { frontDeskApi, guestApi, inventoryApi, reservationApi } from '../lib/api/pms';
import { guestFromApi, roomFromApi, roomTypeFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { formatCurrency } from '../lib/api/format';
import { useAuth } from '../features/auth/AuthContext';

const SOURCES = ['Direct', 'OTA', 'Corporate', 'Walk-in', 'Travel agent'];
const RATE_PLANS = ['Best available', 'Advance purchase', 'Corporate', 'Day rate'];
const SERVICES = [
  { name: 'Breakfast (per night)', price: 18 },
  { name: 'Airport transfer', price: 45 },
  { name: 'Evening turndown', price: 12 },
];
const INITIAL_CHECK_IN = new Date().toISOString().slice(0, 10);
const addNights = (day: string, nights: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + nights);
  return date.toISOString().slice(0, 10);
};

export function NewReservation({ go }: { go: (t: NavTarget) => void }) {
  const { me } = useAuth();
  const loadChoices = useCallback(async () => {
    const [guestResult, roomTypeResult, roomResult, movementResult] = await Promise.allSettled([
      guestApi.list('', 1, 100),
      inventoryApi.roomTypes(),
      inventoryApi.rooms(),
      frontDeskApi.arrivals(),
    ]);
    const guestRows = guestResult.status === 'fulfilled' ? guestResult.value.data : [];
    const typeRows = roomTypeResult.status === 'fulfilled' ? roomTypeResult.value : [];
    const roomRows = roomResult.status === 'fulfilled' ? roomResult.value : [];
    const businessDate = movementResult.status === 'fulfilled' ? movementResult.value.businessDate : INITIAL_CHECK_IN;
    const warnings: string[] = [];
    if (guestResult.status === 'rejected') warnings.push(`Guests could not be loaded: ${displayApiError(guestResult.reason)}`);
    if (roomTypeResult.status === 'rejected') warnings.push(`Room types could not be loaded: ${displayApiError(roomTypeResult.reason)}`);
    if (roomResult.status === 'rejected') warnings.push(`Rooms could not be loaded: ${displayApiError(roomResult.reason)}`);
    if (movementResult.status === 'rejected') warnings.push(`Business date could not be loaded, using today: ${displayApiError(movementResult.reason)}`);
    if (typeRows.length === 0 && roomTypeResult.status === 'rejected') throw roomTypeResult.reason;
    return {
      guests: guestRows.map(guestFromApi),
      roomTypes: typeRows.map((row) => roomTypeFromApi(row, roomRows)),
      rooms: roomRows.map((row) => roomFromApi(row)),
      businessDate,
      warnings,
    };
  }, []);
  const choices = useApiResource(loadChoices);
  const [guestChoice, setGuestChoice] = useState('existing');
  const [guestId, setGuestId] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [checkInOverride, setCheckInOverride] = useState('');
  const [checkOutOverride, setCheckOutOverride] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
  const [rooms, setRooms] = useState(1);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [ratePlan, setRatePlan] = useState(RATE_PLANS[0]);
  const [discount, setDiscount] = useState(0);
  const [extras, setExtras] = useState<string[]>(['Breakfast (per night)']);
  const [source, setSource] = useState(SOURCES[0]);
  const [method, setMethod] = useState('Card');
  const [deposit, setDeposit] = useState(100);
  const [requests, setRequests] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const roomTypes = useMemo(() => choices.data?.roomTypes ?? [], [choices.data?.roomTypes]);
  const guests = useMemo(() => choices.data?.guests ?? [], [choices.data?.guests]);
  const allRooms = useMemo(() => choices.data?.rooms ?? [], [choices.data?.rooms]);
  const loadWarnings = useMemo(() => choices.data?.warnings ?? [], [choices.data?.warnings]);
  const effectiveGuestChoice = guests.length === 0 ? 'new' : guestChoice;
  const checkIn = checkInOverride || choices.data?.businessDate || INITIAL_CHECK_IN;
  const checkOut = checkOutOverride || addNights(checkIn, 2);
  const roomTypeId = selectedRoomTypeId || roomTypes.find((item) => item.active)?.id || roomTypes[0]?.id || '';
  const selectedGuestId = guestId || guests[0]?.id || '';
  const currencyCode = me?.user.propertyMemberships.find((membership) => membership.propertyId === me.activePropertyId)?.property.currencyCode ?? 'INR';
  const type = roomTypes.find((item) => item.id === roomTypeId) ?? roomTypes[0] ?? {
    id: '', name: 'Room type', description: '', count: 0, maxOccupancy: 2, beds: '—', baseRate: 0, amenities: [], active: false,
  };
  const roomType = type?.name ?? '';

  const loadAvailability = useCallback(() => roomTypeId && checkOut > checkIn
    ? inventoryApi.availability(checkIn, checkOut, roomTypeId)
    : Promise.resolve(null), [roomTypeId, checkIn, checkOut]);
  const availabilityResource = useApiResource(loadAvailability, [roomTypeId, checkIn, checkOut]);
  const availabilityResult = availabilityResource.data;
  const availabilityError = availabilityResource.error;
  const nights = useMemo(() => {
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 86400000)) : 0;
  }, [checkIn, checkOut]);

  const availability = availabilityResult?.available.length ?? 0;
  const roomCharges = (type?.baseRate ?? 0) * nights;
  const extraCharges = extras.reduce((s, name) => {
    const svc = SERVICES.find((x) => x.name === name);
    if (!svc) return s;
    return s + (name.includes('per night') ? svc.price * nights * rooms : svc.price * rooms);
  }, 0);
  const subtotal = roomCharges + extraCharges;
  const clampedDiscount = Math.min(Math.max(0, discount), subtotal);
  const total = subtotal - clampedDiscount;
  const balance = total - Math.min(deposit, total);

  const availableRoomList = useMemo(() => (availabilityResult?.available ?? []).map((availableRoom) => {
    const existing = allRooms.find((room) => room.backendId === availableRoom.id);
    if (existing) return { ...existing, backendId: availableRoom.id, number: availableRoom.roomNumber };
    return {
      number: availableRoom.roomNumber,
      backendId: availableRoom.id,
      type: roomType,
      floor: Number.parseInt(String(availableRoom.floor ?? '').replace(/\D/g, ''), 10) || 0,
      status: 'Available' as const,
      hk: 'Clean' as const,
      guest: null,
      guestId: null,
      reservationId: null,
      checkIn: null,
      checkOut: null,
      rate: type?.baseRate ?? 0,
    };
  }), [availabilityResult, allRooms, roomType, type?.baseRate]);
  const floorGroups = useMemo(() => {
    const groups = new Map<number, typeof availableRoomList>();
    for (const room of availableRoomList) {
      const list = groups.get(room.floor) ?? [];
      list.push(room);
      groups.set(room.floor, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [availableRoomList]);
  const toggleRoom = (no: string) => {
    setSelectedRooms((prev) => {
      if (prev.includes(no)) return prev.filter((x) => x !== no);
      if (prev.length >= rooms) return prev;
      return [...prev, no];
    });
  };

  const validate = () => {
    const errs: string[] = [];
    if (choices.error) errs.push(`Page data failed to load: ${choices.error}`);
    if (effectiveGuestChoice === 'new') {
      if (newName.trim().split(/\s+/).length < 2) errs.push('Enter both the guest first and last name.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail.trim())) errs.push('A valid guest email is required.');
      if (newPhone.trim().length < 6) errs.push('A contact phone number is required.');
    } else if (!selectedGuestId) {
      errs.push('No guest is selected. Add a guest first or switch to New guest.');
    }
    if (nights < 1) errs.push('Check-out must be after check-in (at least 1 night).');
    if (!type?.id) errs.push('Room types failed to load. Reload the page and try again.');
    if (rooms > 1) errs.push('The backend currently supports one room per reservation. Create separate reservations for additional rooms.');
    if (type && adults + children > type.maxOccupancy * rooms) errs.push(`${type.name} holds max ${type.maxOccupancy} per room — reduce guests or add rooms.`);
    if (availability <= 0) errs.push(availabilityError || 'No rooms are available for these dates.');
    if (selectedRooms.length !== 1) errs.push('Select one physical room that is available for this stay.');
    else if (!availableRoomList.some((room) => selectedRooms.includes(room.number))) errs.push('The selected room is no longer available for these dates. Pick another room.');
    if (deposit < 0 || deposit > total) errs.push('Deposit must be between $0 and the displayed estimate.');
    setErrors(errs);
    return errs.length === 0;
  };

  const guestName = effectiveGuestChoice === 'existing' ? (guests.find((g) => g.id === selectedGuestId)?.name ?? '') : newName.trim();

  const createReservation = async () => {
    if (!type?.id) return;
    if (effectiveGuestChoice === 'existing' && !selectedGuestId) {
      setErrors(['No guest is selected. Add a guest first or switch to New guest.']);
      return;
    }
    setSubmitting(true);
    setErrors([]);
    try {
      const nameParts = newName.trim().split(/\s+/);
      const guest = effectiveGuestChoice === 'existing'
        ? { id: selectedGuestId }
        : await guestApi.create({ firstName: nameParts[0], lastName: nameParts.slice(1).join(' ') || 'Guest', email: newEmail.trim(), phone: newPhone.trim() });
      const physicalRoom = availableRoomList.find((room) => selectedRooms.includes(room.number));
      if (!physicalRoom) throw new Error('The selected room is no longer available for these dates. Pick another room.');
      const created = await reservationApi.create({
        primaryGuestId: guest.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults,
        children,
        roomTypeId: type.id,
        roomId: physicalRoom.backendId,
        source: ({ 'Walk-in': 'WALK_IN', OTA: 'OTA', Corporate: 'CORPORATE' } as Record<string, string>)[source] ?? 'DIRECT',
        specialRequests: requests,
      });
      setDone(created.bookingCode ?? created.id);
      setConfirming(false);
      toast('Reservation created', { detail: `${created.bookingCode ?? 'Booking'} confirmed and inventory allocated.`, tone: 'success' });
    } catch (error) {
      const message = displayApiError(error);
      setErrors([message]);
      toast('Reservation failed', { detail: message, tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full text-[24px] font-bold" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }} aria-hidden="true">✓</span>
          <h3 className="pms-section-title">Reservation {done} confirmed</h3>
          <p className="max-w-[440px] text-[13.5px]" style={{ color: 'var(--color-ink-secondary)' }}>
            {guestName} · {roomType} × {rooms}{selectedRooms.length > 0 ? ` (${selectedRooms.join(', ')})` : ''} · {nights} night{nights === 1 ? '' : 's'} · estimate <span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>{formatCurrency(total, currencyCode)}</span>.
            The reservation is confirmed and its room nights are allocated by the backend.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" className="pms-btn-primary px-4 py-2.5" onClick={() => go({ view: 'reservations' })}>View reservations</button>
            <button type="button" className="pms-btn-ghost px-4 py-2.5" onClick={() => { setDone(null); setErrors([]); }}>Create another</button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <div className="flex min-w-0 flex-col gap-4 xl:col-span-3">
        <Card>
          <CardTitle title="Guest" subtitle={guests.length === 0 ? 'No guests yet — add the first guest below' : 'Existing profile or inline registration'} />
          {choices.error && guests.length === 0 && roomTypes.length === 0 ? <p role="alert" className="pms-helper mb-3">Could not load page data: {choices.error}</p> : null}
          {loadWarnings.length > 0 ? <ul className="pms-helper mb-3">{loadWarnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul> : null}
          <div className="mb-3 flex gap-2" role="radiogroup" aria-label="Guest source">
            {['existing', 'new'].map((m) => (
              <button key={m} type="button" role="radio" aria-checked={effectiveGuestChoice === m} disabled={m === 'existing' && guests.length === 0} onClick={() => setGuestChoice(m)} className="rounded-full border px-4 py-2 text-[12.5px] font-semibold capitalize disabled:opacity-50" style={{ borderColor: effectiveGuestChoice === m ? 'var(--color-primary)' : 'var(--color-border)', background: effectiveGuestChoice === m ? 'var(--color-primary)' : 'var(--color-surface)', color: effectiveGuestChoice === m ? 'var(--color-primary-foreground)' : 'var(--color-ink-secondary)' }}>
                {m === 'existing' ? 'Existing guest' : 'New guest'}
              </button>
            ))}
          </div>
          {effectiveGuestChoice === 'existing' ? (
            <Field label="Guest">
              <select value={selectedGuestId} onChange={(e) => setGuestId(e.target.value)} className={inputClass()}>
                {guests.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Full name"><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jordan Miles" className={inputClass()} /></Field>
              <Field label="Email"><input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="jordan@mail.com" inputMode="email" className={inputClass()} /></Field>
              <Field label="Phone"><input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1 555 010 2030" inputMode="tel" className={inputClass()} /></Field>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle title="Stay" subtitle="Dates, party and room choice" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Field label="Check-in"><input type="date" value={checkIn} onChange={(e) => { setCheckInOverride(e.target.value); setSelectedRooms([]); }} className={inputClass('tnum')} /></Field>
            <Field label="Check-out"><input type="date" value={checkOut} onChange={(e) => { setCheckOutOverride(e.target.value); setSelectedRooms([]); }} className={inputClass('tnum')} /></Field>
            <Field label="Adults"><input type="number" min={1} max={8} value={adults} onChange={(e) => setAdults(Number(e.target.value))} className={inputClass('tnum')} /></Field>
            <Field label="Children"><input type="number" min={0} max={6} value={children} onChange={(e) => setChildren(Number(e.target.value))} className={inputClass('tnum')} /></Field>
            <Field label="Room type">
              <select
                value={roomTypeId}
                onChange={(e) => {
                  setSelectedRoomTypeId(e.target.value);
                  setSelectedRooms([]);
                }}
                className={inputClass()}
              >
                {roomTypes.filter((t) => t.active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Rooms">
              <input
                type="number"
                min={1}
                max={1}
                value={rooms}
                onChange={() => {
                  const next = 1;
                  setRooms(next);
                  setSelectedRooms((prev) => prev.slice(0, next));
                }}
                className={inputClass('tnum')}
              />
            </Field>
            <Field label="Rate plan">
              <select value={ratePlan} onChange={(e) => setRatePlan(e.target.value)} className={inputClass()}>
                {RATE_PLANS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label={`Discount (${currencyCode})`} hint={`Estimate only · max ${type.maxOccupancy}/room`}>
              <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className={inputClass('tnum')} />
            </Field>
          </div>
          <div className="mt-3 rounded-[10px] border p-3 text-[13px]" style={{ borderColor: 'var(--color-border)', background: availability > 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)' }}>
            <span className="font-semibold" style={{ color: availability > 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>
              {availability > 0 ? `${availability} ${roomType} rooms available` : `No ${roomType} rooms left`} for {nights} night{nights === 1 ? '' : 's'}
            </span>
              <span style={{ color: 'var(--color-ink-secondary)' }}> · live backend availability.</span>
            </div>
            {availabilityError ? <p className="pms-helper mt-2" role="alert">Availability check failed: {availabilityError}</p> : null}
          <div className="mt-4">
            <p className="pms-label mb-1">Choose rooms — mini blueprint</p>
            <p className="pms-helper mb-2">
              {selectedRooms.length} of {rooms} picked{selectedRooms.length > 0 ? `: ${selectedRooms.join(', ')}` : ''} · rooms shown are available for these dates.
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Room status legend">
              {['Available', 'Inspected', 'Occupied', 'Dirty', 'Cleaning', 'Out-of-service'].map((s) => (
                <Badge key={s} tone={roomTone(s as never)}>{s}</Badge>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              {floorGroups.length === 0 ? <p className="pms-helper">No available rooms for this room type and date range.</p> : null}
              {floorGroups.map(([floor, floorRooms]) => {
                return (
                  <div key={floor} className="rounded-[10px] border p-2.5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--color-ink-secondary)' }}>
                      {floor === 0 ? 'Floor unassigned' : `Floor ${floor}`} · {floorRooms.length} rooms available
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
                      {floorRooms.map((r) => {
                        const pickable = true;
                        const picked = selectedRooms.includes(r.number);
                        const oos = r.status === 'Out-of-service';
                        return (
                          <button
                            key={r.number}
                            type="button"
                            disabled={!pickable}
                            aria-pressed={picked}
                            title={`Room ${r.number} · ${r.type} · ${r.status}`}
                            onClick={() => toggleRoom(r.number)}
                            className="min-w-0 rounded-[10px] border p-2 text-center transition-all duration-150 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            style={{
                              borderColor: picked ? 'var(--color-primary)' : oos ? 'var(--color-danger-border)' : 'var(--color-border)',
                              background: picked ? 'var(--color-primary)' : oos ? 'var(--color-danger-bg)' : pickable ? 'var(--color-surface)' : 'var(--color-muted-surface)',
                              color: picked ? 'var(--color-primary-foreground)' : oos ? 'var(--color-danger-text)' : 'var(--color-ink)',
                              boxShadow: picked ? 'var(--shadow-sm)' : 'none',
                              opacity: !pickable && !picked ? 0.72 : 1,
                            }}
                          >
                            <span className="tnum block text-[14px] font-semibold">{r.number}</span>
                            <span className="block truncate text-[10px] font-semibold uppercase tracking-wide" style={{ color: picked ? 'var(--color-primary-foreground)' : undefined }}>
                              {r.status === 'Out-of-service' ? 'OOS' : r.status}
                            </span>
                            <span className="block truncate text-[10px]" style={{ color: picked ? 'var(--color-primary-foreground)' : 'var(--color-ink-muted)' }}>
                              {r.type}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedRooms.length > 0 ? (
              <button type="button" onClick={() => setSelectedRooms([])} className="pms-btn-ghost mt-2 px-3 py-1.5">
                Clear picked rooms
              </button>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardTitle title="Services & payment" subtitle="The existing booking API saves source and special requests only" />
          <p className="pms-helper mb-3">Extras, discounts, deposits, and payment method are estimates only here; the backend does not persist them during reservation creation.</p>
          <fieldset>
            <legend className="pms-label mb-2">Extra services</legend>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s) => {
                const on = extras.includes(s.name);
                return (
                  <button key={s.name} type="button" aria-pressed={on} onClick={() => setExtras((p) => (on ? p.filter((x) => x !== s.name) : [...p, s.name]))} className="rounded-full border px-3 py-2 text-[12.5px] font-semibold" style={{ borderColor: on ? 'var(--color-primary)' : 'var(--color-border)', background: on ? 'var(--color-hover-surface)' : 'var(--color-surface)', color: on ? 'var(--color-ink)' : 'var(--color-ink-secondary)' }}>
                     {s.name} · <span className="tnum">{formatCurrency(s.price, currencyCode)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Field label="Booking source">
              <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass()}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
            </Field>
            <Field label="Payment method">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass()}>{['Card', 'Cash', 'Transfer', 'Invoice'].map((m) => <option key={m}>{m}</option>)}</select>
            </Field>
            <Field label={`Deposit (${currencyCode})`}>
              <input type="number" min={0} value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} className={inputClass('tnum')} />
            </Field>
            <Field label="Nights (auto)">
              <input value={nights} readOnly aria-readonly className={inputClass('tnum')} style={{ background: 'var(--color-muted-surface)' }} />
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Special requests"><input value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="High floor, quiet side…" className={inputClass()} /></Field>
            <Field label="Internal notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Staff-only note…" className={inputClass()} /></Field>
          </div>
        </Card>
      </div>

      <div className="min-w-0 xl:col-span-2 xl:self-start">
        <Card className="xl:sticky xl:top-24">
          <CardTitle title="Price estimate" subtitle="Estimate only; backend uses the room type base rate" />
          <ul className="text-[13.5px]">
            {selectedRooms.length > 0 ? (
              <li className="pms-summary-row border-b py-2" style={{ borderColor: 'var(--color-divider)' }}>
                <span className="min-w-0" style={{ color: 'var(--color-ink-secondary)' }}>Picked rooms</span>
                <span className="tnum min-w-0 flex-shrink-0 text-right font-semibold" style={{ color: 'var(--color-ink)' }}>{selectedRooms.join(', ')}</span>
              </li>
            ) : null}
            {[
              [`Room — ${type.name} × ${nights}n × ${rooms}`, formatCurrency(roomCharges, currencyCode)],
              [`Extras (${extras.length || 'none'})`, formatCurrency(extraCharges, currencyCode)],
              ['Discount', `−${formatCurrency(clampedDiscount, currencyCode)}`],
              ['Tax', 'Calculated by backend when folio charges are posted'],
            ].map(([k, v]) => (
              <li key={k} className="pms-summary-row border-b py-2" style={{ borderColor: 'var(--color-divider)' }}>
                <span className="min-w-0" style={{ color: 'var(--color-ink-secondary)' }}>{k}</span>
                <span className="tnum flex-shrink-0 text-right font-semibold" style={{ color: 'var(--color-ink)' }}>{v}</span>
              </li>
            ))}
            <li className="pms-summary-row py-2.5">
              <span className="min-w-0 font-semibold" style={{ color: 'var(--color-ink)' }}>Total</span>
              <span className="tnum flex-shrink-0 text-right text-[18px] font-semibold" style={{ color: 'var(--color-ink)' }}>{formatCurrency(total, currencyCode)}</span>
            </li>
            <li className="pms-summary-row">
              <span className="min-w-0" style={{ color: 'var(--color-ink-secondary)' }}>Deposit → balance due</span>
              <span className="tnum flex-shrink-0 text-right font-semibold" style={{ color: 'var(--color-ink)' }}>{formatCurrency(Math.min(deposit, total), currencyCode)} → {formatCurrency(balance, currencyCode)}</span>
            </li>
          </ul>
          {errors.length > 0 ? (
            <ul className="mt-3 rounded-[10px] border p-3 text-[12.5px] font-medium" style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)' }} role="alert">
              {errors.map((e) => <li key={e}>• {e}</li>)}
            </ul>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => go({ view: 'reservations' })}>Cancel</button>
              <button type="button" disabled={choices.loading || availabilityResource.loading || submitting || !availabilityResult} className="pms-btn-primary flex-[2] px-4 py-2.5 disabled:opacity-50" onClick={() => { if (validate()) setConfirming(true); }}>Review & create</button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => { if (!submitting) setConfirming(false); }}
        onConfirm={() => { void createReservation(); }}
        title="Create this reservation?"
        body={`${guestName || 'Guest not selected'} · ${roomType || 'Room type'} × ${rooms}${selectedRooms.length > 0 ? ` (${selectedRooms.join(', ')})` : ''} · ${nights} night${nights === 1 ? '' : 's'} · estimate ${formatCurrency(total, currencyCode)} via ${source}.`}
        confirmLabel={submitting ? 'Creating…' : 'Create reservation'}
        busy={submitting}
        autoClose={false}
      />
    </div>
  );
}
