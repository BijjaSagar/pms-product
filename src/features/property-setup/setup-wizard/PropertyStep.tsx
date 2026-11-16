import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { BrandField, BrandSelect, BrandStepper } from '../../../components/brand/BrandControls';
import { CARD, FIELD, FIELD_INVALID, HEADING } from '../../../components/brand/brandStyles';
import { MAX_FLOORS } from '../../settings/room-settings/floorPlan';
import { MAX_CODE_LENGTH, MAX_ROOMS } from './draft';
import type { PropertyDraft, PropertyErrors } from './draft';
import { COUNTRIES, CURRENCIES } from './options';

function Section({ icon: Icon, title, className = '', children }: { icon: typeof Lucide.Building2; title: string; className?: string; children: ReactNode }) {
  return (
    <section className={`${CARD} p-4 ${className}`}>
      <h3 className={`flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em] text-ink ${HEADING}`}>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={16} aria-hidden="true" />
        </span>
        {title}
      </h3>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

interface PropertyStepProps {
  value: PropertyDraft;
  onChange: (patch: Partial<PropertyDraft>) => void;
  /** Only passed once the user has tried to continue, so untouched fields do not shout. */
  errors: PropertyErrors;
}

/** Step 1: who and where the property is, its currency, and how many floors and rooms it has. */
export function PropertyStep({ value, onChange, errors }: PropertyStepProps) {
  const text = (error?: string) => (error ? FIELD_INVALID : FIELD);
  return (
    <div className="flex flex-col gap-3">
      <Section icon={Lucide.Building2} title="Identity">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <BrandField label="Property name" error={errors.name}>
            <input
              className={text(errors.name)}
              value={value.name}
              maxLength={150}
              autoFocus
              placeholder="e.g. Seaside Grand Hotel"
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </BrandField>
          <BrandField label="Abbreviation" error={errors.code}>
            <input
              className={`${text(errors.code)} font-semibold uppercase tracking-wide`}
              value={value.code}
              maxLength={MAX_CODE_LENGTH}
              placeholder="SGH"
              onChange={(e) => onChange({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
            />
          </BrandField>
        </div>
      </Section>

      <Section icon={Lucide.MapPin} title="Location">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BrandField label="Country" error={errors.country}>
            <BrandSelect invalid={!!errors.country} value={value.country} onChange={(e) => onChange({ country: e.target.value })}>
              <option value="">Select country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </BrandSelect>
          </BrandField>
          <BrandField label="State">
            <input className={FIELD} value={value.state} maxLength={100} placeholder="e.g. Goa" onChange={(e) => onChange({ state: e.target.value })} />
          </BrandField>
          <BrandField label="City" error={errors.city}>
            <input className={text(errors.city)} value={value.city} maxLength={100} placeholder="e.g. Panaji" onChange={(e) => onChange({ city: e.target.value })} />
          </BrandField>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Section icon={Lucide.Wallet} title="Billing">
          <BrandField label="Currency" error={errors.currency}>
            <BrandSelect invalid={!!errors.currency} value={value.currency} onChange={(e) => onChange({ currency: e.target.value })}>
              <option value="">Select currency</option>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </BrandSelect>
          </BrandField>
        </Section>

        <Section icon={Lucide.Layers} title="Structure">
          <div className="grid grid-cols-2 gap-4">
            <BrandField label="No. of floors">
              <BrandStepper label="No. of floors" value={value.floors} min={1} max={MAX_FLOORS} onChange={(floors) => onChange({ floors })} />
            </BrandField>
            <BrandField label="No. of rooms">
              <BrandStepper label="No. of rooms" value={value.rooms} min={1} max={MAX_ROOMS} onChange={(rooms) => onChange({ rooms })} />
            </BrandField>
          </div>
        </Section>
      </div>
    </div>
  );
}
