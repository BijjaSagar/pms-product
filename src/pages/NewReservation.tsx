import { useMemo, useState } from 'react';
import { GUESTS, PROPERTY, ROOMS, ROOM_TYPES, formatMoney } from '../data/mock';
import { Badge, Card, CardTitle } from '../components/ui';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { ConfirmDialog } from '../components/overlays';
import { toast } from '../components/toastStore';
import { roomTone } from '../components/status';
import type { NavTarget } from '../components/nav';

const SOURCES = ['Direct', 'OTA', 'Corporate', 'Walk-in', 'Travel agent'];
const RATE_PLANS = ['Best available', 'Advance purchase', 'Corporate', 'Day rate'];
const SERVICES = [
  { name: 'Breakfast (per night)', price: 18 },
  { name: 'Airport transfer', price: 45 },
  { name: 'Evening turndown', price: 12 },
];

export function NewReservation({ go }: { go: (t: NavTarget) => void }) {
  const [guestChoice, setGuestChoice] = useState('existing');
  const [guestId, setGuestId] = useState(GUESTS[0].id);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [checkIn, setCheckIn] = useState('2026-10-14');
  const [checkOut, setCheckOut] = useState('2026-10-16');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomType, setRoomType] = useState(ROOM_TYPES[1].name);
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

  const type = ROOM_TYPES.find((t) => t.name === roomType) ?? ROOM_TYPES[0];
  const nights = useMemo(() => {
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 86400000)) : 0;
  }, [checkIn, checkOut]);

  const availability = Math.max(0, type.count - 40 - rooms * 3);
  const roomCharges = type.baseRate * nights * rooms;
  const extraCharges = extras.reduce((s, name) => {
    const svc = SERVICES.find((x) => x.name === name);
    if (!svc) return s;
    return s + (name.includes('per night') ? svc.price * nights * rooms : svc.price * rooms);
  }, 0);
  const subtotal = roomCharges + extraCharges;
  const clampedDiscount = Math.min(Math.max(0, discount), subtotal);
  const tax = Math.round((subtotal - clampedDiscount) * (PROPERTY.taxRate / 100));
  const total = subtotal - clampedDiscount + tax;
  const balance = total - Math.min(deposit, total);

  const FLOORS = [1, 2, 3, 4, 5];
  const isPickable = (r: (typeof ROOMS)[number]) =>
    r.type === roomType && (r.status === 'Available' || r.status === 'Inspected');
  const toggleRoom = (no: string) => {
    setSelectedRooms((prev) => {
      if (prev.includes(no)) return prev.filter((x) => x !== no);
      if (prev.length >= rooms) return prev;
      return [...prev, no];
    });
  };

  const validate = () => {
    const errs: string[] = [];
    if (guestChoice === 'new') {
      if (newName.trim().length < 2) errs.push('Guest name is required.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail.trim())) errs.push('A valid guest email is required.');
      if (newPhone.trim().length < 6) errs.push('A contact phone number is required.');
    }
    if (nights < 1) errs.push('Check-out must be after check-in (at least 1 night).');
    if (adults + children > type.maxOccupancy * rooms) errs.push(`${type.name} holds max ${type.maxOccupancy} per room — reduce guests or add rooms.`);
    if (availability <= 0) errs.push('No rooms of this type left for these dates in the demo inventory.');
    if (selectedRooms.length > 0 && selectedRooms.length !== rooms) errs.push(`Select ${rooms} room${rooms === 1 ? '' : 's'} on the blueprint — currently ${selectedRooms.length} picked.`);
    if (deposit < 0 || deposit > total) errs.push('Deposit must be between $0 and the total.');
    setErrors(errs);
    return errs.length === 0;
  };

  const guestName = guestChoice === 'existing' ? (GUESTS.find((g) => g.id === guestId)?.name ?? '') : newName.trim();

  if (done) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full text-[24px] font-bold" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }} aria-hidden="true">✓</span>
          <h3 className="pms-section-title">Reservation {done} drafted</h3>
          <p className="max-w-[440px] text-[13.5px]" style={{ color: 'var(--color-ink-secondary)' }}>
            {guestName} · {roomType} × {rooms}{selectedRooms.length > 0 ? ` (${selectedRooms.join(', ')})` : ''} · {nights} night{nights === 1 ? '' : 's'} · total <span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>${formatMoney(total)}</span>.
            This is a local demo draft — no inventory was reserved on a server.
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
      <div className="flex flex-col gap-4 xl:col-span-3">
        <Card>
          <CardTitle title="Guest" subtitle="Existing profile or inline registration" />
          <div className="mb-3 flex gap-2" role="radiogroup" aria-label="Guest source">
            {['existing', 'new'].map((m) => (
              <button key={m} type="button" role="radio" aria-checked={guestChoice === m} onClick={() => setGuestChoice(m)} className="rounded-full border px-4 py-2 text-[12.5px] font-semibold capitalize" style={{ borderColor: guestChoice === m ? 'var(--color-primary)' : 'var(--color-border)', background: guestChoice === m ? 'var(--color-primary)' : 'var(--color-surface)', color: guestChoice === m ? 'var(--color-primary-foreground)' : 'var(--color-ink-secondary)' }}>
                {m === 'existing' ? 'Existing guest' : 'New guest'}
              </button>
            ))}
          </div>
          {guestChoice === 'existing' ? (
            <Field label="Guest">
              <select value={guestId} onChange={(e) => setGuestId(e.target.value)} className={inputClass()}>
                {GUESTS.map((g) => <option key={g.id} value={g.id}>{g.name} · {g.tier} · {g.stays} stays</option>)}
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
            <Field label="Check-in"><input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputClass('tnum')} /></Field>
            <Field label="Check-out"><input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={inputClass('tnum')} /></Field>
            <Field label="Adults"><input type="number" min={1} max={8} value={adults} onChange={(e) => setAdults(Number(e.target.value))} className={inputClass('tnum')} /></Field>
            <Field label="Children"><input type="number" min={0} max={6} value={children} onChange={(e) => setChildren(Number(e.target.value))} className={inputClass('tnum')} /></Field>
            <Field label="Room type">
              <select
                value={roomType}
                onChange={(e) => {
                  const next = e.target.value;
                  setRoomType(next);
                  setSelectedRooms((prev) =>
                    prev.filter((no) => {
                      const r = ROOMS.find((x) => x.number === no);
                      return r && r.type === next && (r.status === 'Available' || r.status === 'Inspected');
                    }),
                  );
                }}
                className={inputClass()}
              >
                {ROOM_TYPES.filter((t) => t.active).map((t) => <option key={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Rooms">
              <input
                type="number"
                min={1}
                max={6}
                value={rooms}
                onChange={(e) => {
                  const next = Math.min(6, Math.max(1, Number(e.target.value) || 1));
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
            <Field label="Discount ($)" hint={`Max ${type.maxOccupancy}/room`}>
              <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className={inputClass('tnum')} />
            </Field>
          </div>
          <div className="mt-3 rounded-[10px] border p-3 text-[13px]" style={{ borderColor: 'var(--color-border)', background: availability > 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)' }}>
            <span className="font-semibold" style={{ color: availability > 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>
              {availability > 0 ? `${availability} ${roomType} rooms available` : `No ${roomType} rooms left`} for {nights} night{nights === 1 ? '' : 's'}
            </span>
            <span style={{ color: 'var(--color-ink-secondary)' }}> · demo availability, not live inventory.</span>
          </div>
          <div className="mt-4">
            <p className="pms-label mb-1">Choose rooms — mini blueprint</p>
            <p className="pms-helper mb-2">
              {selectedRooms.length} of {rooms} picked{selectedRooms.length > 0 ? `: ${selectedRooms.join(', ')}` : ''} · only {roomType} rooms that are Available or Inspected can be picked · demo sample, not full inventory.
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Room status legend">
              {['Available', 'Inspected', 'Occupied', 'Dirty', 'Cleaning', 'Out-of-service'].map((s) => (
                <Badge key={s} tone={roomTone(s as never)}>{s}</Badge>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              {FLOORS.map((f) => {
                const floorRooms = ROOMS.filter((r) => r.floor === f);
                if (floorRooms.length === 0) return null;
                return (
                  <div key={f} className="rounded-[10px] border p-2.5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--color-ink-secondary)' }}>
                      Floor {f} · {floorRooms.length} rooms in sample
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
                      {floorRooms.map((r) => {
                        const pickable = isPickable(r);
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
                            className="rounded-[10px] border p-2 text-center transition-all duration-150 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:hover:translate-y-0"
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
          <CardTitle title="Services & payment" subtitle="Extras, source and deposit" />
          <fieldset>
            <legend className="pms-label mb-2">Extra services</legend>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s) => {
                const on = extras.includes(s.name);
                return (
                  <button key={s.name} type="button" aria-pressed={on} onClick={() => setExtras((p) => (on ? p.filter((x) => x !== s.name) : [...p, s.name]))} className="rounded-full border px-3 py-2 text-[12.5px] font-semibold" style={{ borderColor: on ? 'var(--color-primary)' : 'var(--color-border)', background: on ? 'var(--color-hover-surface)' : 'var(--color-surface)', color: on ? 'var(--color-ink)' : 'var(--color-ink-secondary)' }}>
                    {s.name} · <span className="tnum">${s.price}</span>
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
            <Field label="Deposit ($)">
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

      <div className="xl:col-span-2">
        <Card>
          <CardTitle title="Price breakdown" subtitle="Calculated locally from mock rates" />
          <ul className="text-[13.5px]">
            {selectedRooms.length > 0 ? (
              <li className="flex justify-between border-b py-2" style={{ borderColor: 'var(--color-divider)' }}>
                <span style={{ color: 'var(--color-ink-secondary)' }}>Picked rooms</span>
                <span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>{selectedRooms.join(', ')}</span>
              </li>
            ) : null}
            {[
              [`Room — ${type.name} × ${nights}n × ${rooms}`, `$${formatMoney(roomCharges)}`],
              [`Extras (${extras.length || 'none'})`, `$${formatMoney(extraCharges)}`],
              ['Discount', `−$${formatMoney(clampedDiscount)}`],
              [`Taxes (${PROPERTY.taxRate}%)`, `$${formatMoney(tax)}`],
            ].map(([k, v]) => (
              <li key={k} className="flex justify-between border-b py-2" style={{ borderColor: 'var(--color-divider)' }}>
                <span style={{ color: 'var(--color-ink-secondary)' }}>{k}</span>
                <span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>{v}</span>
              </li>
            ))}
            <li className="flex justify-between py-2.5">
              <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>Total</span>
              <span className="tnum text-[18px] font-semibold" style={{ color: 'var(--color-ink)' }}>${formatMoney(total)}</span>
            </li>
            <li className="flex justify-between">
              <span style={{ color: 'var(--color-ink-secondary)' }}>Deposit → balance due</span>
              <span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>${formatMoney(Math.min(deposit, total))} → ${formatMoney(balance)}</span>
            </li>
          </ul>
          {errors.length > 0 ? (
            <ul className="mt-3 rounded-[10px] border p-3 text-[12.5px] font-medium" style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)' }} role="alert">
              {errors.map((e) => <li key={e}>• {e}</li>)}
            </ul>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => go({ view: 'reservations' })}>Cancel</button>
            <button type="button" className="pms-btn-primary flex-[2] px-4 py-2.5" onClick={() => { if (validate()) setConfirming(true); }}>Review & create</button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => { setDone(`RSV-${9051 + Math.floor(Math.random() * 40)}`); toast('Reservation drafted (demo)', { detail: 'Local draft only — nothing reserved remotely.' }); }}
        title="Create this reservation?"
        body={`${guestName} · ${roomType} × ${rooms}${selectedRooms.length > 0 ? ` (${selectedRooms.join(', ')})` : ''} · ${nights} nights · total $${formatMoney(total)} via ${source}.`}
        confirmLabel="Create reservation"
      />
    </div>
  );
}
