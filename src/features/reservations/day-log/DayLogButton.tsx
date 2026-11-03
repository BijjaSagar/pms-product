import type { ReactNode } from 'react';

/**
 * Icon control in a calendar date header. It is tinted when the date has content
 * and grey when it is empty, so the header shows at a glance which days are covered.
 */
export function DayLogButton({
  icon,
  label,
  filled,
  tone,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  filled: boolean;
  tone: 'warning' | 'info';
  onClick: () => void;
}) {
  const palette = filled
    ? tone === 'warning'
      ? 'bg-warning-bg text-warning-text border-warning-border'
      : 'bg-info-bg text-info-text border-info-border'
    : 'bg-muted-surface text-ink-secondary border-border';

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${palette}`}
    >
      {icon}
    </button>
  );
}
