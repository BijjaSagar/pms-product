import { Button } from '../../../components/primitives';
import * as Lucide from 'lucide-react';
import { formatSeasonPeriod } from './data';
import type { Season } from './types';

interface Props {
  seasons: Season[];
  onAdd: () => void;
  onToggleStatus: (season: Season) => void;
}

export function SeasonalityPanel({ seasons, onAdd, onToggleStatus }: Props) {
  return (
    <section className="pms-card overflow-hidden" aria-labelledby="seasonality-title">
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-warning-text to-warning-border text-white shadow-xs shadow-warning-text/20">
            <Lucide.SunMedium size={18} strokeWidth={2.4} />
          </div>
          <div>
            <h2 id="seasonality-title" className="text-body font-bold text-ink tracking-tight">Seasonal Pricing</h2>
            <p className="text-label text-ink-muted mt-0.5">Set date-based adjustments for holidays, demand peaks and low seasons</p>
          </div>
        </div>
        <Button variant="primary" type="button" onClick={onAdd} >
          <Lucide.Plus size={15} /> Add season
        </Button>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 sm:p-5">
        {seasons.map((season) => {
          const positive = season.adjustmentPct > 0;
          const active = season.status === 'Active';
          return (
            <article key={season.id} className="pms-card pms-card-hover flex min-h-[168px] flex-col justify-between p-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-control" style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))', color: 'var(--color-primary)' }}>
                      <Lucide.CalendarRange size={17} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-body font-semibold text-ink">{season.name}</h3>
                      <p className="mt-0.5 text-label text-ink-muted">{formatSeasonPeriod(season.startDate, season.endDate)}</p>
                    </div>
                  </div>
                  <span className={`tnum rounded-full px-2.5 py-1 text-label font-bold ${positive ? 'bg-warning-bg text-warning-text' : 'bg-success-bg text-success-text'}`}>
                    {positive ? '+' : ''}{season.adjustmentPct}%
                  </span>
                </div>
                <p className="mt-4 text-label leading-relaxed text-ink-secondary">
                  {positive ? 'Increase rates' : 'Reduce rates'} during this season across applicable room types.
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--color-divider)' }}>
                <span className={`inline-flex items-center gap-1.5 text-label font-semibold ${active ? 'text-success-text' : 'text-ink-muted'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-success-text' : 'bg-ink-disabled'}`} />{season.status}
                </span>
                <Button variant="link" type="button" onClick={() => onToggleStatus(season)} className="hover:underline">
                  {active ? 'Pause season' : 'Activate'}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {seasons.length === 0 && <p className="p-10 text-center text-body text-ink-muted">No seasonal rules yet. Add a season to get started.</p>}
    </section>
  );
}
