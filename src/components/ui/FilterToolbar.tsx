import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { IconButton } from './primitives';

/*
 * The shared filter card. Phones stack the inputs in two columns, and from the small breakpoint they
 * flow in one row that wraps only when the card is too narrow. Each input passes its own width
 * classes. The icon-only clear button sits at the start of the trailing group and the view switch
 * at its end.
 */
export function FilterToolbar({
  ariaLabel,
  children,
  onClear,
  clearDisabled = false,
  view,
}: {
  ariaLabel: string;
  children?: ReactNode;
  onClear?: () => void;
  clearDisabled?: boolean;
  view?: ReactNode;
}) {
  return (
    <section className="pms-card p-3 sm:p-4" aria-label={ariaLabel}>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
        {children}
        {(onClear || view) && (
          <div className="col-span-2 flex items-center gap-2 sm:contents">
            {onClear && (
              <IconButton
                variant="ghost"
                type="button"
                onClick={onClear}
                disabled={clearDisabled}
                aria-label="Clear all filters"
                title="Clear all filters"
                className="shrink-0 disabled:opacity-40"
              >
                <Lucide.RotateCcw size={15} aria-hidden="true" />
              </IconButton>
            )}
            {view && <div className="ml-auto shrink-0 sm:ml-auto">{view}</div>}
          </div>
        )}
      </div>
    </section>
  );
}
