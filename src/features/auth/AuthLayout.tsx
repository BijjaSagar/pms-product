import type { ReactNode } from 'react';
import { BrandMark } from '../../components/brand/BrandShell';
import { BODY, EYEBROW, HEADING } from '../../components/brand/brandStyles';

/**
 * A full-screen 8 / 4 split shared by Sign in and Register. The left side is a soft, light brand
 * panel; the right side holds the form. From the large breakpoint up the page is exactly one
 * viewport tall and never scrolls. Below it the brand panel shrinks to a header strip and the page
 * scrolls normally, so the form stays reachable with the on-screen keyboard open or on a short
 * landscape phone.
 */
export function AuthLayout({ sectionLabel, children }: { sectionLabel: string; children: ReactNode }) {
  return (
    <div className={`flex min-h-dvh w-full flex-col bg-surface text-ink lg:grid lg:h-dvh lg:grid-cols-12 lg:grid-rows-1 lg:overflow-hidden ${BODY}`}>
      {/* Brand side: 8 of 12 columns */}
      <aside
        className="relative flex flex-none items-center overflow-hidden border-b border-border/60 bg-gradient-to-br from-surface via-primary/[0.06] to-primary/[0.22] px-5 py-3.5 sm:px-10 lg:col-span-8 lg:items-stretch lg:border-b-0 lg:px-16 lg:py-12"
        aria-label="About TriponX"
      >
        {/* Soft light streaks, blurred glows and two outlined tiles (decorative) */}
        <div
          className="pointer-events-none absolute inset-0 hidden opacity-20 lg:block"
          style={{ backgroundImage: 'repeating-linear-gradient(115deg, transparent 0 140px, var(--color-surface) 140px 143px, transparent 143px 300px)' }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -right-16 top-16 hidden h-96 w-96 rounded-full bg-primary/15 blur-3xl lg:block" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 left-64 hidden h-80 w-80 rounded-full bg-primary/10 blur-3xl lg:block" aria-hidden="true" />
        <div className="pointer-events-none absolute right-[8%] top-[28%] hidden h-[304px] w-[304px] rotate-[12deg] rounded-[40px] border border-primary/15 lg:block" aria-hidden="true" />
        <div className="pointer-events-none absolute right-[14%] top-[34%] hidden h-[304px] w-[304px] -rotate-[8deg] rounded-[40px] border border-primary/10 lg:block" aria-hidden="true" />

        {/* Three rows: the logo on top, the headline exactly in the middle, the quote at the bottom. */}
        <div className="relative grid w-full grid-rows-[1fr_auto_1fr] lg:items-center">
          <div className="self-start">
            <BrandMark />
          </div>

          <div className="hidden max-w-xl lg:block">
            <p className={`flex items-center gap-4 ${EYEBROW}`}>
              <span className="h-px w-16 bg-primary" aria-hidden="true" /> Every stay begins here
            </p>
            <h2 className={`mt-6 text-[clamp(2.5rem,4vw,3.75rem)] font-bold leading-[1.05] tracking-[-0.05em] text-ink ${HEADING}`}>
              Run calmer.<br />
              <span className="text-primary">Host better.</span>
            </h2>
            <p className="mt-6 max-w-lg text-[16px] leading-7 text-ink-secondary [@media(max-height:660px)]:hidden">
              Your reservations, rooms and billing — gathered in one gentle, easy place.
            </p>
          </div>

          <p className="hidden max-w-[16rem] self-end border-l-2 border-primary/50 pl-4 text-[12px] leading-6 text-ink-muted lg:block [@media(max-height:700px)]:invisible">
            Thoughtfully designed for teams who love the details.
          </p>
        </div>
      </aside>

      {/* Form side: 4 of 12 columns */}
      <main className="flex flex-1 items-start justify-center !bg-surface px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 sm:items-center sm:px-10 sm:py-10 lg:col-span-4 lg:min-h-0 lg:overflow-y-auto lg:px-14 lg:py-4">
        <section className="pms-animate-fade-in w-full max-w-[400px]" aria-label={sectionLabel}>
          {children}
        </section>
      </main>
    </div>
  );
}
