import type { ComponentType, ReactNode } from 'react';

export type KitTone = 'info' | 'success' | 'warning' | 'danger' | 'primary';

const TONE_CHIP: Record<KitTone, string> = {
  info: 'bg-info-bg text-info-text',
  success: 'bg-success-bg text-success-text',
  warning: 'bg-warning-bg text-warning-text',
  danger: 'bg-danger-bg text-danger-text',
  primary: 'bg-primary/10 text-primary',
};

interface StatTileProps {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone?: KitTone;
  /** Colours the value itself, for health or compliance figures. */
  valueTone?: 'success';
}

/** One metric cell. Always rendered inside a StatStrip. */
export function StatTile({ label, value, caption, icon: Icon, tone = 'info', valueTone }: StatTileProps) {
  return (
    <div className="flex min-w-0 items-start gap-3 bg-surface p-4">
      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${TONE_CHIP[tone]}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-micro font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        <p className={`mt-0.5 truncate text-disp3 font-extrabold tnum ${valueTone === 'success' ? 'text-success-text' : 'text-ink'}`}>
          {value}
        </p>
        {caption ? <p className="mt-0.5 text-label text-ink-secondary">{caption}</p> : null}
      </div>
    </div>
  );
}

/** A single card of divided metrics; hairlines come from the grid gap. */
export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <div className="pms-card grid grid-cols-1 gap-px overflow-hidden bg-divider p-0 min-[480px]:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}
