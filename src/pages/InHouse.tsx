import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Avatar, Badge, Card, CardTitle, TableContainer, TableActionBtn } from '../components/ui';
import { reservationTone } from '../components/status';
import { FilterChip } from '../components/controls';
import { inputClass } from '../components/inputClass';
import type { NavTarget } from '../components/nav';
import { folioApi, frontDeskApi, reservationApi } from '../lib/api/pms';
import { reservationFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import type { StayRow } from '../lib/api/pms';
import { formatCurrency } from '../lib/api/format';

export function InHouse({ go }: { go: (t: NavTarget) => void }) {
  const loadRows = useCallback(async () => {
    const result = await frontDeskApi.inHouse();
    return Promise.all(result.data.map(async (stay: StayRow) => {
      const [detail, balance] = await Promise.all([
        reservationApi.get(stay.id),
        stay.folioId ? folioApi.balance(stay.folioId) : Promise.resolve(null),
      ]);
      return reservationFromApi({
        ...detail,
        guestName: stay.guestName,
        roomNumber: stay.roomNumber,
        totalAmount: balance?.total ?? detail.totalAmount,
        paid: Number(balance?.paid ?? 0),
        guest: detail.guest ? { ...detail.guest, name: `${detail.guest.firstName} ${detail.guest.lastName}` } : null,
      });
    }));
  }, []);
  const resource = useApiResource(loadRows);
  const stays = useMemo(() => resource.data ?? [], [resource.data]);
  const [q, setQ] = useState('');
  const [floor, setFloor] = useState('All');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return stays.filter(
      (r) =>
        r.status === 'Checked-in' &&
        (floor === 'All' || (r.roomNumber && Math.floor(Number(r.roomNumber) / 100) === Number(floor))) &&
        (!needle || r.guest.toLowerCase().includes(needle) || (r.roomNumber ?? '').includes(needle)),
    );
  }, [q, floor, stays]);

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.Building2 className="text-primary" size={28} />
            <span>In-House Guests</span>
          </h1>
          <p className="mt-1 text-xs text-ink-secondary">
            Active stays, room allocations, occupancy dates, and current in-house guest folios
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl border border-border"
            title="Refresh in-house stays"
          >
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => go({ view: 'check-out' })}
            className="pms-btn-primary flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl"
          >
            <Lucide.LogOut size={16} />
            <span>Check-out Desk</span>
          </button>
        </div>
      </div>

      <Card elevated>
        <CardTitle
          title="In-House Stays"
          subtitle={resource.loading ? 'Loading in-house guests…' : `${rows.length} active stay${rows.length !== 1 ? 's' : ''} in residence`}
        />
      {resource.error ? <p role="alert" className="pms-helper">Could not load in-house stays: {resource.error}</p> : null}
      
      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Lucide.Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search guest name or room number…"
            aria-label="Search in-house guests"
            className={inputClass('pl-9')}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by floor">
          {['All', '1', '2', '3', '4', '5'].map((f) => (
            <FilterChip key={f} active={floor === f} onClick={() => setFloor(f)}>
              {f === 'All' ? 'All floors' : `Floor ${f}`}
            </FilterChip>
          ))}
        </div>

        {(q || floor !== 'All') && (
          <button
            type="button"
            className="pms-btn-ghost flex items-center gap-1.5 px-3 py-2.5"
            onClick={() => { setQ(''); setFloor('All'); }}
          >
            <Lucide.RotateCcw size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      <TableContainer>
        <table className="pms-table min-w-[760px]">
          <thead>
            <tr>
              <th className="w-12 text-center">#</th>
              <th>GUEST NAME</th>
              <th>ASSIGNED ROOM</th>
              <th>STAY DURATION</th>
              <th>GUESTS</th>
              <th>STATUS</th>
              <th className="text-right">OUTSTANDING BALANCE</th>
              <th className="text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id}>
                <td className="text-center font-medium text-slate-400 text-xs">
                  {idx + 1}
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={r.guest} size={36} />
                    <div>
                      <span className="font-semibold text-slate-900 text-sm block">{r.guest}</span>
                      <span className="text-[11px] font-mono text-slate-400 block">{r.id}</span>
                    </div>
                  </div>
                </td>
                <td className="tnum font-medium text-slate-800 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <Lucide.BedDouble size={14} className="text-slate-400" />
                    <span>{r.roomNumber ?? r.roomType}</span>
                  </span>
                </td>
                <td className="tnum text-slate-600 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span>{r.checkIn}</span>
                    <Lucide.ArrowRight size={12} className="text-slate-400" />
                    <span>{r.checkOut}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-700">{r.nights}n</span>
                  </span>
                </td>
                <td className="tnum text-slate-600 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <Lucide.Users size={13} className="text-slate-400" />
                    <span>{r.adults + r.children}</span>
                  </span>
                </td>
                <td><Badge tone={reservationTone(r.status)}>{r.status}</Badge></td>
                <td className="tnum text-right font-bold text-slate-900 text-sm">
                  {formatCurrency(r.total - r.paid, r.currencyCode)}
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <TableActionBtn
                      icon={Lucide.User}
                      title={`Open profile for ${r.guest}`}
                      onClick={() => go({ view: 'guests', focusId: r.guestId })}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="pms-helper py-8 text-center text-slate-400">No in-house guests match your search or filter.</p> : null}
      </TableContainer>
    </Card>
    </div>
  );
}
