import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { toast } from '../../../shared/utils/toast';
import {
  CHANNELS,
  INITIAL_CLOSED_TO_ARRIVAL,
  INITIAL_CLOSED_TO_DEPARTURE,
  INITIAL_HISTORY,
  INITIAL_MAX_STAYS,
  INITIAL_MIN_STAYS,
  INITIAL_RATE_PLANS,
  INITIAL_SEASONS,
  INITIAL_STOP_SELL,
  INITIAL_RANGE_START,
  ROOM_TYPES,
  buildDateRange,
} from './rate-management/data';
import { PlanDetailsDialog } from './rate-management/PlanDetailsDialog';
import { PlanRateEditor } from './rate-management/PlanRateEditor';
import { YearCalendarPanel } from './rate-management/YearCalendarPanel';
import { BarPlansPanel } from './rate-management/BarPlansPanel';
import { BulkUpdatePanel } from './rate-management/BulkUpdatePanel';
import { ChannelMappingPanel } from './rate-management/ChannelMappingPanel';
import { HistoryPanel } from './rate-management/HistoryPanel';
import { RatePlanDialog } from './rate-management/RatePlanDialog';
import { RatePlansPanel } from './rate-management/RatePlansPanel';
import { RateRestrictionsPanel } from './rate-management/RateRestrictionsPanel';
import { SeasonDialog } from './rate-management/SeasonDialog';
import { SeasonalityPanel } from './rate-management/SeasonalityPanel';
import type { BulkUpdatePayload, RateGrid, RateHistoryEvent, RatePlan, RateSectionId, RateViewId, Season } from './rate-management/types';
import { PageTabs } from '../../../shared/components/ui/PageTabs';
import type { PageTab } from '../../../shared/components/ui/PageTabs';
import { SectionNav } from '../../../shared/components/ui/SectionNav';
import type { NavGroup } from '../../../shared/components/ui/SectionNav';
import { ComingSoonPanel } from './rate-management/ComingSoonPanel';

const SECTIONS: NavGroup<RateSectionId>[] = [
  {
    title: 'Rate management',
    items: [
      { id: 'bar', label: 'Best Available Rates', icon: Lucide.CircleDollarSign },
      { id: 'packages', label: 'Package', icon: Lucide.Package },
      { id: 'planner', label: 'Rate Planner', icon: Lucide.Layers3 },
      { id: 'restrictions', label: 'Restrictions Rule', icon: Lucide.LockKeyhole },
      { id: 'deals', label: 'Deals and Promo', icon: Lucide.BadgePercent },
      { id: 'activity', label: 'Activity Logs', icon: Lucide.History },
    ],
  },
];

const SECTION_VIEWS: Record<RateSectionId, PageTab<RateViewId>[]> = {
  bar: [
    { id: 'bar', label: 'Best Available Rates' },
  ],
  packages: [{ id: 'packages', label: 'Package' }],
  planner: [
    { id: 'yearly', label: 'Yearly calendar', icon: Lucide.CalendarDays },
    { id: 'plans', label: 'Rate plans', icon: Lucide.Layers3 },
    { id: 'seasonality', label: 'Seasonality', icon: Lucide.CalendarRange },
    { id: 'mapping', label: 'Channel mapping', icon: Lucide.Network },
    { id: 'bulk', label: 'Bulk update', icon: Lucide.Zap },
  ],
  restrictions: [{ id: 'restrictions', label: 'Restrictions Rule' }],
  deals: [{ id: 'deals', label: 'Deals and Promo' }],
  activity: [{ id: 'history', label: 'Activity Logs' }],
};

export function RateManagement() {
  const [activeView, setActiveView] = useState<RateViewId>('bar');
  const [minStays, setMinStays] = useState<number[]>([...INITIAL_MIN_STAYS]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([...INITIAL_RATE_PLANS]);
  const [seasons, setSeasons] = useState<Season[]>([...INITIAL_SEASONS]);
  const [history, setHistory] = useState<RateHistoryEvent[]>([...INITIAL_HISTORY]);
  const [connectedChannelIds, setConnectedChannelIds] = useState<string[]>(CHANNELS.map((channel) => channel.id));
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<RatePlan | null>(null);
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [rateGrids, setRateGrids] = useState<Record<string, RateGrid>>({});
  const [ratesPlanId, setRatesPlanId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const ratesPlan = ratePlans.find((plan) => plan.id === ratesPlanId);
  const activeSection = SECTIONS[0]!.items.find((section) => SECTION_VIEWS[section.id].some((view) => view.id === activeView))!.id;
  const sectionViews = SECTION_VIEWS[activeSection];
  const showViewTabs = activeSection === 'planner';
  const dates = useMemo(() => buildDateRange(INITIAL_RANGE_START), []);
  const endDate = dates[dates.length - 1]?.iso ?? INITIAL_RANGE_START;

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

  const handleBulkUpdate = (update: BulkUpdatePayload) => {
    const affectedIndexes = dates.flatMap((date, index) => (
      date.iso >= update.startDate && date.iso <= update.endDate && (!update.weekendsOnly || date.isWeekend) ? [index] : []
    ));
    const affectedDates = affectedIndexes.length;
    if (!affectedDates) {
      toast('No dates in the current window matched that range', { tone: 'warning' });
      return;
    }
    if (update.minStay !== null) {
      setMinStays((current) => current.map((value, index) => (affectedIndexes.includes(index) ? update.minStay! : value)));
    }
    addHistory('Bulk update applied', `${affectedDates} dates · ${update.adjustmentPct > 0 ? '+' : ''}${update.adjustmentPct}%`, 'info');
    toast(`Bulk update applied to ${affectedDates} date${affectedDates === 1 ? '' : 's'}`, { tone: 'success' });
  };

  const handleSavePlan = (plan: RatePlan) => {
    setRatePlans((previous) => previous.some((item) => item.id === plan.id)
      ? previous.map((item) => item.id === plan.id ? plan : item)
      : [plan, ...previous]);
    setPlanDialogOpen(false);
    setEditingPlan(null);
    addHistory(editingPlan ? 'Rate plan updated' : 'Rate plan created', `${plan.name} · ${plan.channels.length} channels`);
    toast(`${plan.name} ${editingPlan ? 'updated' : 'created'}`, { tone: 'success' });
  };

  const handleTogglePlanStatus = (plan: RatePlan) => {
    const status: RatePlan['status'] = plan.status === 'Active' ? 'Inactive' : 'Active';
    setRatePlans((previous) => previous.map((item) => item.id === plan.id ? { ...item, status } : item));
    addHistory(`Rate plan ${status.toLowerCase()}`, plan.name, status === 'Active' ? 'success' : 'warning');
    toast(`${plan.name} ${status === 'Active' ? 'activated' : 'paused'}`, { tone: status === 'Active' ? 'success' : 'info' });
  };

  const handleSaveSeason = (season: Season) => {
    setSeasons((previous) => [season, ...previous]);
    setSeasonDialogOpen(false);
    addHistory('Seasonal pricing added', `${season.name} · ${season.adjustmentPct > 0 ? '+' : ''}${season.adjustmentPct}%`, 'info');
    toast(`${season.name} added to seasonal pricing`, { tone: 'success' });
  };

  const handleToggleSeason = (season: Season) => {
    const status: Season['status'] = season.status === 'Active' ? 'Scheduled' : 'Active';
    setSeasons((previous) => previous.map((item) => item.id === season.id ? { ...item, status } : item));
    toast(`${season.name} ${status === 'Active' ? 'activated' : 'paused'}`, { tone: 'info' });
  };

  const handleToggleChannel = (channelId: string) => {
    const isConnected = connectedChannelIds.includes(channelId);
    setConnectedChannelIds((previous) => isConnected ? previous.filter((id) => id !== channelId) : [...previous, channelId]);
    const channel = CHANNELS.find((item) => item.id === channelId)?.name ?? channelId;
    toast(`${channel} ${isConnected ? 'paused' : 'connected'} for distribution`, { tone: 'info' });
  };

  const handleSaveDetails = (plan: RatePlan) => {
    setRatePlans((previous) => previous.map((item) => item.id === plan.id ? plan : item));
    setDetailsDialogOpen(false);
    addHistory('Rate plan updated', plan.name);
    toast(`${plan.name} updated`, { tone: 'success' });
  };

  const handleSaveRates = (plan: RatePlan, grid: RateGrid) => {
    setRateGrids((previous) => ({ ...previous, [plan.id]: grid }));
    addHistory('Plan rates updated', plan.name);
    toast(`${plan.name} rates saved`, { tone: 'success' });
  };

  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanDialogOpen(true);
  };

  const openEditPlan = (plan: RatePlan) => {
    setEditingPlan(plan);
    setPlanDialogOpen(true);
  };

  return (
    <div className="pms-page gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <SectionNav label="Rate management" className="lg:w-[232px]" groups={SECTIONS} active={activeSection} onSelect={(section) => { setRatesPlanId(null); setActiveView(SECTION_VIEWS[section][0]!.id); }} />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {showViewTabs && (
            <PageTabs label="Section views" idPrefix="rate" panelId="rate-view-panel" tabs={sectionViews} active={activeView} onChange={setActiveView} />
          )}

          <div
            id="rate-view-panel"
            {...(showViewTabs ? { role: 'tabpanel', 'aria-labelledby': `rate-tab-${activeView}` } : {})}
            className="pms-card min-w-0 p-3 sm:p-4"
          >
            {activeView === 'bar' && (ratesPlan
              ? <PlanRateEditor key={ratesPlan.id} plan={ratesPlan} saved={rateGrids[ratesPlan.id] ?? {}} onBack={() => setRatesPlanId(null)} onEditPlan={() => setDetailsDialogOpen(true)} onSave={(grid) => handleSaveRates(ratesPlan, grid)} />
              : <BarPlansPanel plans={ratePlans} connectedChannelIds={connectedChannelIds} onEdit={(plan) => setRatesPlanId(plan.id)} onToggleStatus={handleTogglePlanStatus} />)}
            {activeView === 'yearly' && <YearCalendarPanel seasons={seasons} />}
            {activeView === 'plans' && <RatePlansPanel plans={ratePlans} onCreate={openCreatePlan} onEdit={openEditPlan} onToggleStatus={handleTogglePlanStatus} />}
            {activeView === 'seasonality' && <SeasonalityPanel seasons={seasons} onAdd={() => setSeasonDialogOpen(true)} onToggleStatus={handleToggleSeason} />}
            {activeView === 'restrictions' && <RateRestrictionsPanel dates={dates} minStays={minStays} maxStays={INITIAL_MAX_STAYS} closedToArrival={INITIAL_CLOSED_TO_ARRIVAL} closedToDeparture={INITIAL_CLOSED_TO_DEPARTURE} stopSell={INITIAL_STOP_SELL} />}
            {activeView === 'mapping' && <ChannelMappingPanel channels={CHANNELS} connectedChannelIds={connectedChannelIds} plans={ratePlans} onToggle={handleToggleChannel} onSync={(channel) => { addHistory('Channel sync requested', channel.name, 'info'); toast(`${channel.name} sync completed`, { tone: 'success', detail: 'Demo action; no external channel was contacted.' }); }} />}
            {activeView === 'bulk' && <BulkUpdatePanel startDate={INITIAL_RANGE_START} endDate={endDate} onApply={handleBulkUpdate} />}
            {activeView === 'packages' && <ComingSoonPanel title="Package" description="Offers that bundle a room with meals or services will be managed here." icon={Lucide.Package} />}
            {activeView === 'deals' && <ComingSoonPanel title="Deals and Promo" description="Discount deals and promo codes will be managed here." icon={Lucide.BadgePercent} />}
            {activeView === 'history' && <HistoryPanel events={history} />}
          </div>
        </div>
      </div>

      {planDialogOpen && <RatePlanDialog key={editingPlan?.id ?? 'new-rate-plan'} open plan={editingPlan} roomTypes={ROOM_TYPES} channelIds={CHANNELS.map((channel) => channel.id)} onClose={() => { setPlanDialogOpen(false); setEditingPlan(null); }} onSave={handleSavePlan} />}
      {detailsDialogOpen && ratesPlan && <PlanDetailsDialog plan={ratesPlan} onClose={() => setDetailsDialogOpen(false)} onSave={handleSaveDetails} />}
      {seasonDialogOpen && <SeasonDialog open onClose={() => setSeasonDialogOpen(false)} onSave={handleSaveSeason} />}
    </div>
  );
}
