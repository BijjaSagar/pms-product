import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { ROOM_TYPES } from '../../../data/catalog';
import { Button, Checkbox, IconButton } from '../../../components/ui/primitives';
import { PageTabs } from '../../../components/ui/PageTabs';
import { inputClass } from '../../../utils/styling';
import { MEAL_PLAN_CODES, OCCUPANCIES, SALES_CHANNELS, WEEK_DAYS, defaultGridRate } from './data';
import type { RateGrid, RatePlan, SalesChannel } from './types';

interface Props {
  plan: RatePlan;
  saved: RateGrid;
  onBack: () => void;
  onEditPlan: () => void;
  onSave: (grid: RateGrid) => void;
}

const HEAD = 'border border-border bg-muted-surface px-3 py-2 text-left font-semibold text-ink';
const CELL = 'border border-border px-3 py-1 text-ink-secondary';

export function PlanRateEditor({ plan, saved, onBack, onEditPlan, onSave }: Props) {
  const [channel, setChannel] = useState<SalesChannel>('Direct');
  const [dayWise, setDayWise] = useState(false);
  const [draft, setDraft] = useState<RateGrid>(saved);
  const [dirty, setDirty] = useState(false);

  const columns = dayWise ? WEEK_DAYS : ['All Days'];
  const rooms = ROOM_TYPES.filter((room) => room.isActive);

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
        {/* Half width for the single rate column; seven day columns need the whole row. */}
        <div className={`pms-table-scroll min-w-0 ${dayWise ? 'w-full' : 'w-full xl:w-1/2'}`}>
          <table className={`pms-matrix-table text-label ${dayWise ? 'min-w-[1040px]' : 'min-w-[400px]'}`}>
            <thead>
              <tr>
                <th className={HEAD}>Category</th>
                <th className={HEAD}>Meal Plan</th>
                <th className={HEAD}>Occupancy</th>
                {columns.map((column) => <th key={column} className={HEAD}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {rooms.flatMap((room) => MEAL_PLAN_CODES.flatMap((mealPlan, mealIndex) => OCCUPANCIES.map((occupancy, occupancyIndex) => {
                const cellKey = `${channel}|${room.id}|${mealPlan}|${occupancy}`;
                const allDays = draft[`${cellKey}|All Days`] ?? defaultGridRate(room, mealPlan, occupancy, plan.adjustmentPct);
                const varies = WEEK_DAYS.some((day) => draft[`${cellKey}|${day}`] !== undefined);
                return (
                  <tr key={cellKey}>
                    {mealIndex === 0 && occupancyIndex === 0 && (
                      <th scope="rowgroup" rowSpan={MEAL_PLAN_CODES.length * OCCUPANCIES.length} className={`${CELL} text-left font-medium`}>{room.name}</th>
                    )}
                    {occupancyIndex === 0 && <td rowSpan={OCCUPANCIES.length} className={CELL}>{mealPlan}</td>}
                    <td className={`${CELL} whitespace-nowrap`}>{occupancy}</td>
                    {columns.map((column) => (
                      <td key={column} className={CELL}>
                        <input
                          type="number"
                          min={0}
                          aria-label={`${room.name} ${mealPlan} ${occupancy} ${column}`}
                          value={dayWise ? draft[`${cellKey}|${column}`] ?? allDays : varies ? '' : allDays}
                          placeholder={!dayWise && varies ? 'Varies' : undefined}
                          onChange={(event) => setRate(cellKey, column, event.target.value)}
                          className={inputClass('tnum min-h-[34px] w-full min-w-[84px] md:min-h-[32px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none')}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
