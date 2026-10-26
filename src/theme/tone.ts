/**
 * Controlled palette helpers.
 *
 * Every accent in the product resolves to one of two places:
 *   1. the active theme preset (primary / dark accent / soft), or
 *   2. a fixed semantic status tone (success / info / warning / danger / neutral).
 *
 * Keep Tailwind class names as complete literal strings so the compiler can
 * detect them. Runtime tinting uses the CSS variables in `TONE_VARS`.
 */

export type Tone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export const TONES: readonly Tone[] = ['success', 'info', 'warning', 'danger', 'neutral'];

export interface ToneClassSet {
  /** Tinted badge: background + readable text + border. */
  badge: string;
  /** Solid accent surface with readable foreground. */
  solid: string;
  /** Readable text on a neutral surface. */
  text: string;
  /** Tinted background. */
  bg: string;
  /** Tinted border. */
  border: string;
  /** Solid dot / indicator. */
  dot: string;
  /** Low-emphasis tint for hover or icon wells. */
  soft: string;
}

export const TONE_CLASSES: Record<Tone, ToneClassSet> = {
  success: {
    badge: 'bg-success-bg text-success-text border-success-border',
    solid: 'bg-success-text text-success-foreground',
    text: 'text-success-text',
    bg: 'bg-success-bg',
    border: 'border-success-border',
    dot: 'bg-success-text',
    soft: 'bg-success-text/10',
  },
  info: {
    badge: 'bg-info-bg text-info-text border-info-border',
    solid: 'bg-info-text text-info-foreground',
    text: 'text-info-text',
    bg: 'bg-info-bg',
    border: 'border-info-border',
    dot: 'bg-info-text',
    soft: 'bg-info-text/10',
  },
  warning: {
    badge: 'bg-warning-bg text-warning-text border-warning-border',
    solid: 'bg-warning-text text-warning-foreground',
    text: 'text-warning-text',
    bg: 'bg-warning-bg',
    border: 'border-warning-border',
    dot: 'bg-warning-text',
    soft: 'bg-warning-text/10',
  },
  danger: {
    badge: 'bg-danger-bg text-danger-text border-danger-border',
    solid: 'bg-danger-text text-danger-foreground',
    text: 'text-danger-text',
    bg: 'bg-danger-bg',
    border: 'border-danger-border',
    dot: 'bg-danger-text',
    soft: 'bg-danger-text/10',
  },
  neutral: {
    badge: 'bg-neutral-bg text-neutral-text border-neutral-border',
    solid: 'bg-neutral-text text-neutral-foreground',
    text: 'text-neutral-text',
    bg: 'bg-neutral-bg',
    border: 'border-neutral-border',
    dot: 'bg-neutral-text',
    soft: 'bg-neutral-text/10',
  },
};

export interface ToneVars {
  text: string;
  bg: string;
  border: string;
  foreground: string;
  gradient: string;
}

const TONE_VAR_NAMES: Record<Tone, string> = {
  success: 'success',
  info: 'info',
  warning: 'warning',
  danger: 'danger',
  neutral: 'neutral',
};

export const TONE_VARS: Record<Tone, ToneVars> = TONES.reduce((acc, tone) => {
  const name = TONE_VAR_NAMES[tone];
  acc[tone] = {
    text: `var(--color-${name}-text)`,
    bg: `var(--color-${name}-bg)`,
    border: `var(--color-${name}-border)`,
    foreground: `var(--color-${name}-foreground)`,
    gradient: `linear-gradient(135deg, var(--color-${name}-text) 0%, var(--color-${name}-border) 100%)`,
  };
  return acc;
}, {} as Record<Tone, ToneVars>);

/** Theme-driven accent tokens for decorative UI (page headers, icon wells). */
export const ACCENT_VARS = {
  text: 'var(--color-primary)',
  hover: 'var(--color-primary-hover)',
  active: 'var(--color-primary-active)',
  foreground: 'var(--color-primary-foreground)',
  dark: 'var(--color-dark-accent)',
  soft: 'var(--color-soft)',
  muted: 'var(--color-muted-surface)',
  gradient: 'var(--gradient-accent)',
} as const;

/** Accent classes for decorative UI, kept literal for Tailwind detection. */
export const ACCENT_CLASSES = {
  gradient: 'bg-gradient-to-tr from-primary to-dark-accent text-primary-foreground',
  text: 'text-primary',
  bg: 'bg-primary',
  soft: 'bg-primary/10',
  border: 'border-primary/30',
} as const;

/**
 * Build an inline tint of a tone's readable colour.
 * `base` defaults to transparent so it can sit on any surface.
 */
export function toneMix(tone: Tone, weight: number, base = 'transparent'): string {
  return `color-mix(in srgb, ${TONE_VARS[tone].text} ${weight}%, ${base})`;
}

/** Token-backed colour strings for SVG charts and inline styles. */
export const CHART_COLORS = {
  primary: 'var(--color-primary)',
  primaryHover: 'var(--color-primary-hover)',
  primaryActive: 'var(--color-primary-active)',
  soft: 'var(--color-soft)',
  darkAccent: 'var(--color-dark-accent)',
  success: 'var(--color-success-text)',
  info: 'var(--color-info-text)',
  warning: 'var(--color-warning-text)',
  danger: 'var(--color-danger-text)',
  neutral: 'var(--color-neutral-text)',
  border: 'var(--color-border)',
} as const;

/** Ordered series used by small charts that need more than one slice. */
export const CHART_SERIES = [
  CHART_COLORS.primary,
  CHART_COLORS.warning,
  CHART_COLORS.info,
  CHART_COLORS.danger,
  CHART_COLORS.success,
  CHART_COLORS.soft,
] as const;
