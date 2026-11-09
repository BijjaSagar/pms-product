import { useMemo, useState } from 'react';
import { FLOOR_PLAN, ROOM_TYPES as CATALOG_ROOM_TYPES } from '../../data/catalog';
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
import { Button, SelectField } from '../../components/primitives';
import { Field } from '../../components/controls';
import { PageTabs } from '../../components/PageTabs';
import type { PageTab } from '../../components/PageTabs';
import { SummaryStrip } from '../../components/SummaryStrip';
import type { SummaryItem } from '../../components/SummaryStrip';
import { Badge } from '../../components/ui';

const ROOM_RATE_MULTIPLIER: Record<string, number> = {
  Standard: 0.72,
  Deluxe: 1,
  Superior: 1.16,
  Executive: 1.42,
  Family: 1.72,
  Suite: 2.15,
};

const TABS: PageTab<RateTabId>[] = [
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

  const metrics: SummaryItem[] = [
    { label: 'Active rate plans', value: String(ratePlans.filter((plan) => plan.status === 'Active').length), hint: `${ratePlans.length} configured`, icon: Lucide.Layers3, tone: 'primary' },
    { label: 'Room inventory', value: String(FLOOR_PLAN.reduce((sum, plan) => sum + plan.count, 0)), hint: `Across ${CATALOG_ROOM_TYPES.length} room types`, icon: Lucide.BedDouble, tone: 'info' },
    { label: 'Average daily rate', value: '₹8,450', hint: 'Demo forecast', icon: Lucide.CircleDollarSign, tone: 'success' },
    { label: 'Occupancy forecast', value: '78%', hint: 'Demo forecast', icon: Lucide.ChartNoAxesCombined, tone: 'warning' },
    { label: 'Projected revenue', value: '₹4,22,500', hint: 'Next 30 days', icon: Lucide.TrendingUp, tone: 'success' },
  ];

  const planAdjustmentLabel = (pct: number) => `${pct > 0 ? '+' : ''}${pct}%`;

  return (
    <div className="pms-page gap-5">
      {/* Title, publish state and the actions that matter most */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-primary-foreground shadow-xs shadow-primary/20">
            <Lucide.SlidersHorizontal size={20} strokeWidth={2.4} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-disp3 font-bold leading-tight tracking-tight text-ink">Rate Management</h1>
            <p className="mt-0.5 text-label text-ink-secondary">Pricing, stay rules and channel distribution in one place.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span role="status" className="mr-1">
            {hasUnpublishedChanges ? (
              <Badge tone="warning" dot>Unpublished changes</Badge>
            ) : (
              <Badge tone="success" dot>All changes published</Badge>
            )}
          </span>
          <Button variant="secondary" onClick={() => setActiveTab('bulk')} icon={<Lucide.Zap size={14} />}>
            Bulk update
          </Button>
          <Button variant="secondary" onClick={openCreatePlan} icon={<Lucide.Plus size={15} />}>
            Create rate plan
          </Button>
          <Button variant="primary" onClick={handlePublish} disabled={!hasUnpublishedChanges} icon={<Lucide.Upload size={14} />}>
            Publish rates
          </Button>
        </div>
      </header>

      <SummaryStrip label="Rate management summary" items={metrics} />

      {/* What the calendar below is showing */}
      <section className="pms-card flex flex-col gap-3 p-4 md:flex-row md:items-end" aria-label="Calendar filters">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Room type">
            <SelectField value={selectedRoomType} onChange={(event) => handleRoomTypeChange(event.target.value)}>
              {ROOM_TYPES.map((roomType) => <option key={roomType} value={roomType}>{roomType}</option>)}
            </SelectField>
          </Field>
          <Field label="Rate plan">
            <SelectField value={selectedPlan?.id ?? ''} onChange={(event) => setSelectedPlanId(event.target.value)}>
              {eligiblePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </SelectField>
          </Field>
        </div>
        <div className="flex min-h-[34px] items-center gap-2 rounded-lg bg-muted-surface px-3 text-label md:min-h-[32px]">
          <Lucide.CalendarRange size={14} className="flex-none text-ink-muted" aria-hidden="true" />
          <span className="text-ink-secondary">Window</span>
          <span className="font-semibold text-ink">{dateLabel}</span>
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-3">
        <PageTabs label="Rate management sections" idPrefix="rate" panelId="rate-tab-panel" tabs={TABS} active={activeTab} onChange={setActiveTab} />

        <div id="rate-tab-panel" role="tabpanel" aria-labelledby={`rate-tab-${activeTab}`} className="pms-card min-w-0 p-3 sm:p-4">
          {activeTab === 'calendar' && selectedPlan && (
            <div className="flex flex-col gap-5">
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

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)] xl:items-start">
                <RatePerformancePanel />
                <aside className="pms-card flex flex-col p-4 sm:p-5" aria-labelledby="selected-plan-title">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Lucide.Tag size={16} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-micro font-bold uppercase tracking-[0.14em] text-ink-muted">Selected rate plan</p>
                        <h2 id="selected-plan-title" className="mt-0.5 truncate text-title font-bold text-ink">{selectedPlan.name}</h2>
                      </div>
                    </div>
                    <Badge tone={selectedPlan.adjustmentPct < 0 ? 'success' : selectedPlan.adjustmentPct > 0 ? 'warning' : 'neutral'}>
                      {planAdjustmentLabel(selectedPlan.adjustmentPct)}
                    </Badge>
                  </div>
                  <p className="mt-3 text-label leading-relaxed text-ink-secondary">{selectedPlan.description}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-divider pt-4 text-label">
                    <div>
                      <dt className="text-micro font-bold uppercase tracking-[0.14em] text-ink-muted">Meal plan</dt>
                      <dd className="mt-1 font-medium text-ink">{selectedPlan.mealPlan}</dd>
                    </div>
                    <div>
                      <dt className="text-micro font-bold uppercase tracking-[0.14em] text-ink-muted">Coverage</dt>
                      <dd className="mt-1 font-medium text-ink">{selectedPlan.channels.filter((id) => connectedChannelIds.includes(id)).length} channels</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-micro font-bold uppercase tracking-[0.14em] text-ink-muted">Cancellation</dt>
                      <dd className="mt-1 font-medium text-ink">{selectedPlan.cancellationPolicy}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto flex gap-2 pt-5">
                    <Button variant="secondary" onClick={() => openEditPlan(selectedPlan)} icon={<Lucide.Pencil size={13} />} className="flex-1">
                      Edit plan
                    </Button>
                    <Button
                      variant="secondary"
                      aria-label="Clone selected rate plan"
                      title="Clone this plan"
                      onClick={() => {
                        const clone: RatePlan = { ...selectedPlan, id: `plan-${Date.now()}`, code: `${selectedPlan.code.slice(0, 8)}-COPY`, name: `${selectedPlan.name} copy`, status: 'Inactive' };
                        setRatePlans((previous) => [clone, ...previous]);
                        setSelectedPlanId(clone.id);
                        setHasUnpublishedChanges(true);
                        addHistory('Rate plan cloned', clone.name, 'info');
                        toast(`${selectedPlan.name} cloned`, { tone: 'success' });
                      }}
                      className="min-w-[42px]"
                    >
                      <Lucide.Copy size={14} />
                    </Button>
                  </div>
                </aside>
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
      </div>

      {planDialogOpen && <RatePlanDialog key={editingPlan?.id ?? 'new-rate-plan'} open plan={editingPlan} roomTypes={ROOM_TYPES} channelIds={CHANNELS.map((channel) => channel.id)} onClose={() => { setPlanDialogOpen(false); setEditingPlan(null); }} onSave={handleSavePlan} />}
      {seasonDialogOpen && <SeasonDialog open onClose={() => setSeasonDialogOpen(false)} onSave={handleSaveSeason} />}
    </div>
  );
}
