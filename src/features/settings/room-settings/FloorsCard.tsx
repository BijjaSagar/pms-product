import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Button, IconButton, SelectField, TextField } from '../../../components/primitives';
import { toast } from '../../../utils/toast';
import { SectionCard } from './SectionCard';
import { LOCATION_KINDS, type FloorItem, type LocationItem, type LocationKind } from './roomSettingsData';

/* Buildings, wings and towers on one side; the floors of the property on the other. */
export function FloorsCard({
  locations,
  floors,
  roomFloorNumbers,
  saving,
  onSave,
}: {
  locations: LocationItem[];
  floors: FloorItem[];
  /* Floor numbers the rooms already carry, shown so the floor list can be checked against them. */
  roomFloorNumbers: number[];
  saving: boolean;
  onSave: (locations: LocationItem[], floors: FloorItem[]) => void;
}) {
  const [locationList, setLocationList] = useState<LocationItem[]>(locations);
  const [floorList, setFloorList] = useState<FloorItem[]>(floors);
  const [locationName, setLocationName] = useState('');
  const [locationKind, setLocationKind] = useState<LocationKind>('Building');
  const [floorName, setFloorName] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [floorLocation, setFloorLocation] = useState('');
  const dirty = JSON.stringify([locationList, floorList]) !== JSON.stringify([locations, floors]);

  const addLocation = () => {
    const name = locationName.trim();
    if (!name) return toast('Name the building, wing or tower', { tone: 'warning' });
    setLocationList([...locationList, { id: crypto.randomUUID(), name, kind: locationKind }]);
    setLocationName('');
  };

  const addFloor = () => {
    const name = floorName.trim();
    const number = floorNumber.trim();
    if (!name || !number) return toast('Give the floor a name and a number', { tone: 'warning' });
    setFloorList([
      ...floorList,
      { id: crypto.randomUUID(), name, number, locationId: floorLocation || null },
    ]);
    setFloorName('');
    setFloorNumber('');
  };

  const save = () => {
    if (locationList.some((item) => item.name.trim() === '') || floorList.some((item) => item.name.trim() === '' || item.number.trim() === '')) {
      toast('Every building and floor needs a name', { tone: 'warning' });
      return;
    }
    // A floor whose building was removed stays on the property, without a building.
    const kept = new Set(locationList.map((item) => item.id));
    onSave(
      locationList.map((item) => ({ ...item, name: item.name.trim() })),
      floorList.map((item) => ({
        ...item,
        name: item.name.trim(),
        number: item.number.trim(),
        locationId: item.locationId && kept.has(item.locationId) ? item.locationId : null,
      })),
    );
  };

  return (
    <SectionCard
      icon={Lucide.Building2}
      title="Floors & Buildings"
      description="Buildings, wings and towers, and the floors in each. A room's floor is set on the room."
      action={
        <Button variant="primary" type="button" onClick={save} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-label font-bold text-ink">Buildings, wings & towers</h3>
          {locationList.length === 0 && <p className="text-label text-ink-muted">No buildings defined yet.</p>}
          <ul className="flex flex-col gap-2">
            {locationList.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <TextField
                  value={item.name}
                  aria-label="Building name"
                  onChange={(e) => setLocationList(locationList.map((row) => (row.id === item.id ? { ...row, name: e.target.value } : row)))}
                  className="min-w-0 flex-1"
                />
                <SelectField
                  value={item.kind}
                  aria-label="Building kind"
                  onChange={(e) => setLocationList(locationList.map((row) => (row.id === item.id ? { ...row, kind: e.target.value as LocationKind } : row)))}
                  className="w-32 flex-none"
                >
                  {LOCATION_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                </SelectField>
                <IconButton variant="ghost" type="button" aria-label={`Remove ${item.name}`} onClick={() => setLocationList(locationList.filter((row) => row.id !== item.id))}>
                  <Lucide.X size={14} />
                </IconButton>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row">
            <TextField
              value={locationName}
              placeholder="e.g. North Tower"
              aria-label="New building name"
              onChange={(e) => setLocationName(e.target.value)}
              className="min-w-0 flex-1"
            />
            <SelectField value={locationKind} aria-label="New building kind" onChange={(e) => setLocationKind(e.target.value as LocationKind)} className="w-32 flex-none">
              {LOCATION_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
            </SelectField>
            <Button variant="secondary" type="button" onClick={addLocation} icon={<Lucide.Plus size={14} />}>Add</Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-label font-bold text-ink">Floors</h3>
          {floorList.length === 0 && <p className="text-label text-ink-muted">No floors defined yet.</p>}
          <ul className="flex flex-col gap-2">
            {floorList.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <TextField
                  value={item.name}
                  aria-label="Floor name"
                  onChange={(e) => setFloorList(floorList.map((row) => (row.id === item.id ? { ...row, name: e.target.value } : row)))}
                  className="min-w-0 flex-1"
                />
                <TextField
                  value={item.number}
                  aria-label="Floor number"
                  onChange={(e) => setFloorList(floorList.map((row) => (row.id === item.id ? { ...row, number: e.target.value } : row)))}
                  className="w-20 flex-none tnum"
                />
                <SelectField
                  value={item.locationId ?? ''}
                  aria-label="Floor building"
                  onChange={(e) => setFloorList(floorList.map((row) => (row.id === item.id ? { ...row, locationId: e.target.value || null } : row)))}
                  className="w-36 flex-none"
                >
                  <option value="">No building</option>
                  {locationList.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </SelectField>
                <IconButton variant="ghost" type="button" aria-label={`Remove ${item.name}`} onClick={() => setFloorList(floorList.filter((row) => row.id !== item.id))}>
                  <Lucide.X size={14} />
                </IconButton>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row">
            <TextField value={floorName} placeholder="Floor name, e.g. Ground" aria-label="New floor name" onChange={(e) => setFloorName(e.target.value)} className="min-w-0 flex-1" />
            <TextField value={floorNumber} placeholder="No." aria-label="New floor number" onChange={(e) => setFloorNumber(e.target.value)} className="w-20 flex-none tnum" />
            <SelectField value={floorLocation} aria-label="New floor building" onChange={(e) => setFloorLocation(e.target.value)} className="w-36 flex-none">
              <option value="">No building</option>
              {locationList.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </SelectField>
            <Button variant="secondary" type="button" onClick={addFloor} icon={<Lucide.Plus size={14} />}>Add</Button>
          </div>
          <p className="text-label text-ink-secondary">
            {roomFloorNumbers.length > 0 ? `Rooms are on floor ${roomFloorNumbers.join(', ')}.` : 'No room has a floor number yet.'}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
