import type { ReactNode } from 'react';
import type * as Lucide from 'lucide-react';

/* The frame every room settings section shares: an icon, a title and description, and the section's action. */
export function SectionCard({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon: Lucide.LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border p-5 sm:p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3.5 mb-3.5 border-b border-divider">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
            <Icon size={17} strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <h2 className="text-body font-bold text-ink tracking-tight">{title}</h2>
            <p className="text-label text-ink-muted mt-0.5">{description}</p>
          </div>
        </div>
        {action && <div className="flex flex-none items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}
