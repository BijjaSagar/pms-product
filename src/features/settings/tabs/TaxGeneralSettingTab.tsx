import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { taxSetupApi } from '../../../lib/api/pms';
import type { TaxComputation, TaxGeneralSettings } from '../../../lib/api/pms';
import { useApiResource } from '../../../lib/api/useApiResource';
import { displayApiError } from '../../../lib/api/client';
import { toast } from '../../../utils/toast';
import { Button, TextField } from '../../../components/ui/primitives';
import { Field } from '../../../components/ui/controls';
import { PanelLoadState } from '../../../components/feedback/Skeleton';
import { Card, CardTitle } from '../../../components/ui/display';
import { ReadOnlyNotice, SettingsHeader, ToggleRow } from '../components/SettingsKit';

const COMPUTATION_OPTIONS: { value: TaxComputation; label: string }[] = [
  {
    value: 'COMPOSITE_SUPPLY',
    label: 'Recompute GST as per Govt prescribed Composite Supply Concept (taking into account meal plan and extra adult or extra child rates)',
  },
  {
    value: 'OTA_VOUCHER',
    label: 'Apply Taxes As Sent By OTA on their voucher without any change',
  },
];

type ToggleKey = 'enableSacCodes' | 'applyRoomSlabOnMeals' | 'applyRoomSlabOnExtraBed' | 'showPropertyGstNo';

const TOGGLES: { key: ToggleKey; label: string }[] = [
  { key: 'enableSacCodes', label: 'Enable SAC Codes' },
  { key: 'applyRoomSlabOnMeals', label: 'Apply Room Taxes Slab On Meals' },
  { key: 'applyRoomSlabOnExtraBed', label: 'Apply Room Taxes Slab On Extra Bed' },
  { key: 'showPropertyGstNo', label: 'Show Property GST No.' },
];

const SAC_PATTERN = /^\d{6}$/;

function GeneralTaxForm({
  settings,
  canManage,
  onSaved,
}: {
  settings: TaxGeneralSettings;
  canManage: boolean;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TaxGeneralSettings>(settings);
  // What is stored; the form is dirty while it differs from this.
  const [baseline, setBaseline] = useState<TaxGeneralSettings>(settings);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const sacInvalid = form.enableSacCodes && !SAC_PATTERN.test(form.sacRoomCode.trim());

  const save = async () => {
    if (sacInvalid) {
      toast('Check the SAC room code', { detail: 'It is a 6-digit number, for example 996311.', tone: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const body = { ...form, sacRoomCode: form.sacRoomCode.trim() };
      await taxSetupApi.saveGeneralSettings(body);
      setForm(body);
      setBaseline(body);
      onSaved();
      toast('Tax settings saved', { tone: 'success' });
    } catch (err) {
      toast('Could not save tax settings', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <fieldset disabled={!canManage} className="m-0 min-w-0 border-0 p-0">
      <div className="flex flex-col gap-5">
        <SettingsHeader title="General Tax Setting" description="How tax is worked out on bookings and what is shown with it" />
        {!canManage ? <ReadOnlyNotice what="tax settings" /> : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
          <Card className="min-w-0">
            <CardTitle icon={Lucide.Calculator} title="Tax Calculation" />
            <div role="radiogroup" aria-label="Tax calculation" className="flex flex-col gap-2.5">
              {COMPUTATION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-hover-surface has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70"
                >
                  <input
                    type="radio"
                    name="tax-computation"
                    checked={form.computation === option.value}
                    onChange={() => setForm((prev) => ({ ...prev, computation: option.value }))}
                    className="mt-0.5 h-4 w-4 flex-none cursor-pointer accent-[var(--color-primary)]"
                  />
                  <span className="min-w-0 text-body font-semibold leading-snug text-ink">{option.label}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card className="min-w-0">
            <CardTitle icon={Lucide.FileText} title="SAC Codes & Display" />
            <div className="flex flex-col gap-3">
              <Field
                label="SAC Room Code"
                error={sacInvalid ? 'Enter a 6-digit code, for example 996311.' : undefined}
              >
                <TextField
                  inputMode="numeric"
                  maxLength={6}
                  value={form.sacRoomCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, sacRoomCode: e.target.value.replace(/\D/g, '') }))}
                  className="tnum font-mono"
                />
              </Field>
              {TOGGLES.map(({ key, label }) => (
                <ToggleRow
                  key={key}
                  label={label}
                  checked={form[key]}
                  onChange={(checked) => setForm((prev) => ({ ...prev, [key]: checked }))}
                />
              ))}
            </div>
          </Card>
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-divider pt-4">
            <Button variant="secondary" disabled={!dirty || saving} onClick={() => setForm(baseline)}>
              Discard
            </Button>
            <Button
              variant="primary"
              disabled={!dirty || saving}
              onClick={() => void save()}
              icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}

export function TaxGeneralSettingTab({ canManage }: { canManage: boolean }) {
  const load = useCallback(() => taxSetupApi.generalSettings(), []);
  const resource = useApiResource(load);

  if (!resource.data) return <PanelLoadState error={resource.error} label="Loading tax settings" />;
  return <GeneralTaxForm settings={resource.data} canManage={canManage} onSaved={resource.refresh} />;
}
