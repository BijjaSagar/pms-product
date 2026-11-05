import { useState } from 'react';
import * as Lucide from 'lucide-react';
import type { RoomDetails } from '../../../lib/api/pms';
import { toast } from '../../../utils/toast';
import { Button, SelectField, TextField } from '../../../components/primitives';
import { Field } from '../../../components/controls';
import { Modal } from '../../../components/overlays';
import { Card, CardTitle } from '../../../components/ui';
import type { FloorPlan } from './types';
import { StatStrip, StatTile } from './RoomSettingsKit';
import { MAX_FLOORS, MAX_ROOMS_PER_FLOOR, boxKey, parseCount, roomNumber } from './floorPlan';

interface FloorsSectionProps {
  /** The property's room offerings that a box on the sitemap can be assigned to. */
  rooms: RoomDetails[];
  loading: boolean;
  /** Raw text of the "number of floors" field. */
  floorInput: string;
  onFloorInputChange: (value: string) => void;
  plan: FloorPlan;
  onPlanChange: (next: FloorPlan) => void;
  /** Why the saved plan could not be loaded, if it could not. */
  loadError: string | null;
  /** True while there are edits not yet saved to the backend. */
  dirty: boolean;
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
  /** The property's total number of rooms, when it has one; the plan may not draw more boxes than this. */
  totalRooms: number | null;
}

interface BoxRef {
  floor: number;
  index: number;
}

export function FloorsSection({
  rooms,
  loading,
  floorInput,
  onFloorInputChange,
  plan,
  onPlanChange,
  loadError,
  dirty,
  saving,
  canSave,
  onSave,
  totalRooms,
}: FloorsSectionProps) {
  const [picked, setPicked] = useState<BoxRef | null>(null);
  const [pickedRoomId, setPickedRoomId] = useState('');

  const floorCount = parseCount(floorInput, MAX_FLOORS);
  // Highest floor first, the way a building section is read.
  const floors = Array.from({ length: floorCount }, (_, i) => floorCount - i);
  const roomsOn = (floor: number) => Math.min(plan.roomsPerFloor[floor] ?? 0, MAX_ROOMS_PER_FLOOR);

  // Only boxes that are currently drawn count; shrinking a floor hides its extra boxes.
  const drawn: BoxRef[] = floors.flatMap((floor) =>
    Array.from({ length: roomsOn(floor) }, (_, i) => ({ floor, index: i + 1 })),
  );
  const overTotal = totalRooms !== null && drawn.length > totalRooms;
  const assignedTo = (roomId: string) => drawn.filter((b) => plan.assigned[boxKey(b.floor, b.index)] === roomId).length;
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? 'Removed room';

  const assignedCount = drawn.filter((b) => {
    const id = plan.assigned[boxKey(b.floor, b.index)];
    return id && rooms.some((r) => r.id === id);
  }).length;

  const setFloorRooms = (floor: number, raw: string) =>
    onPlanChange({ ...plan, roomsPerFloor: { ...plan.roomsPerFloor, [floor]: parseCount(raw, MAX_ROOMS_PER_FLOOR) } });

  const openBox = (box: BoxRef) => {
    setPicked(box);
    setPickedRoomId(plan.assigned[boxKey(box.floor, box.index)] ?? '');
  };

  const handleAssign = () => {
    if (!picked) return;
    const key = boxKey(picked.floor, picked.index);
    const { [key]: _previous, ...rest } = plan.assigned;
    onPlanChange({ ...plan, assigned: pickedRoomId ? { ...rest, [key]: pickedRoomId } : rest });
    toast(pickedRoomId ? 'Room assigned' : 'Room cleared', {
      detail: pickedRoomId
        ? `${roomName(pickedRoomId)} set for room ${roomNumber(picked.floor, picked.index)}.`
        : `Room ${roomNumber(picked.floor, picked.index)} is unassigned.`,
      tone: pickedRoomId ? 'success' : 'info',
    });
    setPicked(null);
  };

  // An offering can fill only as many boxes as it has units; the box being edited keeps its own choice.
  const currentId = picked ? (plan.assigned[boxKey(picked.floor, picked.index)] ?? '') : '';
  const options = rooms.filter((r) => r.id === currentId || assignedTo(r.id) < r.roomCount);

  return (
    <div className="flex flex-col gap-5">
      <StatStrip>
        <StatTile label="Floors" icon={Lucide.Layers} tone="info" value={floorCount} caption="In the floor plan" />
        <StatTile
          label="Rooms on Plan"
          icon={Lucide.DoorOpen}
          tone={overTotal ? 'danger' : 'success'}
          value={totalRooms ? `${drawn.length} / ${totalRooms}` : drawn.length}
          caption={totalRooms ? 'Boxes of the property total' : 'Boxes across all floors'}
        />
        <StatTile label="Assigned" icon={Lucide.BedDouble} tone="primary" value={assignedCount} caption="Linked to a room offering" />
        <StatTile
          label="Unassigned"
          icon={Lucide.CircleDashed}
          tone="warning"
          value={drawn.length - assignedCount}
          caption="Boxes still to link"
        />
      </StatStrip>

      <Card>
        <CardTitle
          title="Floor Management"
          subtitle="Enter the number of floors, then the rooms on each floor to draw the sitemap"
          icon={Lucide.Layers}
          action={
            <Button
              variant="primary"
              onClick={onSave}
              disabled={!canSave || !dirty || saving || floorCount === 0 || overTotal}
              icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
            >
              {saving ? 'Saving…' : dirty ? 'Save Floor Plan' : 'Saved'}
            </Button>
          }
        />

        {overTotal && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-warning-border bg-warning-bg p-3 text-label text-warning-text">
            <Lucide.AlertTriangle size={16} />
            <span>
              The plan draws {drawn.length} rooms but the property has {totalRooms}. Remove {drawn.length - (totalRooms ?? 0)} to
              save.
            </span>
          </div>
        )}

        {loadError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            <Lucide.AlertCircle size={16} />
            <span>Could not load the floor plan: {loadError}</span>
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 items-end gap-3.5 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <Field label="Number of Floors" hint={`1 to ${MAX_FLOORS}`}>
            <TextField
              type="number"
              min={1}
              max={MAX_FLOORS}
              value={floorInput}
              onChange={(e) => onFloorInputChange(e.target.value)}
              placeholder="e.g. 5"
              className="tnum"
            />
          </Field>
          <p className="text-label text-ink-secondary">
            {floorCount === 0
              ? 'Enter how many floors the property has to draw its sitemap.'
              : `${floorCount} floor${floorCount === 1 ? '' : 's'} · ${drawn.length} rooms on the plan. Select a room box to assign a room.`}
          </p>
        </div>

        {floorCount === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
            <Lucide.Building2 size={28} className="text-ink-muted" />
            <p className="text-label text-ink-muted">The floor sitemap appears here once you enter the number of floors.</p>
          </div>
        ) : (
          <ol className="flex flex-col gap-2" aria-label="Floor sitemap">
            {floors.map((floor) => {
              const count = roomsOn(floor);
              return (
                <li
                  key={floor}
                  className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-2.5 md:grid-cols-[150px_minmax(0,1fr)]"
                >
                  <div className="flex items-center gap-3 md:flex-col md:items-stretch md:justify-center md:gap-2">
                    <div className="flex flex-none flex-col items-center justify-center rounded-lg bg-primary/5 px-3 py-2 text-center">
                      <span className="text-micro font-bold uppercase tracking-wider text-ink-muted">Floor</span>
                      <span className="text-title font-extrabold text-primary tnum">{floor}</span>
                    </div>
                    <Field label="No. of Rooms">
                      <TextField
                        type="number"
                        min={0}
                        max={MAX_ROOMS_PER_FLOOR}
                        value={count === 0 ? '' : count}
                        onChange={(e) => setFloorRooms(floor, e.target.value)}
                        placeholder="e.g. 12"
                        className="tnum"
                      />
                    </Field>
                  </div>

                  {count === 0 ? (
                    <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-4 text-label text-ink-muted">
                      Enter the number of rooms on floor {floor} to draw its rooms.
                    </div>
                  ) : (
                    <ul
                      className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] content-start gap-2"
                      aria-label={`Rooms on floor ${floor}`}
                    >
                      {Array.from({ length: count }, (_, i) => {
                        const index = i + 1;
                        const id = plan.assigned[boxKey(floor, index)];
                        const known = id ? rooms.some((r) => r.id === id) : false;
                        return (
                          <li key={index}>
                            <button
                              type="button"
                              onClick={() => openBox({ floor, index })}
                              title={known ? `${roomNumber(floor, index)} · ${roomName(id)}` : `Assign a room to ${roomNumber(floor, index)}`}
                              className={`flex h-full min-h-[56px] w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1.5 text-center transition-colors ${
                                known
                                  ? 'border-primary/30 bg-primary/5 text-ink hover:bg-primary/10'
                                  : 'border-dashed border-border bg-muted-surface text-ink-secondary hover:bg-hover-surface'
                              }`}
                            >
                              <span className="text-label font-bold tnum">{roomNumber(floor, index)}</span>
                              <span className="w-full truncate text-micro text-ink-secondary">
                                {known ? roomName(id) : 'Unassigned'}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {loading && <p className="mt-3 text-label text-ink-muted">Loading rooms…</p>}
      </Card>

      <Modal
        open={picked !== null}
        onClose={() => setPicked(null)}
        title={picked ? `Room ${roomNumber(picked.floor, picked.index)}` : 'Room'}
        subtitle={picked ? `Floor ${picked.floor} · choose the room offering this box represents` : undefined}
      >
        {picked && (
          <div className="grid grid-cols-1 gap-3.5 py-2">
            <Field
              label="Room"
              hint={rooms.length === 0 ? 'Add rooms in the Rooms section first' : undefined}
            >
              <SelectField value={pickedRoomId} onChange={(e) => setPickedRoomId(e.target.value)}>
                <option value="">Unassigned</option>
                {options.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.roomCount - assignedTo(r.id) + (r.id === currentId ? 1 : 0)} left)
                  </option>
                ))}
              </SelectField>
            </Field>
            <div className="flex justify-end gap-2 border-t border-divider pt-3">
              <Button variant="secondary" onClick={() => setPicked(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAssign} icon={<Lucide.Check size={14} />}>
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
