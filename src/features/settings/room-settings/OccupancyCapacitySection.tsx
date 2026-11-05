import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { formatCurrency } from '../../../lib/api/format';
import { toast } from '../../../utils/toast';
import { Button, Checkbox, TextField } from '../../../components/primitives';
import { Field } from '../../../components/controls';
import { Card, CardTitle } from '../../../components/ui';
import type { OccupancyConfig } from './types';
import { StatStrip, StatTile } from './RoomSettingsKit';

interface OccupancyCapacitySectionProps {
  config: OccupancyConfig;
  currencyCode: string;
  onChange: (cfg: OccupancyConfig) => void;
}

export function OccupancyCapacitySection({
  config,
  currencyCode,
  onChange,
}: OccupancyCapacitySectionProps) {
  const [form, setForm] = useState<OccupancyConfig>({ ...config });
  const [isSaving, setIsSaving] = useState(false);

  // Live Scenario Simulator State
  const [simAdults, setSimAdults] = useState(3);
  const [simChildren, setSimChildren] = useState(1);
  const [simExtraBed, setSimExtraBed] = useState(true);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onChange(form);
      setIsSaving(false);
      toast('Occupancy & capacity rules updated', {
        detail: 'Global reservation boundaries and extra bed charges have been applied.',
        tone: 'success',
      });
    }, 250);
  };

  const handleReset = () => {
    setForm({ ...config });
    toast('Form reset to saved values', { tone: 'info' });
  };

  // Compute simulation outcome
  const totalGuests = simAdults + simChildren;
  const isOverCapacity = totalGuests > form.maxTotalOccupancy;
  const extraAdultsCount = Math.max(0, simAdults - form.baseOccupancy);
  const extraAdultSurchargeTotal = extraAdultsCount * form.extraAdultSurcharge;
  const extraBedSurchargeTotal = simExtraBed && form.allowExtraBeds ? form.extraBedRate : 0;
  const simulatedNightlyAddon = extraAdultSurchargeTotal + extraBedSurchargeTotal;

  return (
    <div className="flex flex-col gap-5">
      <StatStrip>
        <StatTile
          label="Base Occupancy"
          icon={Lucide.Users}
          tone="info"
          value={<>{form.baseOccupancy} Guests</>}
          caption="Included in base room rate"
        />

        <StatTile
          label="Max Capacity Limit"
          icon={Lucide.Maximize2}
          tone="primary"
          value={<>{form.maxTotalOccupancy} Total</>}
          caption={<>{form.maxAdults} adults + {form.maxChildren} children</>}
        />

        <StatTile
          label="Extra Bed Surcharge"
          icon={Lucide.BedSingle}
          tone="warning"
          value={formatCurrency(form.extraBedRate, currencyCode)}
          caption="Per rollaway bed / night"
        />

        <StatTile
          label="Infant Policy"
          icon={Lucide.Baby}
          tone="success"
          valueTone="success"
          value={<>Under {form.childFreeAgeLimit} Free</>}
          caption="Cribs complimentary"
        />
      </StatStrip>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Configuration Form */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <Card>
            <CardTitle
              title="Global Occupancy Boundaries"
              subtitle="Define baseline guest headcounts and maximum allowable limits per room"
              icon={Lucide.Users2}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Standard Base Occupancy"
                hint="Number of occupants included before extra person fees apply"
              >
                <TextField
                  type="number"
                  min={1}
                  max={6}
                  value={form.baseOccupancy}
                  onChange={(e) => setForm({ ...form, baseOccupancy: Number(e.target.value) })}
                  className="tnum"
                />
              </Field>

              <Field
                label="Maximum Total Occupants"
                hint="Hard ceiling for any standard booking"
              >
                <TextField
                  type="number"
                  min={form.baseOccupancy}
                  max={12}
                  value={form.maxTotalOccupancy}
                  onChange={(e) => setForm({ ...form, maxTotalOccupancy: Number(e.target.value) })}
                  className="tnum"
                />
              </Field>

              <Field
                label="Max Adults Permitted"
                hint="Maximum adults (ages 13+) allowed per room"
              >
                <TextField
                  type="number"
                  min={1}
                  max={8}
                  value={form.maxAdults}
                  onChange={(e) => setForm({ ...form, maxAdults: Number(e.target.value) })}
                  className="tnum"
                />
              </Field>

              <Field
                label="Max Children Permitted"
                hint="Children (ages under 12) allowed with parents"
              >
                <TextField
                  type="number"
                  min={0}
                  max={6}
                  value={form.maxChildren}
                  onChange={(e) => setForm({ ...form, maxChildren: Number(e.target.value) })}
                  className="tnum"
                />
              </Field>

              <Field
                label={`Extra Adult Surcharge (${currencyCode})`}
                hint="Nightly fee applied for each adult exceeding base occupancy"
              >
                <TextField
                  type="number"
                  min={0}
                  value={form.extraAdultSurcharge}
                  onChange={(e) => setForm({ ...form, extraAdultSurcharge: Number(e.target.value) })}
                  className="tnum"
                />
              </Field>

              <Field
                label="Child Free Age Threshold"
                hint="Children below this age stay completely free in existing bedding"
              >
                <div className="flex items-center gap-2">
                  <TextField
                    type="number"
                    min={0}
                    max={12}
                    value={form.childFreeAgeLimit}
                    onChange={(e) => setForm({ ...form, childFreeAgeLimit: Number(e.target.value) })}
                    className="tnum"
                  />
                  <span className="text-label text-ink-muted whitespace-nowrap">years old</span>
                </div>
              </Field>
            </div>
          </Card>

          <Card>
            <CardTitle
              title="Extra Bedding & Baby Crib Policies"
              subtitle="Rollaway beds, baby crib allotments, and associated nightly equipment charges"
              icon={Lucide.Bed}
            />

            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border p-4 bg-muted-surface/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-body font-bold text-ink">Rollaway Extra Beds</h4>
                  <p className="text-label text-ink-secondary mt-0.5">
                    Allow guests to request additional single folding beds
                  </p>
                </div>
                <Checkbox
                  checked={form.allowExtraBeds}
                  onChange={(e) => setForm({ ...form, allowExtraBeds: e.target.checked })}
                  label="Permit Extra Beds"
                />
              </div>

              {form.allowExtraBeds && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-1">
                  <Field label="Max Extra Beds per Room">
                    <TextField
                      type="number"
                      min={1}
                      max={3}
                      value={form.maxExtraBeds}
                      onChange={(e) => setForm({ ...form, maxExtraBeds: Number(e.target.value) })}
                      className="tnum"
                    />
                  </Field>

                  <Field label={`Nightly Extra Bed Surcharge (${currencyCode})`}>
                    <TextField
                      type="number"
                      min={0}
                      value={form.extraBedRate}
                      onChange={(e) => setForm({ ...form, extraBedRate: Number(e.target.value) })}
                      className="tnum"
                    />
                  </Field>
                </div>
              )}

              <div className="rounded-xl border border-border p-4 bg-muted-surface/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-body font-bold text-ink">Infant Baby Cribs & Cots</h4>
                  <p className="text-label text-ink-secondary mt-0.5">
                    Wooden or mesh safety cribs for infants (0-2 years)
                  </p>
                </div>
                <Checkbox
                  checked={form.allowCribs}
                  onChange={(e) => setForm({ ...form, allowCribs: e.target.checked })}
                  label="Permit Baby Cribs"
                />
              </div>

              {form.allowCribs && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-1">
                  <Field label="Max Cribs per Room">
                    <TextField
                      type="number"
                      min={1}
                      max={2}
                      value={form.maxCribs}
                      onChange={(e) => setForm({ ...form, maxCribs: Number(e.target.value) })}
                      className="tnum"
                    />
                  </Field>

                  <div className="flex items-center pt-6">
                    <Checkbox
                      checked={form.cribComplimentary}
                      onChange={(e) => setForm({ ...form, cribComplimentary: e.target.checked })}
                      label="Complimentary (No Surcharge)"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-divider flex items-center justify-end gap-2.5">
              <Button variant="secondary" onClick={handleReset}>
                Reset Changes
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
                icon={isSaving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
              >
                {isSaving ? 'Saving…' : 'Save Occupancy Rules'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Col: Live Interactive Scenario Calculator */}
        <div className="flex flex-col gap-4">
          <Card elevated>
            <CardTitle
              title="Live Rule Simulator"
              subtitle="Test how your rules calculate fees and capacity for a guest party"
              icon={Lucide.Calculator}
            />

            <div className="flex flex-col gap-3.5">
              <Field label="Adults in Reservation">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    className="h-8 w-8 !p-0"
                    onClick={() => setSimAdults(Math.max(1, simAdults - 1))}
                  >
                    -
                  </Button>
                  <span className="flex-1 text-center font-bold text-ink tnum">{simAdults} Adults</span>
                  <Button
                    variant="secondary"
                    className="h-8 w-8 !p-0"
                    onClick={() => setSimAdults(simAdults + 1)}
                  >
                    +
                  </Button>
                </div>
              </Field>

              <Field label="Children in Reservation">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    className="h-8 w-8 !p-0"
                    onClick={() => setSimChildren(Math.max(0, simChildren - 1))}
                  >
                    -
                  </Button>
                  <span className="flex-1 text-center font-bold text-ink tnum">{simChildren} Children</span>
                  <Button
                    variant="secondary"
                    className="h-8 w-8 !p-0"
                    onClick={() => setSimChildren(simChildren + 1)}
                  >
                    +
                  </Button>
                </div>
              </Field>

              <div className="pt-2">
                <Checkbox
                  checked={simExtraBed}
                  onChange={(e) => setSimExtraBed(e.target.checked)}
                  label="Guest requested 1 Extra Bed"
                />
              </div>

              <div
                className={`rounded-xl border p-3 flex items-start gap-2.5 ${
                  isOverCapacity
                    ? 'bg-danger-bg text-danger-text border-danger-border'
                    : 'bg-success-bg text-success-text border-success-border'
                }`}
              >
                {isOverCapacity ? (
                  <Lucide.AlertTriangle size={18} className="shrink-0 mt-0.5" />
                ) : (
                  <Lucide.CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-label font-bold">
                    {isOverCapacity
                      ? 'Exceeds Maximum Room Limit'
                      : 'Compliant with Room Capacity'}
                  </p>
                  <p className="text-micro mt-0.5 opacity-90">
                    {isOverCapacity
                      ? `${totalGuests} guests exceed maximum room limit of ${form.maxTotalOccupancy}. Requires booking a second room.`
                      : `${totalGuests} guests fit comfortably within maximum limit of ${form.maxTotalOccupancy}.`}
                  </p>
                </div>
              </div>

              {/* Fee Breakdown Card */}
              <div className="rounded-xl border border-border p-3.5 bg-muted-surface/60 flex flex-col gap-2">
                <span className="text-micro font-bold uppercase tracking-wider text-ink-muted">
                  Nightly Add-on Calculation
                </span>
                <div className="flex items-center justify-between text-label">
                  <span className="text-ink-secondary">
                    Extra Adult Surcharge ({extraAdultsCount} x {formatCurrency(form.extraAdultSurcharge, currencyCode)})
                  </span>
                  <span className="font-semibold text-ink tnum">
                    {formatCurrency(extraAdultSurchargeTotal, currencyCode)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-label">
                  <span className="text-ink-secondary">Rollaway Bed Fee</span>
                  <span className="font-semibold text-ink tnum">
                    {formatCurrency(extraBedSurchargeTotal, currencyCode)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-label">
                  <span className="text-ink-secondary">Children under {form.childFreeAgeLimit}</span>
                  <span className="font-semibold text-success-text">FREE</span>
                </div>
                <div className="pt-2 border-t border-divider flex items-center justify-between">
                  <span className="text-label font-bold text-ink">Total Nightly Add-ons</span>
                  <span className="text-disp2 font-black text-ink tnum">
                    {formatCurrency(simulatedNightlyAddon, currencyCode)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
