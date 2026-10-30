import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { toast } from '../../utils/toast';
import {
  BUSINESS_DATE,
  CHANNELS,
  INITIAL_AVAILABILITY,
  INITIAL_CLOSED_TO_ARRIVAL,
  INITIAL_CLOSED_TO_DEPARTURE,
  INITIAL_DEMAND,
  INITIAL_HISTORY,
  INITIAL_MAX_STAYS,
  INITIAL_MIN_STAYS,
  INITIAL_RATE_PLANS,
  INITIAL_RATES,
  INITIAL_SEASONS,
  INITIAL_STOP_SELL,
  INITIAL_RANGE_START,
  ROOM_TYPES,
  buildDateRange,
  formatDateRange,
  shiftDate,
} from './rate-management/data';
import { BulkUpdatePanel } from './rate-management/BulkUpdatePanel';
import { ChannelMappingPanel } from './rate-management/ChannelMappingPanel';
import { HistoryPanel } from './rate-management/HistoryPanel';
import { RateCalendarPanel } from './rate-management/RateCalendarPanel';
import { RatePerformancePanel } from './rate-management/RatePerformancePanel';
import { RatePlanDialog } from './rate-management/RatePlanDialog';
import { RatePlansPanel } from './rate-management/RatePlansPanel';
import { RateRestrictionsPanel } from './rate-management/RateRestrictionsPanel';
import { SeasonDialog } from './rate-management/SeasonDialog';
import { SeasonalityPanel } from './rate-management/SeasonalityPanel';
import type { BulkUpdatePayload, EditableRateRow, RateHistoryEvent, RatePlan, RateTabId, Season } from './rate-management/types';

const ROOM_RATE_MULTIPLIER: Record<string, number> = {
  Standard: 0.72,
  Deluxe: 1,
  Superior: 1.16,
  Executive: 1.42,
  Family: 1.72,
  Suite: 2.15,
};

const TABS: Array<{ id: RateTabId; label: string; icon: Lucide.LucideIcon }> = [
  { id: 'calendar', label: 'Rate calendar', icon: Lucide.CalendarDays },
  { id: 'plans', label: 'Rate plans', icon: Lucide.Layers3 },
  { id: 'seasonality', label: 'Seasonality', icon: Lucide.CalendarRange },
  { id: 'restrictions', label: 'Restrictions', icon: Lucide.LockKeyhole },
  { id: 'mapping', label: 'Channel mapping', icon: Lucide.Network },
  { id: 'bulk', label: 'Bulk update', icon: Lucide.Zap },
  { id: 'history', label: 'History', icon: Lucide.History },
];

function createRoomRateMap(): Record<string, number[]> {
  return Object.fromEntries(ROOM_TYPES.map((roomType) => [
    roomType,
    INITIAL_RATES.map((rate) => Math.round(rate * (ROOM_RATE_MULTIPLIER[roomType] ?? 1))),
  ]));
}

function formatCurrency(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  hint: string;
  icon: Lucide.LucideIcon;
  tint: 'primary' | 'success' | 'warning' | 'info';
}) {
  const colors = {
    primary: { icon: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))' },
    success: { icon: 'var(--color-success-text)', background: 'var(--color-success-bg)' },
    warning: { icon: 'var(--color-warning-text)', background: 'var(--color-warning-bg)' },
    info: { icon: 'var(--color-info-text)', background: 'var(--color-info-bg)' },
  }[tint];

  return (
    <article className="pms-card pms-card-hover flex min-w-0 items-center gap-3 p-3.5 sm:p-4">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-control" style={{ color: colors.icon, background: colors.background }}>
        <Icon size={18} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-ink-secondary">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold leading-tight text-ink tnum">{value}</p>
        <p className="mt-0.5 truncate text-[10px] text-ink-muted">{hint}</p>
      </div>
    </article>
  );
}

export function RateManagement() {
  const [activeTab, setActiveTab] = useState<RateTabId>('calendar');
  const [selectedRoomType, setSelectedRoomType] = useState('Deluxe');
  const [selectedPlanId, setSelectedPlanId] = useState('bar');
  const [rangeStart, setRangeStart] = useState(INITIAL_RANGE_START);
  const [ratesByRoomType, setRatesByRoomType] = useState<Record<string, number[]>>(createRoomRateMap);
  const [minStays, setMinStays] = useState<number[]>([...INITIAL_MIN_STAYS]);
  const [maxStays, setMaxStays] = useState<number[]>([...INITIAL_MAX_STAYS]);
  const [closedToArrival, setClosedToArrival] = useState<boolean[]>([...INITIAL_CLOSED_TO_ARRIVAL]);
  const [closedToDeparture, setClosedToDeparture] = useState<boolean[]>([...INITIAL_CLOSED_TO_DEPARTURE]);
  const [stopSell, setStopSell] = useState<boolean[]>([...INITIAL_STOP_SELL]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([...INITIAL_RATE_PLANS]);
  const [seasons, setSeasons] = useState<Season[]>([...INITIAL_SEASONS]);
  const [history, setHistory] = useState<RateHistoryEvent[]>([...INITIAL_HISTORY]);
  const [connectedChannelIds, setConnectedChannelIds] = useState<string[]>(CHANNELS.map((channel) => channel.id));
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<RatePlan | null>(null);
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);

  const dates = useMemo(() => buildDateRange(rangeStart), [rangeStart]);
  const endDate = dates[dates.length - 1]?.iso ?? rangeStart;
  const dateLabel = formatDateRange(rangeStart, endDate);
  const eligiblePlans = ratePlans.filter((plan) => plan.roomTypes.includes('All room types') || plan.roomTypes.includes(selectedRoomType));
  const selectedPlan = eligiblePlans.find((plan) => plan.id === selectedPlanId) ?? eligiblePlans[0] ?? ratePlans[0];
  const planAdjustment = Math.max(0.05, (100 + (selectedPlan?.adjustmentPct ?? 0)) / 100);
  const roomAdjustment = ROOM_RATE_MULTIPLIER[selectedRoomType] ?? 1;
  const baseRates = ratesByRoomType[selectedRoomType] ?? INITIAL_RATES;
  const displayedRates = baseRates.map((rate) => Math.round(rate * roomAdjustment * planAdjustment));

  const addHistory = (title: string, detail: string, tone: RateHistoryEvent['tone'] = 'success') => {
    const event: RateHistoryEvent = {
      id: `history-${Date.now()}`,
      title,
      detail,
      user: 'Anaya Sharma',
      timestamp: 'Just now',
      tone,
    };
    setHistory((previous) => [event, ...previous]);
  };

  const updateRoomRates = (updater: (current: number[]) => number[]) => {
    setRatesByRoomType((previous) => ({
      ...previous,
      [selectedRoomType]: updater([...(previous[selectedRoomType] ?? INITIAL_RATES)]),
    }));
  };

  const handleRoomTypeChange = (roomType: string) => {
    setSelectedRoomType(roomType);
    const currentPlanApplies = ratePlans.some((plan) => plan.id === selectedPlanId && (plan.roomTypes.includes('All room types') || plan.roomTypes.includes(roomType)));
    if (!currentPlanApplies) {
      const nextPlan = ratePlans.find((plan) => plan.status === 'Active' && (plan.roomTypes.includes('All room types') || plan.roomTypes.includes(roomType)));
      if (nextPlan) setSelectedPlanId(nextPlan.id);
    }
  };

  const handleCopyRow = (row: EditableRateRow) => {
    if (row === 'rate') {
      updateRoomRates((current) => current.map(() => current[0]));
      toast(`Copied ${formatCurrency(displayedRates[0] ?? 0)} across ${dates.length} dates`, { tone: 'success' });
    } else if (row === 'minStay') {
      setMinStays((current) => current.map(() => current[0]));
      toast(`Copied ${minStays[0]} night minimum stay across all dates`, { tone: 'success' });
    } else if (row === 'maxStay') {
      setMaxStays((current) => current.map(() => current[0]));
      toast(`Copied ${maxStays[0]} night maximum stay across all dates`, { tone: 'success' });
    } else if (row === 'cta') {
      setClosedToArrival((current) => current.map(() => current[0]));
      toast('Copied closed-to-arrival rule across all dates', { tone: 'info' });
    } else if (row === 'ctd') {
      setClosedToDeparture((current) => current.map(() => current[0]));
      toast('Copied closed-to-departure rule across all dates', { tone: 'info' });
    } else {
      setStopSell((current) => current.map(() => current[0]));
      toast('Copied stop-sell rule across all dates', { tone: 'info' });
    }
    setHasUnpublishedChanges(true);
  };

  const handleBulkUpdate = (update: BulkUpdatePayload) => {
    const affectedIndexes = dates.flatMap((date, index) => (
      date.iso >= update.startDate && date.iso <= update.endDate && (!update.weekendsOnly || date.isWeekend) ? [index] : []
    ));
    const affectedDates = affectedIndexes.length;
    if (!affectedDates) {
      toast('No dates in the visible calendar matched that range', { tone: 'warning' });
      return;
    }
    const affectedSet = new Set(affectedIndexes);
    updateRoomRates((current) => current.map((rate, index) => affectedSet.has(index)
      ? Math.max(0, Math.round(rate * (1 + update.adjustmentPct / 100)))
      : rate));
    if (update.minStay !== null) {
      setMinStays((current) => current.map((value, index) => {
        return affectedSet.has(index) ? update.minStay! : value;
      }));
    }
    setHasUnpublishedChanges(true);
    addHistory('Bulk update applied', `${selectedRoomType} · ${affectedDates} dates · ${update.adjustmentPct > 0 ? '+' : ''}${update.adjustmentPct}%`, 'info');
    toast(`Bulk update applied to ${affectedDates} date${affectedDates === 1 ? '' : 's'}`, { tone: 'success' });
    setActiveTab('calendar');
  };

  const handleSavePlan = (plan: RatePlan) => {
    setRatePlans((previous) => previous.some((item) => item.id === plan.id)
      ? previous.map((item) => item.id === plan.id ? plan : item)
      : [plan, ...previous]);
    setSelectedPlanId(plan.id);
    setPlanDialogOpen(false);
    setEditingPlan(null);
    setHasUnpublishedChanges(true);
    addHistory(editingPlan ? 'Rate plan updated' : 'Rate plan created', `${plan.name} · ${plan.channels.length} channels`);
    toast(`${plan.name} ${editingPlan ? 'updated' : 'created'}`, { tone: 'success' });
  };

  const handleTogglePlanStatus = (plan: RatePlan) => {
    const status: RatePlan['status'] = plan.status === 'Active' ? 'Inactive' : 'Active';
    setRatePlans((previous) => previous.map((item) => item.id === plan.id ? { ...item, status } : item));
    setHasUnpublishedChanges(true);
    addHistory(`Rate plan ${status.toLowerCase()}`, plan.name, status === 'Active' ? 'success' : 'warning');
    toast(`${plan.name} ${status === 'Active' ? 'activated' : 'paused'}`, { tone: status === 'Active' ? 'success' : 'info' });
  };

  const handleSaveSeason = (season: Season) => {
    setSeasons((previous) => [season, ...previous]);
    setSeasonDialogOpen(false);
    setHasUnpublishedChanges(true);
    addHistory('Seasonal pricing added', `${season.name} · ${season.adjustmentPct > 0 ? '+' : ''}${season.adjustmentPct}%`, 'info');
    toast(`${season.name} added to seasonal pricing`, { tone: 'success' });
  };

  const handleToggleSeason = (season: Season) => {
    const status: Season['status'] = season.status === 'Active' ? 'Scheduled' : 'Active';
    setSeasons((previous) => previous.map((item) => item.id === season.id ? { ...item, status } : item));
    setHasUnpublishedChanges(true);
    toast(`${season.name} ${status === 'Active' ? 'activated' : 'paused'}`, { tone: 'info' });
  };

  const handleToggleChannel = (channelId: string) => {
    const isConnected = connectedChannelIds.includes(channelId);
    setConnectedChannelIds((previous) => isConnected ? previous.filter((id) => id !== channelId) : [...previous, channelId]);
    setHasUnpublishedChanges(true);
    const channel = CHANNELS.find((item) => item.id === channelId)?.name ?? channelId;
    toast(`${channel} ${isConnected ? 'paused' : 'connected'} for distribution`, { tone: 'info' });
  };

  const handlePublish = () => {
    setHasUnpublishedChanges(false);
    addHistory('Rate changes published', `${selectedRoomType} · ${selectedPlan?.name ?? 'Rate plan'} · ${connectedChannelIds.length} connected channels`);
    toast(`Rates published to ${connectedChannelIds.length} connected channels`, { tone: 'success', detail: 'This is a local demo action; no external channel was contacted.' });
  };

  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanDialogOpen(true);
  };

  const openEditPlan = (plan: RatePlan) => {
    setEditingPlan(plan);
    setPlanDialogOpen(true);
  };

  const metrics = [
    { label: 'Active rate plans', value: String(ratePlans.filter((plan) => plan.status === 'Active').length), hint: `${ratePlans.length} configured`, icon: Lucide.Layers3, tint: 'primary' as const },
    { label: 'Room inventory', value: '50', hint: 'Across 6 room types', icon: Lucide.BedDouble, tint: 'info' as const },
    { label: 'Average daily rate', value: '₹8,450', hint: '+12% vs last month', icon: Lucide.CircleDollarSign, tint: 'success' as const },
    { label: 'Occupancy forecast', value: '78%', hint: '+6% vs last month', icon: Lucide.ChartNoAxesCombined, tint: 'warning' as const },
    { label: 'Projected revenue', value: '₹4,22,500', hint: 'Next 30 days', icon: Lucide.TrendingUp, tint: 'success' as const },
  ];

  return (
    <div className="flex w-full flex-col gap-5 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20 mt-0.5">
            <Lucide.SlidersHorizontal size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[26px] font-bold tracking-tight text-ink leading-tight">Rate Management</h1>
              <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-[10px] font-bold text-success-text border border-success-border/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-text opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-text"></span>
                </span>
                Active Rates
              </span>
            </div>
            <p className="text-xs text-ink-secondary mt-1">Control pricing, stay rules and channel distribution from one workspace.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setActiveTab('bulk')} className="pms-btn-ghost min-h-[40px] px-3.5 py-2 text-xs"><Lucide.Zap size={14} /> Bulk update</button>
          <button type="button" onClick={openCreatePlan} className="pms-btn-primary min-h-[40px] px-3.5 py-2 text-xs"><Lucide.Plus size={15} /> Create rate plan</button>
          <button type="button" onClick={handlePublish} disabled={!hasUnpublishedChanges} className="pms-btn-ghost min-h-[40px] px-3.5 py-2 text-xs disabled:opacity-50"><Lucide.Upload size={14} /> Publish rates</button>
        </div>
      </header>

      <section className="pms-stagger grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5" aria-label="Rate management summary">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="pms-card grid gap-3 p-4 sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(180px,0.8fr)_minmax(240px,1.2fr)_minmax(0,1fr)] lg:items-end" aria-label="Rate calendar filters">
        <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-ink-secondary">
          Room type
          <select value={selectedRoomType} onChange={(event) => handleRoomTypeChange(event.target.value)} className="pms-input min-h-[40px] w-full text-xs font-semibold">
            {ROOM_TYPES.map((roomType) => <option key={roomType} value={roomType}>{roomType}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-ink-secondary">
          Rate plan
          <select value={selectedPlan?.id ?? ''} onChange={(event) => setSelectedPlanId(event.target.value)} className="pms-input min-h-[40px] w-full text-xs font-semibold">
            {eligiblePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select>
        </label>
        <div className="flex min-h-[40px] items-center justify-between gap-3 rounded-control border px-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted-surface)' }}>
          <span className="text-[11px] font-medium text-ink-secondary">Selected window</span>
          <span className="text-xs font-semibold text-ink">{dateLabel}</span>
        </div>
      </section>

      <section className="pms-card overflow-hidden">
        <div
          className="no-scrollbar flex overflow-x-auto border-b px-2 sm:px-3"
          role="tablist"
          aria-label="Rate management sections"
          style={{ borderColor: 'var(--color-border)' }}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            const currentIndex = TABS.findIndex((tab) => `rate-tab-${tab.id}` === document.activeElement?.id);
            const step = event.key === 'ArrowRight' ? 1 : -1;
            const next = TABS[(currentIndex + step + TABS.length) % TABS.length];
            setActiveTab(next.id);
            document.getElementById(`rate-tab-${next.id}`)?.focus();
          }}
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const selected = activeTab === id;
            return (
              <button key={id} type="button" role="tab" tabIndex={selected ? 0 : -1} id={`rate-tab-${id}`} aria-selected={selected} aria-controls="rate-tab-panel" onClick={() => setActiveTab(id)} className={`relative flex min-h-[48px] flex-none items-center gap-2 px-3 text-xs font-semibold transition-colors sm:px-4 ${selected ? 'text-primary' : 'text-ink-muted hover:text-ink'}`}>
                <Icon size={15} aria-hidden="true" />{label}
                {selected && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary sm:inset-x-4" />}
              </button>
            );
          })}
        </div>

        <div id="rate-tab-panel" role="tabpanel" aria-labelledby={`rate-tab-${activeTab}`} className="min-w-0 p-3 sm:p-4">
          {activeTab === 'calendar' && selectedPlan && (
            <div className="flex flex-col gap-4">
              <RateCalendarPanel
                roomType={selectedRoomType}
                plan={{ ...selectedPlan, channels: selectedPlan.channels.filter((channelId) => connectedChannelIds.includes(channelId)) }}
                dates={dates}
                businessDate={BUSINESS_DATE}
                startLabel={dateLabel}
                rates={displayedRates}
                minStays={minStays}
                maxStays={maxStays}
                closedToArrival={closedToArrival}
                closedToDeparture={closedToDeparture}
                stopSell={stopSell}
                availability={INITIAL_AVAILABILITY}
                demand={INITIAL_DEMAND}
                onPrevious={() => setRangeStart((current) => shiftDate(current, -15))}
                onNext={() => setRangeStart((current) => shiftDate(current, 15))}
                onToday={() => setRangeStart(shiftDate(BUSINESS_DATE, -3))}
                onRateChange={(index, value) => {
                  const divisor = Math.max(0.05, roomAdjustment * planAdjustment);
                  updateRoomRates((current) => current.map((rate, itemIndex) => itemIndex === index ? Math.max(0, Math.round(value / divisor)) : rate));
                  setHasUnpublishedChanges(true);
                }}
                onMinStayChange={(index, value) => { setMinStays((current) => current.map((item, itemIndex) => itemIndex === index ? Math.max(1, value) : item)); setHasUnpublishedChanges(true); }}
                onMaxStayChange={(index, value) => { setMaxStays((current) => current.map((item, itemIndex) => itemIndex === index ? Math.max(1, value) : item)); setHasUnpublishedChanges(true); }}
                onRestrictionChange={(row, index, value) => {
                  const setter = row === 'cta' ? setClosedToArrival : row === 'ctd' ? setClosedToDeparture : setStopSell;
                  setter((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
                  setHasUnpublishedChanges(true);
                }}
                onCopyRow={handleCopyRow}
              />

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
                <RatePerformancePanel />
                {selectedPlan && (
                  <aside className="pms-card flex flex-col p-4 sm:p-5" aria-labelledby="selected-plan-title">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-control bg-primary/10 text-primary"><Lucide.Tag size={16} /></span>
                        <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Selected rate plan</p><h2 id="selected-plan-title" className="mt-0.5 truncate text-sm font-bold text-ink">{selectedPlan.name}</h2></div>
                      </div>
                      <span className={`tnum rounded-full px-2.5 py-1 text-[11px] font-bold ${selectedPlan.adjustmentPct < 0 ? 'bg-success-bg text-success-text' : selectedPlan.adjustmentPct > 0 ? 'bg-warning-bg text-warning-text' : 'bg-muted-surface text-ink-secondary'}`}>{selectedPlan.adjustmentPct > 0 ? '+' : ''}{selectedPlan.adjustmentPct}%</span>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-ink-secondary">{selectedPlan.description}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t pt-4 text-xs" style={{ borderColor: 'var(--color-divider)' }}>
                      <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Meal plan</dt><dd className="mt-1 font-medium text-ink">{selectedPlan.mealPlan}</dd></div>
                      <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Coverage</dt><dd className="mt-1 font-medium text-ink">{selectedPlan.channels.filter((id) => connectedChannelIds.includes(id)).length} channels</dd></div>
                      <div className="col-span-2"><dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Cancellation</dt><dd className="mt-1 font-medium text-ink">{selectedPlan.cancellationPolicy}</dd></div>
                    </dl>
                    <div className="mt-auto flex gap-2 pt-5">
                      <button type="button" onClick={() => openEditPlan(selectedPlan)} className="pms-btn-ghost flex-1 px-3 py-2 text-xs"><Lucide.Pencil size={13} /> Edit plan</button>
                      <button type="button" onClick={() => {
                        const clone: RatePlan = { ...selectedPlan, id: `plan-${Date.now()}`, code: `${selectedPlan.code.slice(0, 8)}-COPY`, name: `${selectedPlan.name} copy`, status: 'Inactive' };
                        setRatePlans((previous) => [clone, ...previous]);
                        setSelectedPlanId(clone.id);
                        setHasUnpublishedChanges(true);
                        addHistory('Rate plan cloned', clone.name, 'info');
                        toast(`${selectedPlan.name} cloned`, { tone: 'success' });
                      }} aria-label="Clone selected rate plan" className="pms-btn-ghost min-w-[42px] px-2 py-2"><Lucide.Copy size={14} /></button>
                    </div>
                  </aside>
                )}
              </div>
            </div>
          )}
          {activeTab === 'plans' && <RatePlansPanel plans={ratePlans} onCreate={openCreatePlan} onEdit={openEditPlan} onToggleStatus={handleTogglePlanStatus} />}
          {activeTab === 'seasonality' && <SeasonalityPanel seasons={seasons} onAdd={() => setSeasonDialogOpen(true)} onToggleStatus={handleToggleSeason} />}
          {activeTab === 'restrictions' && <RateRestrictionsPanel dates={dates} minStays={minStays} maxStays={maxStays} closedToArrival={closedToArrival} closedToDeparture={closedToDeparture} stopSell={stopSell} onOpenCalendar={() => setActiveTab('calendar')} />}
          {activeTab === 'mapping' && <ChannelMappingPanel channels={CHANNELS} connectedChannelIds={connectedChannelIds} plans={ratePlans} onToggle={handleToggleChannel} onSync={(channel) => { addHistory('Channel sync requested', channel.name, 'info'); toast(`${channel.name} sync completed`, { tone: 'success', detail: 'Demo action; no external channel was contacted.' }); }} />}
          {activeTab === 'bulk' && <BulkUpdatePanel startDate={rangeStart} endDate={endDate} onApply={handleBulkUpdate} />}
          {activeTab === 'history' && <HistoryPanel events={history} />}
        </div>
      </section>

      {planDialogOpen && <RatePlanDialog key={editingPlan?.id ?? 'new-rate-plan'} open plan={editingPlan} roomTypes={ROOM_TYPES} channelIds={CHANNELS.map((channel) => channel.id)} onClose={() => { setPlanDialogOpen(false); setEditingPlan(null); }} onSave={handleSavePlan} />}
      {seasonDialogOpen && <SeasonDialog open onClose={() => setSeasonDialogOpen(false)} onSave={handleSaveSeason} />}
    </div>
  );
}
