import type { ReactNode } from 'react';
import type { BadgeTone } from '../utils/status';
import { TONE_CLASSES, TONE_VARS } from '../theme/tone';
import { Button } from './primitives';

export function Badge({
  tone,
  children,
  dot = false,
  size = 'md',
}: {
  tone: BadgeTone;
  children: ReactNode;
  dot?: boolean;
  /** md = status pills (reference "Official Records"); sm = room and tag chips. */
  size?: 'md' | 'sm';
}) {
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-micro' : 'px-3 py-1 text-label';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-bold whitespace-nowrap ${sizing} ${TONE_CLASSES[tone].badge}`}>
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
            <h2 className="text-body font-bold text-ink tracking-tight">{title}</h2>
            {badge}
          </div>
          {subtitle ? <p className="text-label text-ink-muted mt-0.5">{subtitle}</p> : null}
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
    <Button variant="secondary"
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-8 inline-flex items-center justify-center transition-colors cursor-pointer ${variantClass}`}
    >
      <Icon size={15} />
    </Button>
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
      className="inline-flex flex-none items-center justify-center rounded-full text-label font-bold transition-transform hover:scale-105"
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
