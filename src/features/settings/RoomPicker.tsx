import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { roomListingApi } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { SelectField } from '../../components/primitives';
import { Field } from '../../components/controls';
import { Card } from '../../components/ui';

/** The "Category" dropdown of the rooms of a property; `children` gets the chosen room id. */
export function RoomPicker({ propertyId, children }: { propertyId: string; children: (roomId: string) => ReactNode }) {
  const roomsResource = useApiResource(useCallback(() => roomListingApi.list(propertyId), [propertyId]));
  const rooms = roomsResource.data ?? [];
  const [chosen, setChosen] = useState<string | null>(null);
  // Until one is picked, the first room is shown.
  const roomId = chosen && rooms.some((room) => room.id === chosen) ? chosen : (rooms[0]?.id ?? null);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="max-w-md">
          <Field label="Category">
            <SelectField value={roomId ?? ''} onChange={(e) => setChosen(e.target.value)} disabled={rooms.length === 0}>
              {rooms.length === 0 ? (
                <option value="">{roomsResource.error ?? (roomsResource.loading ? 'Loading rooms…' : 'No rooms yet')}</option>
              ) : (
                rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))
              )}
            </SelectField>
          </Field>
        </div>
      </Card>

      {roomId ? children(roomId) : null}
    </div>
  );
}
