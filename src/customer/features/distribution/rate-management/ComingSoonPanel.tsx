import type { LucideIcon } from 'lucide-react';

export function ComingSoonPanel({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <section className="flex flex-col items-center px-4 py-16 text-center" aria-label={title}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon size={20} aria-hidden="true" />
      </span>
      <h2 className="mt-3 text-title font-bold text-ink">{title}</h2>
      <p className="mt-1 max-w-sm text-label text-ink-secondary">{description}</p>
      <p className="mt-3 text-label text-ink-muted">Not available yet.</p>
    </section>
  );
}
