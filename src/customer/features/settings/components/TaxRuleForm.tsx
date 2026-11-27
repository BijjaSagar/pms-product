import { useState } from 'react';
import * as Lucide from 'lucide-react';
import type { TaxAppliedOn, TaxCategoryRow, TaxComponent, TaxComponentCode, TaxSetupRuleInput, TaxSetupRuleRow, TaxSlab, TaxValueType } from '../../../../shared/services/taxSetupApi';
import { Button, SelectField, TextArea, TextField } from '../../../../shared/components/ui/primitives';
import { Field } from '../../../../shared/components/ui/controls';
import { Modal } from '../../../../shared/components/ui/overlays';

const COMPONENT_CODES: TaxComponentCode[] = ['CGST', 'SGST'];

const APPLIED_ON: { value: TaxAppliedOn; label: string }[] = [
  { value: 'ROOM_TARIFF', label: 'Room tariff' },
  { value: 'TOTAL_AMOUNT', label: 'Total amount' },
];

const newSlab = (): TaxSlab => ({ id: crypto.randomUUID(), from: '', to: '', valueType: 'PERCENTAGE', value: '' });

const newComponent = (code: TaxComponentCode): TaxComponent => ({ code, appliedOn: 'ROOM_TARIFF', slabs: [newSlab()] });

/** The first problem with the slabs of one component, or null when they are fine. */
function slabProblem(component: TaxComponent): string | null {
  const bands: [number, number][] = [];
  for (const [index, slab] of component.slabs.entries()) {
    const label = `${component.code} slab ${index + 1}`;
    if (slab.from.trim() === '' || slab.to.trim() === '' || slab.value.trim() === '') {
      return `${label}: fill in the start range, end range and tax.`;
    }
    const from = Number(slab.from);
    const to = Number(slab.to);
    const value = Number(slab.value);
    if (![from, to, value].every(Number.isFinite) || from < 0 || value < 0) {
      return `${label}: amounts and tax cannot be negative.`;
    }
    if (to <= from) return `${label}: the end range must be above the start range.`;
    if (slab.valueType === 'PERCENTAGE' && value > 100) return `${label}: a percentage cannot be above 100.`;
    bands.push([from, to]);
  }
  bands.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < bands.length; i += 1) {
    if (bands[i][0] < bands[i - 1][1]) return `${component.code}: the slabs overlap.`;
  }
  return null;
}

function SlabRow({
  component,
  slab,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  component: TaxComponentCode;
  slab: TaxSlab;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<TaxSlab>) => void;
  onRemove: () => void;
}) {
  const radioName = `${component}-${slab.id}`;
  return (
    <li className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-3 md:grid-cols-[1fr_1fr_auto_1fr_auto] md:items-end">
      <h4 className="col-span-full text-body font-bold text-ink">Slab {index + 1}</h4>
      <Field label="Amount start range">
        <TextField type="number" min={0} value={slab.from} onChange={(e) => onChange({ from: e.target.value })} aria-label={`${component} slab ${index + 1} start range`} />
      </Field>
      <Field label="End range">
        <TextField type="number" min={0} value={slab.to} onChange={(e) => onChange({ to: e.target.value })} aria-label={`${component} slab ${index + 1} end range`} />
      </Field>
      <fieldset className="col-span-2 flex min-w-0 flex-col gap-1.5 md:col-span-1">
        <legend className="pms-label mb-1.5">Tax value type</legend>
        <div className="flex min-h-[34px] flex-wrap items-center gap-x-4 gap-y-1 md:min-h-[32px]">
          {(['PERCENTAGE', 'FIXED'] as TaxValueType[]).map((type) => (
            <label key={type} className="flex cursor-pointer items-center gap-1.5 text-body text-ink">
              <input
                type="radio"
                name={radioName}
                checked={slab.valueType === type}
                onChange={() => onChange({ valueType: type })}
                className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
              />
              {type === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={slab.valueType === 'PERCENTAGE' ? 'Tax (%)' : 'Tax (amount)'}>
        <TextField type="number" min={0} step="0.01" value={slab.value} onChange={(e) => onChange({ value: e.target.value })} aria-label={`${component} slab ${index + 1} tax`} />
      </Field>
      <div className="col-span-2 flex justify-end md:col-span-1">
        <Button
          variant="secondary"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label={`Remove ${component} slab ${index + 1}`}
          title={canRemove ? 'Remove slab' : 'A component needs at least one slab'}
          icon={<Lucide.Trash2 size={14} />}
        >
          <span className="md:hidden">Remove</span>
        </Button>
      </div>
    </li>
  );
}

function ComponentCard({
  component,
  onChange,
}: {
  component: TaxComponent;
  onChange: (next: TaxComponent) => void;
}) {
  const updateSlab = (id: string, patch: Partial<TaxSlab>) =>
    onChange({ ...component, slabs: component.slabs.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-page/60 p-3 sm:p-4" aria-label={component.code}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Tax component">
          <TextField value={component.code} readOnly className="font-bold" />
        </Field>
        <Field label="Tax applied on">
          <SelectField value={component.appliedOn} onChange={(e) => onChange({ ...component, appliedOn: e.target.value as TaxAppliedOn })}>
            {APPLIED_ON.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </Field>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="pms-label">Tax slabs</p>
        <Button variant="secondary" icon={<Lucide.Plus size={14} />} onClick={() => onChange({ ...component, slabs: [...component.slabs, newSlab()] })}>
          Add slab
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {component.slabs.map((slab, index) => (
          <SlabRow
            key={slab.id}
            component={component.code}
            slab={slab}
            index={index}
            canRemove={component.slabs.length > 1}
            onChange={(patch) => updateSlab(slab.id, patch)}
            onRemove={() => onChange({ ...component, slabs: component.slabs.filter((s) => s.id !== slab.id) })}
          />
        ))}
      </ul>
    </section>
  );
}

/** Add or edit one tax rule. Remounted per rule, so it always starts from that rule's values. */
export function TaxRuleForm({
  rule,
  categories,
  onSave,
  onClose,
}: {
  rule: TaxSetupRuleRow | null;
  categories: TaxCategoryRow[];
  onSave: (body: TaxSetupRuleInput) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(rule?.name ?? '');
  const [description, setDescription] = useState(rule?.description ?? '');
  const [startDate, setStartDate] = useState(rule?.startDate ?? '');
  const [endDate, setEndDate] = useState(rule?.endDate ?? '');
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? '');
  const [components, setComponents] = useState<TaxComponent[]>(
    () => rule?.components ?? COMPONENT_CODES.map(newComponent),
  );
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const dateProblem = startDate && endDate && endDate < startDate ? 'The end date cannot be before the start date.' : undefined;

  const submit = async () => {
    const found =
      (!name.trim() && 'Enter a name for the rule.') ||
      (!categoryId && 'Choose the applicable tax category.') ||
      (!startDate && 'Choose a start date.') ||
      dateProblem ||
      components.map(slabProblem).find(Boolean) ||
      null;
    setProblem(found);
    if (found) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim(), startDate, endDate, categoryId, components });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={rule ? 'Edit Tax Rule' : 'Add Tax Rule'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={saving || categories.length === 0} onClick={() => void submit()}>
            {rule ? 'Save Changes' : 'Add Rule'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Name" required className="sm:col-span-2">
            <TextField autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. GST on rooms" />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <TextArea rows={2} value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} placeholder="What this rule is for" />
          </Field>
          <Field label="Start date" required>
            <TextField type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="End date" error={dateProblem} hint="Leave empty for no end">
            <TextField type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
          <Field
            label="Applicable tax category"
            required
            className="sm:col-span-2"
            hint={categories.length === 0 ? 'Add a tax category first, then come back to create a rule.' : undefined}
          >
            <SelectField value={categoryId} disabled={categories.length === 0} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.description ? `${c.name} — ${c.description}` : c.name}
                </option>
              ))}
            </SelectField>
          </Field>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-body font-bold text-ink">Tax components</p>
          {components.map((component) => (
            <ComponentCard
              key={component.code}
              component={component}
              onChange={(next) => setComponents((prev) => prev.map((c) => (c.code === next.code ? next : c)))}
            />
          ))}
        </div>

        {problem ? (
          <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg p-3 text-label font-medium text-danger-text">
            {problem}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
