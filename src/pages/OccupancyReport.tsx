import { useCallback, useState } from 'react';
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
    <div className="flex flex-col gap-4">
      {resource.error ? <p role="alert" className="pms-helper">Could not load occupancy report: {resource.error}</p> : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Occupancy', occupancy ? `${occupancy.occupancyPct}%` : '—'],
          ['Room nights', occupancy?.nights ?? '—'],
          ['Sold room nights', occupancy?.soldRoomNights ?? '—'],
          ['Available tonight', data?.flash.rooms.ready ?? '—'],
        ].map(([label, value]) => (
          <section key={label} className="pms-card p-4"><p className="pms-label">{label}</p><p className="pms-kpi-value tnum mt-1">{value}</p></section>
        ))}
      </div>
      <Card>
        <CardTitle title="Occupancy trend" subtitle={occupancy ? `${occupancy.from} through ${occupancy.to}` : 'Loading occupancy data…'} action={<div className="flex flex-wrap items-center gap-2"><Tabs label="Date range" tabs={RANGES.map((item) => ({ id: item, label: item }))} active={range} onChange={setRange} />{can('report.export') ? <button type="button" disabled={!occupancy} className="pms-btn-ghost px-3 py-2 disabled:opacity-50" onClick={() => occupancy && void downloadApiFile(reportsApi.exportOccupancy(occupancy.from, occupancy.to), 'occupancy.csv').catch((error: unknown) => toast('Export failed', { detail: displayApiError(error), tone: 'danger' }))}>Export CSV</button> : null}</div>} />
        {occupancy ? <BarChart label={`Occupancy over ${range}`} data={[{ label: range, value: Number(occupancy.occupancyPct), highlight: true }]} /> : null}
      </Card>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle title="Sold vs unsold" subtitle="Room-night inventory in this range" />
          {occupancy ? <DonutChart label="Sold versus unsold room nights" slices={[
            { label: 'Sold', value: occupancy.soldRoomNights, color: 'var(--color-primary)' },
            { label: 'Unsold', value: occupancy.unsoldRoomNights, color: 'var(--color-warning-text)' },
          ]} /> : null}
        </Card>
        <Card>
          <CardTitle title="Inventory reconciliation" subtitle="Reservation expectations compared with allocated room nights" />
          {occupancy ? <div className="flex flex-col gap-2 text-[13px]">
            {[
              ['Rooms in property', occupancy.rooms],
              ['Overlapping reservations', occupancy.reconciliation.overlappingReservations],
              ['Expected room nights', occupancy.reconciliation.expectedRoomNights],
              ['Claimed room nights', occupancy.reconciliation.claimedRoomNights],
              ['Reconciles', occupancy.reconciliation.matches ? 'Yes' : 'No'],
            ].map(([label, value]) => <div key={label} className="pms-summary-row border-b py-2 last:border-0" style={{ borderColor: 'var(--color-divider)' }}><span className="pms-helper">{label}</span><span className="tnum font-semibold">{value}</span></div>)}
          </div> : null}
        </Card>
      </div>
    </div>
  );
}
