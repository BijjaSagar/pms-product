import { Field } from '../../../components/controls';
import { Modal } from '../../../components/overlays';
import { Button, SelectField } from '../../../components/primitives';
import { inputClass } from '../../../utils/styling';
import { ChipPicker } from './ChipPicker';
import { toggled } from './selection';
import type { AttributeDef, BedType, CatalogItem, AmenityDef } from './roomSettingsData';

export interface TypeDraft {
  /* Null for a room type not saved yet. */
  id: string | null;
  code: string;
  name: string;
  description: string;
  baseRate: number;
  baseOccupancy: number;
  maxOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  defaultAdults: number;
  defaultChildren: number;
  extraBeds: number;
  roomSizeSqFt: number | null;
  defaultBedTypeId: string | null;
  classificationIds: string[];
  amenityIds: string[];
  attributeValues: Record<string, string>;
  active: boolean;
}

/* The control for one attribute: its options as a dropdown, yes or no, a number, or free text. */
function AttributeControl({ attribute, value, onChange }: { attribute: AttributeDef; value: string; onChange: (value: string) => void }) {
  if (attribute.type === 'Dropdown' || attribute.type === 'Yes-No') {
    const choices = attribute.type === 'Yes-No' ? ['Yes', 'No'] : attribute.options;
    return (
      <SelectField value={value} onChange={(e) => onChange(e.target.value)} className="w-full" aria-label={attribute.name}>
        <option value="">Not set</option>
        {choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
      </SelectField>
    );
  }
  return (
    <input
      type={attribute.type === 'Number' ? 'number' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass(attribute.type === 'Number' ? 'tnum' : '')}
      aria-label={attribute.name}
    />
  );
}

export function RoomTypeDialog({
  draft,
  onChange,
  onClose,
  onSave,
  saving,
  currencyCode,
  classifications,
  bedTypes,
  amenities,
  attributes,
}: {
  /* Null while the dialog is closed. */
  draft: TypeDraft | null;
  onChange: (patch: Partial<TypeDraft>) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  currencyCode: string;
  classifications: CatalogItem[];
  /* Active bed types, amenities and attributes, plus any this room type already uses. */
  bedTypes: BedType[];
  amenities: AmenityDef[];
  attributes: AttributeDef[];
}) {
  const isNew = draft?.id === null;

  return (
    <Modal
      open={draft !== null}
      onClose={onClose}
      title={isNew ? 'Add Room Type' : `Edit ${draft?.name ?? ''}`}
      subtitle="Category, occupancy, bed, rate, classification, attributes and amenities"
      wide
    >
      {draft && (
        <div className="grid grid-cols-1 gap-3.5 py-2 sm:grid-cols-2">
          <Field label="Room type code" hint={isNew ? 'Up to 20 letters, digits, _ or -' : 'The code cannot be changed after it is saved'}>
            <input
              value={draft.code}
              disabled={!isNew}
              onChange={(e) => onChange({ code: e.target.value.toUpperCase() })}
              className={inputClass('font-mono')}
              autoFocus={isNew}
            />
          </Field>
          <Field label="Room type name">
            <input
              value={draft.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className={inputClass()}
              placeholder="e.g. Deluxe Room, Junior Suite"
              autoFocus={!isNew}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <input value={draft.description} onChange={(e) => onChange({ description: e.target.value })} className={inputClass()} />
            </Field>
          </div>

          <Field label="Base occupancy" hint="Guests the rate is quoted for">
            <input type="number" min={1} value={draft.baseOccupancy} onChange={(e) => onChange({ baseOccupancy: Number(e.target.value) })} className={inputClass('tnum')} />
          </Field>
          <Field label="Maximum occupancy" hint="Most guests the room can take, adults and children">
            <input type="number" min={1} value={draft.maxOccupancy} onChange={(e) => onChange({ maxOccupancy: Number(e.target.value) })} className={inputClass('tnum')} />
          </Field>
          <Field label="Max adults">
            <input type="number" min={1} max={50} value={draft.maxAdults} onChange={(e) => onChange({ maxAdults: Number(e.target.value) })} className={inputClass('tnum')} />
          </Field>
          <Field label="Max children">
            <input type="number" min={0} max={50} value={draft.maxChildren} onChange={(e) => onChange({ maxChildren: Number(e.target.value) })} className={inputClass('tnum')} />
          </Field>
          <Field label="Default adults">
            <input type="number" min={1} value={draft.defaultAdults} onChange={(e) => onChange({ defaultAdults: Number(e.target.value) })} className={inputClass('tnum')} />
          </Field>
          <Field label="Default children">
            <input type="number" min={0} value={draft.defaultChildren} onChange={(e) => onChange({ defaultChildren: Number(e.target.value) })} className={inputClass('tnum')} />
          </Field>

          <Field label="Default bed type">
            <SelectField value={draft.defaultBedTypeId ?? ''} onChange={(e) => onChange({ defaultBedTypeId: e.target.value || null })} className="w-full">
              <option value="">Not set</option>
              {bedTypes.map((bed) => <option key={bed.id} value={bed.id}>{bed.name}</option>)}
            </SelectField>
          </Field>
          <Field label="Room size (sq. ft.)">
            <input
              type="number"
              min={0}
              value={draft.roomSizeSqFt ?? ''}
              onChange={(e) => onChange({ roomSizeSqFt: e.target.value === '' ? null : Number(e.target.value) })}
              className={inputClass('tnum')}
            />
          </Field>
          <Field label="Extra beds allowed">
            <input type="number" min={0} value={draft.extraBeds} onChange={(e) => onChange({ extraBeds: Number(e.target.value) })} className={inputClass('tnum')} />
          </Field>
          <Field label={`Base rate per night (${currencyCode})`}>
            <input type="number" min={0} value={draft.baseRate} onChange={(e) => onChange({ baseRate: Number(e.target.value) })} className={inputClass('tnum')} />
          </Field>
          <Field label="Status">
            <SelectField value={draft.active ? 'active' : 'inactive'} onChange={(e) => onChange({ active: e.target.value === 'active' })} className="w-full">
              <option value="active">Active (Available for booking)</option>
              <option value="inactive">Inactive (Hidden from sales)</option>
            </SelectField>
          </Field>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="pms-label">Classification</span>
            <ChipPicker
              options={classifications.map((item) => ({ value: item.id, label: item.label }))}
              selected={draft.classificationIds}
              onToggle={(id) => onChange({ classificationIds: toggled(draft.classificationIds, id) })}
              emptyText="No classifications defined yet. Add them in the Room Classifications list."
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="pms-label">Amenities</span>
            <ChipPicker
              options={amenities.map((item) => ({ value: item.id, label: item.name }))}
              selected={draft.amenityIds}
              onToggle={(id) => onChange({ amenityIds: toggled(draft.amenityIds, id) })}
              emptyText="No amenities defined yet. Add them in Room Amenities."
            />
          </div>

          {attributes.length > 0 && (
            <div className="grid grid-cols-1 gap-3.5 sm:col-span-2 sm:grid-cols-2">
              <span className="pms-label sm:col-span-2">Attributes</span>
              {attributes.map((attribute) => (
                <Field key={attribute.id} label={attribute.name}>
                  <AttributeControl
                    attribute={attribute}
                    value={draft.attributeValues[attribute.id] ?? ''}
                    onChange={(value) => onChange({ attributeValues: { ...draft.attributeValues, [attribute.id]: value } })}
                  />
                </Field>
              ))}
            </div>
          )}

          <div className="flex gap-2 border-t pt-3 sm:col-span-2" style={{ borderColor: 'var(--color-border)' }}>
            <Button variant="secondary" type="button" className="flex-1" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="button" className="flex-1" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Room Type'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
