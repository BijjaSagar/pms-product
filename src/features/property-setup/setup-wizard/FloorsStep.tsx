import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { BrandStepper } from '../../../components/brand/BrandControls';
import { Button } from '../../../components/primitives';
import { CARD, HEADING, LABEL } from '../../../components/brand/brandStyles';
import { selectClass } from '../../../components/formStyles';
import { MAX_ROOMS_PER_FLOOR, roomNumber } from '../../settings/room-settings/floorPlan';
import { toast } from '../../../utils/toast';
import { NO_CATEGORY_TONE, categoryTone } from '../categoryTones';
import { autoFillFloors, newId, placedByCategory, roomsOnFloors } from './draft';
import type { CategoryDraft, FloorRooms, RoomDraft } from './draft';

interface FloorsStepProps {
  floorCount: number;
  floors: FloorRooms;
  categories: CategoryDraft[];
  totalRooms: number;
  onChange: (next: FloorRooms) => void;
}

interface FloorCardProps {
  floor: number;
  rooms: RoomDraft[];
  categories: CategoryDraft[];
  /** How many more rooms the property can still take across all floors. */
  roomsLeft: number;
  /** The category a newly added room starts with. */
  defaultCategoryId: string;
  onChange: (rooms: RoomDraft[]) => void;
}

function FloorCard({ floor, rooms, categories, roomsLeft, defaultCategoryId, onChange }: FloorCardProps) {
  const [quantity, setQuantity] = useState(1);
  const toneOf = (categoryId: string) => {
    const index = categories.findIndex((c) => c.id === categoryId);
    return index < 0 ? NO_CATEGORY_TONE : categoryTone(index);
  };

  const addRooms = () => {
    const count = Math.min(quantity, roomsLeft, MAX_ROOMS_PER_FLOOR - rooms.length);
    if (count <= 0) {
      toast('No rooms left to add', { detail: 'Every room of the property is already on a floor.', tone: 'warning' });
      return;
    }
    onChange([...rooms, ...Array.from({ length: count }, () => ({ id: newId(), categoryId: defaultCategoryId }))]);
  };

  return (
    <section className={`${CARD} flex-none overflow-hidden`} aria-label={`Floor ${floor}`}>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border/70 bg-muted-surface/40 px-3 py-2">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-white text-[15px] font-bold text-primary ${HEADING}`}>{floor}</span>
          <div>
            <h3 className={`text-[16px] font-semibold leading-tight tracking-[-0.02em] text-ink ${HEADING}`}>Floor {floor}</h3>
            <p className="text-[12px] text-ink-secondary">
              {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BrandStepper label={`Rooms to add on floor ${floor}`} value={quantity} min={1} max={MAX_ROOMS_PER_FLOOR} onChange={setQuantity} className="!w-24" />
          <Button variant="primary" icon={<Lucide.Plus size={14} />} onClick={addRooms}>
            Add room
          </Button>
          <span className="relative">
            <select
              aria-label={`Set every room on floor ${floor} to a category`}
              disabled={rooms.length === 0}
              value=""
              onChange={(e) => e.target.value && onChange(rooms.map((r) => ({ ...r, categoryId: e.target.value })))}
              className={`${selectClass} !w-36`}
            >
              <option value="">Set all to…</option>
              {categories
                .filter((c) => c.name.trim())
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.trim()}
                  </option>
                ))}
            </select>
          </span>
          <button
            type="button"
            title="Clear this floor"
            aria-label={`Clear floor ${floor}`}
            disabled={rooms.length === 0}
            onClick={() => onChange([])}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger-text disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Lucide.Eraser size={15} />
          </button>
        </div>
      </header>

      {rooms.length === 0 ? (
        <div className="m-4 flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border py-8 text-center">
          <Lucide.Plus size={20} className="text-ink-muted" aria-hidden="true" />
          <p className="text-[13px] text-ink-secondary">No rooms yet — add the first room on this floor</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2 xl:grid-cols-4">
          {rooms.map((room, index) => {
            const tone = toneOf(room.categoryId);
            return (
              <li key={room.id} className={`flex items-center gap-1.5 rounded-xl border p-1.5 ${tone.tile}`}>
                <span className={`tnum flex h-8 w-12 flex-none items-center justify-center rounded-lg bg-white text-[13px] font-bold text-ink ${HEADING}`} title="Room number">
                  {roomNumber(floor, index + 1)}
                </span>
                <span className="relative min-w-0 flex-1">
                  <select
                    aria-label={`Category of room ${roomNumber(floor, index + 1)}`}
                    value={room.categoryId}
                    onChange={(e) => onChange(rooms.map((r) => (r.id === room.id ? { ...r, categoryId: e.target.value } : r)))}
                    className="h-8 w-full cursor-pointer appearance-none truncate rounded-lg bg-transparent pl-1.5 pr-6 text-[12px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <option value="">Choose category</option>
                    {categories
                      .filter((c) => c.name.trim())
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name.trim()}
                        </option>
                      ))}
                  </select>
                  <Lucide.ChevronDown size={14} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-70" aria-hidden="true" />
                </span>
                <button
                  type="button"
                  title="Remove room"
                  aria-label={`Remove room ${roomNumber(floor, index + 1)}`}
                  onClick={() => onChange(rooms.filter((r) => r.id !== room.id))}
                  className="flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100"
                >
                  <Lucide.X size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Step 3: one card per floor; every room gets a category, and the totals must match the plan exactly. */
export function FloorsStep({ floorCount, floors, categories, totalRooms, onChange }: FloorsStepProps) {
  const all = roomsOnFloors(floors, floorCount);
  const placedPer = placedByCategory(floors, floorCount);
  const placed = all.filter((r) => r.categoryId).length;
  const roomsLeft = Math.max(totalRooms - all.length, 0);
  // New rooms start in the first category that still has rooms to place.
  const defaultCategoryId = categories.find((c) => (placedPer[c.id] ?? 0) < c.count)?.id ?? '';
  const percent = Math.min(100, (placed / totalRooms) * 100);

  return (
    <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
      <section className={`${CARD} flex-none px-4 py-3`} aria-label="Rooms placed">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div>
            <p className={LABEL}>Rooms placed</p>
            <p className={`tnum mt-0.5 text-[22px] font-semibold leading-none text-ink ${HEADING}`}>
              {placed}
              <span className="text-ink-muted"> / {totalRooms}</span>
            </p>
          </div>
          <div className="hidden w-28 sm:block">
            <div className="h-2 overflow-hidden rounded-full bg-muted-surface" aria-hidden="true">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-1 text-[12px] text-ink-secondary">{placed === totalRooms ? 'All placed' : `${totalRooms - placed} to place`}</p>
          </div>

          <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {categories.map((c, i) => {
              const done = (placedPer[c.id] ?? 0) === c.count;
              return (
                <li key={c.id} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${categoryTone(i).tile}`}>
                  <span className={`h-2 w-2 rounded-full ${categoryTone(i).dot}`} aria-hidden="true" />
                  {c.name.trim() || `Category ${i + 1}`}
                  <span className="tnum">
                    {placedPer[c.id] ?? 0}/{c.count}
                  </span>
                  {done && <Lucide.CheckCircle2 size={13} aria-label="Complete" />}
                </li>
              );
            })}
          </ul>

          <Button
            variant="secondary"
            icon={<Lucide.Wand2 size={14} />}
            onClick={() => {
              onChange(autoFillFloors(floorCount, totalRooms, categories));
              toast('Floors filled', {
                detail: `${totalRooms} rooms spread across ${floorCount} floor${floorCount === 1 ? '' : 's'}. Adjust anything you like.`,
                tone: 'success',
              });
            }}
          >
            Auto-fill floors
          </Button>
        </div>
      </section>

      <div className="flex flex-col gap-2.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-1">
      {Array.from({ length: floorCount }, (_, i) => i + 1).map((floor) => (
        <FloorCard
          key={floor}
          floor={floor}
          rooms={floors[floor] ?? []}
          categories={categories}
          roomsLeft={roomsLeft}
          defaultCategoryId={defaultCategoryId}
          onChange={(rooms) => onChange({ ...floors, [floor]: rooms })}
        />
      ))}
      </div>
    </div>
  );
}
