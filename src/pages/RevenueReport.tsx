import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Card, CardTitle } from '../components/ui';
import { BarChart } from '../components/charts';
import { Tabs } from '../components/controls';
import { formatCurrency } from '../lib/api/format';
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

  const metrics = [
    {
      label: 'Gross Revenue',
      val: revenue ? formatCurrency(Number(revenue.grossRevenue), revenue.currencyCode) : '—',
      Icon: Lucide.TrendingUp,
    },
    {
      label: 'Average Daily Rate (ADR)',
      val: revenue ? formatCurrency(Number(revenue.adr), revenue.currencyCode) : '—',
      Icon: Lucide.BarChart3,
    },
    {
      label: 'Revenue per Available Room (RevPAR)',
      val: revenue ? formatCurrency(Number(revenue.revpar), revenue.currencyCode) : '—',
      Icon: Lucide.LineChart,
    },
    {
      label: 'Net Payments Collected',
      val: revenue ? formatCurrency(Number(revenue.paymentsNetCollected), revenue.currencyCode) : '—',
      Icon: Lucide.CreditCard,
    },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.TrendingUp className="text-primary" size={26} />
            <span>Revenue & ADR Analytics</span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Analyze Average Daily Rate (ADR), RevPAR, gross lodging revenues, and tax totals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border"
            title="Refresh revenue"
          >
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {resource.error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <Lucide.AlertCircle size={18} />
          <span>Could not load financial report: {resource.error}</span>
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, val, Icon }) => (
          <section key={label} className="pms-card p-4 flex items-start justify-between">
            <div>
              <p className="pms-label text-xs">{label}</p>
              <p className="pms-kpi-value tnum mt-1 text-2xl font-bold">{val}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.03] text-primary">
              <Icon size={20} />
            </div>
          </section>
        ))}
      </div>

      <Card>
        <CardTitle
          title="Revenue Breakdown"
          subtitle={revenue ? `${revenue.from} through ${revenue.to} · ${revenue.currencyCode}` : 'Loading revenue data…'}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Tabs
                label="Date range"
                tabs={RANGES.map((item) => ({ id: item, label: item }))}
                active={range}
                onChange={setRange}
              />
              {can('report.export') ? (
                <button
                  type="button"
                  disabled={!revenue}
                  className="pms-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  onClick={() =>
                    revenue &&
                    void downloadApiFile(reportsApi.exportRevenue(revenue.from, revenue.to), 'revenue.csv').catch(
                      (error: unknown) => toast('Export failed', { detail: displayApiError(error), tone: 'danger' }),
                    )
                  }
                >
                  <Lucide.Download size={14} />
                  <span>Export CSV</span>
                </button>
              ) : null}
            </div>
          }
        />
        {revenue ? (
          <div className="mt-3">
            <BarChart
              label="Revenue components"
              data={[
                { label: 'Room Revenue', value: Number(revenue.roomRevenue) },
                { label: 'Other Revenue', value: Number(revenue.otherRevenue) },
                { label: 'Taxes Total', value: Number(revenue.taxTotal) },
                { label: 'Gross Revenue', value: Number(revenue.grossRevenue), highlight: true },
              ]}
            />
          </div>
        ) : null}
      </Card>

      <Card>
        <CardTitle title="Revenue and Collections Ledger" subtitle="Accounting metrics from backend financial engine" />
        {revenue ? (
          <div className="mt-2 overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
            <table className="pms-table min-w-[480px]">
              <thead>
                <tr>
                  <th>Financial Metric</th>
                  <th className="text-right">Amount / Count</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Room Revenue', formatCurrency(Number(revenue.roomRevenue), revenue.currencyCode)],
                  ['Other Incidental Revenue', formatCurrency(Number(revenue.otherRevenue), revenue.currencyCode)],
                  ['Tax Total', formatCurrency(Number(revenue.taxTotal), revenue.currencyCode)],
                  ['Gross Revenue Total', formatCurrency(Number(revenue.grossRevenue), revenue.currencyCode)],
                  ['Gross Payments Collected', formatCurrency(Number(revenue.paymentsCollected), revenue.currencyCode)],
                  ['Payments Refunded', formatCurrency(Number(revenue.paymentsRefunded), revenue.currencyCode)],
                  ['Net Collections', formatCurrency(Number(revenue.paymentsNetCollected), revenue.currencyCode)],
                  ['Sold Room Nights', String(revenue.soldRoomNights)],
                  ['Available Room Nights', String(revenue.availableRoomNights)],
                ].map(([label, value]) => (
                  <tr key={label} className="transition-colors hover:bg-black/[0.01]">
                    <td className="font-medium text-ink">{label}</td>
                    <td className="tnum text-right font-bold text-ink">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
