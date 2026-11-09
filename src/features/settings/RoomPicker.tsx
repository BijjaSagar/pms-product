import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
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
  const current = rooms.find((room) => room.id === roomId);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <span
            className="hidden h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-primary-foreground shadow-xs shadow-primary/20 sm:flex"
            aria-hidden="true"
          >
            <Lucide.BedDouble size={17} />
          </span>
          <div className="w-full sm:max-w-sm">
            <Field label="Editing category">
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
          {current ? (
            <p className="text-label text-ink-secondary sm:pb-2">
              {current.roomType.name} · {current.roomCount} {current.roomCount === 1 ? 'room' : 'rooms'}. Changes apply to this category only.
            </p>
          ) : null}
        </div>
      </Card>

      {roomId ? children(roomId) : null}
    </div>
  );
}
