import { useCallback, useMemo, useState } from 'react';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { reservationTone } from '../components/status';
import { inputClass } from '../components/inputClass';
import { reportsApi } from '../lib/api/pms';
import { apiReservationStatus } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { downloadApiFile, displayApiError } from '../lib/api/client';
import { toast } from '../components/toastStore';
import { useAuth } from '../features/auth/AuthContext';

export function ArrivalsReport() {
  const { can } = useAuth();
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const load = useCallback(() => reportsApi.movement(day, day), [day]);
  const resource = useApiResource(load, [day]);
  const rows = useMemo(() => resource.data?.rows ?? [], [resource.data?.rows]);
  const arrivals = useMemo(() => rows.filter((row) => row.checkInDate === day), [rows, day]);
  const departures = useMemo(() => rows.filter((row) => row.checkOutDate === day), [rows, day]);
  const net = arrivals.length - departures.length;

  return (
    <div className="flex flex-col gap-4">
      {resource.error ? <p role="alert" className="pms-helper">Could not load movement report: {resource.error}</p> : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Arrivals', String(arrivals.length)],
          ['Departures', String(departures.length)],
          ['Net change', net >= 0 ? `+${net}` : `${net}`],
          ['Business date', day],
        ].map(([label, value]) => <section key={label} className="pms-card p-4"><p className="pms-label">{label}</p><p className="pms-kpi-value tnum mt-1">{value}</p></section>)}
      </div>
      <Card>
        <CardTitle title="Movement" subtitle={resource.loading ? 'Loading reservations…' : `Backend manifest · ${resource.data?.currencyCode ?? ''}`} action={<div className="flex flex-wrap items-center gap-2"><input type="date" value={day} onChange={(event) => setDay(event.target.value)} className={inputClass('tnum')} aria-label="Movement business date" />{can('report.export') ? <button type="button" className="pms-btn-ghost px-3 py-2" onClick={() => void downloadApiFile(reportsApi.exportMovement(day, day), `movement-${day}.csv`).catch((error: unknown) => toast('Export failed', { detail: displayApiError(error), tone: 'danger' }))}>Export CSV</button> : null}</div>} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <p className="pms-label mb-2">Arrivals ({arrivals.length})</p>
            <ul className="flex flex-col gap-2">
              {arrivals.length === 0 ? <p className="pms-helper">No arrivals for this date.</p> : arrivals.map((row) => (
                <li key={`${row.bookingCode}-arrival`} className="flex items-center gap-3 rounded-control border p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <Avatar name={row.guestName ?? 'Guest'} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold">{row.guestName ?? 'Guest'}</span><span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{row.bookingCode} · Room {row.roomNumber ?? 'unassigned'} · {row.nights}n</span></span>
                  <Badge tone={reservationTone(apiReservationStatus(row.status))}>{apiReservationStatus(row.status)}</Badge>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="pms-label mb-2">Departures ({departures.length})</p>
            <ul className="flex flex-col gap-2">
              {departures.length === 0 ? <p className="pms-helper">No departures for this date.</p> : departures.map((row) => (
                <li key={`${row.bookingCode}-departure`} className="flex items-center gap-3 rounded-control border p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <Avatar name={row.guestName ?? 'Guest'} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold">{row.guestName ?? 'Guest'}</span><span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{row.bookingCode} · Room {row.roomNumber ?? 'unassigned'}</span></span>
                  <Badge tone={reservationTone(apiReservationStatus(row.status))}>{apiReservationStatus(row.status)}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
