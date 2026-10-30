import type { ReactNode } from 'react';
import type { BadgeTone } from '../utils/status';
import { TONE_CLASSES, TONE_VARS } from '../theme/tone';

export function Badge({
  tone,
  children,
  dot = false,
}: {
  tone: BadgeTone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${TONE_CLASSES[tone].badge}`}>
      {dot ? <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
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
      className={`pms-card min-w-0 p-5 sm:p-6 ${hover ? 'pms-card-hover pms-card-interactive' : ''} ${elevated ? 'pms-card-elevated' : ''} ${className}`}
    >
      {children}
    </section>
  );
}

export function CardTitle({
  title,
  subtitle,
  action,
  icon: Icon,
  iconBg = 'bg-gradient-to-tr from-primary to-dark-accent text-primary-foreground shadow-xs shadow-primary/20',
  badge,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  iconBg?: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-divider/80">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon ? (
          <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl text-white shadow-xs ${iconBg}`}>
            <Icon size={17} strokeWidth={2.4} />
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-ink tracking-tight">{title}</h2>
            {badge}
          </div>
          {subtitle ? <p className="text-[11px] text-ink-muted mt-0.5">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="flex flex-none items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function TableContainer({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`pms-table-container overflow-hidden min-w-0 w-full ${className}`}>
      <div className="pms-table-scroll w-full min-w-0">{children}</div>
    </div>
  );
}

export function TableActionBtn({
  icon: Icon,
  onClick,
  title,
  variant = 'default',
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
  title?: string;
  variant?: 'default' | 'danger' | 'primary';
}) {
  const variantClass =
    variant === 'danger'
      ? 'text-danger-text hover:text-danger-text bg-danger-bg hover:bg-danger-border'
      : variant === 'primary'
      ? 'text-primary hover:text-primary-active bg-primary/10 hover:bg-primary/15'
      : 'text-ink-secondary hover:text-ink bg-muted-surface hover:bg-hover-surface';

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${variantClass}`}
    >
      <Icon size={15} />
    </button>
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
      <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px color-mix(in srgb, var(--color-ink) 22%, transparent))' }} />
      <circle cx={width} cy={lastY} r="3.5" fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="1.5" />
    </svg>
  );
}

const AVATAR_PALETTES = [
  { bg: TONE_VARS.info.bg, text: TONE_VARS.info.text, border: TONE_VARS.info.border },
  { bg: 'var(--color-muted-surface)', text: 'var(--color-primary)', border: 'color-mix(in srgb, var(--color-primary) 25%, var(--color-border))' },
  { bg: TONE_VARS.danger.bg, text: TONE_VARS.danger.text, border: TONE_VARS.danger.border },
  { bg: TONE_VARS.success.bg, text: TONE_VARS.success.text, border: TONE_VARS.success.border },
  { bg: TONE_VARS.warning.bg, text: TONE_VARS.warning.text, border: TONE_VARS.warning.border },
  { bg: 'color-mix(in srgb, var(--color-soft) 24%, var(--color-surface))', text: 'var(--color-dark-accent)', border: 'color-mix(in srgb, var(--color-dark-accent) 22%, var(--color-border))' },
  { bg: TONE_VARS.neutral.bg, text: TONE_VARS.neutral.text, border: TONE_VARS.neutral.border },
];

function getAvatarPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const palette = getAvatarPalette(name);

  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-full text-xs font-bold transition-transform hover:scale-105"
      style={{
        width: size,
        height: size,
        backgroundColor: palette.bg,
        color: palette.text,
        border: `1px solid ${palette.border}`,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
