import { useState } from 'react';
import * as Lucide from 'lucide-react';
import type { RoomDetails } from '../../../lib/api/pms';
import { toast } from '../../../utils/toast';
import { Button, IconButton, TextField } from '../../../components/primitives';
import { Modal } from '../../../components/overlays';
import { CardSkeleton } from '../../../components/Skeleton';
import { Badge, Card, CardTitle } from '../../../components/ui';
import type { FloorPlan } from './types';
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

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** A number field with minus and plus buttons, for counts that are nudged more often than typed. */
function Stepper({
  value,
  min,
  max,
  label,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <IconButton
        title={`Fewer: ${label}`}
        aria-label={`Fewer: ${label}`}
        onClick={() => onChange(clamp(value - 1, min, max))}
        disabled={disabled || value <= min}
      >
        <Lucide.Minus size={14} />
      </IconButton>
      <TextField
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value === 0 && min === 0 ? '' : value || ''}
        placeholder="0"
        aria-label={label}
        disabled={disabled}
        onChange={(e) => onChange(clamp(Math.floor(Number(e.target.value)) || 0, min, max))}
        className="tnum !w-14 text-center"
      />
      <IconButton
        title={`More: ${label}`}
        aria-label={`More: ${label}`}
        onClick={() => onChange(clamp(value + 1, min, max))}
        disabled={disabled || value >= max}
      >
        <Lucide.Plus size={14} />
      </IconButton>
    </div>
  );
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
  const [bulk, setBulk] = useState('');

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
  const roomFor = (floor: number, index: number) => rooms.find((r) => r.id === plan.assigned[boxKey(floor, index)]);
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? 'Removed room';
  const assignedCount = drawn.filter((b) => roomFor(b.floor, b.index)).length;

  const setFloorRooms = (floor: number, count: number) =>
    onPlanChange({ ...plan, roomsPerFloor: { ...plan.roomsPerFloor, [floor]: count } });

  const applyToAll = () => {
    const count = parseCount(bulk, MAX_ROOMS_PER_FLOOR);
    if (count === 0 || floorCount === 0) {
      toast('Enter how many rooms each floor has', { detail: `Use a whole number from 1 to ${MAX_ROOMS_PER_FLOOR}.`, tone: 'warning' });
      return;
    }
    const next: Record<number, number> = { ...plan.roomsPerFloor };
    for (const floor of floors) next[floor] = count;
    onPlanChange({ ...plan, roomsPerFloor: next });
  };

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
  const unavailable = rooms.filter((r) => !options.includes(r));
  const leftOf = (r: RoomDetails) => r.roomCount - assignedTo(r.id) + (r.id === currentId ? 1 : 0);

  return (
    <>
      <Card>
        <CardTitle
          title="Floor Management"
          subtitle="Set the floors, then the rooms on each, and link every room to an offering"
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
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-warning-border bg-warning-bg p-3 text-label text-warning-text">
            <Lucide.AlertTriangle size={16} className="mt-px flex-none" aria-hidden="true" />
            <span>
              The plan draws {drawn.length} rooms but the property has {totalRooms}. Remove {drawn.length - (totalRooms ?? 0)} to save.
            </span>
          </div>
        )}

        {loadError && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            <Lucide.AlertCircle size={16} className="mt-px flex-none" aria-hidden="true" />
            <span>Could not load the floor plan: {loadError}</span>
          </div>
        )}

        {/* Controls: how many floors, and a quick way to give every floor the same number of rooms. */}
        <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted-surface/60 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-[auto_auto_minmax(0,1fr)] xl:items-end xl:gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="pms-label">Number of floors</span>
            <Stepper
              label="Number of floors"
              value={floorCount}
              min={0}
              max={MAX_FLOORS}
              disabled={!canSave}
              onChange={(n) => onFloorInputChange(n === 0 ? '' : String(n))}
            />
            <span className="pms-helper">1 to {MAX_FLOORS}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="pms-label">Same rooms on every floor</span>
            <div className="flex items-center gap-1.5">
              <TextField
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_ROOMS_PER_FLOOR}
                value={bulk}
                placeholder="e.g. 12"
                aria-label="Rooms on every floor"
                disabled={!canSave || floorCount === 0}
                onChange={(e) => setBulk(e.target.value)}
                className="tnum !w-24"
              />
              <Button variant="secondary" onClick={applyToAll} disabled={!canSave || floorCount === 0}>
                Apply to all
              </Button>
            </div>
            <span className="pms-helper">Overwrites the count on each floor</span>
          </div>

          <p className="text-label text-ink-secondary sm:col-span-2 xl:col-span-1" aria-live="polite">
            {floorCount === 0 ? (
              'Set the number of floors to draw the building.'
            ) : (
              <>
                <span className="font-semibold text-ink">{drawn.length}</span>
                {totalRooms ? ` of ${totalRooms}` : ''} rooms drawn on {floorCount} floor{floorCount === 1 ? '' : 's'} ·{' '}
                <span className="font-semibold text-ink">{assignedCount}</span> linked to an offering
              </>
            )}
          </p>
        </div>

        {floorCount === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
            <Lucide.Building2 size={30} className="text-ink-muted" aria-hidden="true" />
            <p className="max-w-xs text-label text-ink-muted">The building appears here once you set the number of floors.</p>
          </div>
        ) : (
          <>
            <ol className="flex flex-col gap-2.5" aria-label="Building floors, top floor first">
              {floors.map((floor) => {
                const count = roomsOn(floor);
                const linked = Array.from({ length: count }, (_, i) => i + 1).filter((i) => roomFor(floor, i)).length;
                return (
                  <li key={floor} className="overflow-hidden rounded-xl border border-border bg-surface">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-divider bg-muted-surface/50 px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-primary px-1.5 text-body font-bold text-primary-foreground tnum">
                          {floor}
                        </span>
                        <div>
                          <p className="text-body font-semibold leading-tight text-ink">Floor {floor}</p>
                          <p className="text-label text-ink-secondary">
                            {count === 0 ? 'No rooms yet' : `${linked} of ${count} linked`}
                          </p>
                        </div>
                      </div>
                      <Stepper
                        label={`Rooms on floor ${floor}`}
                        value={count}
                        min={0}
                        max={MAX_ROOMS_PER_FLOOR}
                        disabled={!canSave}
                        onChange={(n) => setFloorRooms(floor, n)}
                      />
                    </div>

                    {count === 0 ? (
                      <p className="px-3 py-4 text-center text-label text-ink-muted">Add rooms to this floor to draw them.</p>
                    ) : (
                      <ul
                        className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2 p-3"
                        aria-label={`Rooms on floor ${floor}`}
                      >
                        {Array.from({ length: count }, (_, i) => {
                          const index = i + 1;
                          const room = roomFor(floor, index);
                          const number = roomNumber(floor, index);
                          return (
                            <li key={index}>
                              <button
                                type="button"
                                onClick={() => openBox({ floor, index })}
                                disabled={!canSave}
                                title={room ? `${number} · ${room.name}` : `Link a room to ${number}`}
                                aria-label={room ? `Room ${number}, ${room.name}. Change` : `Room ${number}, not linked. Link a room`}
                                className={`flex h-full min-h-[58px] w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1.5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                                  room
                                    ? 'border-primary/30 bg-primary/5 text-ink hover:bg-primary/10'
                                    : 'border-dashed border-border bg-surface text-ink-secondary hover:border-primary/40 hover:bg-hover-surface'
                                }`}
                              >
                                <span className="text-body font-bold tnum">{number}</span>
                                <span className={`w-full truncate text-micro ${room ? 'text-ink-secondary' : 'text-ink-muted'}`}>
                                  {room ? room.name : 'Not linked'}
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

            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-label text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-primary/30 bg-primary/5" aria-hidden="true" />
                Linked to an offering
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-dashed border-border" aria-hidden="true" />
                Not linked yet
              </span>
              <span>Select a room to link or change it.</span>
            </p>
          </>
        )}

        {loading && <div className="mt-3"><CardSkeleton lines={3} label="Loading rooms" /></div>}
      </Card>

      <Modal
        open={picked !== null}
        onClose={() => setPicked(null)}
        title={picked ? `Room ${roomNumber(picked.floor, picked.index)}` : 'Room'}
        subtitle={picked ? `Floor ${picked.floor} · choose the offering this room belongs to` : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPicked(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAssign} icon={<Lucide.Check size={14} />}>
              {pickedRoomId ? 'Link room' : 'Clear link'}
            </Button>
          </div>
        }
      >
        {picked && (
          <div className="flex flex-col gap-2 py-2" role="radiogroup" aria-label="Room offering">
            <label
              className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
                pickedRoomId === '' ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-hover-surface'
              }`}
            >
              <input
                type="radio"
                name="room-offering"
                checked={pickedRoomId === ''}
                onChange={() => setPickedRoomId('')}
                className="h-4 w-4 flex-none accent-[var(--color-primary)]"
              />
              <span className="min-w-0">
                <span className="block text-body font-semibold text-ink">Not linked</span>
                <span className="block text-label text-ink-secondary">Leave this room without an offering</span>
              </span>
            </label>

            {options.map((r) => {
              const selected = pickedRoomId === r.id;
              return (
                <label
                  key={r.id}
                  className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
                    selected ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-hover-surface'
                  }`}
                >
                  <input
                    type="radio"
                    name="room-offering"
                    checked={selected}
                    onChange={() => setPickedRoomId(r.id)}
                    className="h-4 w-4 flex-none accent-[var(--color-primary)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold text-ink">{r.name}</span>
                    <span className="block truncate text-label text-ink-secondary">{r.roomType.name}</span>
                  </span>
                  <Badge tone="neutral" size="sm">{leftOf(r)} left</Badge>
                </label>
              );
            })}

            {rooms.length === 0 ? (
              <p className="rounded-xl bg-muted-surface px-3 py-2.5 text-label text-ink-secondary">
                This property has no room offerings yet, so there is nothing to link.
              </p>
            ) : unavailable.length > 0 ? (
              <p className="px-1 pt-1 text-label text-ink-muted">
                Fully placed and not shown: {unavailable.map((r) => r.name).join(', ')}.
              </p>
            ) : null}
          </div>
        )}
      </Modal>
    </>
  );
}
