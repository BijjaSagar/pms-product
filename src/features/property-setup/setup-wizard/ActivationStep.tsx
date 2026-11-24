import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { CARD, HEADING } from '../../../components/brand/brandStyles';
import { ACTIVATION_KEY_LENGTH } from './draft';
import type { PropertyDraft } from './draft';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 text-[13px] last:border-b-0">
      <dt className="flex-none text-ink-secondary">{label}</dt>
      <dd className="min-w-0 text-right font-semibold text-ink">{children}</dd>
    </div>
  );
}

interface ActivationStepProps {
  /** The key as typed (already formatted by the wizard). */
  value: string;
  onChange: (value: string) => void;
  /** Pressing Enter in the field activates, same as the footer button. */
  onSubmit: () => void;
  property: PropertyDraft;
  categoryCount: number;
  disabled: boolean;
}

/** The last registration step: the activation key a super admin issued turns the property on. */
export function ActivationStep({ value, onChange, onSubmit, property, categoryCount, disabled }: ActivationStepProps) {
  const complete = value.length === ACTIVATION_KEY_LENGTH + 3;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <section className={`${CARD} p-5`}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
            <Lucide.KeyRound size={18} />
          </span>
          <h2 className={`text-[16px] font-semibold text-ink ${HEADING}`}>Activation key</h2>
        </div>
        <label htmlFor="activation-key" className="mt-4 block text-[13px] font-medium text-ink">
          Enter your key
        </label>
        <input
          id="activation-key"
          className="pms-input tnum mt-1.5 min-h-[34px] w-full font-mono tracking-[0.12em] md:min-h-[32px]"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && complete && !disabled) onSubmit();
          }}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={disabled}
          maxLength={ACTIVATION_KEY_LENGTH + 3}
        />
        <p className="mt-2 text-[12px] leading-5 text-ink-secondary">
          Your key was sent to you by Hotel PMX. Each key works once, and activating makes {property.name.trim() || 'your property'} ready to use straight away.
        </p>
      </section>

      <section className={`${CARD} p-5`}>
        <h3 className={`border-b border-border/70 pb-3 text-[14px] font-semibold text-ink ${HEADING}`}>Your property</h3>
        <dl>
          <Detail label="Property">{property.name.trim()}</Detail>
          <Detail label="Abbreviation">{property.code}</Detail>
          <Detail label="Rooms">
            {property.rooms} on {property.floors} {property.floors === 1 ? 'floor' : 'floors'}
          </Detail>
          <Detail label="Room categories">{categoryCount}</Detail>
          <Detail label="Channels">All available OTAs</Detail>
        </dl>
      </section>
    </div>
  );
}
