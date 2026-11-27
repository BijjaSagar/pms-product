import * as Lucide from 'lucide-react';
import { HEADING } from '../../../components/brand/brandStyles';

interface SetupStepBarProps {
  steps: string[];
  step: number;
  /** The furthest step reached, so earlier steps can be revisited but later ones cannot be skipped to. */
  reached: number;
  onJump: (step: number) => void;
}

/** The horizontal step bar under the header: done steps show a tick, the current one is filled. */
export function SetupStepBar({ steps, step, reached, onJump }: SetupStepBarProps) {
  return (
    <nav aria-label="Setup steps" className="flex-none border-b border-border bg-white/70 px-4 py-2.5 sm:px-6">
      <ol className="mx-auto flex w-full max-w-[1040px] items-center">
        {steps.map((title, i) => {
          const state = i < step ? 'done' : i === step ? 'current' : 'todo';
          const clickable = i <= reached && i !== step;
          return (
            <li key={title} className="flex items-center max-sm:flex-1 sm:flex-1 last:flex-none" aria-current={state === 'current' ? 'step' : undefined}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onJump(i)}
                aria-label={`Step ${i + 1}: ${title}`}
                className={`flex min-w-0 items-center gap-2 rounded-full py-1 pr-3 text-[13px] font-semibold transition-colors disabled:cursor-default ${
                  state === 'current' ? 'bg-primary/10 pl-1 text-primary' : state === 'done' ? 'cursor-pointer pl-1 text-ink hover:text-primary' : 'pl-1 text-ink-muted'
                } ${state === 'current' ? '' : 'max-sm:pr-0'}`}
              >
                <span
                  className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[12px] font-bold ${HEADING} ${
                    state === 'current'
                      ? 'bg-primary text-primary-foreground'
                      : state === 'done'
                        ? 'bg-success-bg text-success-text'
                        : 'border border-border bg-white text-ink-muted'
                  }`}
                >
                  {state === 'done' ? <Lucide.Check size={14} aria-hidden="true" /> : i + 1}
                </span>
                <span className={`whitespace-nowrap ${state === 'current' ? '' : 'max-sm:hidden'}`}>{title}</span>
              </button>
              {i < steps.length - 1 && <span aria-hidden="true" className={`mx-2 h-px min-w-3 flex-1 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
