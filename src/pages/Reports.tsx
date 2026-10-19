import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Badge, Card, CardTitle } from '../components/ui';
import type { NavTarget } from '../components/nav';
import { auditApi, nightAuditApi, reportsApi } from '../lib/api/pms';
import { useApiResource } from '../lib/api/useApiResource';
import { useAuth } from '../features/auth/AuthContext';
import { newIdempotencyKey, displayApiError, downloadApiFile } from '../lib/api/client';
import { toast } from '../components/toastStore';
import { PromptDialog } from '../components/overlays';

const OCCUPANCY_CHART_DATA = [
  { day: '14 Oct', occ: 88, adr: 4600 },
  { day: '15 Oct', occ: 62, adr: 4200 },
  { day: '16 Oct', occ: 40, adr: 5100 },
  { day: '17 Oct', occ: 92, adr: 5400 },
  { day: '18 Oct', occ: 70, adr: 4800 },
  { day: '19 Oct', occ: 60, adr: 5900 },
  { day: '20 Oct', occ: 78, adr: 6200 },
  { day: '21 Oct', occ: 55, adr: 5200 },
  { day: '22 Oct', occ: 68, adr: 5500 },
  { day: '23 Oct', occ: 74, adr: 5800 },
  { day: '24 Oct', occ: 95, adr: 6500 },
  { day: '25 Oct', occ: 88, adr: 6400 },
  { day: '26 Oct', occ: 72, adr: 5700 },
  { day: '27 Oct', occ: 58, adr: 5300 },
];

export function Reports({ go }: { go: (t: NavTarget) => void }) {
  const { can } = useAuth();
  const [reopenModal, setReopenModal] = useState(false);

  const adrPoints = useMemo(() => {
    const minAdr = 3500;
    const maxAdr = 7000;
    return OCCUPANCY_CHART_DATA.map((item, idx) => {
      const x = 40 + (idx / (OCCUPANCY_CHART_DATA.length - 1)) * 920;
      const norm = Math.max(0, Math.min(1, (item.adr - minAdr) / (maxAdr - minAdr)));
      const y = 120 - norm * 85;
      return { x: Math.round(x), y: Math.round(y) };
    });
  }, []);

  const load = useCallback(async () => {
    const flash = await reportsApi.dailyFlash();
    const date = flash.businessDate;
    const [occupancy, revenue, audit, housekeeping] = await Promise.all([
      reportsApi.occupancy(date, date),
      can('report.read.financial') ? reportsApi.revenue(date, date) : Promise.resolve(null),
      can('audit-log.read') ? auditApi.list(10) : Promise.resolve(null),
      reportsApi.housekeeping(date, date),
    ]);
    return { flash, occupancy, revenue, audit, housekeeping };
  }, [can]);

  const resource = useApiResource(load);
  const data = resource.data;
  const auditDate = data?.flash.businessDate ?? '';
  const nightAuditResource = useApiResource(
    () => (auditDate && can('night-audit.read') ? nightAuditApi.get(auditDate) : Promise.resolve(null)),
    [auditDate, can],
  );

  const runNightAudit = async (action: 'preview' | 'close') => {
    if (!auditDate) return;
    try {
      if (action === 'preview') await nightAuditApi.preview(auditDate);
      else if (action === 'close') await nightAuditApi.close(auditDate, newIdempotencyKey(`night-audit:${auditDate}`));
      nightAuditResource.refresh();
      toast(`Night audit ${action} complete`, { detail: auditDate, tone: 'success' });
    } catch (error) {
      toast(`Night audit ${action} failed`, { detail: displayApiError(error), tone: 'danger' });
    }
  };

  const handleReopenSubmit = async (reason: string) => {
    if (!auditDate || !reason.trim()) return;
    try {
      await nightAuditApi.reopen(auditDate, reason.trim());
      nightAuditResource.refresh();
      setReopenModal(false);
      toast('Night audit reopened', { detail: auditDate, tone: 'success' });
    } catch (error) {
      toast('Night audit reopen failed', { detail: displayApiError(error), tone: 'danger' });
    }
  };

  const tiles = [
    {
      title: 'Occupancy Report',
      desc: 'Available and sold room-nights breakdown',
      target: { view: 'occupancy-report' } as NavTarget,
      Icon: Lucide.BedDouble,
    },
    ...(can('report.read.financial')
      ? [
          {
            title: 'Revenue Report',
            desc: 'ADR, RevPAR, gross revenue and tax breakdown',
            target: { view: 'revenue-report' } as NavTarget,
            Icon: Lucide.TrendingUp,
          },
        ]
      : []),
    {
      title: 'Arrivals & Departures',
      desc: 'Daily guest movements, check-ins and check-outs',
      target: { view: 'arrivals-departures' } as NavTarget,
      Icon: Lucide.ArrowLeftRight,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.BarChart3 className="text-primary" size={28} />
            <span>Operational & Financial Reports</span>
          </h1>
          <p className="mt-1 text-xs text-ink-secondary">
            Property performance analytics, occupancy forecasts, daily flash metrics, and manager audits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl border border-border"
            title="Refresh analytics"
          >
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {resource.error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <Lucide.AlertCircle size={18} />
          <span>Could not load reports: {resource.error}</span>
        </div>
      ) : null}

      {/* Navigation Quick Tiles */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {tiles.map((tile) => (
          <button
            key={tile.title}
            type="button"
            onClick={() => go(tile.target)}
            className="pms-card pms-card-hover p-3 sm:p-3.5 text-left flex flex-col justify-between transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.03] text-primary">
                  <tile.Icon size={20} />
                </span>
                <Lucide.ArrowUpRight size={18} className="text-ink-muted" />
              </div>
              <p className="pms-section-title font-bold text-ink text-[16px]">{tile.title}</p>
              <p className="pms-helper mt-1 text-xs leading-relaxed">{tile.desc}</p>
            </div>
            <p className="mt-4 text-xs font-semibold text-primary flex items-center gap-1">
              <span>View detailed report</span>
              <Lucide.ChevronRight size={13} />
            </p>
          </button>
        ))}
      </div>

      {/* ================= 14-DAY OCCUPANCY & ROOM STATUS OVERVIEW ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card: Occupancy (Next 14 Days) - col-8 */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-200/70 shadow-2xs">
                  <Lucide.BarChart3 size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Occupancy (Next 14 Days)</h2>
                  <p className="text-[11px] text-slate-400">Demand forecast and Average Daily Rate (ADR) projection</p>
                </div>
              </div>

              {/* Legend & Action */}
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200/60">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[var(--color-primary)]" />
                    <span>Occupancy %</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full border-2 border-sky-400 bg-white" />
                    <span>ADR (₹)</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => go({ view: 'occupancy-report' })}
                  className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                >
                  <span>Report</span>
                  <Lucide.ArrowRight size={12} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Bar + Line Combo Chart */}
            <div className="relative h-48 w-full flex items-end pt-3">
              {/* Y-axis left lines */}
              <div className="absolute inset-0 flex flex-col justify-between text-[9.5px] text-slate-400 pointer-events-none select-none">
                <div className="border-b border-dashed border-slate-100 pb-0.5">100%</div>
                <div className="border-b border-dashed border-slate-100 pb-0.5">80%</div>
                <div className="border-b border-dashed border-slate-100 pb-0.5">60%</div>
                <div className="border-b border-dashed border-slate-100 pb-0.5">40%</div>
                <div className="border-b border-dashed border-slate-100 pb-0.5">20%</div>
                <div className="border-b border-slate-200 pb-0.5">0%</div>
              </div>

              {/* Y-axis right labels */}
              <div className="absolute right-0 inset-y-0 flex flex-col justify-between text-[9.5px] text-slate-400 pointer-events-none select-none text-right">
                <div>₹7K</div>
                <div>₹6K</div>
                <div>₹5K</div>
                <div>₹4K</div>
                <div>₹3K</div>
                <div>₹0</div>
              </div>

              {/* 14 Day Bars */}
              <div className="relative z-10 w-full pl-7 pr-8 flex items-end justify-between h-40">
                {OCCUPANCY_CHART_DATA.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 text-[9.5px] font-bold bg-slate-900 text-white rounded px-1.5 py-0.5 pointer-events-none z-30 whitespace-nowrap shadow-md">
                      {item.day}: {item.occ}% · ₹{item.adr}
                    </div>
                    {/* The bar */}
                    <div
                      className="w-3.5 sm:w-5 md:w-6 rounded-t bg-[var(--color-primary)] group-hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-2xs"
                      style={{ height: `${item.occ}%` }}
                    />
                    <span className="text-[10px] text-slate-500 mt-2 leading-tight text-center font-medium">
                      {item.day.split(' ')[0]}<br />
                      <span className="text-slate-400 text-[9px]">{item.day.split(' ')[1]}</span>
                    </span>
                  </div>
                ))}

                {/* Simulated ADR Trend Line (SVG Overlay) */}
                <svg className="absolute inset-0 h-40 w-full pointer-events-none overflow-visible pl-7 pr-8" viewBox="0 0 1000 140" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={adrPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  />
                  {adrPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                  ))}
                </svg>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11.5px] text-slate-400">Peak demand: 24 Oct (95% Occupancy · ₹6,500 ADR)</span>
            <button
              type="button"
              onClick={() => go({ view: 'occupancy-report' })}
              className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>14-day projection report</span>
              <Lucide.ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Card: Room Status Overview - col-4 */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 shadow-2xs">
                  <Lucide.BedDouble size={18} strokeWidth={2.4} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Room Status Overview</h2>
                  <p className="text-[11px] text-slate-400">Current live inventory distribution</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
                50 Rooms
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-2">
              {/* SVG Donut Chart */}
              <div className="relative h-32 w-32 flex-none flex items-center justify-center">
                <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                  <circle cx="80" cy="80" r="60" fill="none" stroke="var(--color-primary)" strokeWidth="18" strokeDasharray="256.35 376.99" strokeDashoffset="0" />
                  <circle cx="80" cy="80" r="60" fill="none" stroke="#10b981" strokeWidth="18" strokeDasharray="75.40 376.99" strokeDashoffset="-256.35" />
                  <circle cx="80" cy="80" r="60" fill="none" stroke="#f59e0b" strokeWidth="18" strokeDasharray="30.16 376.99" strokeDashoffset="-331.75" />
                  <circle cx="80" cy="80" r="60" fill="none" stroke="#0ea5e9" strokeWidth="18" strokeDasharray="7.54 376.99" strokeDashoffset="-361.91" />
                  <circle cx="80" cy="80" r="60" fill="none" stroke="#ef4444" strokeWidth="18" strokeDasharray="7.54 376.99" strokeDashoffset="-369.45" />
                </svg>

                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-900 leading-none">50</span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">Total Rooms</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 truncate">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-primary)] flex-none" />
                    <span className="font-medium">34 Occupied</span>
                  </span>
                  <span className="font-bold text-slate-800">68%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#10b981] flex-none" />
                    <span className="font-medium">10 Available</span>
                  </span>
                  <span className="font-bold text-slate-800">20%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#f59e0b] flex-none" />
                    <span className="font-medium">4 Dirty</span>
                  </span>
                  <span className="font-bold text-slate-800">8%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#0ea5e9] flex-none" />
                    <span className="font-medium">1 Cleaning</span>
                  </span>
                  <span className="font-bold text-slate-800">2%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 truncate">
                    <span className="h-2 w-2 rounded-full bg-[#ef4444] flex-none" />
                    <span className="font-medium">1 Out of order</span>
                  </span>
                  <span className="font-bold text-slate-800">2%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11.5px] text-slate-400">Available to sell: 10 units</span>
            <button
              type="button"
              onClick={() => go({ view: 'room-inventory' })}
              className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Room inventory</span>
              <Lucide.ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Operational and Financial Snapshots */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle
            title="Operational Snapshot"
            subtitle="Current property front-desk movements"
            action={
              data && can('report.export') ? (
                <button
                  type="button"
                  className="pms-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                  onClick={() =>
                    void downloadApiFile(
                      reportsApi.exportDailyFlash(data.flash.businessDate),
                      `daily-flash-${data.flash.businessDate}.csv`,
                    ).catch((error: unknown) =>
                      toast('Export failed', { detail: displayApiError(error), tone: 'danger' }),
                    )
                  }
                >
                  <Lucide.Download size={14} />
                  <span>Export CSV</span>
                </button>
              ) : undefined
            }
          />
          {data ? (
            <ul className="flex flex-col gap-2 mt-2">
              {[
                { label: 'Arrivals', value: data.flash.arrivals.length, icon: Lucide.LogIn },
                { label: 'Departures', value: data.flash.departures.length, icon: Lucide.LogOut },
                { label: 'In-house Guests', value: data.flash.inHouseCount, icon: Lucide.Users },
                { label: 'Open Housekeeping Tasks', value: data.flash.housekeeping.open, icon: Lucide.Sparkles },
                { label: 'Open Maintenance Tickets', value: data.flash.maintenance.open, icon: Lucide.Wrench },
              ].map(({ label, value, icon: Icon }) => (
                <li
                  key={label}
                  className="flex items-center justify-between rounded-xl border px-3.5 py-2.5 transition-colors hover:bg-black/[0.01]"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                    <Icon size={15} className="text-ink-muted" />
                    <span>{label}</span>
                  </span>
                  <Badge tone="neutral">{value}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card>
          <CardTitle
            title="Financial Snapshot"
            subtitle={
              data?.revenue
                ? `${data.revenue.currencyCode} · ${data.revenue.from} to ${data.revenue.to}`
                : 'Financial permission required for revenue data'
            }
          />
          {data?.revenue ? (
            <ul className="flex flex-col gap-2 mt-2">
              {[
                ['Room Revenue', data.revenue.roomRevenue],
                ['Other Revenue', data.revenue.otherRevenue],
                ['Taxes Total', data.revenue.taxTotal],
                ['Payments Net Collected', data.revenue.paymentsNetCollected],
                ['ADR / RevPAR', `${data.revenue.adr} / ${data.revenue.revpar}`],
              ].map(([label, value]) => (
                <li
                  key={label}
                  className="flex items-center justify-between gap-2 border-b py-2.5 last:border-0"
                  style={{ borderColor: 'var(--color-divider)' }}
                >
                  <span className="text-[13px] text-ink-secondary">{label}</span>
                  <span className="tnum font-bold text-ink">{value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pms-helper py-8 text-center">
              This role cannot read financial reports, or the backend returned no report data.
            </p>
          )}
        </Card>
      </div>

      {/* Housekeeping Performance */}
      {data?.housekeeping ? (
        <Card>
          <CardTitle
            title="Housekeeping Performance"
            subtitle={`${data.housekeeping.from} · ${data.housekeeping.completionRate}% completion · ${data.housekeeping.avgTurnaroundHours}h avg turnaround`}
          />
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 mt-2">
            {[
              ['Total Tasks', String(data.housekeeping.totalTasks)],
              ['Completed', String(data.housekeeping.completed)],
              ['Blocked', String(data.housekeeping.blocked)],
              ['Rooms Serviced', `${data.housekeeping.roomsTouched} / ${data.housekeeping.roomsTotal}`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border p-3 shadow-xs"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
              >
                <p className="text-xs text-ink-muted">{label}</p>
                <p className="tnum text-[20px] font-bold text-ink mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
            <table className="pms-table min-w-[480px]">
              <thead>
                <tr>
                  <th>Task Type</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Completed</th>
                  <th className="text-right">Blocked</th>
                </tr>
              </thead>
              <tbody>
                {data.housekeeping.byType.map((row) => (
                  <tr key={row.type}>
                    <td className="font-semibold text-ink">{row.type.replace(/_/g, ' ')}</td>
                    <td className="tnum text-right">{row.total}</td>
                    <td className="tnum text-right font-semibold text-emerald-600">{row.completed}</td>
                    <td className="tnum text-right text-rose-600">{row.blocked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* Night Audit Card */}
      {can('night-audit.read') ? (
        <Card>
          <CardTitle
            title="Night Audit"
            subtitle={`Business date ${auditDate} · Advisory and day-close workflow`}
          />
          {nightAuditResource.error ? (
            <p role="alert" className="pms-helper mb-2 text-danger">
              {nightAuditResource.error}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <Badge tone={nightAuditResource.data?.status === 'COMPLETED' ? 'success' : 'neutral'}>
              {nightAuditResource.data?.status ?? 'Not previewed'}
            </Badge>
            {nightAuditResource.data?.previewSummary?.exceptionCount !== undefined ? (
              <span className="pms-helper text-xs">
                {nightAuditResource.data.previewSummary.exceptionCount} preview exceptions
              </span>
            ) : null}
            {can('night-audit.run') ? (
              <button
                type="button"
                className="pms-btn-ghost px-3.5 py-2 text-xs font-semibold"
                onClick={() => void runNightAudit('preview')}
              >
                Run preview
              </button>
            ) : null}
            {can('night-audit.approve') && nightAuditResource.data?.status !== 'COMPLETED' ? (
              <button
                type="button"
                className="pms-btn-primary px-3.5 py-2 text-xs font-semibold"
                onClick={() => void runNightAudit('close')}
              >
                Close business date
              </button>
            ) : null}
            {can('night-audit.approve') && nightAuditResource.data?.status === 'COMPLETED' ? (
              <button
                type="button"
                className="pms-btn-ghost px-3.5 py-2 text-xs text-amber-600 font-semibold"
                onClick={() => setReopenModal(true)}
              >
                Reopen business date
              </button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {/* Audit Log Card */}
      {data?.audit ? (
        <Card>
          <CardTitle
            title="Recent Audit Events"
            subtitle={`${data.audit.total} events recorded · latest ${data.audit.returned} shown`}
            action={
              can('audit-log.export') ? (
                <button
                  type="button"
                  className="pms-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                  onClick={() =>
                    void downloadApiFile(auditApi.export(), 'audit-log.csv').catch((error: unknown) =>
                      toast('Audit export failed', { detail: displayApiError(error), tone: 'danger' }),
                    )
                  }
                >
                  <Lucide.Download size={14} />
                  <span>Export CSV</span>
                </button>
              ) : undefined
            }
          />
          <div className="mt-3 overflow-x-auto">
            <table className="pms-table min-w-[680px]">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Resource</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.rows.map((event) => (
                  <tr key={event.id} className="transition-colors hover:bg-black/[0.01]">
                    <td className="tnum text-xs text-ink-secondary">{event.createdAt}</td>
                    <td className="font-semibold text-ink">{event.action}</td>
                    <td>{event.actorName ?? 'System'}</td>
                    <td className="font-mono text-xs text-ink-secondary">
                      {event.resourceType}
                      {event.resourceId ? ` · ${event.resourceId}` : ''}
                    </td>
                    <td>
                      <Badge tone={event.outcome === 'SUCCESS' ? 'success' : 'danger'}>
                        {event.outcome}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* Night Audit Reopen PromptDialog */}
      <PromptDialog
        open={reopenModal}
        onClose={() => setReopenModal(false)}
        onSubmit={handleReopenSubmit}
        title={`Reopen Night Audit for ${auditDate}`}
        subtitle="This action will unlock transactions and reverse the business date close status."
        label="Reason for reopening"
        placeholder="e.g. Late posting correction, financial reconciliation adjustment"
        confirmLabel="Reopen Business Date"
        danger
      />
    </div>
  );
}
