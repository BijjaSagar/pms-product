import { Field } from '../../../components/controls';
import { Modal } from '../../../components/overlays';
import { Button, SelectField } from '../../../components/primitives';
import { inputClass } from '../../../utils/styling';
import { ATTRIBUTE_TYPES, type AttributeDef } from './roomSettingsData';

/* Adds or edits one room attribute. The card owns the draft, the options text and the save. */
export function AttributeDialog({
  draft,
  optionsText,
  isNew,
  onChange,
  onOptionsText,
  onClose,
  onSave,
  saving,
}: {
  /* Null while the dialog is closed. */
  draft: AttributeDef | null;
  optionsText: string;
  isNew: boolean;
  onChange: (patch: Partial<AttributeDef>) => void;
  onOptionsText: (text: string) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Modal
      open={draft !== null}
      onClose={onClose}
      title={isNew ? 'Add Attribute' : `Edit ${draft?.name ?? ''}`}
      subtitle="A characteristic used for room allocation and guest preferences"
    >
      {draft && (
        <div className="grid grid-cols-1 gap-3.5 py-2 sm:grid-cols-2">
          <Field label="Attribute code" hint="Up to 20 letters, digits, _ or -">
            <input value={draft.code} onChange={(e) => onChange({ code: e.target.value.toUpperCase() })} className={inputClass()} autoFocus />
          </Field>
          <Field label="Attribute name">
            <input value={draft.name} onChange={(e) => onChange({ name: e.target.value })} className={inputClass()} placeholder="e.g. Room View" />
          </Field>
          <Field label="Attribute type">
            <SelectField value={draft.type} onChange={(e) => onChange({ type: e.target.value as AttributeDef['type'] })} className="w-full">
              {ATTRIBUTE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </SelectField>
          </Field>
          <Field label="Status">
            <SelectField value={draft.active ? 'active' : 'inactive'} onChange={(e) => onChange({ active: e.target.value === 'active' })} className="w-full">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectField>
          </Field>
          {draft.type === 'Dropdown' && (
            <div className="sm:col-span-2">
              <Field label="Options" hint="Separate the choices with commas, e.g. City, Garden, Sea">
                <input value={optionsText} onChange={(e) => onOptionsText(e.target.value)} className={inputClass()} />
              </Field>
            </div>
          )}
          <div className="sm:col-span-2">
            <Field label="Description">
              <input value={draft.description} onChange={(e) => onChange({ description: e.target.value })} className={inputClass()} />
            </Field>
          </div>
          <div className="flex gap-2 border-t pt-3 sm:col-span-2" style={{ borderColor: 'var(--color-border)' }}>
            <Button variant="secondary" type="button" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="primary" type="button" className="flex-1" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Attribute'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
