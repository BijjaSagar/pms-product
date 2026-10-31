import * as Lucide from 'lucide-react';
import type { RateHistoryEvent } from './types';

const TONE = {
  success: { icon: Lucide.Check, color: 'var(--color-success-text)', bg: 'var(--color-success-bg)' },
  info: { icon: Lucide.Info, color: 'var(--color-info-text)', bg: 'var(--color-info-bg)' },
  warning: { icon: Lucide.AlertTriangle, color: 'var(--color-warning-text)', bg: 'var(--color-warning-bg)' },
};

export function HistoryPanel({ events }: { events: RateHistoryEvent[] }) {
  return (
    <section className="pms-card overflow-hidden" aria-labelledby="rate-history-title">
      <div className="flex items-center gap-2.5 border-b px-4 py-4 sm:px-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
          <Lucide.History size={18} strokeWidth={2.4} />
        </div>
        <div>
          <h2 id="rate-history-title" className="text-body font-bold text-ink tracking-tight">Rate Change History</h2>
          <p className="text-label text-ink-muted mt-0.5">A local audit trail of recent rate and distribution actions</p>
        </div>
      </div>
      {events.length ? (
        <ol className="divide-y" style={{ borderColor: 'var(--color-divider)' }}>
          {events.map((event) => {
            const tone = TONE[event.tone];
            const Icon = tone.icon;
            return (
              <li key={event.id} className="flex gap-3.5 px-4 py-4 sm:px-5">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full" style={{ color: tone.color, background: tone.bg }}><Icon size={16} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-body font-semibold text-ink">{event.title}</h3>
                    <time className="text-label text-ink-muted">{event.timestamp}</time>
                  </div>
                  <p className="mt-1 text-label text-ink-secondary">{event.detail}</p>
                  <p className="mt-1.5 text-label text-ink-muted">By {event.user}</p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : <p className="p-10 text-center text-body text-ink-muted">No rate changes have been recorded.</p>}
      <div className="border-t px-4 py-3 text-label text-ink-muted sm:px-5" style={{ borderColor: 'var(--color-divider)' }}>History entries are sample data and reset when the page is reloaded.</div>
    </section>
  );
}
