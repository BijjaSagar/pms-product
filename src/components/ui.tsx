import type { ReactNode } from 'react';
import type { BadgeTone } from './status';

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-success-bg text-success-text border-success-border',
  info: 'bg-info-bg text-info-text border-info-border',
  warning: 'bg-warning-bg text-warning-text border-warning-border',
  danger: 'bg-danger-bg text-danger-text border-danger-border',
  neutral: 'bg-neutral-bg text-neutral-text border-neutral-border',
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className={`pms-badge border ${TONE_CLASSES[tone]}`}>
      <span className="pms-badge-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function Card({
  children,
  className = '',
  hover = false,
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  elevated?: boolean;
}) {
  return (
    <section
      className={`pms-card p-4 sm:p-5 ${hover ? 'pms-card-hover pms-card-interactive' : ''} ${elevated ? 'pms-card-elevated' : ''} ${className}`}
    >
      {children}
    </section>
  );
}

export function CardTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div className="min-w-0 flex-1 basis-48">
        <h3 className="pms-section-title text-balance">{title}</h3>
        {subtitle ? <p className="pms-helper mt-1 text-pretty">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex flex-none flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Sparkline({ points, width = 120, height = 36 }: { points: readonly number[]; width?: number; height?: number }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const line = points
    .map((p, i) => {
      const x = i * step;
      const y = height - 4 - ((p - min) / span) * (height - 8);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const area = `${line} L${width.toFixed(1)},${height} L0,${height} Z`;
  const gid = `spark-${Math.round(max)}-${points.length}`;
  const lastY = height - 4 - ((points[points.length - 1] - min) / span) * (height - 8);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} stroke="none" />
      <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgb(60 40 20 / 0.22))' }} />
      <circle cx={width} cy={lastY} r="3.5" fill="var(--color-primary)" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full"
      style={{ background: 'var(--color-divider)', boxShadow: 'var(--shadow-inner)' }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${clamped}%`,
          background: 'linear-gradient(90deg, var(--color-primary-hover), var(--color-primary))',
          boxShadow: '0 1px 4px rgb(60 40 20 / 0.3), inset 0 1px 0 rgb(255 255 255 / 0.35)',
          transition: 'width 500ms cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </div>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-full text-[12px] font-bold"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, var(--color-soft), color-mix(in srgb, var(--color-soft) 60%, white))',
        color: 'var(--color-dark-accent)',
        boxShadow: 'var(--shadow-sm), inset 0 1px 0 rgb(255 255 255 / 0.6)',
        border: '1px solid color-mix(in srgb, var(--color-dark-accent) 18%, transparent)',
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
