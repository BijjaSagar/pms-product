/** The sitemap: how many rooms each floor has, and which room offering each box stands for. */
export interface FloorPlan {
  /** Floor number to its number of rooms. */
  roomsPerFloor: Record<number, number>;
  /** Box key (`floor-index`) to a room offering id. */
  assigned: Record<string, string>;
}
