import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { roomBedTypeApi } from '../../lib/api/pms';
import type { RoomBedTypeDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { IconButton, TextField } from '../../components/primitives';
import { CardSkeleton } from '../../components/Skeleton';
import { Badge, Card, CardTitle } from '../../components/ui';
import { RoomPicker } from './RoomPicker';
import { Switch } from '../../components/controls';
import { ReadOnlyNotice, SettingsHeader } from './SettingsKit';

const MAX_BEDS = 50;

/** The bed types of one room. Keyed by room, so a new room starts clean. */
function RoomBedTypes({ propertyId, roomId, canEdit }: { propertyId: string; roomId: string; canEdit: boolean }) {
  const load = useCallback(() => roomBedTypeApi.list(propertyId, roomId), [propertyId, roomId]);
  const resource = useApiResource(load);
  // Saved changes sit on top of what was loaded, so the list never reloads.
  const [saved, setSaved] = useState<Record<string, RoomBedTypeDetails>>({});
  // What is typed in the bed count boxes, until it is saved.
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const locked = !canEdit || busy;
  const bedTypes = (resource.data ?? []).map((loaded) => saved[loaded.code] ?? loaded);
  const active = bedTypes.filter((b) => b.isActive);
  const totalBeds = active.reduce((sum, b) => sum + b.beds, 0);

  const clearTyped = (code: string) =>
    setTyped((prev) => {
      const { [code]: _done, ...rest } = prev;
      return rest;
    });

  const save = async (code: string, body: { isActive?: boolean; beds?: number }) => {
    setBusy(true);
    try {
      const updated = await roomBedTypeApi.update(propertyId, roomId, code, body);
      setSaved((prev) => ({ ...prev, [code]: updated }));
      clearTyped(code);
    } catch (err) {
      toast('Could not save the change', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  /** Saves the typed number of beds when the box loses focus or Enter is pressed. */
  const commitBeds = (bedType: RoomBedTypeDetails) => {
    const text = typed[bedType.code];
    if (text === undefined) return;
    const beds = Number(text);
    if (text.trim() === '' || !Number.isInteger(beds) || beds < 1 || beds > MAX_BEDS) {
      toast('Check the number of beds', { detail: `Use a whole number from 1 to ${MAX_BEDS}.`, tone: 'warning' });
      clearTyped(bedType.code);
      return;
    }
    if (beds !== bedType.beds) void save(bedType.code, { beds });
    else clearTyped(bedType.code);
  };

  return (
    <Card>
      <CardTitle
        icon={Lucide.BedDouble}
        title="Bed Types"
        subtitle="Switch on the beds this category has, and how many of each"
        badge={
          resource.data ? (
            <Badge tone="info" size="sm">
              {active.length} on · {totalBeds} {totalBeds === 1 ? 'bed' : 'beds'}
            </Badge>
          ) : undefined
        }
      />

      {!resource.data ? (
        resource.loading && !resource.error ? (
          <CardSkeleton lines={4} label="Loading bed types" />
        ) : (
          <p role="alert" className="py-8 text-center text-label text-danger-text">
            {resource.error ?? 'No records yet.'}
          </p>
        )
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {bedTypes.map((bedType) => {
            const shown = typed[bedType.code] ?? String(bedType.beds);
            return (
              <li
                key={bedType.code}
                className={`flex flex-col gap-3 rounded-xl border p-3.5 transition-colors ${
                  bedType.isActive ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${
                        bedType.isActive ? 'bg-primary text-primary-foreground' : 'bg-muted-surface text-ink-secondary'
                      }`}
                    >
                      <Lucide.BedDouble size={17} aria-hidden="true" />
                    </span>
                    <p className="truncate text-body font-semibold text-ink">{bedType.name}</p>
                  </div>
                  <Switch
                    label={`${bedType.name} is offered`}
                    checked={bedType.isActive}
                    disabled={locked}
                    onChange={(next) => void save(bedType.code, { isActive: next })}
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="pms-label">Number of beds</span>
                  <div className="flex items-center gap-1.5">
                    <IconButton
                      title={`Fewer ${bedType.name} beds`}
                      aria-label={`Fewer ${bedType.name} beds`}
                      disabled={locked || bedType.beds <= 1}
                      onClick={() => void save(bedType.code, { beds: bedType.beds - 1 })}
                    >
                      <Lucide.Minus size={14} />
                    </IconButton>
                    <TextField
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_BEDS}
                      value={shown}
                      disabled={locked}
                      aria-label={`Number of ${bedType.name} beds`}
                      className="tnum !w-14 text-center"
                      onChange={(e) => setTyped((prev) => ({ ...prev, [bedType.code]: e.target.value }))}
                      onBlur={() => commitBeds(bedType)}
                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    />
                    <IconButton
                      title={`More ${bedType.name} beds`}
                      aria-label={`More ${bedType.name} beds`}
                      disabled={locked || bedType.beds >= MAX_BEDS}
                      onClick={() => void save(bedType.code, { beds: bedType.beds + 1 })}
                    >
                      <Lucide.Plus size={14} />
                    </IconButton>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function BedTypeTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Bed Type" description="Which beds each room category has, and how many" />
      {!canEdit ? <ReadOnlyNotice what="bed types" /> : null}
      <RoomPicker propertyId={propertyId}>
        {(roomId) => <RoomBedTypes key={roomId} propertyId={propertyId} roomId={roomId} canEdit={canEdit} />}
      </RoomPicker>
    </div>
  );
}
