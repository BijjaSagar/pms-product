import { Suspense, lazy, useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { propertyTermsApi, type PropertyTermsDetails } from '../../../../shared/services/propertyTermsApi';
import { useApiResource } from '../../../../shared/services/useApiResource';
import { displayError } from '../../../../shared/services/errors';
import { toast } from '../../../../shared/utils/toast';
import { Field } from '../../../../shared/components/ui/controls';
import { Card, CardTitle } from '../../../../shared/components/ui/display';
import { PanelLoadState } from '../../../../shared/components/feedback/Skeleton';
import { ReadOnlyNotice, SettingsHeader, ToggleRow, UnsavedBar } from '../components/SettingsKit';

// The editor is large, so it is only fetched once someone opens this tab.
const RichTextEditor = lazy(() => import('../components/RichTextEditor').then((m) => ({ default: m.RichTextEditor })));

/** Counts the HTML the editor writes, markup included; the same limit as the data layer. */
const MAX_LENGTH = 20_000;

/** True when the editor holds no text, such as an empty paragraph left behind after clearing it. */
const isBlank = (html: string) => html.replace(/<[^>]*>|&nbsp;/g, '').trim() === '';

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Text saved before the editor existed is plain; it is shown as paragraphs so its line breaks survive. */
const toEditorHtml = (text: string | null): string => {
  const value = text ?? '';
  if (/<\/?[a-z][\s\S]*>/i.test(value)) return value;
  return value
    .split(/\n{2,}/)
    .filter((part) => part.trim() !== '')
    .map((part) => `<p>${escapeHtml(part.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
};

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
  inclusions: toEditorHtml(terms.inclusions),
  includeBookingTerms: terms.includeBookingTerms,
  bookingTerms: toEditorHtml(terms.bookingTerms),
  includeCheckInTerms: terms.includeCheckInTerms,
  checkInTerms: toEditorHtml(terms.checkInTerms),
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
  // What the data layer holds; the form is dirty while it differs from this.
  const [baseline, setBaseline] = useState<FormState>(() => toForm(terms));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  const handleSave = async () => {
    const empty = BLOCKS.find((block) => form[block.enabledKey] && isBlank(form[block.textKey]));
    if (empty) {
      toast('Write the text or untick the box', { detail: empty.switchLabel, tone: 'warning' });
      return;
    }
    const tooLong = BLOCKS.find((block) => form[block.textKey].length > MAX_LENGTH);
    if (tooLong) {
      toast('That text is too long', { detail: `${tooLong.title} can hold up to ${MAX_LENGTH.toLocaleString('en-US')} characters.`, tone: 'warning' });
      return;
    }
    const clean = (block: TermsBlock) => (isBlank(form[block.textKey]) ? '' : form[block.textKey].trim());
    setSaving(true);
    try {
      const saved = await propertyTermsApi.save(propertyId, {
        includeInclusions: form.includeInclusions,
        inclusions: clean(BLOCKS[0]),
        includeBookingTerms: form.includeBookingTerms,
        bookingTerms: clean(BLOCKS[1]),
        includeCheckInTerms: form.includeCheckInTerms,
        checkInTerms: clean(BLOCKS[2]),
      });
      const next = toForm(saved);
      setForm(next);
      setBaseline(next);
      onSaved();
      toast('Terms and inclusions saved', { tone: 'success' });
    } catch (err) {
      toast('Could not save terms and inclusions', { detail: displayError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0">
      <div className="flex flex-col gap-5">
        <SettingsHeader title="Terms and Inclusions" description="Standard text shown to guests when they book and when they check in" />
        {!canEdit ? <ReadOnlyNotice what="these terms" /> : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {BLOCKS.map((block, index) => {
            const enabled = form[block.enabledKey];
            const text = form[block.textKey];
            return (
              <Card key={block.enabledKey} className={`min-w-0 ${index === 0 ? 'xl:col-span-2' : ''}`}>
                <CardTitle icon={block.icon} title={block.title} />
                <div className="flex min-w-0 flex-col gap-3">
                  <ToggleRow
                    label={block.switchLabel}
                    checked={enabled}
                    onChange={(checked) => setForm((prev) => ({ ...prev, [block.enabledKey]: checked }))}
                  />
                  {enabled ? (
                    <Field
                      label={block.editorLabel.replace(/:$/, '')}
                      hint={`${text.length.toLocaleString('en-US')} / ${MAX_LENGTH.toLocaleString('en-US')} characters, formatting included`}
                      error={text.length > MAX_LENGTH ? 'This is over the limit. Shorten the text to save.' : undefined}
                    >
                      <Suspense fallback={<div className="h-[280px] animate-pulse rounded-xl bg-muted-surface" aria-label="Loading editor" />}>
                        <RichTextEditor
                          label={block.editorLabel.replace(/:$/, '')}
                          value={text}
                          disabled={!canEdit}
                          onChange={(html) => setForm((prev) => ({ ...prev, [block.textKey]: html }))}
                        />
                      </Suspense>
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
