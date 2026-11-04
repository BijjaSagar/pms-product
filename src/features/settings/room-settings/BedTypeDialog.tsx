import { Field } from '../../../components/controls';
import { Modal } from '../../../components/overlays';
import { Button, SelectField } from '../../../components/primitives';
import { inputClass } from '../../../utils/styling';
import { BED_UNITS, type BedType } from './roomSettingsData';

/* Adds or edits one bed type. The card owns the draft and the save. */
export function BedTypeDialog({
  draft,
  isNew,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  /* Null while the dialog is closed. */
  draft: BedType | null;
  isNew: boolean;
  onChange: (patch: Partial<BedType>) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Modal
      open={draft !== null}
      onClose={onClose}
      title={isNew ? 'Add Bed Type' : `Edit ${draft?.name ?? ''}`}
      subtitle="The bed a room type can offer, with its size"
    >
      {draft && (
        <div className="grid grid-cols-1 gap-3.5 py-2 sm:grid-cols-2">
          <Field label="Bed code" hint="Up to 20 letters, digits, _ or -">
            <input value={draft.code} onChange={(e) => onChange({ code: e.target.value.toUpperCase() })} className={inputClass()} autoFocus />
          </Field>
          <Field label="Bed name">
            <input value={draft.name} onChange={(e) => onChange({ name: e.target.value })} className={inputClass()} placeholder="e.g. Queen" />
          </Field>
          <Field label="Width">
            <input
              type="number"
              min={0}
              value={draft.width ?? ''}
              onChange={(e) => onChange({ width: e.target.value === '' ? null : Number(e.target.value) })}
              className={inputClass('tnum')}
            />
          </Field>
          <Field label="Length">
            <input
              type="number"
              min={0}
              value={draft.length ?? ''}
              onChange={(e) => onChange({ length: e.target.value === '' ? null : Number(e.target.value) })}
              className={inputClass('tnum')}
            />
          </Field>
          <Field label="Measurement unit">
            <SelectField value={draft.unit} onChange={(e) => onChange({ unit: e.target.value as BedType['unit'] })} className="w-full">
              {BED_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </SelectField>
          </Field>
          <Field label="Status">
            <SelectField value={draft.active ? 'active' : 'inactive'} onChange={(e) => onChange({ active: e.target.value === 'active' })} className="w-full">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectField>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <input value={draft.description} onChange={(e) => onChange({ description: e.target.value })} className={inputClass()} />
            </Field>
          </div>
          <div className="flex gap-2 border-t pt-3 sm:col-span-2" style={{ borderColor: 'var(--color-border)' }}>
            <Button variant="secondary" type="button" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="primary" type="button" className="flex-1" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Bed Type'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
