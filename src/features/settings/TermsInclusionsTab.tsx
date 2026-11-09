import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { propertyTermsApi } from '../../lib/api/pms';
import type { PropertyTermsDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { TextArea } from '../../components/primitives';
import { Field } from '../../components/controls';
import { Card, CardTitle } from '../../components/ui';
import { PanelLoadState } from '../../components/Skeleton';
import { ReadOnlyNotice, SettingsHeader, ToggleRow, UnsavedBar } from './SettingsKit';

const MAX_LENGTH = 10_000;

interface TermsBlock {
  enabledKey: 'includeInclusions' | 'includeBookingTerms' | 'includeCheckInTerms';
  textKey: 'inclusions' | 'bookingTerms' | 'checkInTerms';
  title: string;
  icon: Lucide.LucideIcon;
  /** The sentence beside the checkbox. */
  switchLabel: string;
  /** The label above the editor once the box is checked. */
  editorLabel: string;
}

const BLOCKS: TermsBlock[] = [
  {
    enabledKey: 'includeInclusions',
    textKey: 'inclusions',
    title: 'Inclusions',
    icon: Lucide.Gift,
    switchLabel: 'Add Standard/Common complimentary inclusions.',
    editorLabel: 'Define the inclusions:',
  },
  {
    enabledKey: 'includeBookingTerms',
    textKey: 'bookingTerms',
    title: 'Booking Terms & Conditions',
    icon: Lucide.ScrollText,
    switchLabel: 'Add Standard/Common Terms & Conditions while booking a room at your property.',
    editorLabel: 'Define Standard/Common Terms & Conditions:',
  },
  {
    enabledKey: 'includeCheckInTerms',
    textKey: 'checkInTerms',
    title: 'Check-in Terms & Conditions',
    icon: Lucide.KeyRound,
    switchLabel: 'Add Standard/Common Terms & Conditions to show while check in at your property.',
    editorLabel: 'Define Standard/Common Check-in Terms & Conditions:',
  },
];

type FormState = Record<TermsBlock['enabledKey'], boolean> & Record<TermsBlock['textKey'], string>;

const toForm = (terms: PropertyTermsDetails): FormState => ({
  includeInclusions: terms.includeInclusions,
  inclusions: terms.inclusions ?? '',
  includeBookingTerms: terms.includeBookingTerms,
  bookingTerms: terms.bookingTerms ?? '',
  includeCheckInTerms: terms.includeCheckInTerms,
  checkInTerms: terms.checkInTerms ?? '',
});

function TermsForm({
  propertyId,
  terms,
  canEdit,
  onSaved,
}: {
  propertyId: string;
  terms: PropertyTermsDetails;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(terms));
  // What the server holds; the form is dirty while it differs from this.
  const [baseline, setBaseline] = useState<FormState>(() => toForm(terms));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  const handleSave = async () => {
    const empty = BLOCKS.find((block) => form[block.enabledKey] && form[block.textKey].trim() === '');
    if (empty) {
      toast('Write the text or untick the box', { detail: empty.switchLabel, tone: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const saved = await propertyTermsApi.save(propertyId, {
        includeInclusions: form.includeInclusions,
        inclusions: form.inclusions.trim(),
        includeBookingTerms: form.includeBookingTerms,
        bookingTerms: form.bookingTerms.trim(),
        includeCheckInTerms: form.includeCheckInTerms,
        checkInTerms: form.checkInTerms.trim(),
      });
      const next = toForm(saved);
      setForm(next);
      setBaseline(next);
      onSaved();
      toast('Terms and inclusions saved', { tone: 'success' });
    } catch (err) {
      toast('Could not save terms and inclusions', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0">
      <div className="flex flex-col gap-5">
        <SettingsHeader title="Terms and Inclusions" description="Standard text shown to guests when they book and when they check in" />
        {!canEdit ? <ReadOnlyNotice what="these terms" /> : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
          {BLOCKS.map((block, index) => {
            const enabled = form[block.enabledKey];
            const text = form[block.textKey];
            return (
              <Card key={block.enabledKey} className={index === 0 ? 'xl:col-span-2' : ''}>
                <CardTitle icon={block.icon} title={block.title} />
                <div className="flex flex-col gap-3">
                  <ToggleRow
                    label={block.switchLabel}
                    checked={enabled}
                    onChange={(checked) => setForm((prev) => ({ ...prev, [block.enabledKey]: checked }))}
                  />
                  {enabled ? (
                    <Field label={block.editorLabel.replace(/:$/, '')} hint={`${text.length.toLocaleString('en-US')} / ${MAX_LENGTH.toLocaleString('en-US')} characters`}>
                      <TextArea
                        rows={6}
                        value={text}
                        onChange={(e) => setForm((prev) => ({ ...prev, [block.textKey]: e.target.value.slice(0, MAX_LENGTH) }))}
                        className="min-h-[140px] font-normal"
                      />
                    </Field>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>

        {canEdit ? (
          <UnsavedBar dirty={dirty} saving={saving} onSave={() => void handleSave()} onDiscard={() => setForm(baseline)} />
        ) : null}
      </div>
    </fieldset>
  );
}

export function TermsInclusionsTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => propertyTermsApi.get(propertyId), [propertyId]);
  const resource = useApiResource(load);

  if (!resource.data) {
    return (
      <PanelLoadState error={resource.error} label="Loading terms and inclusions" />
    );
  }

  return <TermsForm key={propertyId} propertyId={propertyId} terms={resource.data} canEdit={canEdit} onSaved={resource.refresh} />;
}
