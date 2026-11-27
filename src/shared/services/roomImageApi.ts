import type { RoomImageRecord } from '../mocks/propertySettings';
import { settingsFor } from './propertyAccess';
import { recordActivity } from './session';

/** A photo of a room; the bytes come from `roomImageApi.file`. */
export interface RoomImageDetails {
  id: string;
  roomId: string;
  fileName: string;
  mimeType: string;
  /** Bytes. */
  size: number;
  caption: string | null;
  createdAt: string;
}

const toDetails = ({ file: _file, ...details }: RoomImageRecord): RoomImageDetails => ({ ...details });

function requireImage(propertyId: string, id: string): RoomImageRecord {
  const image = settingsFor(propertyId).images.find((item) => item.id === id);
  if (!image) throw new Error('This image no longer exists.');
  return image;
}

/** Room photos are kept as the chosen files, in memory. */
export const roomImageApi = {
  list: async (propertyId: string, roomId: string) =>
    settingsFor(propertyId).images.filter((image) => image.roomId === roomId).map(toDetails),
  upload: async (propertyId: string, roomId: string, file: File, caption?: string) => {
    const image: RoomImageRecord = {
      id: globalThis.crypto.randomUUID(),
      roomId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      caption: caption || null,
      createdAt: new Date().toISOString(),
      file,
    };
    settingsFor(propertyId).images.push(image);
    recordActivity('room-listings', 'update', 'Uploaded a room image', { propertyId, resourceId: roomId });
    return toDetails(image);
  },
  /** Send null or blank to clear the caption. */
  update: async (propertyId: string, _roomId: string, id: string, caption: string | null) => {
    const image = requireImage(propertyId, id);
    image.caption = caption?.trim() || null;
    return toDetails(image);
  },
  remove: async (propertyId: string, roomId: string, id: string) => {
    const settings = settingsFor(propertyId);
    settings.images.splice(settings.images.indexOf(requireImage(propertyId, id)), 1);
    recordActivity('room-listings', 'update', 'Deleted a room image', { propertyId, resourceId: roomId });
  },
  file: async (propertyId: string, _roomId: string, id: string): Promise<Blob> => requireImage(propertyId, id).file,
};
