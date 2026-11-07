import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { propertyTermsApi } from '../../lib/api/pms';
import type { PropertyTermsDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Button, Checkbox, TextArea } from '../../components/primitives';

const MAX_LENGTH = 10_000;

interface TermsBlock {
  enabledKey: 'includeInclusions' | 'includeBookingTerms' | 'includeCheckInTerms';
  textKey: 'inclusions' | 'bookingTerms' | 'checkInTerms';
  /** The sentence beside the checkbox. */
  switchLabel: string;
  /** The label above the editor once the box is checked. */
  editorLabel: string;
}

const BLOCKS: TermsBlock[] = [
  {
    enabledKey: 'includeInclusions',
    textKey: 'inclusions',
    switchLabel: 'Add Standard/Common complimentary inclusions.',
    editorLabel: 'Define the inclusions:',
  },
  {
    enabledKey: 'includeBookingTerms',
    textKey: 'bookingTerms',
    switchLabel: 'Add Standard/Common Terms & Conditions while booking a room at your property.',
    editorLabel: 'Define Standard/Common Terms & Conditions:',
  },
  {
    enabledKey: 'includeCheckInTerms',
    textKey: 'checkInTerms',
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
  const [saving, setSaving] = useState(false);

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
      setForm(toForm(saved));
      onSaved();
      toast('Terms and inclusions saved', { tone: 'success' });
    } catch (err) {
      toast('Could not save terms and inclusions', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <fieldset
      disabled={!canEdit}
      title={canEdit ? undefined : 'Only administrators can change these terms'}
      className="m-0 min-w-0 border-0 p-0"
    >
      <section
        className="rounded-2xl border p-5 shadow-sm sm:p-6"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-divider pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-primary-foreground shadow-xs shadow-primary/20">
              <Lucide.ScrollText size={17} strokeWidth={2.4} />
            </div>
            <h2 className="text-body font-bold tracking-tight text-ink">General Terms and Conditions</h2>
          </div>
          <Button
            variant="primary"
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !canEdit}
            className="w-fit disabled:opacity-50"
          >
            Save Changes
          </Button>
        </div>

        <div className="flex flex-col gap-5">
          {BLOCKS.map((block) => {
            const enabled = form[block.enabledKey];
            const text = form[block.textKey];
            return (
              <div key={block.enabledKey} className="flex flex-col gap-3">
                <label className="flex cursor-pointer items-start gap-2.5 text-body font-medium text-ink">
                  <Checkbox
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setForm((prev) => ({ ...prev, [block.enabledKey]: e.target.checked }))}
                    className="mt-0.5"
                  />
                  <span>{block.switchLabel}</span>
                </label>

                {enabled ? (
                  <div className="ml-7">
                    <label className="mb-1.5 block text-label font-medium text-ink">
                      {block.editorLabel}
                      <TextArea
                        rows={6}
                        value={text}
                        onChange={(e) => setForm((prev) => ({ ...prev, [block.textKey]: e.target.value.slice(0, MAX_LENGTH) }))}
                        className="mt-1.5 w-full font-normal focus:outline-none focus:ring-2"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                      />
                    </label>
                    <p className="text-right text-label text-ink-secondary">
                      Characters: {text.length} / {MAX_LENGTH}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </fieldset>
  );
}

export function TermsInclusionsTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => propertyTermsApi.get(propertyId), [propertyId]);
  const resource = useApiResource(load);

  if (!resource.data) {
    return (
      <div
        className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {resource.error ?? 'Loading terms and inclusions…'}
      </div>
    );
  }

  return <TermsForm key={propertyId} propertyId={propertyId} terms={resource.data} canEdit={canEdit} onSaved={resource.refresh} />;
}
