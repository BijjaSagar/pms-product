import type { LucideIcon } from 'lucide-react';
import { TONE_CLASSES } from '../theme/tone';
import type { Tone } from '../theme/tone';

export interface SummaryItem {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: Tone | 'primary';
}

/** A row of headline figures: the value first, the label above it and a hint below, with a tinted icon. */
export function SummaryStrip({
  items,
  label,
  columns = 'xs:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5',
}: {
  items: SummaryItem[];
  label: string;
  /** Responsive column classes; the default suits five items. */
  columns?: string;
}) {
  return (
    <ul aria-label={label} className={`grid grid-cols-1 gap-2.5 ${columns}`}>
      {items.map(({ label: text, value, hint, icon: Icon, tone }) => (
        <li key={text} className="min-w-0 rounded-xl border border-border bg-surface p-3.5">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-label font-medium text-ink-secondary">{text}</p>
            <span
              className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg ${
                tone === 'primary' ? 'bg-primary/10 text-primary' : `${TONE_CLASSES[tone].bg} ${TONE_CLASSES[tone].text}`
              }`}
            >
              <Icon size={15} aria-hidden="true" />
            </span>
          </div>
          <p className="tnum mt-1.5 truncate text-disp2 font-bold leading-tight text-ink">{value}</p>
          <p className="mt-0.5 truncate text-micro text-ink-muted">{hint}</p>
        </li>
      ))}
    </ul>
  );
}
