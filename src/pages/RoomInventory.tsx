import { useMemo, useState } from 'react';
import { ROOMS } from '../data/mock';
import { Badge, Card, CardTitle } from '../components/ui';
import { roomTone } from '../components/status';
import { inputClass } from '../components/inputClass';

export function RoomInventory() {
  const [q, setQ] = useState('');
  const [floor, setFloor] = useState('All');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ROOMS.filter(
      (r) => (floor === 'All' || r.floor === Number(floor)) && (!needle || r.number.includes(needle) || r.type.toLowerCase().includes(needle) || (r.guest ?? '').toLowerCase().includes(needle)),
    );
  }, [q, floor]);

  return (
    <Card>
      <CardTitle title="Room inventory" subtitle={`${rows.length} sample rooms · full 159-room register lives with the property system`} />
      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Number, type or guest…" aria-label="Search inventory" className={inputClass()} />
        <select value={floor} onChange={(e) => setFloor(e.target.value)} aria-label="Filter by floor" className={inputClass()}>
          {['All', '1', '2', '3', '4', '5'].map((f) => <option key={f} value={f}>{f === 'All' ? 'All floors' : `Floor ${f}`}</option>)}
        </select>
        <button type="button" className="pms-btn-ghost px-3 py-2.5" onClick={() => { setQ(''); setFloor('All'); }}>Clear</button>
      </div>
      <div className="overflow-x-auto">
        <table className="pms-table min-w-[760px]">
          <thead><tr><th>Room</th><th>Type</th><th>Floor</th><th>Status</th><th>Housekeeping</th><th>Guest / booking</th><th className="text-right">Rate</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.number}>
                <td className="tnum font-mono font-semibold">{r.number}</td>
                <td>{r.type}</td>
                <td className="tnum">{r.floor}</td>
                <td><Badge tone={roomTone(r.status)}>{r.status}</Badge></td>
                <td style={{ color: 'var(--color-ink-secondary)' }}>{r.hk}</td>
                <td className="tnum" style={{ color: 'var(--color-ink-secondary)' }}>{r.guest ? `${r.guest} · ${r.reservationId}` : '—'}</td>
                <td className="tnum text-right font-semibold">${r.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="pms-helper py-6 text-center">No rooms match.</p> : null}
      </div>
    </Card>
  );
}
