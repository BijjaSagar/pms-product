import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Button } from '../../../components/primitives';
import { TableContainer } from '../../../components/ui';
import { toast } from '../../../utils/toast';
import { BedTypeDialog } from './BedTypeDialog';
import { SectionCard } from './SectionCard';
import { CODE_PATTERN, codeInUse, normalizeCode, saveRoomSetting, type BedType } from './roomSettingsData';
import type { RunSave } from './useRoomSave';

const blankBedType = (): BedType => ({
  id: crypto.randomUUID(), code: '', name: '', width: null, length: null, unit: 'Inches', description: '', active: true,
});

/* The size as the spec shows it: 60 × 75 Inches, or "Not set". */
const sizeOf = (bed: BedType) =>
  bed.width === null && bed.length === null ? 'Not set' : `${bed.width ?? '—'} × ${bed.length ?? '—'} ${bed.unit}`;

export function BedTypesCard({ bedTypes, saving, run }: { bedTypes: BedType[]; saving: boolean; run: RunSave }) {
  const [editing, setEditing] = useState<{ isNew: boolean; draft: BedType } | null>(null);

  const save = async () => {
    if (!editing) return;
    const draft = editing.draft;
    const code = normalizeCode(draft.code);
    const name = draft.name.trim();
    if (name.length < 2) return toast('Name required', { detail: 'Give the bed type a name.', tone: 'warning' });
    if (!CODE_PATTERN.test(code)) return toast('Check the bed code', { detail: 'Use up to 20 letters, digits, _ or -.', tone: 'warning' });
    if (codeInUse(bedTypes, code, editing.isNew ? null : draft.id)) {
      return toast('Code already used', { detail: `Another bed type already uses ${code}.`, tone: 'warning' });
    }
    if ([draft.width, draft.length].some((size) => size !== null && !(size > 0))) {
      return toast('Check the size', { detail: 'Width and length must be above zero.', tone: 'warning' });
    }
    const saved = { ...draft, code, name, description: draft.description.trim() };
    const next = editing.isNew ? [...bedTypes, saved] : bedTypes.map((item) => (item.id === draft.id ? saved : item));
    if (await run('Bed types', () => saveRoomSetting('bedTypes', next))) setEditing(null);
  };

  return (
    <>
      <SectionCard
        icon={Lucide.Bed}
        title="Bed Types"
        description="The beds rooms are furnished with. Room types pick a default bed from this list."
        action={
          <Button variant="primary" type="button" onClick={() => setEditing({ isNew: true, draft: blankBedType() })} icon={<Lucide.Plus size={15} strokeWidth={2.4} />}>
            Add Bed Type
          </Button>
        }
      >
        <TableContainer>
          <table className="pms-table min-w-[640px] w-full text-left">
            <thead>
              <tr>
                <th>CODE</th>
                <th>NAME</th>
                <th>SIZE</th>
                <th>DESCRIPTION</th>
                <th>STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {bedTypes.map((bed) => (
                <tr key={bed.id} className="border-b border-divider last:border-b-0">
                  <td className="py-3 font-mono text-label text-ink-secondary">{bed.code}</td>
                  <td className="py-3 font-bold text-ink text-label">{bed.name}</td>
                  <td className="py-3 tnum text-label text-ink-secondary">{sizeOf(bed)}</td>
                  <td className="py-3 max-w-[220px] truncate text-label text-ink-muted">{bed.description || '—'}</td>
                  <td className="py-3 text-label font-medium text-ink-secondary">{bed.active ? 'Active' : 'Inactive'}</td>
                  <td className="py-3 text-right">
                    <Button variant="secondary" type="button" title={`Edit ${bed.name}`} onClick={() => setEditing({ isNew: false, draft: { ...bed } })}>
                      <Lucide.Pencil size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bedTypes.length === 0 && <p className="py-8 text-center text-label text-ink-muted">No bed types yet.</p>}
        </TableContainer>
      </SectionCard>

      <BedTypeDialog
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
