import { useEffect, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Button, IconButton } from '../../components/primitives';
import { hotelTodayIso } from '../../utils/date';
import {
  addMonthsIso,
  formatMonthTitle,
  formatRangeDate,
  monthWeeks,
  startOfMonthIso,
} from './reservationDateRange';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export interface DateRange {
  from: string;
  to: string;
}

/*
 * Pick a stay range on one calendar. The first click sets the start, the second sets the end and
 * closes the popover. Empty bounds mean the range is open on that side.
 */
export function DateRangePicker({ from, to, onChange }: DateRange & { onChange: (range: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const today = hotelTodayIso();
  const [viewMonth, setViewMonth] = useState(() => startOfMonthIso(from || today));
  const [hovered, setHovered] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // A start without an end means the user is choosing the end date.
  const awaitingEnd = Boolean(from) && !to;

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('mousedown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const toggle = () => {
    if (!open) setViewMonth(startOfMonthIso(from || today));
    setHovered(null);
    setOpen((value) => !value);
  };

  const pickDay = (day: string) => {
    // No start yet, a finished range, or a day before the pending start all begin a new range.
    if (!from || to || day < from) {
      onChange({ from: day, to: '' });
      return;
    }
    onChange({ from, to: day });
    setOpen(false);
  };

  // While the end is pending, the hovered day previews the range.
  const previewEnd = awaitingEnd && hovered ? hovered : to;
  const rangeStart = from && previewEnd ? (previewEnd < from ? previewEnd : from) : '';
  const rangeEnd = from && previewEnd ? (previewEnd < from ? from : previewEnd) : '';

  const label =
    from && to
      ? `${formatRangeDate(from)} → ${formatRangeDate(to)}`
      : from
        ? `${formatRangeDate(from)} → Select end date`
        : 'Stay dates';

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Stay dates: ${label}`}
        onClick={toggle}
        className="pms-input flex w-full min-w-0 items-center gap-2 text-left text-label text-ink cursor-pointer"
      >
        <Lucide.CalendarRange size={15} aria-hidden="true" className="shrink-0 text-ink-muted" />
        <span className={`min-w-0 truncate ${from ? '' : 'text-ink-muted'}`}>{label}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose stay dates"
          className="absolute left-0 top-full z-40 mt-1.5 w-[296px] max-w-[calc(100vw-2.5rem)] rounded-xl border border-border bg-surface p-3 shadow-lg"
          onMouseLeave={() => setHovered(null)}
        >
          <div className="mb-2 flex items-center justify-between">
            <IconButton variant="ghost" type="button" aria-label="Previous month" onClick={() => setViewMonth((m) => addMonthsIso(m, -1))}>
              <Lucide.ChevronLeft size={16} />
            </IconButton>
            <span className="text-label font-semibold text-ink">{formatMonthTitle(viewMonth)}</span>
            <IconButton variant="ghost" type="button" aria-label="Next month" onClick={() => setViewMonth((m) => addMonthsIso(m, 1))}>
              <Lucide.ChevronRight size={16} />
            </IconButton>
          </div>

          <div className="grid grid-cols-7 gap-y-0.5 text-center">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="py-1 text-micro font-semibold uppercase text-ink-secondary">
                {weekday}
              </span>
            ))}
            {monthWeeks(viewMonth).flat().map((day, index) => {
              if (!day) return <span key={`blank-${index}`} />;
              const isEndpoint = day === from || day === previewEnd;
              const inRange = Boolean(rangeStart && rangeEnd && day >= rangeStart && day <= rangeEnd);
              const isToday = day === today;
              return (
                <button
                  key={day}
                  type="button"
                  aria-label={formatRangeDate(day)}
                  aria-pressed={isEndpoint}
                  onClick={() => pickDay(day)}
                  onMouseEnter={() => setHovered(day)}
                  className={`h-8 w-full text-label tnum transition-colors cursor-pointer ${
                    isEndpoint
                      ? 'rounded-lg bg-[var(--color-primary)] font-bold text-white'
                      : inRange
                        ? 'bg-[var(--color-muted-surface)] text-ink'
                        : 'rounded-lg text-ink hover:bg-page'
                  } ${isToday && !isEndpoint ? 'ring-1 ring-inset ring-[var(--color-primary)]/50' : ''}`}
                >
                  {Number(day.slice(8))}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-divider pt-2.5 text-micro text-ink-secondary">
            <span>{awaitingEnd ? 'Select end date' : 'Select start date'}</span>
            <Button variant="ghost" type="button" onClick={() => onChange({ from: '', to: '' })} disabled={!from && !to}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
