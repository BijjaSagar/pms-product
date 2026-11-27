import { settingsFor } from './propertyAccess';
import { recordActivity } from './session';
import { roomNumber } from '../utils/floorPlan';

/** A property's floor plan: floors that have rooms, with their boxes. */
export interface FloorPlanDetails {
  numberOfFloors: number | null;
  floors: {
    floor: number;
    roomCount: number;
    units: { position: number; roomNumber: string; roomId: string | null }[];
  }[];
}
export interface FloorPlanInput {
  numberOfFloors: number;
  floors: { floor: number; roomCount: number; assignments: { position: number; roomId: string }[] }[];
}

const read = (propertyId: string): FloorPlanDetails => {
  const { floorPlan } = settingsFor(propertyId);
  return {
    numberOfFloors: floorPlan.numberOfFloors,
    floors: floorPlan.floors.map((floor) => ({
      floor: floor.floor,
      roomCount: floor.roomCount,
      units: Array.from({ length: floor.roomCount }, (_, index) => ({
        position: index + 1,
        roomNumber: roomNumber(floor.floor, index + 1),
        roomId: floor.assignments.find((a) => a.position === index + 1)?.roomId ?? null,
      })),
    })),
  };
};

export const floorPlanApi = {
  get: async (propertyId: string) => read(propertyId),
  save: async (propertyId: string, body: FloorPlanInput) => {
    const settings = settingsFor(propertyId);
    settings.floorPlan = structuredClone({ ...body, floors: body.floors.filter((floor) => floor.roomCount > 0) });
    recordActivity('floor-plan', 'update', 'Saved the floor plan', { propertyId });
    return read(propertyId);
  },
};
