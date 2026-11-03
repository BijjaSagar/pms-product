import type { LucideIcon } from 'lucide-react';
import { Button } from './primitives';

interface SegmentOption<T extends string> {
  id: T;
  label: string;
  Icon: LucideIcon;
}

/* A switch between views. Each segment is a toggle with aria-pressed, so the choice is announced. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-page p-0.5"
      role="group"
      aria-label={label}
    >
      {options.map(({ id, label: text, Icon }) => {
        const active = value === id;
        return (
          <Button
            key={id}
            variant="text"
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            icon={<Icon size={13} aria-hidden="true" />}
            className={`rounded-md px-2.5 py-1 text-label cursor-pointer ${active ? '!bg-[var(--color-primary)] !text-white shadow-xs' : 'text-ink-secondary hover:text-ink'}`}
          >
            {text}
          </Button>
        );
      })}
    </div>
  );
}
