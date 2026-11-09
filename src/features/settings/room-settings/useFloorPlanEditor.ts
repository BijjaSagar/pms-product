import { useState } from 'react';
import { floorPlanApi } from '../../../lib/api/pms';
import type { FloorPlanDetails, RoomDetails } from '../../../lib/api/pms';
import { useApiResource } from '../../../lib/api/useApiResource';
import { displayApiError } from '../../../lib/api/client';
import { toast } from '../../../utils/toast';
import type { FloorPlan } from './types';
import { MAX_FLOORS, MAX_ROOMS_PER_FLOOR, boxKey, parseCount } from './floorPlan';

interface FloorPlanEditorOptions {
  propertyId: string | null | undefined;
  rooms: RoomDetails[];
  /** The property's total rooms; the plan may not draw more boxes than this. */
  totalRooms: number | null;
  /** The floor count on the property record, used until a plan has been saved. */
  propertyFloors: number | null | undefined;
  /** Called after a successful save so the caller can refresh what the plan feeds. */
  onSaved: () => void;
}

/**
 * Loads the saved floor plan and holds unsaved edits so they survive switching sections or tabs;
 * null means "nothing edited, show what is saved".
 */
export function useFloorPlanEditor({ propertyId, rooms, totalRooms, propertyFloors, onSaved }: FloorPlanEditorOptions) {
  const resource = useApiResource(
    () => (propertyId ? floorPlanApi.get(propertyId) : Promise.resolve<FloorPlanDetails | null>(null)),
    [propertyId],
  );
  const [floorInputEdit, setFloorInputEdit] = useState<string | null>(null);
  const [planEdit, setPlanEdit] = useState<FloorPlan | null>(null);
  const [saving, setSaving] = useState(false);

  const saved = resource.data;
  const savedPlan: FloorPlan = { roomsPerFloor: {}, assigned: {} };
  for (const f of saved?.floors ?? []) {
    savedPlan.roomsPerFloor[f.floor] = f.roomCount;
    for (const u of f.units) if (u.roomId) savedPlan.assigned[boxKey(f.floor, u.position)] = u.roomId;
  }
  const plan = planEdit ?? savedPlan;
  const floorInput = floorInputEdit ?? String(saved?.numberOfFloors ?? propertyFloors ?? '');
  const dirty = floorInputEdit !== null || planEdit !== null;

  const discardEdits = () => {
    setFloorInputEdit(null);
    setPlanEdit(null);
  };

  const reset = () => {
    discardEdits();
    resource.refresh();
  };

  const save = async () => {
    if (!propertyId) return;
    const numberOfFloors = parseCount(floorInput, MAX_FLOORS);
    if (numberOfFloors === 0) {
      return toast('Number of floors required', { detail: 'Enter how many floors the property has.', tone: 'warning' });
    }
    const floors = Array.from({ length: numberOfFloors }, (_, i) => i + 1)
      .map((floor) => {
        const roomCount = Math.min(plan.roomsPerFloor[floor] ?? 0, MAX_ROOMS_PER_FLOOR);
        const assignments = Array.from({ length: roomCount }, (_, i) => i + 1).flatMap((position) => {
          const roomId = plan.assigned[boxKey(floor, position)];
          return roomId && rooms.some((r) => r.id === roomId) ? [{ position, roomId }] : [];
        });
        return { floor, roomCount, assignments };
      })
      .filter((f) => f.roomCount > 0);
    const boxCount = floors.reduce((n, f) => n + f.roomCount, 0);
    if (totalRooms !== null && boxCount > totalRooms) {
      return toast('Too many rooms on the plan', {
        detail: `The plan draws ${boxCount} rooms but the property has ${totalRooms}.`,
        tone: 'warning',
      });
    }

    setSaving(true);
    try {
      await floorPlanApi.save(propertyId, { numberOfFloors, floors });
      discardEdits();
      resource.refresh();
      onSaved();
      toast('Floor plan saved', {
        detail: `${numberOfFloors} floor${numberOfFloors === 1 ? '' : 's'} and ${boxCount} rooms saved.`,
        tone: 'success',
      });
    } catch (err) {
      toast('Could not save floor plan', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return {
    floorInput,
    floorCount: parseCount(floorInput, MAX_FLOORS),
    plan,
    setFloorInput: setFloorInputEdit,
    setPlan: setPlanEdit,
    loadError: resource.error,
    dirty,
    saving,
    save,
    reset,
  };
}
