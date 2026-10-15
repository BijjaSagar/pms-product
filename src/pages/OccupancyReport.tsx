import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Card, CardTitle } from '../components/ui';
import { BarChart, DonutChart } from '../components/charts';
import { Tabs } from '../components/controls';
import { reportsApi } from '../lib/api/pms';
import { useApiResource } from '../lib/api/useApiResource';
import { downloadApiFile, displayApiError } from '../lib/api/client';
import { toast } from '../components/toastStore';
import { useAuth } from '../features/auth/AuthContext';

const RANGES = ['7 days', '14 days', '30 days'] as const;
const daysFor = (range: (typeof RANGES)[number]) => Number.parseInt(range, 10);

function subtractDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - amount);
  return date.toISOString().slice(0, 10);
}

export function OccupancyReport() {
  const { can } = useAuth();
  const [range, setRange] = useState<(typeof RANGES)[number]>('7 days');
  const load = useCallback(async () => {
    const flash = await reportsApi.dailyFlash();
    const from = subtractDays(flash.businessDate, daysFor(range) - 1);
    const occupancy = await reportsApi.occupancy(from, flash.businessDate);
    return { flash, occupancy };
  }, [range]);
  const resource = useApiResource(load, [range]);
  const data = resource.data;
  const occupancy = data?.occupancy;

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.BedDouble className="text-primary" size={26} />
            <span>Occupancy Report</span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Track sold room nights, occupancy percentages, and inventory availability forecasts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border"
            title="Refresh occupancy"
          >
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {resource.error ? <p role="alert" className="pms-helper">Could not load occupancy report: {resource.error}</p> : null}
      
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Occupancy rate', value: occupancy ? `${occupancy.occupancyPct}%` : '—', icon: Lucide.TrendingUp, color: 'var(--color-primary)' },
          { label: 'Total room nights', value: occupancy?.nights ?? '—', icon: Lucide.Moon, color: 'var(--color-ink)' },
          { label: 'Sold room nights', value: occupancy?.soldRoomNights ?? '—', icon: Lucide.CalendarCheck, color: 'var(--color-primary)' },
          { label: 'Available tonight', value: data?.flash.rooms.ready ?? '—', icon: Lucide.BedDouble, color: 'var(--color-success-text)' },
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
          title="Occupancy trend"
          subtitle={occupancy ? `${occupancy.from} through ${occupancy.to}` : 'Loading occupancy data…'}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Tabs label="Date range" tabs={RANGES.map((item) => ({ id: item, label: item }))} active={range} onChange={setRange} />
              {can('report.export') ? (
                <button
                  type="button"
                  disabled={!occupancy}
                  className="pms-btn-ghost flex items-center gap-1.5 px-3 py-2 disabled:opacity-50"
                  onClick={() => occupancy && void downloadApiFile(reportsApi.exportOccupancy(occupancy.from, occupancy.to), 'occupancy.csv').catch((error: unknown) => toast('Export failed', { detail: displayApiError(error), tone: 'danger' }))}
                >
                  <Lucide.Download size={14} />
                  <span>Export CSV</span>
                </button>
              ) : null}
            </div>
          }
        />
        {occupancy ? <BarChart label={`Occupancy over ${range}`} data={[{ label: range, value: Number(occupancy.occupancyPct), highlight: true }]} /> : null}
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card elevated>
          <CardTitle title="Sold vs unsold inventory" subtitle="Room-night utilization in this range" />
          {occupancy ? (
            <DonutChart
              label="Sold versus unsold room nights"
              slices={[
                { label: 'Sold', value: occupancy.soldRoomNights, color: 'var(--color-primary)' },
                { label: 'Unsold', value: occupancy.unsoldRoomNights, color: 'var(--color-warning-text)' },
              ]}
            />
          ) : null}
        </Card>

        <Card elevated>
          <CardTitle title="Inventory reconciliation" subtitle="Reservation expectations compared with allocated room nights" />
          {occupancy ? (
            <div className="flex flex-col gap-2.5 text-[13px] pt-1">
              {[
                { label: 'Rooms in property', value: occupancy.rooms },
                { label: 'Overlapping reservations', value: occupancy.reconciliation.overlappingReservations },
                { label: 'Expected room nights', value: occupancy.reconciliation.expectedRoomNights },
                { label: 'Claimed room nights', value: occupancy.reconciliation.claimedRoomNights },
              ].map((row) => (
                <div key={row.label} className="pms-summary-row flex items-center justify-between border-b py-2 last:border-0" style={{ borderColor: 'var(--color-divider)' }}>
                  <span className="text-ink-secondary">{row.label}</span>
                  <span className="tnum font-semibold text-ink">{row.value}</span>
                </div>
              ))}
              <div className="pms-summary-row flex items-center justify-between border-t pt-3 mt-1" style={{ borderColor: 'var(--color-border)' }}>
                <span className="font-medium text-ink">Reconciliation status</span>
                {occupancy.reconciliation.matches ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[13px]">
                    <Lucide.CheckCircle2 size={16} />
                    <span>Balanced</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-600 font-semibold text-[13px]">
                    <Lucide.AlertTriangle size={16} />
                    <span>Discrepancy</span>
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
