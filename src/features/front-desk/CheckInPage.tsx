import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import type { Reservation } from '../../types';
import { Avatar, Badge, Card, CardTitle } from '../../components/ui';
import { reservationTone, roomTone } from '../../components/status';
import { Field } from '../../components/controls';
import { inputClass } from '../../components/inputClass';
import { toast } from '../../components/toastStore';
import { frontDeskApi, inventoryApi, reservationApi } from '../../lib/api/pms';
import { reservationFromApi, roomFromApi, roomTypeFromApi } from '../../lib/api/adapters';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { formatCurrency } from '../../lib/api/format';

const STEPS = ['Find stay', 'Verify ID', 'Guests', 'Room', 'Balance', 'Review', 'Complete'] as const;

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
        roomTypeName: detail.roomTypeName ?? roomType?.name,
        roomLines: detail.roomLines?.map((line) => ({ ...line, roomTypeName: roomTypes.find((item) => item.id === line.roomTypeId)?.name })) ?? [],
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
  const [roomAssignments, setRoomAssignments] = useState<Record<string, string>>({});
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
  const roomLines = current?.roomLines?.length
    ? current.roomLines
    : current ? [{ id: `legacy-${current.backendId ?? current.id}`, roomTypeId: current.roomTypeId ?? '', roomNumber: current.roomNumber, roomTypeName: current.roomType }] : [];
  const roomOptions = (lineId: string, roomTypeId: string) => {
    const selectedElsewhere = new Set(Object.entries(roomAssignments)
      .filter(([selectedLineId, selectedRoomNo]) => selectedLineId !== lineId && selectedRoomNo)
      .map(([, selectedRoomNo]) => selectedRoomNo));
    return rooms.filter((candidate) => candidate.roomTypeId === roomTypeId
      && ['Available', 'Inspected'].includes(candidate.status)
      && (!selectedElsewhere.has(candidate.number) || roomAssignments[lineId] === candidate.number));
  };
  const selectedRoomNumbers = roomLines.map((line) => roomAssignments[line.id] || line.roomNumber).filter(Boolean);
  const uniqueAssignments = new Set(selectedRoomNumbers).size === selectedRoomNumbers.length;
  const allRoomsAssigned = uniqueAssignments && roomLines.every((line) => {
    const selectedNo = roomAssignments[line.id] || line.roomNumber;
    const selectedRoom = rooms.find((candidate) => candidate.number === selectedNo);
    return Boolean(selectedRoom && selectedRoom.roomTypeId === line.roomTypeId && ['Available', 'Inspected'].includes(selectedRoom.status));
  });
  const balance = current ? current.total - current.paid : 0;

  const pick = (r: Reservation) => {
    setResId(r.id);
    setStep(1);
    setIdChecked(false);
    setAdults(r.adults);
    setChildren(r.children);
    const assignments = Object.fromEntries((r.roomLines ?? []).map((line) => [line.id, line.roomNumber ?? '']));
    if (!(r.roomLines?.length)) assignments[`legacy-${r.backendId ?? r.id}`] = r.roomNumber ?? '';
    setRoomAssignments(assignments);
    setDepositOk(true);
  };

  const reset = () => {
    setResId(null);
    setStep(0);
    setQ('');
    setRoomAssignments({});
    resource.refresh();
  };

  const complete = async () => {
    if (!current?.backendId) return;
    const assignments = roomLines.map((line) => ({
      line,
      room: rooms.find((candidate) => candidate.number === (roomAssignments[line.id] || line.roomNumber)),
    }));
    if (assignments.some((assignment) => !assignment.room?.backendId
      || !['Available', 'Inspected'].includes(assignment.room.status)
      || assignment.room.roomTypeId !== assignment.line.roomTypeId)) {
      toast('Assign every room', { detail: 'Choose an available room for each room line before completing check-in.', tone: 'danger' });
      return;
    }
    try {
      for (const assignment of assignments) {
        const selectedRoom = assignment.room!;
        const selectedRoomId = selectedRoom.backendId;
        if (!selectedRoomId) throw new Error(`Room ${selectedRoom.number} is missing its inventory ID.`);
        if (assignment.line.roomNumber !== selectedRoom.number) {
          await reservationApi.assignRoom(current.backendId, selectedRoomId, assignment.line.id.startsWith('legacy-') ? undefined : assignment.line.id);
        }
      }
      await frontDeskApi.checkIn(current.backendId);
      setDoneIds((ids) => [...ids, current.id]);
      setStep(6);
      toast('Guest checked in', { detail: `${current.guest} · Rooms ${assignments.map(({ room: assignedRoom }) => assignedRoom!.number).join(', ')}.`, tone: 'success' });
    } catch (error) {
      toast('Check-in failed', { detail: displayApiError(error), tone: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-success-text to-success-border text-white shadow-xs shadow-success-text/20 mt-0.5">
            <Lucide.LogIn size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[26px] font-bold tracking-tight text-ink leading-tight">
                Guest Check-in
              </h1>
              <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-[10px] font-bold text-success-text border border-success-border/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-text opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-text"></span>
                </span>
                Terminal Active
              </span>
            </div>
            <p className="text-xs text-ink-secondary mt-1">
              Verify each guest, assign a ready room, and complete check-in.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl border border-border bg-surface text-ink shadow-2xs flex items-center gap-1.5">
            <Lucide.Users size={14} className="text-success-text" />
            <span>{arrivals.length} arrival{arrivals.length === 1 ? '' : 's'} due</span>
          </span>
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-surface text-ink hover:bg-page shadow-2xs cursor-pointer transition-colors"
            title="Refresh arrivals"
          >
            <Lucide.RefreshCw size={13} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-5">
        {resource.error ? (
          <div className="xl:col-span-5 flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-4 text-sm text-danger-text">
            <Lucide.AlertCircle size={18} />
            <span>Could not load arrivals: {resource.error}</span>
          </div>
        ) : null}

      {/* Left Column: Arrival Queue */}
      <Card className="xl:col-span-2">
        <CardTitle
          icon={Lucide.Users}
          iconBg="bg-gradient-to-tr from-success-text to-success-border text-white shadow-xs shadow-success-text/20"
          title="Arrival queue"
          subtitle={resource.loading ? 'Loading arrivals…' : `${arrivals.length} ${arrivals.length === 1 ? 'guest is' : 'guests are'} waiting to check in`}
          badge={
            <span className="flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-bold text-success-text border border-success-border/60">
              {arrivals.length} Due
            </span>
          }
        />
        <div className="relative mb-3">
          <Lucide.Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by guest or booking ID…"
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
                  <span className="block truncate text-sm font-semibold text-ink">{r.guest}</span>
                  <span className="tnum block text-xs leading-relaxed text-ink-secondary">
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
              <p className="text-sm font-semibold text-ink">{q.trim() ? 'No matching arrivals' : 'No arrivals waiting'}</p>
              <p className="pms-helper mt-1">
                {q.trim() ? 'Try another guest name or booking ID.' : 'New arrivals will appear here when they are ready to check in.'}
              </p>
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
            <p className="text-base font-semibold tracking-tight text-ink">Select an arrival</p>
            <p className="pms-helper mt-1">Choose a guest from the arrival queue to begin check-in.</p>
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
            <h3 className="text-xl font-bold tracking-tight text-ink">{current.guest} is checked in</h3>
            <p className="tnum text-sm text-ink-secondary">
              Assigned {roomLines.length === 1 ? 'room' : 'rooms'} {roomLines.map((line) => roomAssignments[line.id] || line.roomNumber).filter(Boolean).join(', ')} · Check-in complete
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
                <h3 className="mb-3 text-lg font-semibold tracking-tight text-ink">Verify guest identity</h3>
                <div className="grid grid-cols-1 gap-2.5 text-[13.5px] sm:grid-cols-2">
                  {[
                    ['Guest', current.guest],
                    ['Contact details', 'Available in the reservation record'],
                    ['Stay dates', `${current.checkIn} → ${current.checkOut} (${current.nights} nights)`],
                    ['Booking source', `${current.channel} · ${current.ratePlan}`],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-xl border p-3"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      <p className="text-xs font-medium text-ink-secondary">{k}</p>
                      <p className="mt-0.5 text-sm font-semibold text-ink">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border p-3.5 bg-ink/[0.02]" style={{ borderColor: 'var(--color-border)' }}>
                  <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-ink">
                    <input
                      type="checkbox"
                      checked={idChecked}
                      onChange={(e) => setIdChecked(e.target.checked)}
                      className="h-4 w-4 accent-[var(--color-primary)] rounded"
                    />
                    <span>Government-issued photo ID or passport verified in person</span>
                  </label>
                  {!idChecked ? (
                    <p className="pms-helper mt-1 pl-6 text-warning-text">Verify the guest’s ID before issuing room keys.</p>
                  ) : null}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold tracking-tight text-ink">Confirm guests and stay</h3>
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
                  Reservation: {current.adults} adult{current.adults === 1 ? '' : 's'}{current.children ? ` · ${current.children} child${current.children === 1 ? '' : 'ren'}` : ''} · {current.checkIn} to {current.checkOut}.
                </p>
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 className="mb-1 text-lg font-semibold tracking-tight text-ink">Choose a ready room</h3>
                <p className="pms-helper mb-3 text-xs">
                  Select an available, inspected room for each room in this reservation.
                </p>
                <div className="flex flex-col gap-4">
                  {roomLines.map((line, index) => {
                    const options = roomOptions(line.id, line.roomTypeId);
                    const selectedRoomNo = roomAssignments[line.id] || '';
                    return <section key={line.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="mb-2 flex items-center justify-between gap-2"><div><p className="text-sm font-semibold text-ink">Room {index + 1} · {line.roomTypeName ?? current.roomType}</p><p className="text-xs text-ink-secondary">{line.roomNumber ? `Currently assigned: ${line.roomNumber}` : 'No room assigned yet'}</p></div><span className="text-xs font-medium text-ink-secondary">{selectedRoomNo ? `Selected: ${selectedRoomNo}` : 'Select a room'}</span></div>
                      {options.length === 0 ? <div className="rounded-lg border border-danger-border bg-danger-bg p-3 text-xs leading-relaxed text-danger-text" role="alert"><span className="font-semibold">No ready {line.roomTypeName ?? current.roomType} rooms available.</span> Check housekeeping or choose another room type.</div> :
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label={`Ready rooms for reservation room ${index + 1}`}>
                          {options.map((candidate) => <button
                            key={candidate.number}
                            type="button"
                            role="radio"
                            aria-checked={selectedRoomNo === candidate.number}
                            onClick={() => {
                              const next = { ...roomAssignments, [line.id]: candidate.number };
                              setRoomAssignments(next);
                            }}
                            className="rounded-xl border p-3 text-left transition-all hover:scale-[1.02]"
                            style={{
                              borderColor: selectedRoomNo === candidate.number ? 'var(--color-primary)' : 'var(--color-border)',
                              background: selectedRoomNo === candidate.number ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' : 'var(--color-surface)',
                              boxShadow: selectedRoomNo === candidate.number ? '0 0 0 1px var(--color-primary)' : 'none',
                            }}
                          >
                            <span className="tnum block text-lg font-semibold text-ink">Room {candidate.number}</span>
                            <span className="mt-1 block"><Badge tone={roomTone(candidate.status)}>{candidate.status}</Badge></span>
                            <span className="tnum mt-1 block text-xs text-ink-secondary">Floor {candidate.floor} · {formatCurrency(candidate.rate, current.currencyCode)}/night</span>
                          </button>)}
                        </div>}
                    </section>;
                  })}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold tracking-tight text-ink">Review folio balance and deposit</h3>
                <ul className="rounded-xl border overflow-hidden text-[13.5px]" style={{ borderColor: 'var(--color-border)' }}>
                  <li className="pms-summary-row border-b px-3.5 py-2.5" style={{ borderColor: 'var(--color-divider)' }}>
                    <span className="text-ink-secondary">Stay Total</span>
                    <span className="tnum font-semibold text-ink">{formatCurrency(current.total, current.currencyCode)}</span>
                  </li>
                  <li className="pms-summary-row border-b px-3.5 py-2.5" style={{ borderColor: 'var(--color-divider)' }}>
                    <span className="text-ink-secondary">Prepayments Received</span>
                    <span className="tnum font-semibold text-success-text">{formatCurrency(current.paid, current.currencyCode)}</span>
                  </li>
                  <li className="pms-summary-row px-3.5 py-3" style={{ background: 'var(--color-muted-surface)' }}>
                    <span className="font-bold text-[14px] text-ink">Balance due at departure</span>
                    <span
                      className="tnum font-bold text-[18px]"
                      style={{ color: balance > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}
                    >
                      {formatCurrency(balance, current.currencyCode)}
                    </span>
                  </li>
                </ul>
                <div className="mt-3 rounded-xl border p-3.5 bg-ink/[0.02]" style={{ borderColor: 'var(--color-border)' }}>
                  <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-ink">
                    <input
                      type="checkbox"
                      checked={depositOk}
                      onChange={(e) => setDepositOk(e.target.checked)}
                      className="h-4 w-4 accent-[var(--color-primary)] rounded"
                    />
                    <span>Card pre-authorization or incidental deposit secured</span>
                  </label>
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold tracking-tight text-ink">Review check-in details</h3>
                <dl className="grid grid-cols-1 gap-2.5 text-[13.5px] sm:grid-cols-2">
                  {[
                    ['Guest', current.guest],
                    ['Guests', `${adults} adult${adults === 1 ? '' : 's'}${children ? ` · ${children} child${children === 1 ? '' : 'ren'}` : ''}`],
                    ['Assigned rooms', roomLines.map((line) => `${line.roomTypeName ?? current.roomType}: ${roomAssignments[line.id] || line.roomNumber || 'not selected'}`).join(' · ')],
                    ['Stay dates', `${current.checkIn} → ${current.checkOut}`],
                    ['Folio balance', formatCurrency(balance, current.currencyCode)],
                    ['Special requests', current.specialRequests || 'None'],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-xl border p-3"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      <dt className="text-xs font-medium text-ink-secondary">{k}</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-ink">{v}</dd>
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
                  disabled={(step === 1 && !idChecked) || (step === 3 && !allRoomsAssigned) || (step === 4 && !depositOk)}
                  onClick={() => setStep((s) => s + 1)}
                  className="pms-btn-primary flex-[2] flex items-center justify-center gap-1.5 px-4 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>Continue</span>
                  <Lucide.ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!allRoomsAssigned}
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
