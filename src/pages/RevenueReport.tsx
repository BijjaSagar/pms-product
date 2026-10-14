import { useCallback, useState } from 'react';
import { Card, CardTitle } from '../components/ui';
import { BarChart } from '../components/charts';
import { Tabs } from '../components/controls';
import { formatMoney } from '../data/mock';
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

export function RevenueReport() {
  const { can } = useAuth();
  const [range, setRange] = useState<(typeof RANGES)[number]>('7 days');
  const load = useCallback(async () => {
    const flash = await reportsApi.dailyFlash();
    const from = subtractDays(flash.businessDate, daysFor(range) - 1);
    return reportsApi.revenue(from, flash.businessDate);
  }, [range]);
  const resource = useApiResource(load, [range]);
  const revenue = resource.data;
  const metrics: [string, string][] = [
    [`Gross revenue (${revenue?.currencyCode ?? ''})`, revenue ? formatMoney(Number(revenue.grossRevenue)) : '—'],
    ['ADR', revenue ? formatMoney(Number(revenue.adr)) : '—'],
    ['RevPAR', revenue ? formatMoney(Number(revenue.revpar)) : '—'],
    ['Net collected', revenue ? formatMoney(Number(revenue.paymentsNetCollected)) : '—'],
  ];

  return (
    <div className="flex flex-col gap-4">
      {resource.error ? <p role="alert" className="pms-helper">Could not load financial report: {resource.error}</p> : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map(([label, value]) => <section key={label} className="pms-card p-4"><p className="pms-label">{label}</p><p className="pms-kpi-value tnum mt-1">{value}</p></section>)}
      </div>
      <Card>
        <CardTitle title="Revenue breakdown" subtitle={revenue ? `${revenue.from} through ${revenue.to} · ${revenue.currencyCode}` : 'Loading revenue data…'} action={<div className="flex flex-wrap items-center gap-2"><Tabs label="Date range" tabs={RANGES.map((item) => ({ id: item, label: item }))} active={range} onChange={setRange} />{can('report.export') ? <button type="button" disabled={!revenue} className="pms-btn-ghost px-3 py-2 disabled:opacity-50" onClick={() => revenue && void downloadApiFile(reportsApi.exportRevenue(revenue.from, revenue.to), 'revenue.csv').catch((error: unknown) => toast('Export failed', { detail: displayApiError(error), tone: 'danger' }))}>Export CSV</button> : null}</div>} />
        {revenue ? <BarChart label="Revenue components" data={[
          { label: 'Room', value: Number(revenue.roomRevenue) },
          { label: 'Other', value: Number(revenue.otherRevenue) },
          { label: 'Tax', value: Number(revenue.taxTotal) },
          { label: 'Gross', value: Number(revenue.grossRevenue), highlight: true },
        ]} /> : null}
      </Card>
      <Card>
        <CardTitle title="Revenue and collection" subtitle="Amounts returned by the financial reporting API" />
        {revenue ? <div className="overflow-x-auto"><table className="pms-table min-w-[480px]">
          <thead><tr><th>Metric</th><th className="text-right">Amount / count</th></tr></thead>
          <tbody>
            {[
              ['Room revenue', revenue.roomRevenue], ['Other revenue', revenue.otherRevenue], ['Tax', revenue.taxTotal],
              ['Gross revenue', revenue.grossRevenue], ['Payments collected', revenue.paymentsCollected],
              ['Payments refunded', revenue.paymentsRefunded], ['Net collected', revenue.paymentsNetCollected],
              ['Sold room nights', String(revenue.soldRoomNights)], ['Available room nights', String(revenue.availableRoomNights)],
            ].map(([label, value]) => <tr key={label}><td>{label}</td><td className="tnum text-right font-semibold">{value}</td></tr>)}
          </tbody>
        </table></div> : null}
      </Card>
    </div>
  );
}
