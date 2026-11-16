import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { BODY, HEADING } from './brandStyles';

/** The TriponX logo tile and wordmark. */
export function BrandMark() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
        <Lucide.Hotel size={20} aria-hidden="true" />
      </span>
      <span className={`text-[20px] font-semibold tracking-tight text-ink ${HEADING}`}>TriponX</span>
    </span>
  );
}

/**
 * A cream page with a soft blush glow. From the large breakpoint up it is exactly
 * one viewport tall and never scrolls: the page decides which inner area scrolls
 * (if any). Below that, the page scrolls normally.
 */
export function BrandShell({ children }: { children: ReactNode }) {
  return (
    <div className={`relative min-h-dvh overflow-x-clip bg-surface text-ink lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden ${BODY}`}>
      <div className="pointer-events-none absolute -right-24 top-0 h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-[380px] w-[380px] rounded-full bg-primary/[0.07] blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto flex w-full max-w-[1216px] flex-1 flex-col px-4 py-5 sm:px-6 lg:min-h-0 lg:py-4">{children}</div>
    </div>
  );
}
