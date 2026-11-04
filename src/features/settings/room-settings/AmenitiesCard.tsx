import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Button } from '../../../components/primitives';
import { TableContainer } from '../../../components/ui';
import { toast } from '../../../utils/toast';
import { AmenityDialog } from './AmenityDialog';
import { SectionCard } from './SectionCard';
import { AMENITY_CATEGORIES, CODE_PATTERN, codeInUse, normalizeCode, saveRoomSetting, type AmenityDef } from './roomSettingsData';
import type { RunSave } from './useRoomSave';

const blankAmenity = (): AmenityDef => ({
  id: crypto.randomUUID(), code: '', name: '', category: 'Comfort', description: '', active: true,
});

/* Amenities listed by category, in the order the categories are defined. */
const byCategory = (items: AmenityDef[]) =>
  [...items].sort((a, b) => AMENITY_CATEGORIES.indexOf(a.category) - AMENITY_CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name));

export function AmenitiesCard({ amenities, saving, run }: { amenities: AmenityDef[]; saving: boolean; run: RunSave }) {
  const [editing, setEditing] = useState<{ isNew: boolean; draft: AmenityDef } | null>(null);

  const save = async () => {
    if (!editing) return;
    const draft = editing.draft;
    const code = normalizeCode(draft.code);
    const name = draft.name.trim();
    if (name.length < 2) return toast('Name required', { detail: 'Give the amenity a name.', tone: 'warning' });
    if (!CODE_PATTERN.test(code)) return toast('Check the amenity code', { detail: 'Use up to 20 letters, digits, _ or -.', tone: 'warning' });
    if (codeInUse(amenities, code, editing.isNew ? null : draft.id)) {
      return toast('Code already used', { detail: `Another amenity already uses ${code}.`, tone: 'warning' });
    }
    const saved = { ...draft, code, name, description: draft.description.trim() };
    const next = editing.isNew ? [...amenities, saved] : amenities.map((item) => (item.id === draft.id ? saved : item));
    if (await run('Amenities', () => saveRoomSetting('amenities', next))) setEditing(null);
  };

  return (
    <>
      <SectionCard
        icon={Lucide.Sparkles}
        title="Room Amenities"
        description="Facilities provided inside the room. Room types offer a selection of these."
        action={
          <Button variant="primary" type="button" onClick={() => setEditing({ isNew: true, draft: blankAmenity() })} icon={<Lucide.Plus size={15} strokeWidth={2.4} />}>
            Add Amenity
          </Button>
        }
      >
        <TableContainer>
          <table className="pms-table min-w-[680px] w-full text-left">
            <thead>
              <tr>
                <th>CODE</th>
                <th>NAME</th>
                <th>CATEGORY</th>
                <th>DESCRIPTION</th>
                <th>STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {byCategory(amenities).map((amenity) => (
                <tr key={amenity.id} className="border-b border-divider last:border-b-0">
                  <td className="py-3 font-mono text-label text-ink-secondary">{amenity.code}</td>
                  <td className="py-3 font-bold text-ink text-label">{amenity.name}</td>
                  <td className="py-3 text-label text-ink-secondary">{amenity.category}</td>
                  <td className="py-3 max-w-[220px] truncate text-label text-ink-muted">{amenity.description || '—'}</td>
                  <td className="py-3 text-label font-medium text-ink-secondary">{amenity.active ? 'Active' : 'Inactive'}</td>
                  <td className="py-3 text-right">
                    <Button variant="secondary" type="button" title={`Edit ${amenity.name}`} onClick={() => setEditing({ isNew: false, draft: { ...amenity } })}>
                      <Lucide.Pencil size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {amenities.length === 0 && <p className="py-8 text-center text-label text-ink-muted">No amenities yet.</p>}
        </TableContainer>
      </SectionCard>

      <AmenityDialog
        draft={editing?.draft ?? null}
        isNew={editing?.isNew ?? false}
        onChange={(patch) => setEditing((current) => (current ? { ...current, draft: { ...current.draft, ...patch } } : current))}
        onClose={() => setEditing(null)}
        onSave={() => void save()}
        saving={saving}
      />
    </>
  );
}
