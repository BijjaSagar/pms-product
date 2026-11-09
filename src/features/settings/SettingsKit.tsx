import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { Button, Checkbox } from '../../components/primitives';
import { Card, CardTitle } from '../../components/ui';

/*
 * Shared building blocks for every Settings screen, so headers, form grids, toggles,
 * notices and the save bar look and behave the same everywhere. Colours and type sizes
 * come from the theme tokens and the type ladder in index.css.
 */

/** Header of a screen that holds several cards: one title line, one description, optional actions. */
export function SettingsHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="text-disp2 font-bold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-0.5 text-label text-ink-secondary">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-none items-center gap-2">{action}</div> : null}
    </header>
  );
}

/** Two columns from tablet up, one on phones. Wide fields set `sm:col-span-2` themselves. */
export function FormGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2 ${className}`}>{children}</div>;
}

/** A titled card whose body is a responsive two-column form. */
export function FormSection({
  id,
  icon,
  title,
  subtitle,
  children,
}: {
  /** Anchor for in-page jump links. */
  id?: string;
  icon: Lucide.LucideIcon;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div id={id} className="min-w-0 scroll-mt-4">
      <Card>
        <CardTitle icon={icon} title={title} subtitle={subtitle} />
        <FormGrid>{children}</FormGrid>
      </Card>
    </div>
  );
}

/** A checkbox row with a title and an optional explanation; the whole row is the click target. */
export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  className = '',
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-hover-surface has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70 ${className}`}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 flex-none"
      />
      <span className="min-w-0">
        <span className="block text-body font-semibold leading-snug text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-label text-ink-secondary">{description}</span> : null}
      </span>
    </label>
  );
}

/** Shown on forms a non-administrator can read but not change. */
export function ReadOnlyNotice({ what }: { what: string }) {
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-xl border border-info-border bg-info-bg p-3 text-label text-info-text"
    >
      <Lucide.Lock size={15} className="mt-px flex-none" aria-hidden="true" />
      <span>Only administrators can change {what}. You can view the current values.</span>
    </div>
  );
}

/**
 * Pinned to the bottom of the content while a form has unsaved edits, so Save is always in reach
 * on long forms and small screens. It disappears once the form is saved or discarded.
 */
export function UnsavedBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  saveLabel = 'Save Changes',
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saveLabel?: string;
}) {
  if (!dirty) return null;
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="pms-animate-fade-up sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg"
    >
      <p className="flex items-center gap-2 text-body font-semibold text-ink">
        <span className="h-2 w-2 flex-none rounded-full bg-warning-text" aria-hidden="true" />
        You have unsaved changes
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onDiscard} disabled={saving}>
          Discard
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          disabled={saving}
          icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
        >
          {saving ? 'Saving…' : saveLabel}
        </Button>
      </div>
    </div>
  );
}

export function NoPropertyState() {
  return (
    <div className="pms-card flex flex-col items-center gap-2 p-10 text-center">
      <Lucide.Building2 size={28} className="text-ink-muted" aria-hidden="true" />
      <p className="text-body font-semibold text-ink">No property selected</p>
      <p className="text-label text-ink-secondary">Choose a property from the header to manage its settings.</p>
    </div>
  );
}

export function ComingSoon({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="pms-card flex flex-col items-center gap-3 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Lucide.Sliders size={26} aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-disp2 font-bold text-ink">{title}</h1>
        <p className="mx-auto mt-1 max-w-md text-body text-ink-secondary">
          This section is not available yet. It will appear here once it is ready.
        </p>
      </div>
      <Button variant="secondary" onClick={onBack} icon={<Lucide.ArrowLeft size={14} />}>
        Back to Property Details
      </Button>
    </div>
  );
}
