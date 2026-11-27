import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { requireActivePropertyId } from '../../../../shared/services/propertyAccess';
import { roomListingApi } from '../../../../shared/services/roomListingApi';
import { useApiResource } from '../../../../shared/services/useApiResource';
import { Button, Checkbox, IconButton } from '../../../../shared/components/ui/primitives';
import { PageTabs } from '../../../../shared/components/ui/PageTabs';
import { inputClass } from '../../../../shared/utils/styling';
import { OCCUPANCIES, SALES_CHANNELS, WEEK_DAYS, defaultGridRate } from './data';
import type { Occupancy, RateGrid, RatePlan, SalesChannel } from './types';

interface Props {
  plan: RatePlan;
  saved: RateGrid;
  onBack: () => void;
  onEditPlan: () => void;
  onSave: (grid: RateGrid) => void;
}

const HEAD = 'border border-border bg-muted-surface px-3 py-2 text-left font-semibold text-ink';
const CELL = 'border border-border px-3 py-1 text-ink-secondary';
const RATE_INPUT = inputClass('tnum min-h-[34px] w-full min-w-[84px] md:min-h-[32px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none');

export function PlanRateEditor({ plan, saved, onBack, onEditPlan, onSave }: Props) {
  const [channel, setChannel] = useState<SalesChannel>('Direct');
  const [dayWise, setDayWise] = useState(false);
  const [draft, setDraft] = useState<RateGrid>(saved);
  const [dirty, setDirty] = useState(false);

  // The property's own room categories, each priced only for the meal plans it offers.
  const loadCategories = useCallback(() => roomListingApi.list(requireActivePropertyId()), []);
  const categoriesResource = useApiResource(loadCategories);
  const categories = categoriesResource.data ?? [];
  const priced = categories.filter((category) => category.mealPlans.length > 0);
  const unpriced = categories.filter((category) => category.mealPlans.length === 0);

  const setRate = (cellKey: string, column: string, value: string) => {
    setDraft((previous) => {
      const next = { ...previous };
      // A new all-days rate replaces whatever single days had been set.
      if (column === 'All Days') WEEK_DAYS.forEach((day) => delete next[`${cellKey}|${day}`]);
      next[`${cellKey}|${column}`] = Math.max(0, Number(value));
      return next;
    });
    setDirty(true);
  };

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby="plan-rates-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton variant="ghost" type="button" onClick={onBack} aria-label="Back to plans" title="Back to plans">
            <Lucide.ArrowLeft size={16} />
          </IconButton>
          <h2 id="plan-rates-title" className="truncate text-title font-bold text-ink">{plan.name}</h2>
          <span role="img" aria-label={`Colour ${plan.color}`} className="h-5 w-5 flex-none rounded" style={{ background: plan.color }} />
          <IconButton variant="ghost" type="button" onClick={onEditPlan} aria-label={`Edit ${plan.name} details`} title="Edit name and colour">
            <Lucide.Pencil size={15} />
          </IconButton>
        </div>
        <Button variant="primary" type="button" disabled={!dirty} onClick={() => { onSave(draft); setDirty(false); }}>
          <Lucide.Check size={14} /> Save rates
        </Button>
      </div>

      <PageTabs
        label="Sales channel"
        idPrefix="plan-rates"
        panelId="plan-rates-panel"
        active={channel}
        onChange={setChannel}
        tabs={SALES_CHANNELS.map((id) => ({ id, label: id }))}
      />

      <div id="plan-rates-panel" role="tabpanel" aria-labelledby={`plan-rates-tab-${channel}`} className="flex min-w-0 flex-col gap-3">
        <Checkbox label="Day wise Breakup" checked={dayWise} onChange={(event) => setDayWise(event.target.checked)} />
        {categoriesResource.error ? (
          <p role="alert" className="text-label text-danger-text">Could not load room categories: {categoriesResource.error}</p>
        ) : categoriesResource.data === null ? (
          <p className="text-label text-ink-muted">Loading room categories…</p>
        ) : priced.length === 0 ? (
          <p className="text-label text-ink-muted">No room category offers a meal plan yet. Choose meal plans in Settings › Room Setup.</p>
        ) : dayWise ? (
          // One row per occupancy, so the seven day columns fit across.
          <div className="pms-table-scroll w-full min-w-0">
            <table className="pms-matrix-table min-w-[1040px] text-label">
              <thead>
                <tr>
                  <th className={HEAD}>Category</th>
                  <th className={HEAD}>Meal Plan</th>
                  <th className={HEAD}>Occupancy</th>
                  {WEEK_DAYS.map((day) => <th key={day} className={HEAD}>{day}</th>)}
                </tr>
              </thead>
              <tbody>
                {priced.flatMap((room) => room.mealPlans.flatMap((mealPlan, mealIndex) => OCCUPANCIES.map((occupancy, occupancyIndex) => {
                  const cellKey = `${channel}|${room.id}|${mealPlan}|${occupancy}`;
                  const allDays = draft[`${cellKey}|All Days`] ?? defaultGridRate(mealPlan, occupancy, plan.adjustmentPct);
                  return (
                    <tr key={cellKey}>
                      {mealIndex === 0 && occupancyIndex === 0 && (
                        <th scope="rowgroup" rowSpan={room.mealPlans.length * OCCUPANCIES.length} className={`${CELL} text-left font-medium`}>{room.name}</th>
                      )}
                      {occupancyIndex === 0 && <td rowSpan={OCCUPANCIES.length} className={CELL}>{mealPlan}</td>}
                      <td className={`${CELL} whitespace-nowrap`}>{occupancy}</td>
                      {WEEK_DAYS.map((day) => (
                        <td key={day} className={CELL}>
                          <input
                            type="number"
                            min={0}
                            aria-label={`${room.name} ${mealPlan} ${occupancy} ${day}`}
                            value={draft[`${cellKey}|${day}`] ?? allDays}
                            onChange={(event) => setRate(cellKey, day, event.target.value)}
                            className={RATE_INPUT}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })))}
              </tbody>
            </table>
          </div>
        ) : (
          // One row per category and meal plan, with the occupancies across, so the grid stays short.
          <div className="pms-table-scroll w-full min-w-0">
            <table className="pms-matrix-table min-w-[640px] text-label">
              <thead>
                <tr>
                  <th className={HEAD}>Category</th>
                  <th className={HEAD}>Meal Plan</th>
                  {OCCUPANCIES.map((occupancy) => <th key={occupancy} className={HEAD}>{occupancy}</th>)}
                </tr>
              </thead>
              <tbody>
                {priced.flatMap((room) => room.mealPlans.map((mealPlan, mealIndex) => (
                  <tr key={`${room.id}|${mealPlan}`}>
                    {mealIndex === 0 && (
                      <th scope="rowgroup" rowSpan={room.mealPlans.length} className={`${CELL} text-left font-medium`}>{room.name}</th>
                    )}
                    <td className={CELL}>{mealPlan}</td>
                    {OCCUPANCIES.map((occupancy: Occupancy) => {
                      const cellKey = `${channel}|${room.id}|${mealPlan}|${occupancy}`;
                      const varies = WEEK_DAYS.some((day) => draft[`${cellKey}|${day}`] !== undefined);
                      const allDays = draft[`${cellKey}|All Days`] ?? defaultGridRate(mealPlan, occupancy, plan.adjustmentPct);
                      return (
                        <td key={occupancy} className={CELL}>
                          <input
                            type="number"
                            min={0}
                            aria-label={`${room.name} ${mealPlan} ${occupancy} all days`}
                            value={varies ? '' : allDays}
                            placeholder={varies ? 'Varies' : undefined}
                            onChange={(event) => setRate(cellKey, 'All Days', event.target.value)}
                            className={RATE_INPUT}
                          />
                        </td>
                      );
                    })}
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
        {unpriced.length > 0 ? (
          <p className="text-label text-ink-muted">
            Not priced, as they offer no meal plan: {unpriced.map((category) => category.name).join(', ')}.
          </p>
        ) : null}
      </div>
    </section>
  );
}
