import { Field } from '../../../components/controls';
import { Modal } from '../../../components/overlays';
import { Button, SelectField } from '../../../components/primitives';
import { inputClass } from '../../../utils/styling';
import { AMENITY_CATEGORIES, type AmenityDef } from './roomSettingsData';

/* Adds or edits one amenity. The card owns the draft and the save. */
export function AmenityDialog({
  draft,
  isNew,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  /* Null while the dialog is closed. */
  draft: AmenityDef | null;
  isNew: boolean;
  onChange: (patch: Partial<AmenityDef>) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Modal
      open={draft !== null}
      onClose={onClose}
      title={isNew ? 'Add Amenity' : `Edit ${draft?.name ?? ''}`}
      subtitle="A facility provided inside the room"
    >
      {draft && (
        <div className="grid grid-cols-1 gap-3.5 py-2 sm:grid-cols-2">
          <Field label="Amenity code" hint="Up to 20 letters, digits, _ or -">
            <input value={draft.code} onChange={(e) => onChange({ code: e.target.value.toUpperCase() })} className={inputClass()} autoFocus />
          </Field>
          <Field label="Amenity name">
            <input value={draft.name} onChange={(e) => onChange({ name: e.target.value })} className={inputClass()} placeholder="e.g. Smart TV" />
          </Field>
          <Field label="Category">
            <SelectField value={draft.category} onChange={(e) => onChange({ category: e.target.value as AmenityDef['category'] })} className="w-full">
              {AMENITY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
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
              {saving ? 'Saving…' : 'Save Amenity'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
