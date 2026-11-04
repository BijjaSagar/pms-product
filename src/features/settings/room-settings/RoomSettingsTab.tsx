import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useApiResource } from '../../../lib/api/useApiResource';
import { AmenitiesCard } from './AmenitiesCard';
import { AttributesCard } from './AttributesCard';
import { BedTypesCard } from './BedTypesCard';
import { CatalogCard } from './CatalogCard';
import { FloorsCard } from './FloorsCard';
import { LinkedRoomsCard } from './LinkedRoomsCard';
import { OperationalRulesCard } from './OperationalRulesCard';
import { RoomStatusCard } from './RoomStatusCard';
import { RoomTypesCard } from './RoomTypesCard';
import { loadRoomSettings, saveRoomSetting, type RoomSettingsData } from './roomSettingsData';
import { useRoomSave } from './useRoomSave';

export function RoomSettingsTab({ currencyCode }: { currencyCode: string }) {
  const { can } = useAuth();
  const resource = useApiResource(useCallback(() => loadRoomSettings(can('config.manage'), can('property.read')), [can]));

  // A reload after a save keeps the last loaded data on screen, so the cards keep their place and edits.
  const [loaded, setLoaded] = useState<RoomSettingsData | null>(null);
  if (resource.data && resource.data !== loaded) setLoaded(resource.data);
  const data = resource.data ?? loaded;

  const { saving, run } = useRoomSave(resource.refresh);

  if (!data) {
    return resource.error ? (
      <div className="flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
        <Lucide.AlertCircle size={16} />
        <span>Could not load room settings: {resource.error}</span>
      </div>
    ) : (
      <p className="py-8 text-center text-label text-ink-muted">Loading room settings…</p>
    );
  }

  const { rooms, settings } = data;
  const roomFloorNumbers = [...new Set(rooms.map((room) => room.floor).filter((floor) => floor > 0))].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-5">
      {resource.error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
          <Lucide.AlertCircle size={16} />
          <span>Could not refresh room settings: {resource.error}</span>
        </div>
      )}

      <BedTypesCard bedTypes={settings.bedTypes} saving={saving} run={run} />

      <RoomTypesCard
        data={data}
        currencyCode={currencyCode}
        saving={saving}
        run={run}
        onRefresh={resource.refresh}
      />

      <AmenitiesCard amenities={settings.amenities} saving={saving} run={run} />

      <AttributesCard attributes={settings.attributes} saving={saving} run={run} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CatalogCard
          icon={Lucide.Layers}
          title="Room Classifications"
          description="Classes a room type can be filed under, such as Single, Double or Accessible"
          noun="classification"
          emptyText="No classifications yet."
          items={settings.classifications}
          saving={saving}
          onSave={(items) => void run('Classifications', () => saveRoomSetting('classifications', items))}
        />
        <CatalogCard
          icon={Lucide.Wrench}
          title="Out of Order & Maintenance Reasons"
          description="Reasons offered when a room is taken out of sale, such as plumbing or electrical work"
          noun="reason"
          emptyText="No reasons yet."
          items={settings.outOfOrderReasons}
          saving={saving}
          onSave={(items) => void run('Out-of-order reasons', () => saveRoomSetting('outOfOrderReasons', items))}
        />
      </div>

      <FloorsCard
        locations={settings.locations}
        floors={settings.floors}
        roomFloorNumbers={roomFloorNumbers}
        saving={saving}
        onSave={(locations, floors) =>
          void run('Floors & buildings', async () => {
            await saveRoomSetting('locations', locations);
            await saveRoomSetting('floors', floors);
          })
        }
      />

      <OperationalRulesCard data={data} saving={saving} run={run} />
      <RoomStatusCard />
      <LinkedRoomsCard data={data} saving={saving} run={run} />
    </div>
  );
}
