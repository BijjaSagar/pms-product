import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { IconButton } from '../../../../shared/components/ui/primitives';
import { BUSINESS_DATE, formatSeasonPeriod } from './data';
import type { Season } from './types';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** The days of one month, with leading blanks so weeks start on Monday. */
function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const blanks = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length }, (_, index) => new Date(Date.UTC(year, month, index + 1)).toISOString().slice(0, 10)),
  ];
}

export function YearCalendarPanel({ seasons }: { seasons: Season[] }) {
  const [year, setYear] = useState(() => Number(BUSINESS_DATE.slice(0, 4)));
  const yearSeasons = seasons.filter((season) => season.startDate <= `${year}-12-31` && season.endDate >= `${year}-01-01`);

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby="year-calendar-title">
      <div className="flex items-center justify-center gap-3">
        <IconButton variant="ghost" type="button" onClick={() => setYear(year - 1)} aria-label="Previous year">
          <Lucide.ChevronLeft size={16} />
        </IconButton>
        <h2 id="year-calendar-title" className="tnum text-title font-bold text-ink" aria-live="polite">{year}</h2>
        <IconButton variant="ghost" type="button" onClick={() => setYear(year + 1)} aria-label="Next year">
          <Lucide.ChevronRight size={16} />
        </IconButton>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, month) => {
          const name = new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
          return (
            <div key={month} className="rounded-card border border-border p-2.5">
              <h3 className="mb-1.5 text-center text-label font-bold text-ink">{name}</h3>
              <div className="grid grid-cols-7 gap-0.5 text-center text-label">
                {WEEKDAYS.map((day) => <span key={day} className="text-micro font-bold text-ink-muted">{day}</span>)}
                {monthCells(year, month).map((iso, index) => {
                  if (!iso) return <span key={`blank-${index}`} />;
                  const season = yearSeasons.find((item) => iso >= item.startDate && iso <= item.endDate);
                  return (
                    <span
                      key={iso}
                      title={season?.name}
                      className={`tnum rounded py-1 ${season ? 'bg-primary/15 font-semibold text-primary' : 'text-ink'} ${iso === BUSINESS_DATE ? 'ring-1 ring-primary' : ''}`}
                    >
                      {Number(iso.slice(8))}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {yearSeasons.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-label text-ink-secondary" aria-label="Seasons this year">
          {yearSeasons.map((season) => (
            <li key={season.id} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-3 w-3 rounded bg-primary/15" />
              <span className="font-semibold text-ink">{season.name}</span>
              {formatSeasonPeriod(season.startDate, season.endDate)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
