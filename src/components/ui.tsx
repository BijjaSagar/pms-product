import type { ReactNode } from 'react';
import type { BadgeTone } from './status';

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-emerald-100/90 text-emerald-800 border-emerald-200/60',
  info: 'bg-blue-100/90 text-blue-800 border-blue-200/60',
  warning: 'bg-amber-100/90 text-amber-800 border-amber-200/60',
  danger: 'bg-rose-100/90 text-rose-800 border-rose-200/60',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200/60',
};

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
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${TONE_CLASSES[tone]}`}>
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
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
      <div className="min-w-0 flex-1 basis-48">
        <h4 className="text-base font-semibold tracking-tight text-slate-900 text-balance">{title}</h4>
        {subtitle ? <p className="text-xs text-slate-500 mt-0.5 text-pretty">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex flex-none flex-wrap items-center gap-2">{action}</div> : null}
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
    <div className={`pms-table-container border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-xs min-w-0 w-full ${className}`}>
      <div className="overflow-x-auto w-full min-w-0">{children}</div>
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
      ? 'text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100'
      : variant === 'primary'
      ? 'text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100'
      : 'text-slate-500 hover:text-slate-700 bg-slate-100/80 hover:bg-slate-200/80';

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

const AVATAR_PALETTES = [
  { bg: '#EFF6FF', text: '#2563EB', border: '#DBEAFE' }, // Soft Blue (JD)
  { bg: '#F3E8FF', text: '#7C3AED', border: '#E9D5FF' }, // Soft Purple (JS)
  { bg: '#FFE4E6', text: '#E11D48', border: '#FECDD3' }, // Soft Rose (MJ)
  { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' }, // Soft Green (EW)
  { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' }, // Soft Amber (DC)
  { bg: '#E0F2FE', text: '#0284C7', border: '#BAE6FD' }, // Soft Sky
  { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' }, // Soft Slate
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
