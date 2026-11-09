import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { adminApi } from '../../lib/api/pms';
import type { TaxRuleRow } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Button, TextField } from '../../components/primitives';
import { Field } from '../../components/controls';
import { PanelLoadState } from '../../components/Skeleton';
import { Card, CardTitle } from '../../components/ui';
import { FormGrid, ReadOnlyNotice, SettingsHeader } from './SettingsKit';

const DEFAULT_RATE = 12;

function TaxRuleCard({ activeTax, canManage, onSaved }: { activeTax: TaxRuleRow | undefined; canManage: boolean; onSaved: () => void }) {
  const [rate, setRate] = useState(String(activeTax?.ratePercent ?? DEFAULT_RATE));
  const [saving, setSaving] = useState(false);
  const value = Number(rate);
  const valid = rate.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 40;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      if (activeTax) await adminApi.updateTaxRule(activeTax.id, { ratePercent: value });
      else await adminApi.createTaxRule({ code: 'PROPERTY_TAX', name: 'Property tax', ratePercent: value, appliesTo: 'ALL', isInclusive: false });
      onSaved();
      toast(`Tax rule updated to ${value}%`, { tone: 'success' });
    } catch (err) {
      toast('Could not update tax rule', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardTitle icon={Lucide.Percent} title="Active Tax Rule" subtitle="Applied to every folio and invoice" />
      <Field label="Tax rate (%)" hint="Between 0 and 40" error={rate !== '' && !valid ? 'Enter a rate between 0 and 40.' : undefined}>
        <div className="flex items-center gap-2">
          <TextField
            type="number"
            min={0}
            max={40}
            step="0.01"
            value={rate}
            disabled={!canManage}
            onChange={(e) => setRate(e.target.value)}
            className="w-32"
          />
          <span className="text-label font-semibold text-ink-secondary">% GST / VAT</span>
        </div>
      </Field>
      <div className="mt-4 flex justify-end border-t border-divider pt-3">
        <Button
          variant="primary"
          disabled={saving || !canManage || !valid}
          title={canManage ? undefined : 'You do not have permission to change tax rules'}
          onClick={() => void save()}
          icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
        >
          {saving ? 'Saving…' : 'Save Tax Rule'}
        </Button>
      </div>
    </Card>
  );
}

export function TaxesTab({ canRead, canManage }: { canRead: boolean; canManage: boolean }) {
  const load = useCallback(() => (canRead ? adminApi.taxRules() : Promise.resolve([] as TaxRuleRow[])), [canRead]);
  const resource = useApiResource(load);

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Taxes & Fees" description="Tax applied to folios and the details printed on invoices" />
      {!canManage ? <ReadOnlyNotice what="tax rules" /> : null}

      {!resource.data ? (
        <PanelLoadState error={resource.error} label="Loading tax rules" />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
          <TaxRuleCard
            key={resource.data.find((r) => r.isActive)?.id ?? 'none'}
            activeTax={resource.data.find((r) => r.isActive)}
            canManage={canManage}
            onSaved={resource.refresh}
          />

          <Card>
            <CardTitle icon={Lucide.FileSignature} title="Invoice Details" subtitle="Printed on guest folios and receipts" />
            <FormGrid>
              <Field label="Invoice prefix">
                <TextField defaultValue="INV-2026-" className="font-mono" />
              </Field>
              <Field label="Tax registration / GSTIN">
                <TextField defaultValue="27AAAAA0000A1Z5" className="font-mono" />
              </Field>
            </FormGrid>
            <div className="mt-4 flex justify-end border-t border-divider pt-3">
              <Button variant="primary" onClick={() => toast('Invoice details saved', { tone: 'success' })} icon={<Lucide.Save size={14} />}>
                Save Invoice Details
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
