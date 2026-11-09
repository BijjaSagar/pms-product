import * as Lucide from 'lucide-react';
import type { SmokingPolicyKey } from '../../lib/api/pms';
import { Button } from '../../components/primitives';

const POLICIES: { key: SmokingPolicyKey; name: string; description: string; icon: Lucide.LucideIcon }[] = [
  { key: 'ALL_NON_SMOKING', name: 'All rooms non smoking', description: 'Smoking is not allowed in any room', icon: Lucide.CigaretteOff },
  { key: 'SMOKING_PERMITTED', name: 'Smoking permitted in rooms', description: 'Guests may smoke in their rooms', icon: Lucide.Cigarette },
];

/** Two exclusive choices. Choosing the selected one again, or Clear, leaves the policy unset. */
export function SmokingPolicyPicker({
  value,
  disabled,
  onChange,
}: {
  value: SmokingPolicyKey | null;
  disabled: boolean;
  onChange: (next: SmokingPolicyKey | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Smoking policy">
        {POLICIES.map(({ key, name, description, icon: Icon }) => {
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(selected ? null : key)}
              className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-surface hover:bg-hover-surface'
              }`}
            >
              <span
                className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${
                  selected ? 'bg-primary text-primary-foreground' : 'bg-muted-surface text-ink-secondary'
                }`}
              >
                <Icon size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-ink">{name}</span>
                <span className="block text-label text-ink-secondary">{description}</span>
              </span>
              {selected ? <Lucide.CheckCircle2 size={18} className="flex-none text-primary" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      {value !== null ? (
        <div>
          <Button variant="link" onClick={() => onChange(null)} disabled={disabled}>
            Clear policy
          </Button>
        </div>
      ) : (
        <p className="text-label text-ink-muted">No policy is set.</p>
      )}
    </div>
  );
}
