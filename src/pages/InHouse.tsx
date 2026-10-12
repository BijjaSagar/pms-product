import { useMemo, useState } from 'react';
import { RESERVATIONS, formatMoney } from '../data/mock';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { reservationTone } from '../components/status';
import { FilterChip } from '../components/controls';
import { inputClass } from '../components/inputClass';
import type { NavTarget } from '../components/nav';

export function InHouse({ go }: { go: (t: NavTarget) => void }) {
  const [q, setQ] = useState('');
  const [floor, setFloor] = useState('All');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return RESERVATIONS.filter(
      (r) =>
        r.status === 'Checked-in' &&
        (floor === 'All' || (r.roomNumber && Math.floor(Number(r.roomNumber) / 100) === Number(floor))) &&
        (!needle || r.guest.toLowerCase().includes(needle) || (r.roomNumber ?? '').includes(needle)),
    );
  }, [q, floor]);

  return (
    <Card>
      <CardTitle
        title="In-house guests"
        subtitle={`${rows.length} staying tonight`}
        action={<button type="button" onClick={() => go({ view: 'check-out' })} className="pms-btn-primary px-3.5 py-2.5">Check-out desk</button>}
      />
      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Guest name or room…" aria-label="Search in-house guests" className={inputClass()} />
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by floor">
          {['All', '1', '2', '3', '4', '5'].map((f) => (
            <FilterChip key={f} active={floor === f} onClick={() => setFloor(f)}>{f === 'All' ? 'All floors' : `Floor ${f}`}</FilterChip>
          ))}
        </div>
        <button type="button" className="pms-btn-ghost px-3 py-2.5" onClick={() => { setQ(''); setFloor('All'); }}>Clear</button>
      </div>
      <div className="overflow-x-auto">
        <table className="pms-table min-w-[680px]">
          <thead><tr><th>Guest</th><th>Room</th><th>Stay</th><th>Party</th><th>Status</th><th className="text-right">Balance</th><th><span className="sr-only">Open</span></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={r.guest} />
                    <span className="font-semibold">{r.guest}</span>
                  </span>
                </td>
                <td className="tnum">{r.roomNumber ?? r.roomType}</td>
                <td className="tnum" style={{ color: 'var(--color-ink-secondary)' }}>{r.checkIn} → {r.checkOut} · {r.nights}n</td>
                <td className="tnum" style={{ color: 'var(--color-ink-secondary)' }}>{r.adults + r.children}</td>
                <td><Badge tone={reservationTone(r.status)}>{r.status}</Badge></td>
                <td className="tnum text-right font-semibold">${formatMoney(r.total - r.paid)}</td>
                <td><button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => go({ view: 'guests', focusId: r.guestId })}>Profile</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="pms-helper py-6 text-center">No in-house guests match.</p> : null}
      </div>
    </Card>
  );
}
