import type { ReactNode } from 'react';
import { EYEBROW, HEADING } from '../../../components/brand/brandStyles';
import type { CategoryDraft, PropertyDraft } from './draft';

/** The receipt look from the design: a blush panel behind a white card with a cream footer. Fixed colours, not theme tokens. */
const PANEL_BG = 'bg-[#F2E8E1]'; // palette-allow: folio design colour
const FOOTER_BG = 'bg-[#FDFAF6]'; // palette-allow: folio design colour

const STATUS = {
  draft: { label: 'Draft', tone: 'border-border bg-muted-surface/60 text-ink-secondary' },
  ready: { label: 'Ready to activate', tone: 'border-primary/30 bg-primary/10 text-primary' },
} as const;

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 text-[12px]">
      <dt className="flex-none text-[color-mix(in_srgb,var(--color-ink-secondary)_80%,var(--color-primary))]">{label}</dt>
      <span aria-hidden="true" className="min-w-3 flex-1 border-b border-dotted border-border" />
      <dd className="tnum min-w-0 truncate text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-dashed border-border px-4 py-2 last:border-b-0">
      <h3 className={`${EYEBROW} !text-[11px] !tracking-[0.12em] !text-primary/80`}>{title}</h3>
      <dl className="mt-1.5 flex flex-col gap-1">{children}</dl>
    </section>
  );
}

interface PropertyFolioProps {
  steps: string[];
  status: keyof typeof STATUS;
  property: PropertyDraft;
  categories: CategoryDraft[];
  placed: number;
  /** Steps finished so far, out of `steps.length`. */
  completed: number;
}

/** The receipt-style summary on the left: it fills in as the person moves through the steps. */
export function PropertyFolio({ steps, status, property, categories, placed, completed }: PropertyFolioProps) {
  const named = categories.filter((c) => c.name.trim()).map((c) => c.name.trim());
  const location = [property.city.trim(), property.state.trim()].filter(Boolean).join(', ');
  const none = <span className="font-normal text-ink-muted">—</span>;

  return (
    <aside aria-label="Property folio" className={`hidden w-[300px] flex-none overflow-hidden border-r border-border ${PANEL_BG} p-4 lg:block xl:w-[320px] [@media(max-height:760px)]:p-3`}>
      <div className="overflow-hidden rounded-t-2xl border border-b-0 border-border border-t-[5px] border-t-primary/70 bg-white [border-top-style:dashed]">
        <header className="border-b border-dashed border-border px-4 pb-2.5 pt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">Property folio</p>
              <p className="tnum mt-0.5 truncate text-[11px] text-ink-muted">No. {(property.code || 'NEW') + '-' + String(property.rooms).padStart(3, '0')}</p>
            </div>
            <span className={`flex-none rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS[status].tone}`}>{STATUS[status].label}</span>
          </div>
          <p className={`mt-2 truncate text-[17px] font-semibold leading-tight text-ink ${HEADING}`}>{property.name.trim() || 'Your property'}</p>
          <p className="mt-0.5 truncate text-[12px] text-ink-secondary">{location || 'Location not set'}</p>
        </header>

        <Group title="Property">
          <Row label="Abbreviation" value={property.code || none} />
          <Row label="Country" value={property.country || none} />
          <Row label="Currency" value={property.currency || none} />
        </Group>

        <Group title="Structure">
          <Row label="Floors" value={property.floors} />
          <Row label="Rooms" value={placed > 0 ? `${placed} / ${property.rooms}` : property.rooms} />
          <Row label="Categories" value={named.length || none} />
          {named.length > 0 && <p className="truncate text-right text-[12px] text-ink-secondary [@media(max-height:700px)]:hidden">{named.join(' · ')}</p>}
        </Group>

        <footer className={`border-t-2 border-primary/10 ${FOOTER_BG} px-4 py-3`}>
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-ink">Setup complete</p>
            <p className={`tnum text-[16px] font-semibold text-primary ${HEADING}`}>
              {completed} / {steps.length}
            </p>
          </div>
          <div className="mt-2.5 flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completed} aria-label="Setup progress">
            {steps.map((title, i) => (
              <span key={title} className={`h-1.5 flex-1 rounded-full ${i < completed ? 'bg-primary/65' : 'bg-border/70'}`} />
            ))}
          </div>
        </footer>
      </div>
      {/* The torn receipt edge: a strip in the footer colour with a row of downward points cut from it. */}
      <div
        aria-hidden="true"
        className={`h-2.5 ${FOOTER_BG}`}
        style={{
          boxShadow: 'inset 1px 0 0 var(--color-border), inset -1px 0 0 var(--color-border)',
          mask: 'conic-gradient(from -45deg at bottom, transparent, black 1deg 89deg, transparent 90deg) 50% / 12px 100%',
          WebkitMask: 'conic-gradient(from -45deg at bottom, transparent, black 1deg 89deg, transparent 90deg) 50% / 12px 100%',
        }}
      />
    </aside>
  );
}
