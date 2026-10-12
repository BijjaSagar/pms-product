import { useMemo, useState } from 'react';
import { PROPERTY, ROOM_TYPES, formatMoney } from '../data/mock';
import { Card, CardTitle } from '../components/ui';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { ConfirmDialog } from '../components/overlays';
import { toast } from '../components/toastStore';
import type { NavTarget } from '../components/nav';

export function WalkIn({ go }: { go: (t: NavTarget) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nights, setNights] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomType, setRoomType] = useState('Deluxe');
  const [roomNo, setRoomNo] = useState<string | null>(null);
  const [method, setMethod] = useState('Card');
  const [deposit, setDeposit] = useState(150);
  const [requests, setRequests] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const type = ROOM_TYPES.find((t) => t.name === roomType) ?? ROOM_TYPES[0];
  const ready = useMemo(
    () => [
      { number: '207', type: 'Deluxe', rate: 186, ready: true },
      { number: '210', type: 'Deluxe', rate: 186, ready: true },
      { number: '101', type: 'Standard', rate: 129, ready: true },
      { number: '104', type: 'Standard', rate: 129, ready: true },
      { number: '302', type: 'Family', rate: 233, ready: true },
      { number: '309', type: 'Family', rate: 233, ready: true },
      { number: '505', type: 'Suite', rate: 360, ready: true },
      { number: '502', type: 'Suite', rate: 360, ready: true },
    ].filter((r) => r.type === roomType),
    [roomType],
  );

  const room = ready.find((r) => r.number === roomNo) ?? null;
  const roomCharges = (room?.rate ?? type.baseRate) * nights;
  const tax = Math.round(roomCharges * (PROPERTY.taxRate / 100));
  const total = roomCharges + tax;
  const balance = total - Math.min(deposit, total);

  const validate = () => {
    const errs: string[] = [];
    if (name.trim().length < 2) errs.push('Guest name is required.');
    if (phone.trim().length < 6) errs.push('Contact phone is required.');
    if (nights < 1) errs.push('Stay must be at least 1 night.');
    if (adults + children > type.maxOccupancy) errs.push(`${type.name} holds max ${type.maxOccupancy} guests.`);
    if (!room) errs.push('Select an available ready room.');
    if (deposit < 0 || deposit > total) errs.push('Deposit must be between $0 and the total.');
    setErrors(errs);
    return errs.length === 0;
  };

  if (done) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full text-[24px] font-bold" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }} aria-hidden="true">✓</span>
          <h3 className="pms-section-title">{name.trim()} is registered</h3>
          <p className="tnum text-[13.5px]" style={{ color: 'var(--color-ink-secondary)' }}>Room {roomNo} · {nights} night(s) · ${formatMoney(total)} · demo record only.</p>
          <button type="button" className="pms-btn-primary mt-2 px-4 py-2.5" onClick={() => go({ view: 'check-in' })}>Back to check-in desk</button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <div className="flex flex-col gap-4 xl:col-span-3">
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
          <CardTitle title="Available ready rooms" subtitle="Inspected stock only — tonight" />
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Room type">
            {ROOM_TYPES.filter((t) => t.active).map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={roomType === t.name} onClick={() => { setRoomType(t.name); setRoomNo(null); }} className="rounded-[10px] border p-2.5 text-left" style={{ borderColor: roomType === t.name ? 'var(--color-primary)' : 'var(--color-border)', background: roomType === t.name ? 'var(--color-hover-surface)' : 'var(--color-surface)' }}>
                <span className="block text-[13px] font-semibold" style={{ color: 'var(--color-ink)' }}>{t.name}</span>
                <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>${t.baseRate}/night</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Ready rooms">
            {ready.map((r) => (
              <button key={r.number} type="button" role="radio" aria-checked={roomNo === r.number} onClick={() => setRoomNo(r.number)} className="rounded-[10px] border p-3 text-left" style={{ borderColor: roomNo === r.number ? 'var(--color-primary)' : 'var(--color-border)', background: roomNo === r.number ? 'var(--color-hover-surface)' : 'var(--color-surface)' }}>
                <span className="tnum block text-[17px] font-semibold" style={{ color: 'var(--color-ink)' }}>{r.number}</span>
                <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>${r.rate}/night · ready</span>
              </button>
            ))}
            {ready.length === 0 ? <p className="pms-helper col-span-full">No ready rooms of this type in the demo sample.</p> : null}
          </div>
        </Card>
        <Card>
          <CardTitle title="Payment & requests" subtitle="Simulated — no real charge" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Payment method">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass()}>{['Card', 'Cash', 'Transfer'].map((m) => <option key={m}>{m}</option>)}</select>
            </Field>
            <Field label="Deposit ($)"><input type="number" min={0} value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} className={inputClass('tnum')} /></Field>
            <Field label="Special requests"><input value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="Quiet side…" className={inputClass()} /></Field>
          </div>
        </Card>
      </div>
      <div className="xl:col-span-2">
        <Card>
          <CardTitle title="Registration summary" subtitle="Review before completing" />
          <ul className="text-[13.5px]">
            {[
              [`Room ${roomNo ?? '—'} · ${type.name} × ${nights}n`, `$${formatMoney(roomCharges)}`],
              [`Taxes (${PROPERTY.taxRate}%)`, `$${formatMoney(tax)}`],
            ].map(([k, v]) => (
              <li key={k} className="flex justify-between border-b py-2" style={{ borderColor: 'var(--color-divider)' }}>
                <span style={{ color: 'var(--color-ink-secondary)' }}>{k}</span>
                <span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>{v}</span>
              </li>
            ))}
            <li className="flex justify-between py-2.5"><span className="font-semibold" style={{ color: 'var(--color-ink)' }}>Total</span><span className="tnum text-[18px] font-semibold" style={{ color: 'var(--color-ink)' }}>${formatMoney(total)}</span></li>
            <li className="flex justify-between"><span style={{ color: 'var(--color-ink-secondary)' }}>Deposit → balance</span><span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>${formatMoney(Math.min(deposit, total))} → ${formatMoney(balance)}</span></li>
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
        onConfirm={() => { setDone(true); toast('Walk-in registered (demo)', { detail: 'Local record only.' }); }}
        title="Complete walk-in registration?"
        body={`${name.trim()} · Room ${roomNo} · ${nights} night(s) · $${formatMoney(total)} via ${method}.`}
        confirmLabel="Register guest"
      />
    </div>
  );
}
