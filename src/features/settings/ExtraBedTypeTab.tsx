import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { roomExtraBedTypeApi } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { CardSkeleton } from '../../components/Skeleton';
import { Badge, Card, CardTitle } from '../../components/ui';
import { RoomPicker } from './RoomPicker';
import { ReadOnlyNotice, SettingsHeader, ToggleRow } from './SettingsKit';

/** The extra bed types one room accepts. Keyed by room, so a new room starts clean. */
function RoomExtraBedTypes({ propertyId, roomId, canEdit }: { propertyId: string; roomId: string; canEdit: boolean }) {
  const load = useCallback(() => roomExtraBedTypeApi.list(propertyId, roomId), [propertyId, roomId]);
  const resource = useApiResource(load);
  // Saved changes sit on top of what was loaded, so the list never reloads.
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const change = async (code: string, checked: boolean) => {
    setBusy(true);
    try {
      await roomExtraBedTypeApi.update(propertyId, roomId, code, checked);
      setFlags((prev) => ({ ...prev, [code]: checked }));
    } catch (err) {
      toast('Could not save the change', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const bedTypes = (resource.data ?? []).map((b) => ({ ...b, isActive: flags[b.code] ?? b.isActive }));
  const accepted = bedTypes.filter((b) => b.isActive).length;

  return (
    <Card>
      <CardTitle
        icon={Lucide.BedSingle}
        title="Extra Bed Types"
        subtitle="Bed types this category accepts as an extra bed"
        badge={resource.data ? <Badge tone="info" size="sm">{accepted} of {bedTypes.length} accepted</Badge> : undefined}
      />

      {!resource.data ? (
        resource.loading && !resource.error ? (
          <CardSkeleton lines={3} label="Loading extra bed types" />
        ) : (
          <p role="alert" className="py-8 text-center text-label text-danger-text">
            {resource.error ?? 'No records yet.'}
          </p>
        )
      ) : bedTypes.length === 0 ? (
        <p className="py-8 text-center text-label text-ink-muted">No extra bed types to show.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {bedTypes.map((bedType) => (
            <ToggleRow
              key={bedType.code}
              label={bedType.name}
              description={bedType.isActive ? 'Accepted as an extra bed' : 'Not accepted'}
              checked={bedType.isActive}
              disabled={!canEdit || busy}
              onChange={(next) => void change(bedType.code, next)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

export function ExtraBedTypeTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Extra Bed Type" description="Which bed types each room category accepts as an extra bed" />
      {!canEdit ? <ReadOnlyNotice what="extra bed types" /> : null}
      <RoomPicker propertyId={propertyId}>
        {(roomId) => <RoomExtraBedTypes key={roomId} propertyId={propertyId} roomId={roomId} canEdit={canEdit} />}
      </RoomPicker>
    </div>
  );
}
