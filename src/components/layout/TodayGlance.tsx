import * as Lucide from 'lucide-react';
import type { NavTarget } from '../../config/navigation';

export type GlanceTone = 'primary' | 'success' | 'warning' | 'info' | 'danger';

export interface GlanceItem {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: GlanceTone;
  icon: Lucide.LucideIcon;
  target: NavTarget;
}

const ICON_TONE: Record<GlanceTone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success-bg text-success-text',
  warning: 'bg-warning-bg text-warning-text',
  info: 'bg-info-bg text-info-text',
  danger: 'bg-danger-bg text-danger-text',
};

interface TodayGlanceProps {
  items: GlanceItem[];
  onGo: (target: NavTarget) => void;
  /** strip: one connected bar for the dashboard header. grid: cards for the drawer. */
  layout?: 'strip' | 'grid';
  className?: string;
}

/** Today's live figures. Every value is supplied by the caller from the store. */
export function TodayGlance({ items, onGo, layout = 'strip', className = '' }: TodayGlanceProps) {
  const isStrip = layout === 'strip';
  return (
    <div
      role="group"
      aria-label="Today at a glance"
      className={
        isStrip
          ? `flex items-stretch overflow-x-auto no-scrollbar rounded-2xl border border-border bg-surface shadow-xs ${className}`
          : `grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6 ${className}`
      }
    >
      {items.map((item) => {
        const Icon = item.icon;
        const tile = isStrip
          ? 'flex-none border-l border-border first:border-l-0 px-3 py-2 xl:px-4 first:rounded-l-2xl last:rounded-r-2xl hover:bg-page'
          : 'rounded-xl border border-border/70 bg-surface p-2.5 hover:shadow-xs hover:bg-page';
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onGo(item.target)}
            title={`${item.label}: ${item.value} (${item.detail})`}
            className={`group flex min-w-0 items-center gap-2.5 text-left cursor-pointer transition-colors ${tile}`}
          >
            <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${ICON_TONE[item.tone]}`}>
              <Icon size={15} strokeWidth={2.2} />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-micro font-bold uppercase tracking-wider text-ink-muted">{item.label}</span>
              <span className="truncate text-body font-bold tnum text-ink">{item.value}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
