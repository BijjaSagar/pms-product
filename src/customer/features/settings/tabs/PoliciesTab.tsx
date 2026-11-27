import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import {
  propertyPolicyApi,
  type PropertyPolicyDetails,
  type PropertyPolicyInput,
} from '../../../../shared/services/propertyPolicyApi';
import { useApiResource } from '../../../../shared/services/useApiResource';
import { displayError } from '../../../../shared/services/errors';
import { toast } from '../../../../shared/utils/toast';
import { TextArea } from '../../../../shared/components/ui/primitives';
import { Field } from '../../../../shared/components/ui/controls';
import { Card, CardTitle } from '../../../../shared/components/ui/display';
import { PanelLoadState } from '../../../../shared/components/feedback/Skeleton';
import { ReadOnlyNotice, SettingsHeader, ToggleRow, UnsavedBar } from '../components/SettingsKit';
import { SmokingPolicyPicker } from '../components/SmokingPolicyPicker';

const MAX_TEXT = 2000;

const TEXTS = [
  { key: 'cancellationPolicy', label: 'Cancellation policy', placeholder: 'Free cancellation until 48h before arrival; first night charged thereafter.' },
  { key: 'noShowPolicy', label: 'No-show policy', placeholder: 'First night charged to the primary payment method on file.' },
  { key: 'childExtraBedPolicy', label: 'Child & extra bed policy', placeholder: 'Children under 6 stay complimentary using existing bedding.' },
] as const;

const STAY_RULES = [
  { key: 'requireGovernmentId', label: 'Government ID at check-in', description: 'Passport, driving licence or national identity card' },
  { key: 'requireSecurityDeposit', label: 'Security deposit guarantee', description: 'Pre-authorisation hold of 20% on incidentals' },
  { key: 'enforceMinimumAge', label: 'Minimum check-in age of 18', description: 'The primary guest must be 18 years or older' },
] as const;

/** What the form edits: the saved policies without their timestamp, blank text held as ''. */
type PolicyForm = Omit<PropertyPolicyInput, 'cancellationPolicy' | 'noShowPolicy' | 'childExtraBedPolicy'> & {
  [K in (typeof TEXTS)[number]['key']]: string;
};

const toForm = (policy: PropertyPolicyDetails): PolicyForm => ({
  cancellationPolicy: policy.cancellationPolicy ?? '',
  noShowPolicy: policy.noShowPolicy ?? '',
  childExtraBedPolicy: policy.childExtraBedPolicy ?? '',
  requireGovernmentId: policy.requireGovernmentId,
  requireSecurityDeposit: policy.requireSecurityDeposit,
  enforceMinimumAge: policy.enforceMinimumAge,
  smokingPolicy: policy.smokingPolicy,
});

/** Blank -> null; otherwise the trimmed text. */
const optional = (value: string) => (value.trim() === '' ? null : value.trim());

function PoliciesForm({ propertyId, policy, canEdit }: { propertyId: string; policy: PropertyPolicyDetails; canEdit: boolean }) {
  const [form, setForm] = useState<PolicyForm>(() => toForm(policy));
  // What the data layer holds; the form is dirty while it differs from this.
  const [baseline, setBaseline] = useState<PolicyForm>(() => toForm(policy));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await propertyPolicyApi.save(propertyId, {
        cancellationPolicy: optional(form.cancellationPolicy),
        noShowPolicy: optional(form.noShowPolicy),
        childExtraBedPolicy: optional(form.childExtraBedPolicy),
        requireGovernmentId: form.requireGovernmentId,
        requireSecurityDeposit: form.requireSecurityDeposit,
        enforceMinimumAge: form.enforceMinimumAge,
        smokingPolicy: form.smokingPolicy,
      });
      const next = toForm(saved);
      setForm(next);
      setBaseline(next);
      toast('Policies saved', { tone: 'success' });
    } catch (err) {
      toast('Could not save the policies', { detail: displayError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Policies" description="Guest-facing terms, smoking policy and the checks done at arrival" />
      {!canEdit ? <ReadOnlyNotice what="policies" /> : null}

      {/* A disabled fieldset disables every input inside it for non-administrators. */}
      <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
            <Card>
              <CardTitle icon={Lucide.FileText} title="Booking & Cancellation" subtitle="Terms applied on confirmed bookings" />
              <div className="flex flex-col gap-4">
                {TEXTS.map(({ key, label, placeholder }) => (
                  <Field key={key} label={label}>
                    <TextArea
                      rows={3}
                      maxLength={MAX_TEXT}
                      value={form[key]}
                      placeholder={placeholder}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  </Field>
                ))}
              </div>
            </Card>

            <Card>
              <CardTitle icon={Lucide.ShieldCheck} title="Stay Rules & Check-in" subtitle="Standard verification procedures" />
              <div className="flex flex-col gap-2.5">
                {STAY_RULES.map(({ key, label, description }) => (
                  <ToggleRow
                    key={key}
                    label={label}
                    description={description}
                    checked={form[key]}
                    onChange={(checked) => setForm({ ...form, [key]: checked })}
                  />
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <CardTitle icon={Lucide.CigaretteOff} title="Smoking Policy" subtitle="The policy that applies to your rooms" />
            <SmokingPolicyPicker
              value={form.smokingPolicy}
              disabled={!canEdit || saving}
              onChange={(next) => setForm({ ...form, smokingPolicy: next })}
            />
          </Card>
        </div>
      </fieldset>

      {canEdit ? <UnsavedBar dirty={dirty} saving={saving} onSave={() => void handleSave()} onDiscard={() => setForm(baseline)} /> : null}
    </div>
  );
}

export function PoliciesTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => propertyPolicyApi.get(propertyId), [propertyId]);
  const resource = useApiResource(load);

  if (!resource.data) return <PanelLoadState error={resource.error} label="Loading policies" />;
  return <PoliciesForm key={propertyId} propertyId={propertyId} policy={resource.data} canEdit={canEdit} />;
}
