import { useMemo, useState } from 'react';
import { RESERVATIONS, ROOMS, formatMoney } from '../data/mock';
import type { Reservation } from '../data/mock';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { reservationTone, roomTone } from '../components/status';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { toast } from '../components/toastStore';

const STEPS = ['Find', 'Verify', 'Guests', 'Room', 'Payment', 'Review', 'Done'] as const;

function eligibleRooms(roomType: string) {
  return ROOMS.filter((r) => r.type === roomType && (r.status === 'Available' || r.status === 'Inspected'));
}

export function CheckIn() {
  const [q, setQ] = useState('');
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
    return RESERVATIONS.filter(
      (r) =>
        ['Confirmed', 'Pending'].includes(r.status) &&
        !doneIds.includes(r.id) &&
        (!needle || r.guest.toLowerCase().includes(needle) || r.id.toLowerCase().includes(needle)),
    );
  }, [q, doneIds]);

  const current = RESERVATIONS.find((r) => r.id === resId) ?? null;
  const options = current ? eligibleRooms(current.roomType) : [];
  const room = ROOMS.find((r) => r.number === roomNo) ?? null;
  const balance = current ? current.total - current.paid : 0;

  const pick = (r: Reservation) => {
    setResId(r.id);
    setStep(1);
    setIdChecked(false);
    setAdults(r.adults);
    setChildren(r.children);
    setRoomNo(r.roomNumber && eligibleRooms(r.roomType).some((x) => x.number === r.roomNumber) ? r.roomNumber : null);
    setDepositOk(r.paid > 0);
  };

  const reset = () => {
    setResId(null);
    setStep(0);
    setQ('');
    setRoomNo(null);
  };

  const complete = () => {
    if (current) setDoneIds((d) => [...d, current.id]);
    setStep(6);
    toast('Checked in (demo)', { detail: `${current?.guest} marked checked-in on this screen.` });
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardTitle title="1 · Find reservation" subtitle="Today's expected arrivals" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Booking ID, name or confirmation…" aria-label="Find reservation" className={inputClass() + ' mb-3'} />
        <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
          {arrivals.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => pick(r)}
                aria-pressed={resId === r.id}
                className="flex w-full items-center gap-3 rounded-[10px] border p-3 text-left"
                style={{ borderColor: resId === r.id ? 'var(--color-primary)' : 'var(--color-border)', background: resId === r.id ? 'var(--color-hover-surface)' : 'var(--color-surface)' }}
              >
                <Avatar name={r.guest} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{r.guest}</span>
                  <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{r.id} · {r.roomType} · {r.nights}n</span>
                </span>
                <Badge tone={reservationTone(r.status)}>{r.status}</Badge>
              </button>
            </li>
          ))}
          {arrivals.length === 0 ? <p className="pms-helper py-4 text-center">No matching arrivals. Try “Walk-in Guests” for registration without a booking.</p> : null}
        </ul>
      </Card>

      <Card className="xl:col-span-3">
        <ol className="mb-4 flex flex-wrap gap-1.5" aria-label="Check-in progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: i <= step ? 'var(--color-ink)' : 'var(--color-ink-muted)' }} aria-current={i === step ? 'step' : undefined}>
              <span className="tnum flex h-5 w-5 items-center justify-center rounded-full border" style={{ borderColor: i <= step ? 'var(--color-primary)' : 'var(--color-border)', background: i < step ? 'var(--color-primary)' : 'transparent', color: i < step ? 'var(--color-primary-foreground)' : 'inherit' }}>{i < step ? '✓' : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

        {!current ? (
          <p className="pms-helper py-10 text-center">Select an arrival on the left to begin the 7-step check-in.</p>
        ) : step === 6 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full text-[24px] font-bold" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }} aria-hidden="true">✓</span>
            <h3 className="pms-section-title">{current.guest} is checked in</h3>
            <p className="tnum text-[13.5px]" style={{ color: 'var(--color-ink-secondary)' }}>Room {roomNo} · key packet prepared · demo record only.</p>
            <button type="button" className="pms-btn-primary mt-2 px-4 py-2.5" onClick={reset}>Next arrival</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {step === 1 && (
              <div>
                <h3 className="pms-section-title mb-2">2 · Verify guest details</h3>
                <div className="grid grid-cols-1 gap-2 text-[13.5px] sm:grid-cols-2">
                  {[['Guest', current.guest], ['Contact', 'On file — verify at desk'], ['Stay', `${current.checkIn} → ${current.checkOut} · ${current.nights}n`], ['Booked via', `${current.channel} · ${current.ratePlan}`]].map(([k, v]) => (
                    <div key={k} className="rounded-[10px] border p-3" style={{ borderColor: 'var(--color-border)' }}>
                      <p className="pms-helper">{k}</p>
                      <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>{v}</p>
                    </div>
                  ))}
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13.5px]" style={{ color: 'var(--color-ink)' }}>
                  <input type="checkbox" checked={idChecked} onChange={(e) => setIdChecked(e.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
                  Photo ID verified at the desk (required)
                </label>
                {!idChecked ? <p className="pms-helper mt-1">You cannot continue until ID is verified.</p> : null}
              </div>
            )}
            {step === 2 && (
              <div>
                <h3 className="pms-section-title mb-2">3 · Confirm party & dates</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Adults"><input type="number" min={1} max={6} value={adults} onChange={(e) => setAdults(Number(e.target.value))} className={inputClass('tnum')} /></Field>
                  <Field label="Children"><input type="number" min={0} max={4} value={children} onChange={(e) => setChildren(Number(e.target.value))} className={inputClass('tnum')} /></Field>
                </div>
                <p className="pms-helper mt-2">Booked: {current.adults} adult(s){current.children ? `, ${current.children} child(ren)` : ''} · {current.checkIn} → {current.checkOut}.</p>
              </div>
            )}
            {step === 3 && (
              <div>
                <h3 className="pms-section-title mb-1">4 · Select a ready room</h3>
                <p className="pms-helper mb-3">Only inspected or available {current.roomType} rooms are shown. Dirty, cleaning and out-of-service rooms are never offered.</p>
                {options.length === 0 ? (
                  <p className="rounded-[10px] border p-3 text-[13px] font-medium" style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)' }} role="alert">
                    No ready {current.roomType} rooms right now — escalate to a supervisor or offer an upgrade.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Ready rooms">
                    {options.map((r) => (
                      <button key={r.number} type="button" role="radio" aria-checked={roomNo === r.number} onClick={() => setRoomNo(r.number)} className="rounded-[10px] border p-3 text-left" style={{ borderColor: roomNo === r.number ? 'var(--color-primary)' : 'var(--color-border)', background: roomNo === r.number ? 'var(--color-hover-surface)' : 'var(--color-surface)' }}>
                        <span className="tnum block text-[17px] font-semibold" style={{ color: 'var(--color-ink)' }}>{r.number}</span>
                        <span className="mt-1 block"><Badge tone={roomTone(r.status)}>{r.status}</Badge></span>
                        <span className="tnum mt-1 block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>${r.rate}/night</span>
                      </button>
                    ))}
                  </div>
                )}
                <h4 className="pms-label mb-1 mt-4">All {current.roomType} rooms (reference)</h4>
                <div className="flex flex-wrap gap-1.5">
                  {ROOMS.filter((r) => r.type === current.roomType).map((r) => (
                    <span key={r.number} className="tnum rounded-full border px-2.5 py-1 text-[11.5px]" style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink-secondary)' }}>{r.number} · {r.status}</span>
                  ))}
                </div>
              </div>
            )}
            {step === 4 && (
              <div>
                <h3 className="pms-section-title mb-2">5 · Payment & deposit</h3>
                <ul className="text-[13.5px]">
                  <li className="flex justify-between border-b py-2" style={{ borderColor: 'var(--color-divider)' }}><span style={{ color: 'var(--color-ink-secondary)' }}>Stay total</span><span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>${formatMoney(current.total)}</span></li>
                  <li className="flex justify-between border-b py-2" style={{ borderColor: 'var(--color-divider)' }}><span style={{ color: 'var(--color-ink-secondary)' }}>Already paid</span><span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>${formatMoney(current.paid)}</span></li>
                  <li className="flex justify-between py-2"><span className="font-semibold" style={{ color: 'var(--color-ink)' }}>Balance due</span><span className="tnum font-semibold" style={{ color: balance > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>${formatMoney(balance)}</span></li>
                </ul>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-[13.5px]" style={{ color: 'var(--color-ink)' }}>
                  <input type="checkbox" checked={depositOk} onChange={(e) => setDepositOk(e.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
                  Deposit / card pre-authorisation taken (required)
                </label>
              </div>
            )}
            {step === 5 && (
              <div>
                <h3 className="pms-section-title mb-2">6 · Review registration</h3>
                <dl className="grid grid-cols-1 gap-2 text-[13.5px] sm:grid-cols-2">
                  {[['Guest', current.guest], ['Party', `${adults} adult(s)${children ? `, ${children} child(ren)` : ''}`], ['Room', roomNo ? `${room?.type} ${roomNo}` : '— not selected —'], ['Dates', `${current.checkIn} → ${current.checkOut}`], ['Balance', `$${formatMoney(balance)}`], ['Requests', current.specialRequests || 'None']].map(([k, v]) => (
                    <div key={k} className="rounded-[10px] border p-3" style={{ borderColor: 'var(--color-border)' }}>
                      <dt className="pms-helper">{k}</dt>
                      <dd className="font-semibold" style={{ color: 'var(--color-ink)' }}>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" disabled={step === 1} onClick={() => setStep((s) => s - 1)} className="pms-btn-ghost flex-1 px-4 py-2.5 disabled:opacity-40">Back</button>
              {step < 5 ? (
                <button
                  type="button"
                  disabled={(step === 1 && !idChecked) || (step === 3 && !roomNo) || (step === 4 && !depositOk)}
                  onClick={() => setStep((s) => s + 1)}
                  className="pms-btn-primary flex-[2] px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                </button>
              ) : (
                <button type="button" disabled={!roomNo} onClick={complete} className="pms-btn-primary flex-[2] px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50">
                  Complete check-in
                </button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
