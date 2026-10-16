import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { reservationTone } from '../components/status';
import { inputClass } from '../components/inputClass';
import { reportsApi } from '../lib/api/pms';
import { apiReservationStatus } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { downloadApiFile, displayApiError } from '../lib/api/client';
import { toast } from '../components/toastStore';
import { useAuth } from '../features/auth/AuthContext';

function shiftDate(dateStr: string, deltaDays: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

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
    <div className="flex flex-col gap-3.5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.ArrowLeftRight className="text-primary" size={26} />
            <span>Arrivals & Departures Manifest</span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Daily guest movements, check-in manifests, departure schedules, and net inventory changes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border"
            title="Refresh movements"
          >
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {resource.error ? <p role="alert" className="pms-helper">Could not load movement report: {resource.error}</p> : null}
      
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Expected arrivals', value: arrivals.length, icon: Lucide.ArrowDownLeft, color: 'var(--color-primary)' },
          { label: 'Expected departures', value: departures.length, icon: Lucide.ArrowUpRight, color: 'var(--color-warning-text)' },
          { label: 'Net room change', value: net >= 0 ? `+${net}` : `${net}`, icon: Lucide.Activity, color: net >= 0 ? 'var(--color-primary)' : 'var(--color-danger-text)' },
          { label: 'Manifest date', value: day, icon: Lucide.Calendar, color: 'var(--color-ink-secondary)' },
        ].map((item) => (
          <section key={item.label} className="pms-card p-4 transition-all duration-200 hover:-translate-y-0.5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center justify-between">
              <p className="pms-label">{item.label}</p>
              <item.icon size={16} style={{ color: item.color }} />
            </div>
            <p className="pms-kpi-value tnum mt-1.5">{item.value}</p>
          </section>
        ))}
      </div>

      <Card elevated>
        <CardTitle
          title="Daily movement manifest"
          subtitle={resource.loading ? 'Loading reservations…' : `${arrivals.length} arrivals · ${departures.length} departures`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-control border bg-surface p-0.5" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  title="Previous day"
                  className="pms-btn-ghost h-8 w-8 p-0 flex items-center justify-center rounded"
                  onClick={() => setDay((d) => shiftDate(d, -1))}
                >
                  <Lucide.ChevronLeft size={16} />
                </button>
                <input
                  type="date"
                  value={day}
                  onChange={(event) => setDay(event.target.value)}
                  className={inputClass('border-0 bg-transparent py-1 px-2 tnum text-[13px]')}
                  aria-label="Movement business date"
                />
                <button
                  type="button"
                  title="Next day"
                  className="pms-btn-ghost h-8 w-8 p-0 flex items-center justify-center rounded"
                  onClick={() => setDay((d) => shiftDate(d, 1))}
                >
                  <Lucide.ChevronRight size={16} />
                </button>
              </div>

              {can('report.export') ? (
                <button
                  type="button"
                  className="pms-btn-ghost flex items-center gap-1.5 px-3 py-2"
                  onClick={() => void downloadApiFile(reportsApi.exportMovement(day, day), `movement-${day}.csv`).catch((error: unknown) => toast('Export failed', { detail: displayApiError(error), tone: 'danger' }))}
                >
                  <Lucide.Download size={14} />
                  <span>Export CSV</span>
                </button>
              ) : null}
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mt-2">
          <div className="rounded-control border p-3.5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted-surface)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 font-semibold text-ink text-[14px]">
                <Lucide.ArrowDownLeft size={16} className="text-primary" />
                <span>Arrivals</span>
              </span>
              <span className="pms-badge rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary/10 text-primary">
                {arrivals.length} expected
              </span>
            </div>

            <ul className="flex flex-col gap-2">
              {arrivals.length === 0 ? (
                <p className="pms-helper py-6 text-center">No arrivals scheduled for {day}.</p>
              ) : (
                arrivals.map((row) => (
                  <li
                    key={`${row.bookingCode}-arrival`}
                    className="flex items-center gap-3 rounded-control border p-3 bg-surface transition-all duration-150 hover:border-primary"
                    style={{ borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-xs)' }}
                  >
                    <Avatar name={row.guestName ?? 'Guest'} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">{row.guestName ?? 'Guest'}</span>
                      <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>
                        {row.bookingCode} · Room {row.roomNumber ?? 'unassigned'} · {row.nights} night{row.nights > 1 ? 's' : ''}
                      </span>
                    </span>
                    <Badge tone={reservationTone(apiReservationStatus(row.status))}>{apiReservationStatus(row.status)}</Badge>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-control border p-3.5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted-surface)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 font-semibold text-ink text-[14px]">
                <Lucide.ArrowUpRight size={16} className="text-amber-500" />
                <span>Departures</span>
              </span>
              <span className="pms-badge rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-600">
                {departures.length} scheduled
              </span>
            </div>

            <ul className="flex flex-col gap-2">
              {departures.length === 0 ? (
                <p className="pms-helper py-6 text-center">No departures scheduled for {day}.</p>
              ) : (
                departures.map((row) => (
                  <li
                    key={`${row.bookingCode}-departure`}
                    className="flex items-center gap-3 rounded-control border p-3 bg-surface transition-all duration-150 hover:border-primary"
                    style={{ borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-xs)' }}
                  >
                    <Avatar name={row.guestName ?? 'Guest'} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">{row.guestName ?? 'Guest'}</span>
                      <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>
                        {row.bookingCode} · Room {row.roomNumber ?? 'unassigned'}
                      </span>
                    </span>
                    <Badge tone={reservationTone(apiReservationStatus(row.status))}>{apiReservationStatus(row.status)}</Badge>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
