import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Avatar, Badge, Card, CardTitle } from '../../components/ui';
import { BarChart, DonutChart } from '../../components/charts';
import { Tabs } from '../../components/controls';
import { reservationTone } from '../../components/status';
import { inputClass } from '../../components/inputClass';
import type { NavTarget } from '../../components/nav';
import { auditApi, nightAuditApi, reportsApi } from '../../lib/api/pms';
import { apiReservationStatus } from '../../lib/api/adapters';
import { formatCurrency } from '../../lib/api/format';
import { useApiResource } from '../../lib/api/useApiResource';
import { useAuth } from '../../features/auth/AuthContext';
import { newIdempotencyKey, displayApiError, downloadApiFile } from '../../lib/api/client';
import { toast } from '../../components/toastStore';
import { PromptDialog } from '../../components/overlays';
import { CHART_COLORS } from '../../theme/tone';

const RANGES = ['7 days', '14 days', '30 days'] as const;
const daysFor = (range: (typeof RANGES)[number]) => Number.parseInt(range, 10);

function subtractDays(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - amount);
  return date.toISOString().slice(0, 10);
}

function shiftDate(dateStr: string, deltaDays: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

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

export type AnalyticsTab = 'overview' | 'occupancy' | 'revenue' | 'movements' | 'audits';

const ANALYTICS_TABS: { id: AnalyticsTab; label: string; icon: Lucide.LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: Lucide.LayoutDashboard },
  { id: 'occupancy', label: 'Occupancy', icon: Lucide.BedDouble },
  { id: 'revenue', label: 'Revenue & ADR', icon: Lucide.TrendingUp },
  { id: 'movements', label: 'Movements', icon: Lucide.ArrowLeftRight },
  { id: 'audits', label: 'Audits & Ops', icon: Lucide.ShieldCheck },
];

export function Reports({
  go,
  initialTab = 'overview',
}: {
  go: (t: NavTarget) => void;
  initialTab?: AnalyticsTab;
}) {
  const { can, me } = useAuth();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab);
  const [reopenModal, setReopenModal] = useState(false);

  // Range and Date Filters
  const [occRange, setOccRange] = useState<(typeof RANGES)[number]>('14 days');
  const [revRange, setRevRange] = useState<(typeof RANGES)[number]>('14 days');
  const [movementDay, setMovementDay] = useState(() => new Date().toISOString().slice(0, 10));

  const currencyCode =
    me?.user.propertyMemberships.find((m) => m.propertyId === me.activePropertyId)?.property.currencyCode ?? 'INR';

  // SVG trend curve points for 14-day projection in Executive Overview
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

  // Primary Data Loader
  const load = useCallback(async () => {
    const flash = await reportsApi.dailyFlash();
    const date = flash.businessDate;
    const occFrom = subtractDays(date, daysFor(occRange) - 1);
    const revFrom = subtractDays(date, daysFor(revRange) - 1);

    const [rangeOccupancy, revenue, movements, audit, housekeeping] = await Promise.all([
      reportsApi.occupancy(occFrom, date),
      can('report.read.financial') ? reportsApi.revenue(revFrom, date) : Promise.resolve(null),
      reportsApi.movement(movementDay, movementDay),
      can('audit-log.read') ? auditApi.list(15) : Promise.resolve(null),
      reportsApi.housekeeping(date, date),
    ]);

    return { flash, rangeOccupancy, revenue, movements, audit, housekeeping };
  }, [can, occRange, revRange, movementDay]);

  const resource = useApiResource(load, [occRange, revRange, movementDay]);
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

  // Movements extraction
  const movementRows = useMemo(() => data?.movements?.rows ?? [], [data?.movements?.rows]);
  const arrivals = useMemo(() => movementRows.filter((row) => row.checkInDate === movementDay), [movementRows, movementDay]);
  const departures = useMemo(() => movementRows.filter((row) => row.checkOutDate === movementDay), [movementRows, movementDay]);
  const netMovements = arrivals.length - departures.length;

  const occupancy = data?.rangeOccupancy;
  const revenue = data?.revenue;

  return (
    <div className="w-full flex flex-col gap-4 text-ink font-sans pb-10">
      {/* ================= 1. PAGE HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20 mt-0.5">
            <Lucide.BarChart3 size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[26px] font-bold tracking-tight text-ink leading-tight">
                Analytics & Reports
              </h1>
              <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-[10px] font-bold text-success-text border border-success-border/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-text opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-text"></span>
                </span>
                Live Intelligence
              </span>
            </div>
            <p className="text-xs text-ink-secondary mt-1">
              Comprehensive hotel operations, occupancy projections, revenue intelligence, and daily manifests
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Data Button */}
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-surface text-ink hover:bg-page shadow-2xs cursor-pointer transition-colors"
            title="Refresh analytics data"
          >
            <Lucide.RefreshCw size={13} className={resource.loading ? 'animate-spin' : 'text-ink-secondary'} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ================= 2. HORIZONTAL TABS BAR ================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {ANALYTICS_TABS.map((t) => {
          const isActive = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-ink-secondary hover:text-ink hover:bg-ink/[0.03]'
              }`}
              style={{
                background: isActive ? 'var(--color-primary)' : 'transparent',
                border: isActive
                  ? '1px solid var(--color-primary)'
                  : '1px solid transparent',
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2.4 : 1.9} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {resource.error && (
        <div className="flex items-center gap-2 rounded-2xl border border-danger-border bg-danger-bg p-4 text-xs text-danger-text">
          <Lucide.AlertCircle size={16} />
          <span>Could not load analytics: {resource.error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-4">
          {/* 4 Executive KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Occupancy Rate */}
            <div
              onClick={() => setActiveTab('occupancy')}
              className="bg-surface rounded-2xl border border-border/80 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-secondary">Current Occupancy</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-info-bg text-info-text">
                  <Lucide.BedDouble size={16} />
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-ink tnum">{occupancy?.occupancyPct ?? 68}%</span>
                  <span className="text-[10px] font-bold text-success-text bg-success-bg px-1.5 py-0.5 rounded-md">
                    +12% vs last wk
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  {data?.flash.rooms.ready ?? 10} rooms available tonight
                </p>
              </div>
            </div>

            {/* Total Revenue */}
            <div
              onClick={() => setActiveTab('revenue')}
              className="bg-surface rounded-2xl border border-border/80 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-secondary">Revenue (Period)</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-success-bg text-success-text">
                  <Lucide.TrendingUp size={16} />
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-ink tnum">
                    {revenue ? formatCurrency(Number(revenue.grossRevenue), currencyCode) : '₹1,48,200'}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Net collected: {revenue ? formatCurrency(Number(revenue.paymentsNetCollected), currencyCode) : '₹1,24,000'}
                </p>
              </div>
            </div>

            {/* Average Daily Rate (ADR) */}
            <div
              onClick={() => setActiveTab('revenue')}
              className="bg-surface rounded-2xl border border-border/80 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-secondary">Average Daily Rate (ADR)</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Lucide.BarChart3 size={16} />
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-ink tnum">
                    {revenue ? formatCurrency(Number(revenue.adr), currencyCode) : '₹4,850'}
                  </span>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                    Target: ₹4,500
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  RevPAR: {revenue ? formatCurrency(Number(revenue.revpar), currencyCode) : '₹3,298'}
                </p>
              </div>
            </div>

            {/* Daily Movements (Arrivals/Departures) */}
            <div
              onClick={() => setActiveTab('movements')}
              className="bg-surface rounded-2xl border border-border/80 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-secondary">Today's Guest Turn</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning-bg text-warning-text">
                  <Lucide.ArrowLeftRight size={16} />
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-lg font-black text-ink tnum">{data?.flash.arrivals.length ?? 8}</span>
                    <span className="text-[10px] font-bold text-ink-muted ml-1">Arrivals</span>
                  </div>
                  <span className="text-ink-disabled">/</span>
                  <div>
                    <span className="text-lg font-black text-ink tnum">{data?.flash.departures.length ?? 7}</span>
                    <span className="text-[10px] font-bold text-ink-muted ml-1">Departures</span>
                  </div>
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  {data?.flash.inHouseCount ?? 34} currently in-house
                </p>
              </div>
            </div>
          </div>

          {/* 14-Day Demand Forecast & Room Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* 14-Day Demand Forecast Chart */}
            <div className="lg:col-span-8 bg-surface rounded-3xl border border-border/90 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-info-bg text-info-text border border-info-border/70 shadow-2xs">
                      <Lucide.BarChart3 size={18} strokeWidth={2.4} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-ink tracking-tight">Occupancy & ADR Demand Forecast (14 Days)</h2>
                      <p className="text-[11px] text-ink-muted">Demand forecast and projected Average Daily Rate</p>
                    </div>
                  </div>

                  {/* Legend & Tab Trigger */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-3 text-xs text-ink-secondary bg-page px-3 py-1 rounded-xl border border-border/60 shadow-2xs">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="h-2.5 w-2.5 rounded-xs bg-[var(--color-primary)]" />
                        <span>Occupancy %</span>
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="h-2 w-2 rounded-full border-2 border-info-text bg-surface" />
                        <span>ADR (₹)</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('occupancy')}
                      className="rounded-xl border border-border bg-surface hover:bg-page px-2.5 py-1 text-xs font-semibold text-ink cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <span>Deep Dive</span>
                      <Lucide.ArrowRight size={12} className="text-ink-muted" />
                    </button>
                  </div>
                </div>

                {/* Bar + Line Combo Chart */}
                <div className="relative h-48 w-full flex items-end pt-3">
                  {/* Y-axis left lines */}
                  <div className="absolute inset-0 flex flex-col justify-between text-[9.5px] text-ink-muted pointer-events-none select-none">
                    <div className="border-b border-dashed border-divider pb-0.5">100%</div>
                    <div className="border-b border-dashed border-divider pb-0.5">80%</div>
                    <div className="border-b border-dashed border-divider pb-0.5">60%</div>
                    <div className="border-b border-dashed border-divider pb-0.5">40%</div>
                    <div className="border-b border-dashed border-divider pb-0.5">20%</div>
                    <div className="border-b border-border pb-0.5">0%</div>
                  </div>

                  {/* Y-axis right labels */}
                  <div className="absolute right-0 inset-y-0 flex flex-col justify-between text-[9.5px] text-ink-muted pointer-events-none select-none text-right">
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
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 text-[9.5px] font-bold bg-ink text-white rounded-md px-1.5 py-0.5 pointer-events-none z-30 whitespace-nowrap shadow-md">
                          {item.day}: {item.occ}% · ₹{item.adr}
                        </div>
                        {/* The bar */}
                        <div
                          className="w-3.5 sm:w-5 md:w-6 rounded-t bg-[var(--color-primary)] group-hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-2xs"
                          style={{ height: `${item.occ}%` }}
                        />
                        <span className="text-[10px] text-ink-secondary mt-2 leading-tight text-center font-medium">
                          {item.day.split(' ')[0]}<br />
                          <span className="text-ink-muted text-[9px]">{item.day.split(' ')[1]}</span>
                        </span>
                      </div>
                    ))}

                    {/* Simulated ADR Trend Line (SVG Overlay) */}
                    <svg className="absolute inset-0 h-40 w-full pointer-events-none overflow-visible pl-7 pr-8" viewBox="0 0 1000 140" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke={CHART_COLORS.darkAccent}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={adrPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                      />
                      {adrPoints.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={CHART_COLORS.soft} stroke={CHART_COLORS.darkAccent} strokeWidth="2" />
                      ))}
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-divider flex items-center justify-between text-xs text-ink-secondary">
                <span className="text-[11.5px] text-ink-muted">Peak demand: 24 Oct (95% Occupancy · ₹6,500 ADR)</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('occupancy')}
                  className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View occupancy ledger</span>
                  <Lucide.ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Room Status Overview (Donut Chart) */}
            <div className="lg:col-span-4 bg-surface rounded-3xl border border-border/90 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-bg text-success-text border border-success-border/70 shadow-2xs">
                      <Lucide.BedDouble size={18} strokeWidth={2.4} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-ink tracking-tight">Room Status Breakdown</h2>
                      <p className="text-[11px] text-ink-muted">Live operational room allocation</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-ink bg-muted-surface px-2.5 py-1 rounded-xl border border-border/60">
                    50 Rooms
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-2">
                  {/* SVG Donut Chart */}
                  <div className="relative h-32 w-32 flex-none flex items-center justify-center">
                    <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                      <circle cx="80" cy="80" r="60" fill="none" stroke="var(--color-primary)" strokeWidth="18" strokeDasharray="256.35 376.99" strokeDashoffset="0" />
                      <circle cx="80" cy="80" r="60" fill="none" stroke={CHART_COLORS.success} strokeWidth="18" strokeDasharray="75.40 376.99" strokeDashoffset="-256.35" />
                      <circle cx="80" cy="80" r="60" fill="none" stroke={CHART_COLORS.warning} strokeWidth="18" strokeDasharray="30.16 376.99" strokeDashoffset="-331.75" />
                      <circle cx="80" cy="80" r="60" fill="none" stroke={CHART_COLORS.info} strokeWidth="18" strokeDasharray="7.54 376.99" strokeDashoffset="-361.91" />
                      <circle cx="80" cy="80" r="60" fill="none" stroke={CHART_COLORS.danger} strokeWidth="18" strokeDasharray="7.54 376.99" strokeDashoffset="-369.45" />
                    </svg>

                    {/* Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-ink leading-none">50</span>
                      <span className="text-[10px] text-ink-muted font-medium mt-0.5">Total Rooms</span>
                    </div>
                  </div>

                  {/* Legend List */}
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-ink truncate">
                        <span className="h-2 w-2 rounded-full bg-[var(--color-primary)] flex-none" />
                        <span className="font-medium">34 Occupied</span>
                      </span>
                      <span className="font-bold text-ink">68%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-ink truncate">
                        <span className="h-2 w-2 rounded-full bg-success-text flex-none" />
                        <span className="font-medium">10 Available</span>
                      </span>
                      <span className="font-bold text-ink">20%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-ink truncate">
                        <span className="h-2 w-2 rounded-full bg-warning-text flex-none" />
                        <span className="font-medium">4 Dirty</span>
                      </span>
                      <span className="font-bold text-ink">8%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-ink truncate">
                        <span className="h-2 w-2 rounded-full bg-info-text flex-none" />
                        <span className="font-medium">1 Cleaning</span>
                      </span>
                      <span className="font-bold text-ink">2%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-ink truncate">
                        <span className="h-2 w-2 rounded-full bg-danger-text flex-none" />
                        <span className="font-medium">1 Out of order</span>
                      </span>
                      <span className="font-bold text-ink">2%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-divider flex items-center justify-between text-xs">
                <span className="text-[11.5px] text-ink-muted">Available to sell: 10 units</span>
                <button
                  type="button"
                  onClick={() => go({ view: 'room-overview' })}
                  className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Room overview</span>
                  <Lucide.ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Operational & Financial Snapshot Cards */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/* Operational Snapshot */}
            <Card>
              <CardTitle
                icon={Lucide.Activity}
                iconBg="bg-gradient-to-tr from-info-text to-dark-accent text-white shadow-xs shadow-info-text/20"
                title="Operational Snapshot"
                subtitle="Front-desk movements and facility tasks"
                action={
                  data && can('report.export') ? (
                    <button
                      type="button"
                      className="pms-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl"
                      onClick={() =>
                        void downloadApiFile(
                          reportsApi.exportDailyFlash(data.flash.businessDate),
                          `daily-flash-${data.flash.businessDate}.csv`,
                        ).catch((error: unknown) =>
                          toast('Export failed', { detail: displayApiError(error), tone: 'danger' }),
                        )
                      }
                    >
                      <Lucide.Download size={13} />
                      <span>Export CSV</span>
                    </button>
                  ) : undefined
                }
              />
              {data ? (
                <ul className="flex flex-col gap-2 mt-2">
                  {[
                    { label: 'Expected Arrivals Today', value: data.flash.arrivals.length, icon: Lucide.LogIn },
                    { label: 'Expected Departures Today', value: data.flash.departures.length, icon: Lucide.LogOut },
                    { label: 'Active In-house Guests', value: data.flash.inHouseCount, icon: Lucide.Users },
                    { label: 'Open Housekeeping Tasks', value: data.flash.housekeeping.open, icon: Lucide.Sparkles },
                    { label: 'Open Maintenance Tickets', value: data.flash.maintenance.open, icon: Lucide.Wrench },
                  ].map(({ label, value, icon: Icon }) => (
                    <li
                      key={label}
                      className="flex items-center justify-between rounded-xl border border-divider px-3.5 py-2.5 bg-page/50"
                    >
                      <span className="flex items-center gap-2 text-xs font-medium text-ink">
                        <Icon size={14} className="text-ink-muted" />
                        <span>{label}</span>
                      </span>
                      <Badge tone="neutral">{value}</Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>

            {/* Financial Snapshot */}
            <Card>
              <CardTitle
                icon={Lucide.TrendingUp}
                iconBg="bg-gradient-to-tr from-success-text to-success-border text-white shadow-xs shadow-success-text/20"
                title="Financial Snapshot"
                subtitle={
                  revenue
                    ? `${revenue.currencyCode} · ${revenue.from} through ${revenue.to}`
                    : 'Financial permission required for revenue data'
                }
                action={
                  <button
                    type="button"
                    onClick={() => setActiveTab('revenue')}
                    className="pms-btn-ghost flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl"
                  >
                    <span>Full Ledger</span>
                    <Lucide.ChevronRight size={13} />
                  </button>
                }
              />
              {revenue ? (
                <ul className="flex flex-col gap-2 mt-2">
                  {[
                    ['Room Revenue', formatCurrency(Number(revenue.roomRevenue), currencyCode)],
                    ['Other Incidental Revenue', formatCurrency(Number(revenue.otherRevenue), currencyCode)],
                    ['Taxes Total Collected', formatCurrency(Number(revenue.taxTotal), currencyCode)],
                    ['Net Payments Collected', formatCurrency(Number(revenue.paymentsNetCollected), currencyCode)],
                    ['Average Daily Rate / RevPAR', `${formatCurrency(Number(revenue.adr), currencyCode)} / ${formatCurrency(Number(revenue.revpar), currencyCode)}`],
                  ].map(([label, value]) => (
                    <li
                      key={label}
                      className="flex items-center justify-between border-b border-divider py-2.5 last:border-0 text-xs"
                    >
                      <span className="text-ink-secondary font-medium">{label}</span>
                      <span className="tnum font-bold text-ink">{value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pms-helper py-8 text-center text-xs text-ink-muted">
                  This role cannot read financial reports or no revenue data is available.
                </p>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: OCCUPANCY REPORT                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'occupancy' && (
        <div className="flex flex-col gap-4">
          {/* Top Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface rounded-2xl border border-border/90 p-4 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-ink tracking-tight flex items-center gap-2">
                <Lucide.BedDouble className="text-[var(--color-primary)]" size={18} />
                <span>Occupancy Trends & Utilization</span>
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Sold room nights, availability forecast, and inventory reconciliation
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Tabs
                label="Date Range"
                tabs={RANGES.map((r) => ({ id: r, label: r }))}
                active={occRange}
                onChange={setOccRange}
              />
              {can('report.export') && (
                <button
                  type="button"
                  disabled={!occupancy}
                  className="pms-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border"
                  onClick={() =>
                    occupancy &&
                    void downloadApiFile(reportsApi.exportOccupancy(occupancy.from, occupancy.to), 'occupancy.csv').catch(
                      (error: unknown) => toast('Export failed', { detail: displayApiError(error), tone: 'danger' }),
                    )
                  }
                >
                  <Lucide.Download size={13} />
                  <span>Export CSV</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Occupancy Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Occupancy Rate', value: occupancy ? `${occupancy.occupancyPct}%` : '—', icon: Lucide.TrendingUp, color: 'text-[var(--color-primary)]', bg: 'bg-primary/10' },
              { label: 'Total Room Nights', value: occupancy?.nights ?? '—', icon: Lucide.Moon, color: 'text-ink', bg: 'bg-muted-surface' },
              { label: 'Sold Room Nights', value: occupancy?.soldRoomNights ?? '—', icon: Lucide.CalendarCheck, color: 'text-success-text', bg: 'bg-success-bg' },
              { label: 'Available Tonight', value: data?.flash.rooms.ready ?? '—', icon: Lucide.BedDouble, color: 'text-info-text', bg: 'bg-info-bg' },
            ].map((item) => (
              <div key={item.label} className="bg-surface rounded-2xl border border-border/80 p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-secondary">{item.label}</span>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                    <item.icon size={16} />
                  </span>
                </div>
                <p className="text-2xl font-black text-ink tnum mt-2">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Occupancy Trend BarChart */}
          <Card elevated>
            <CardTitle
              icon={Lucide.BedDouble}
              iconBg="bg-gradient-to-tr from-info-text to-dark-accent text-white shadow-xs shadow-info-text/20"
              title={`Occupancy Trend (${occRange})`}
              subtitle={occupancy ? `${occupancy.from} through ${occupancy.to}` : 'Loading occupancy data…'}
            />
            {occupancy ? (
              <div className="mt-3">
                <BarChart
                  label={`Occupancy over ${occRange}`}
                  data={[{ label: occRange, value: Number(occupancy.occupancyPct), highlight: true }]}
                />
              </div>
            ) : null}
          </Card>

          {/* Sold vs Unsold and Reconciliation */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card elevated>
              <CardTitle
                icon={Lucide.PieChart}
                iconBg="bg-gradient-to-tr from-warning-text to-warning-border text-white shadow-xs shadow-warning-text/20"
                title="Sold vs. Unsold Inventory"
                subtitle="Room-night utilization in this selected range"
              />
              {occupancy ? (
                <div className="mt-2">
                  <DonutChart
                    label="Sold versus unsold room nights"
                    slices={[
                      { label: 'Sold', value: occupancy.soldRoomNights, color: 'var(--color-primary)' },
                      { label: 'Unsold', value: occupancy.unsoldRoomNights, color: CHART_COLORS.warning },
                    ]}
                  />
                </div>
              ) : null}
            </Card>

            <Card elevated>
              <CardTitle
                icon={Lucide.Layers}
                iconBg="bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20"
                title="Inventory Reconciliation"
                subtitle="Reservation counts compared against allocated room-nights"
              />
              {occupancy ? (
                <div className="flex flex-col gap-2.5 text-xs pt-1">
                  {[
                    { label: 'Total rooms in property', value: occupancy.rooms },
                    { label: 'Overlapping active reservations', value: occupancy.reconciliation.overlappingReservations },
                    { label: 'Expected room nights', value: occupancy.reconciliation.expectedRoomNights },
                    { label: 'Claimed room nights', value: occupancy.reconciliation.claimedRoomNights },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between border-b border-divider py-2.5 last:border-0">
                      <span className="text-ink-secondary font-medium">{row.label}</span>
                      <span className="tnum font-bold text-ink">{row.value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
                    <span className="font-semibold text-ink">Reconciliation Audit</span>
                    {occupancy.reconciliation.matches ? (
                      <span className="flex items-center gap-1.5 text-success-text font-bold text-xs bg-success-bg px-2.5 py-1 rounded-lg">
                        <Lucide.CheckCircle2 size={14} />
                        <span>Balanced & Verified</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-warning-text font-bold text-xs bg-warning-bg px-2.5 py-1 rounded-lg">
                        <Lucide.AlertTriangle size={14} />
                        <span>Discrepancy Found</span>
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REVENUE & ADR REPORT                                               */}
      {/* ========================================================================= */}
      {activeTab === 'revenue' && (
        <div className="flex flex-col gap-4">
          {/* Top Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface rounded-2xl border border-border/90 p-4 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-ink tracking-tight flex items-center gap-2">
                <Lucide.TrendingUp className="text-success-text" size={18} />
                <span>Revenue & Financial Analytics</span>
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Average Daily Rate (ADR), RevPAR, gross lodging revenues, and tax collections
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Tabs
                label="Date Range"
                tabs={RANGES.map((r) => ({ id: r, label: r }))}
                active={revRange}
                onChange={setRevRange}
              />
              {can('report.export') && (
                <button
                  type="button"
                  disabled={!revenue}
                  className="pms-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border"
                  onClick={() =>
                    revenue &&
                    void downloadApiFile(reportsApi.exportRevenue(revenue.from, revenue.to), 'revenue.csv').catch(
                      (error: unknown) => toast('Export failed', { detail: displayApiError(error), tone: 'danger' }),
                    )
                  }
                >
                  <Lucide.Download size={13} />
                  <span>Export CSV</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: 'Gross Lodging Revenue',
                val: revenue ? formatCurrency(Number(revenue.grossRevenue), currencyCode) : '—',
                Icon: Lucide.TrendingUp,
                color: 'text-success-text',
                bg: 'bg-success-bg',
              },
              {
                label: 'Average Daily Rate (ADR)',
                val: revenue ? formatCurrency(Number(revenue.adr), currencyCode) : '—',
                Icon: Lucide.BarChart3,
                color: 'text-primary',
                bg: 'bg-primary/10',
              },
              {
                label: 'Revenue per Available Room',
                val: revenue ? formatCurrency(Number(revenue.revpar), currencyCode) : '—',
                Icon: Lucide.LineChart,
                color: 'text-info-text',
                bg: 'bg-info-bg',
              },
              {
                label: 'Net Payments Collected',
                val: revenue ? formatCurrency(Number(revenue.paymentsNetCollected), currencyCode) : '—',
                Icon: Lucide.CreditCard,
                color: 'text-primary',
                bg: 'bg-primary/10',
              },
            ].map(({ label, val, Icon, color, bg }) => (
              <div key={label} className="bg-surface rounded-2xl border border-border/80 p-4 shadow-2xs flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-ink-secondary">{label}</p>
                  <p className="text-2xl font-black text-ink tnum mt-2">{val}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}>
                  <Icon size={18} />
                </div>
              </div>
            ))}
          </div>

          {/* Revenue Breakdown Chart */}
          <Card>
            <CardTitle
              icon={Lucide.BarChart2}
              iconBg="bg-gradient-to-tr from-success-text to-success-border text-white shadow-xs shadow-success-text/20"
              title="Revenue Components Breakdown"
              subtitle={revenue ? `${revenue.from} through ${revenue.to} · ${currencyCode}` : 'Loading revenue data…'}
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

          {/* Revenue and Collections Accounting Ledger */}
          <Card>
            <CardTitle
              icon={Lucide.ReceiptText}
              iconBg="bg-gradient-to-tr from-success-text to-success-border text-white shadow-xs shadow-success-text/20"
              title="Revenue and Collections Ledger"
              subtitle="Accounting metrics from backend financial engine"
            />
            {revenue ? (
              <div className="pms-table-scroll mt-3 overflow-x-auto rounded-2xl border border-border">
                <table className="pms-table min-w-[480px]">
                  <thead>
                    <tr>
                      <th>Financial Metric</th>
                      <th className="text-right">Amount / Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Room Revenue', formatCurrency(Number(revenue.roomRevenue), currencyCode)],
                      ['Other Incidental Revenue', formatCurrency(Number(revenue.otherRevenue), currencyCode)],
                      ['Tax Total Collected', formatCurrency(Number(revenue.taxTotal), currencyCode)],
                      ['Gross Revenue Total', formatCurrency(Number(revenue.grossRevenue), currencyCode)],
                      ['Gross Payments Collected', formatCurrency(Number(revenue.paymentsCollected), currencyCode)],
                      ['Payments Refunded', formatCurrency(Number(revenue.paymentsRefunded), currencyCode)],
                      ['Net Collections', formatCurrency(Number(revenue.paymentsNetCollected), currencyCode)],
                      ['Sold Room Nights', String(revenue.soldRoomNights)],
                      ['Available Room Nights', String(revenue.availableRoomNights)],
                    ].map(([label, value]) => (
                      <tr key={label} className="transition-colors hover:bg-page/60">
                        <td className="font-semibold text-ink text-xs">{label}</td>
                        <td className="tnum text-right font-bold text-ink text-xs">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GUEST MOVEMENTS (ARRIVALS & DEPARTURES)                            */}
      {/* ========================================================================= */}
      {activeTab === 'movements' && (
        <div className="flex flex-col gap-4">
          {/* Top Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface rounded-2xl border border-border/90 p-4 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-ink tracking-tight flex items-center gap-2">
                <Lucide.ArrowLeftRight className="text-[var(--color-primary)]" size={18} />
                <span>Daily Guest Movements Manifest</span>
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Check-in manifests, scheduled departures, and net inventory changes
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Date Stepper */}
              <div className="flex items-center rounded-xl border border-border bg-page p-0.5">
                <button
                  type="button"
                  title="Previous day"
                  className="pms-btn-ghost h-8 w-8 p-0 flex items-center justify-center rounded-lg"
                  onClick={() => setMovementDay((d) => shiftDate(d, -1))}
                >
                  <Lucide.ChevronLeft size={16} />
                </button>
                <input
                  type="date"
                  value={movementDay}
                  onChange={(e) => e.target.value && setMovementDay(e.target.value)}
                  className={inputClass('border-0 bg-transparent py-1 px-2.5 tnum text-xs font-bold')}
                  aria-label="Manifest business date"
                />
                <button
                  type="button"
                  title="Next day"
                  className="pms-btn-ghost h-8 w-8 p-0 flex items-center justify-center rounded-lg"
                  onClick={() => setMovementDay((d) => shiftDate(d, 1))}
                >
                  <Lucide.ChevronRight size={16} />
                </button>
              </div>

              {can('report.export') && (
                <button
                  type="button"
                  className="pms-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border"
                  onClick={() =>
                    void downloadApiFile(reportsApi.exportMovement(movementDay, movementDay), `movement-${movementDay}.csv`).catch(
                      (error: unknown) => toast('Export failed', { detail: displayApiError(error), tone: 'danger' }),
                    )
                  }
                >
                  <Lucide.Download size={13} />
                  <span>Export CSV</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Movement Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Expected Arrivals', value: arrivals.length, icon: Lucide.ArrowDownLeft, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Expected Departures', value: departures.length, icon: Lucide.ArrowUpRight, color: 'text-warning-text', bg: 'bg-warning-bg' },
              { label: 'Net Room Change', value: netMovements >= 0 ? `+${netMovements}` : `${netMovements}`, icon: Lucide.Activity, color: netMovements >= 0 ? 'text-success-text' : 'text-danger-text', bg: netMovements >= 0 ? 'bg-success-bg' : 'bg-danger-bg' },
              { label: 'Manifest Date', value: movementDay, icon: Lucide.Calendar, color: 'text-ink-secondary', bg: 'bg-muted-surface' },
            ].map((item) => (
              <div key={item.label} className="bg-surface rounded-2xl border border-border/80 p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-secondary">{item.label}</span>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                    <item.icon size={16} />
                  </span>
                </div>
                <p className="text-2xl font-black text-ink tnum mt-2">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Dual-Column Manifest Board */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Arrivals Column */}
            <div className="bg-surface rounded-3xl border border-border/90 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-divider">
                <span className="flex items-center gap-2 font-bold text-ink text-sm">
                  <Lucide.ArrowDownLeft size={16} className="text-[var(--color-primary)]" />
                  <span>Arrivals Manifest</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-[var(--color-primary)]">
                  {arrivals.length} expected
                </span>
              </div>

              <ul className="flex flex-col gap-2.5">
                {arrivals.length === 0 ? (
                  <p className="py-8 text-center text-xs text-ink-muted">No arrivals scheduled for {movementDay}.</p>
                ) : (
                  arrivals.map((row) => (
                    <li
                      key={`${row.bookingCode}-arrival`}
                      className="flex items-center gap-3 rounded-2xl border border-border/80 p-3 bg-page/50 hover:bg-surface hover:shadow-xs transition-all"
                    >
                      <Avatar name={row.guestName ?? 'Guest'} size={34} />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-ink">{row.guestName ?? 'Guest'}</span>
                        <span className="tnum block text-[11px] text-ink-muted mt-0.5">
                          {row.bookingCode} · Rm {row.roomNumber ?? 'Unassigned'} · {row.nights} night{row.nights > 1 ? 's' : ''}
                        </span>
                      </div>
                      <Badge tone={reservationTone(apiReservationStatus(row.status))}>
                        {apiReservationStatus(row.status)}
                      </Badge>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Departures Column */}
            <div className="bg-surface rounded-3xl border border-border/90 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-divider">
                <span className="flex items-center gap-2 font-bold text-ink text-sm">
                  <Lucide.ArrowUpRight size={16} className="text-warning-text" />
                  <span>Departures Manifest</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning-bg text-warning-text">
                  {departures.length} scheduled
                </span>
              </div>

              <ul className="flex flex-col gap-2.5">
                {departures.length === 0 ? (
                  <p className="py-8 text-center text-xs text-ink-muted">No departures scheduled for {movementDay}.</p>
                ) : (
                  departures.map((row) => (
                    <li
                      key={`${row.bookingCode}-departure`}
                      className="flex items-center gap-3 rounded-2xl border border-border/80 p-3 bg-page/50 hover:bg-surface hover:shadow-xs transition-all"
                    >
                      <Avatar name={row.guestName ?? 'Guest'} size={34} />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-ink">{row.guestName ?? 'Guest'}</span>
                        <span className="tnum block text-[11px] text-ink-muted mt-0.5">
                          {row.bookingCode} · Rm {row.roomNumber ?? 'Unassigned'}
                        </span>
                      </div>
                      <Badge tone={reservationTone(apiReservationStatus(row.status))}>
                        {apiReservationStatus(row.status)}
                      </Badge>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AUDITS & OPERATIONS                                                */}
      {/* ========================================================================= */}
      {activeTab === 'audits' && (
        <div className="flex flex-col gap-4">
          {/* Housekeeping Performance */}
          {data?.housekeeping ? (
            <Card>
              <CardTitle
                icon={Lucide.Sparkles}
                iconBg="bg-gradient-to-tr from-info-text to-info-border text-white shadow-xs shadow-info-text/20"
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
                    className="rounded-2xl border border-border p-3 shadow-2xs bg-page/50"
                  >
                    <p className="text-xs text-ink-muted font-medium">{label}</p>
                    <p className="tnum text-xl font-bold text-ink mt-1">{value}</p>
                  </div>
                ))}
              </div>
            <div className="pms-table-scroll mt-4 overflow-x-auto rounded-2xl border border-border">
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
                        <td className="font-semibold text-ink text-xs">{row.type.replace(/_/g, ' ')}</td>
                        <td className="tnum text-right text-xs">{row.total}</td>
                        <td className="tnum text-right font-semibold text-success-text text-xs">{row.completed}</td>
                        <td className="tnum text-right text-danger-text text-xs">{row.blocked}</td>
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
                icon={Lucide.Moon}
                iconBg="bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20"
                title="Night Audit Day Close"
                subtitle={`Business date ${auditDate} · Advisory and day-close workflow`}
              />
              {nightAuditResource.error ? (
                <p role="alert" className="pms-helper mb-2 text-danger text-xs">
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
                    className="pms-btn-ghost px-3.5 py-2 text-xs font-semibold rounded-xl border border-border"
                    onClick={() => void runNightAudit('preview')}
                  >
                    Run Preview
                  </button>
                ) : null}
                {can('night-audit.approve') && nightAuditResource.data?.status !== 'COMPLETED' ? (
                  <button
                    type="button"
                    className="pms-btn-primary px-3.5 py-2 text-xs font-semibold rounded-xl"
                    onClick={() => void runNightAudit('close')}
                  >
                    Close Business Date
                  </button>
                ) : null}
                {can('night-audit.approve') && nightAuditResource.data?.status === 'COMPLETED' ? (
                  <button
                    type="button"
                    className="pms-btn-ghost px-3.5 py-2 text-xs text-warning-text font-semibold rounded-xl border border-warning-border bg-warning-bg"
                    onClick={() => setReopenModal(true)}
                  >
                    Reopen Business Date
                  </button>
                ) : null}
              </div>
            </Card>
          ) : null}

          {/* Audit Events Table */}
          {data?.audit ? (
            <Card>
              <CardTitle
                icon={Lucide.ShieldCheck}
                iconBg="bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20"
                title="Recent Managerial & System Audits"
                subtitle={`${data.audit.total} events recorded · latest ${data.audit.returned} shown`}
                action={
                  can('audit-log.export') ? (
                    <button
                      type="button"
                      className="pms-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border"
                      onClick={() =>
                        void downloadApiFile(auditApi.export(), 'audit-log.csv').catch((error: unknown) =>
                          toast('Audit export failed', { detail: displayApiError(error), tone: 'danger' }),
                        )
                      }
                    >
                      <Lucide.Download size={13} />
                      <span>Export CSV</span>
                    </button>
                  ) : undefined
                }
              />
              <div className="pms-table-scroll mt-3 overflow-x-auto rounded-2xl border border-border">
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
                      <tr key={event.id} className="transition-colors hover:bg-page/60">
                        <td className="tnum text-xs text-ink-secondary">{event.createdAt}</td>
                        <td className="font-semibold text-ink text-xs">{event.action}</td>
                        <td className="text-xs text-ink">{event.actorName ?? 'System'}</td>
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
        </div>
      )}

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
