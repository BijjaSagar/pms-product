import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Button } from '../../../components/primitives';
import { TableContainer } from '../../../components/ui';
import { toast } from '../../../utils/toast';
import { AttributeDialog } from './AttributeDialog';
import { SectionCard } from './SectionCard';
import { CODE_PATTERN, codeInUse, normalizeCode, saveRoomSetting, type AttributeDef } from './roomSettingsData';
import type { RunSave } from './useRoomSave';

const blankAttribute = (): AttributeDef => ({
  id: crypto.randomUUID(), code: '', name: '', type: 'Dropdown', options: [], description: '', active: true,
});

/* The choices an attribute offers, as the table and the room type form show them. */
const choicesOf = (attribute: AttributeDef) =>
  attribute.type === 'Yes-No' ? 'Yes, No' : attribute.type === 'Dropdown' ? attribute.options.join(', ') || 'No options yet' : attribute.type;

export function AttributesCard({ attributes, saving, run }: { attributes: AttributeDef[]; saving: boolean; run: RunSave }) {
  const [editing, setEditing] = useState<{ isNew: boolean; draft: AttributeDef; optionsText: string } | null>(null);

  const save = async () => {
    if (!editing) return;
    const draft = editing.draft;
    const code = normalizeCode(draft.code);
    const name = draft.name.trim();
    if (name.length < 2) return toast('Name required', { detail: 'Give the attribute a name.', tone: 'warning' });
    if (!CODE_PATTERN.test(code)) return toast('Check the attribute code', { detail: 'Use up to 20 letters, digits, _ or -.', tone: 'warning' });
    if (codeInUse(attributes, code, editing.isNew ? null : draft.id)) {
      return toast('Code already used', { detail: `Another attribute already uses ${code}.`, tone: 'warning' });
    }
    const options = editing.optionsText.split(',').map((option) => option.trim()).filter(Boolean);
    if (draft.type === 'Dropdown' && options.length === 0) {
      return toast('Add the options', { detail: 'A dropdown attribute needs at least one option.', tone: 'warning' });
    }
    const saved: AttributeDef = {
      ...draft,
      code,
      name,
      description: draft.description.trim(),
      options: draft.type === 'Dropdown' ? options : draft.type === 'Yes-No' ? ['Yes', 'No'] : [],
    };
    const next = editing.isNew ? [...attributes, saved] : attributes.map((item) => (item.id === draft.id ? saved : item));
    if (await run('Attributes', () => saveRoomSetting('attributes', next))) setEditing(null);
  };

  return (
    <>
      <SectionCard
        icon={Lucide.Tags}
        title="Room Attributes"
        description="Characteristics used for room allocation and guest preferences, such as view or smoking preference"
        action={
          <Button
            variant="primary"
            type="button"
            onClick={() => setEditing({ isNew: true, draft: blankAttribute(), optionsText: '' })}
            icon={<Lucide.Plus size={15} strokeWidth={2.4} />}
          >
            Add Attribute
          </Button>
        }
      >
        <TableContainer>
          <table className="pms-table min-w-[680px] w-full text-left">
            <thead>
              <tr>
                <th>CODE</th>
                <th>NAME</th>
                <th>TYPE</th>
                <th>OPTIONS</th>
                <th>STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {attributes.map((attribute) => (
                <tr key={attribute.id} className="border-b border-divider last:border-b-0">
                  <td className="py-3 font-mono text-label text-ink-secondary">{attribute.code}</td>
                  <td className="py-3 font-bold text-ink text-label">{attribute.name}</td>
                  <td className="py-3 text-label text-ink-secondary">{attribute.type}</td>
                  <td className="py-3 max-w-[260px] truncate text-label text-ink-muted">{choicesOf(attribute)}</td>
                  <td className="py-3 text-label font-medium text-ink-secondary">{attribute.active ? 'Active' : 'Inactive'}</td>
                  <td className="py-3 text-right">
                    <Button
                      variant="secondary"
                      type="button"
                      title={`Edit ${attribute.name}`}
                      onClick={() => setEditing({ isNew: false, draft: { ...attribute }, optionsText: attribute.options.join(', ') })}
                    >
                      <Lucide.Pencil size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {attributes.length === 0 && <p className="py-8 text-center text-label text-ink-muted">No attributes yet.</p>}
        </TableContainer>
      </SectionCard>

      <AttributeDialog
        draft={editing?.draft ?? null}
        optionsText={editing?.optionsText ?? ''}
        isNew={editing?.isNew ?? false}
        onChange={(patch) => setEditing((current) => (current ? { ...current, draft: { ...current.draft, ...patch } } : current))}
        onOptionsText={(text) => setEditing((current) => (current ? { ...current, optionsText: text } : current))}
        onClose={() => setEditing(null)}
        onSave={() => void save()}
        saving={saving}
      />
    </>
  );
}
