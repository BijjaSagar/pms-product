import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { CARD, HEADING } from '../../../components/brand/brandStyles';
import type { PropertyDraft } from './draft';
import type { Plan } from './setupPlans';

function TimelineItem({ state, title, note }: { state: 'done' | 'active' | 'todo'; title: string; note: string }) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <span className="absolute left-[9px] top-5 h-[calc(100%-1rem)] w-px bg-border" aria-hidden="true" />
      <span
        className={`relative z-[1] mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full ${
          state === 'done' ? 'bg-success-bg text-success-text' : state === 'active' ? 'bg-primary/10' : 'border border-border bg-white'
        }`}
      >
        {state === 'done' && <Lucide.Check size={12} aria-hidden="true" />}
        {state === 'active' && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span>
        <span className="block text-[14px] font-semibold leading-tight text-ink">{title}</span>
        <span className="block text-[12px] text-ink-secondary">{note}</span>
      </span>
    </li>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 text-[13px] last:border-b-0">
      <dt className="flex-none text-ink-secondary">{label}</dt>
      <dd className="min-w-0 text-right font-semibold text-ink">{children}</dd>
    </div>
  );
}

interface ApprovalStepProps {
  property: PropertyDraft;
  plan: Plan;
  otas: string[];
  floors: number;
  submittedAt: Date;
}

/** Step 6: the request is with the team. Shown right after submitting. */
export function ApprovalStep({ property, plan, otas, floors, submittedAt }: ApprovalStepProps) {
  const when = submittedAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  return (
    <div className="flex flex-col gap-4">
      <section className={`${CARD} flex items-center gap-5 p-6`}>
        {/* A soft ring around the clock that slowly fades in and out so it reads as "in progress". */}
        <span className="relative hidden h-14 w-14 flex-none items-center justify-center sm:flex" aria-hidden="true">
          <span className="absolute inset-0 rounded-full bg-primary/15 motion-safe:animate-pulse [animation-duration:4s]" />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lucide.Clock size={20} />
          </span>
        </span>
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-warning-bg px-2.5 py-0.5 text-[11px] font-semibold text-warning-text">Pending admin approval</span>
          <h2 className={`mt-2 text-[18px] font-semibold text-ink ${HEADING}`}>Your request is with our team.</h2>
          <p className="mt-1 text-[14px] leading-6 text-ink-secondary">
            An admin will review your property and OTA selection shortly. You can leave this page — when approved, you will receive a confirmation email.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className={`${CARD} p-5`}>
          <h3 className={`border-b border-border/70 pb-3 text-[14px] font-semibold text-ink ${HEADING}`}>Progress</h3>
          <ol className="mt-4">
            <TimelineItem state="done" title="Request submitted" note={when} />
            <TimelineItem state="active" title="Admin review" note="In progress" />
            <TimelineItem state="todo" title="Approved & confirmation email" note="Up next" />
          </ol>
        </section>

        <section className={`${CARD} p-5`}>
          <h3 className={`border-b border-border/70 pb-3 text-[14px] font-semibold text-ink ${HEADING}`}>Request details</h3>
          <dl>
            <Detail label="Property">{property.name.trim()}</Detail>
            <Detail label="Plan">
              {plan.name} · {plan.otaLimit} OTAs
            </Detail>
            <Detail label="Rooms">
              {property.rooms} on {floors} {floors === 1 ? 'floor' : 'floors'}
            </Detail>
            <Detail label="Channels">
              <span className="flex flex-wrap justify-end gap-1.5">
                {otas.map((name) => (
                  <span key={name} className="rounded-full bg-primary/10 px-2 py-0.5 text-[12px] font-medium text-primary">
                    {name}
                  </span>
                ))}
              </span>
            </Detail>
          </dl>
        </section>
      </div>
    </div>
  );
}
