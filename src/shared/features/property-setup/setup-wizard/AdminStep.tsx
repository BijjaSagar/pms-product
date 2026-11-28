import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { CARD, HEADING } from '../../../components/brand/brandStyles';
import type { AdminDraft, PropertyDraft } from './draft';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 text-[13px] last:border-b-0">
      <dt className="flex-none text-ink-secondary">{label}</dt>
      <dd className="min-w-0 text-right font-semibold text-ink">{children}</dd>
    </div>
  );
}

interface AdminStepProps {
  value: AdminDraft;
  onChange: (patch: Partial<AdminDraft>) => void;
  errors: { name?: string; email?: string };
  property: PropertyDraft;
  categoryCount: number;
  disabled: boolean;
}

/** The last step: who runs this property day to day. Optional; the owner can add Property Admins later. */
export function AdminStep({ value, onChange, errors, property, categoryCount, disabled }: AdminStepProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <section className={`${CARD} p-5`}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
            <Lucide.UserCog size={18} />
          </span>
          <h2 className={`text-[16px] font-semibold text-ink ${HEADING}`}>Property Admin</h2>
        </div>
        <p className="mt-3 text-[12px] leading-5 text-ink-secondary">
          The Property Admin runs {property.name.trim() || 'this property'}: they add the front office, housekeeping and other teams. You get a temporary
          password to hand over, and they choose their own at first sign-in. Leave both blank to add one later.
        </p>

        <label htmlFor="admin-name" className="mt-4 block text-[13px] font-medium text-ink">
          Full name
        </label>
        <input
          id="admin-name"
          className="pms-input mt-1.5 min-h-[34px] w-full md:min-h-[32px]"
          value={value.name}
          onChange={(event) => onChange({ name: event.target.value })}
          autoComplete="off"
          maxLength={150}
          disabled={disabled}
          aria-invalid={errors.name ? true : undefined}
        />
        {errors.name ? <p className="mt-1 text-[12px] text-danger-text">{errors.name}</p> : null}

        <label htmlFor="admin-email" className="mt-3 block text-[13px] font-medium text-ink">
          Email address
        </label>
        <input
          id="admin-email"
          type="email"
          className="pms-input mt-1.5 min-h-[34px] w-full md:min-h-[32px]"
          value={value.email}
          onChange={(event) => onChange({ email: event.target.value })}
          autoComplete="off"
          maxLength={254}
          disabled={disabled}
          aria-invalid={errors.email ? true : undefined}
        />
        {errors.email ? <p className="mt-1 text-[12px] text-danger-text">{errors.email}</p> : null}
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
          <Detail label="Property Admin">{value.name.trim() || <span className="font-normal text-ink-muted">Add later</span>}</Detail>
        </dl>
      </section>
    </div>
  );
}
