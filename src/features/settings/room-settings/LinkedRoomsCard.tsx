import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Button, IconButton, SelectField, TextField } from '../../../components/primitives';
import { toast } from '../../../utils/toast';
import { ChipPicker } from './ChipPicker';
import { toggled } from './selection';
import { SectionCard } from './SectionCard';
import { LINK_KINDS, saveRoomSetting, type LinkGroup, type LinkKind, type RoomSettingsData } from './roomSettingsData';
import type { RunSave } from './useRoomSave';

export function LinkedRoomsCard({ data, saving, run }: { data: RoomSettingsData; saving: boolean; run: RunSave }) {
  const { rooms, settings } = data;
  const [groups, setGroups] = useState<LinkGroup[]>(settings.links);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<LinkKind>('Connecting');
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const dirty = JSON.stringify(groups) !== JSON.stringify(settings.links);

  const sortedRooms = rooms
    .filter((room): room is typeof room & { backendId: string } => Boolean(room.backendId))
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  const numberOf = new Map(sortedRooms.map((room) => [room.backendId, room.number]));

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return toast('Name the linked group', { tone: 'warning' });
    if (roomIds.length < 2) return toast('Pick at least two rooms to link', { tone: 'warning' });
    setGroups([...groups, { id: crypto.randomUUID(), name: trimmed, kind, roomIds }]);
    setName('');
    setRoomIds([]);
  };

  const save = () => {
    void run('Linked rooms', () => saveRoomSetting('links', groups));
  };

  return (
    <SectionCard
      icon={Lucide.Link2}
      title="Connecting & Linked Rooms"
      description="Rooms that share a door, an adjoining wall or a suite, so they can be sold and cleaned together"
      action={
        <Button variant="primary" type="button" onClick={save} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      }
    >
      {groups.length === 0 && <p className="mb-3 text-label text-ink-muted">No linked rooms yet.</p>}
      <ul className="flex flex-col gap-2">
        {groups.map((group) => (
          <li key={group.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold text-ink truncate">
                {group.name} <span className="ml-1 text-label font-medium text-ink-muted">{group.kind}</span>
              </p>
              <p className="text-label text-ink-secondary tnum">
                {group.roomIds.map((id) => numberOf.get(id) ?? 'Removed room').join(' · ')}
              </p>
            </div>
            <IconButton variant="ghost" type="button" aria-label={`Remove ${group.name}`} onClick={() => setGroups(groups.filter((item) => item.id !== group.id))}>
              <Lucide.X size={14} />
            </IconButton>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-[1fr_11rem]" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <TextField value={name} placeholder="Group name, e.g. Suite 501 & 502" aria-label="Linked group name" onChange={(e) => setName(e.target.value)} />
        <SelectField value={kind} aria-label="Link type" onChange={(e) => setKind(e.target.value as LinkKind)}>
          {LINK_KINDS.map((item) => <option key={item} value={item}>{item}</option>)}
        </SelectField>
        <div className="sm:col-span-2 flex flex-col gap-2">
          <span className="pms-label">Rooms in this group</span>
          <ChipPicker
            options={sortedRooms.map((room) => ({ value: room.backendId, label: room.number }))}
            selected={roomIds}
            onToggle={(id) => setRoomIds(toggled(roomIds, id))}
            emptyText="No rooms in the inventory yet."
          />
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <Button variant="secondary" type="button" onClick={add} icon={<Lucide.Plus size={14} />}>Add Linked Group</Button>
        </div>
      </div>
    </SectionCard>
  );
}
