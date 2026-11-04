import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { TableContainer } from '../../../components/ui';
import { Button } from '../../../components/primitives';
import { formatCurrency } from '../../../lib/api/format';
import { inventoryApi } from '../../../lib/api/pms';
import type { RoomType } from '../../../types';
import { toast } from '../../../utils/toast';
import { RoomTypeDialog, type TypeDraft } from './RoomTypeDialog';
import { SectionCard } from './SectionCard';
import {
  CODE_PATTERN, DEFAULT_TYPE_PROFILE, codeInUse, normalizeCode, saveRoomSetting,
  type RoomSettingsData, type TypeProfile,
} from './roomSettingsData';
import type { RunSave } from './useRoomSave';

/* The first problem with a room type draft, as a message for the user, or null when it can be saved. */
function problemWith(draft: TypeDraft, roomTypes: RoomType[]): { title: string; detail: string } | null {
  if (draft.id === null && !CODE_PATTERN.test(normalizeCode(draft.code))) {
    return { title: 'Check the room type code', detail: 'Use up to 20 letters, digits, _ or -.' };
  }
  if (draft.id === null && codeInUse(roomTypes.map((type) => ({ id: type.id, code: type.code ?? '' })), normalizeCode(draft.code), null)) {
    return { title: 'Code already used', detail: 'Another room type already uses this code.' };
  }
  if (draft.name.trim().length < 2) return { title: 'Name required', detail: 'Give the room type a descriptive name.' };
  if (!(draft.baseRate >= 0)) return { title: 'Check base rate', detail: 'Base rate must be zero or above.' };
  if (!Number.isInteger(draft.maxAdults) || draft.maxAdults < 1) {
    return { title: 'Check max adults', detail: 'Max adults must be a whole number of at least 1.' };
  }
  if (!Number.isInteger(draft.maxChildren) || draft.maxChildren < 0) {
    return { title: 'Check max children', detail: 'Max children must be a whole number, zero or above.' };
  }
  if (!Number.isInteger(draft.maxOccupancy) || draft.maxOccupancy < 1 || draft.maxOccupancy > draft.maxAdults + draft.maxChildren) {
    return { title: 'Check maximum occupancy', detail: 'Maximum occupancy must be from 1 up to max adults plus max children.' };
  }
  if (!Number.isInteger(draft.baseOccupancy) || draft.baseOccupancy < 1 || draft.baseOccupancy > draft.maxOccupancy) {
    return { title: 'Check base occupancy', detail: 'Base occupancy must be from 1 up to maximum occupancy.' };
  }
  if (!Number.isInteger(draft.defaultAdults) || draft.defaultAdults < 1 || draft.defaultAdults > draft.maxAdults) {
    return { title: 'Check default adults', detail: 'Default adults must be from 1 up to max adults.' };
  }
  if (!Number.isInteger(draft.defaultChildren) || draft.defaultChildren < 0 || draft.defaultChildren > draft.maxChildren) {
    return { title: 'Check default children', detail: 'Default children must be from 0 up to max children.' };
  }
  if (!Number.isInteger(draft.extraBeds) || draft.extraBeds < 0) {
    return { title: 'Check extra beds', detail: 'Extra beds must be a whole number, zero or above.' };
  }
  if (draft.roomSizeSqFt !== null && !(draft.roomSizeSqFt > 0)) {
    return { title: 'Check room size', detail: 'Room size must be above zero, or left empty.' };
  }
  return null;
}

/* Attribute values with the blank ones left out, so an unset attribute is stored as not set. */
const setValuesOnly = (values: Record<string, string>) =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== ''));

export function RoomTypesCard({
  data,
  currencyCode,
  saving,
  run,
  onRefresh,
}: {
  data: RoomSettingsData;
  currencyCode: string;
  saving: boolean;
  run: RunSave;
  onRefresh: () => void;
}) {
  const { roomTypes, settings } = data;
  const [draft, setDraft] = useState<TypeDraft | null>(null);

  const activeBedTypes = (selectedId: string | null) =>
    settings.bedTypes.filter((bed) => bed.active || bed.id === selectedId);
  const activeAmenities = (selectedIds: string[]) =>
    settings.amenities.filter((amenity) => amenity.active || selectedIds.includes(amenity.id));
  const activeAttributes = (values: Record<string, string>) =>
    settings.attributes.filter((attribute) => attribute.active || (values[attribute.id] ?? '') !== '');

  /* The draft a room type opens with: its profile when one is saved, else what the backend columns already say. */
  const draftOf = (type: RoomType): TypeDraft => {
    const stored = settings.typeProfiles[type.id];
    const profile: TypeProfile = { ...DEFAULT_TYPE_PROFILE, ...stored };
    const bedByName = settings.bedTypes.find((bed) => bed.name === type.beds);
    const amenityIds = stored?.amenityIds
      ?? settings.amenities.filter((amenity) => type.amenities.includes(amenity.name)).map((amenity) => amenity.id);
    return {
      id: type.id,
      code: type.code ?? '',
      name: type.name,
      description: type.description,
      baseRate: type.baseRate,
      baseOccupancy: type.baseOccupancy ?? type.maxAdults ?? 2,
      maxOccupancy: type.maxOccupancy,
      maxAdults: type.maxAdults ?? 2,
      maxChildren: type.maxChildren ?? 0,
      defaultAdults: profile.defaultAdults,
      defaultChildren: profile.defaultChildren,
      extraBeds: profile.extraBeds,
      roomSizeSqFt: profile.roomSizeSqFt,
      defaultBedTypeId: profile.defaultBedTypeId ?? bedByName?.id ?? null,
      classificationIds: [...profile.classificationIds],
      amenityIds: [...amenityIds],
      attributeValues: { ...profile.attributeValues },
      active: type.active,
    };
  };

  const update = (patch: Partial<TypeDraft>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  const save = async () => {
    if (!draft) return;
    const problem = problemWith(draft, roomTypes);
    if (problem) {
      toast(problem.title, { detail: problem.detail, tone: 'warning' });
      return;
    }
    const bed = settings.bedTypes.find((item) => item.id === draft.defaultBedTypeId);
    const amenityNames = settings.amenities.filter((item) => draft.amenityIds.includes(item.id)).map((item) => item.name);
    const fields = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      baseOccupancy: draft.baseOccupancy,
      maxOccupancy: draft.maxOccupancy,
      maxAdults: draft.maxAdults,
      maxChildren: draft.maxChildren,
      baseRate: draft.baseRate,
      bedConfiguration: bed?.name ?? '',
      amenities: amenityNames,
      isActive: draft.active,
    };
    const profile: TypeProfile = {
      classificationIds: draft.classificationIds,
      amenityIds: draft.amenityIds,
      attributeValues: setValuesOnly(draft.attributeValues),
      defaultBedTypeId: draft.defaultBedTypeId,
      defaultAdults: draft.defaultAdults,
      defaultChildren: draft.defaultChildren,
      extraBeds: draft.extraBeds,
      roomSizeSqFt: draft.roomSizeSqFt,
    };
    const saved = await run('Room type', async () => {
      const id = draft.id ?? (await inventoryApi.createRoomType({ code: normalizeCode(draft.code), ...fields })).id;
      if (draft.id) await inventoryApi.updateRoomType(draft.id, fields);
      await saveRoomSetting('typeProfiles', { ...settings.typeProfiles, [id]: profile });
    });
    if (saved) setDraft(null);
  };

  const blankDraft = (): TypeDraft => ({
    id: null,
    code: '',
    name: '',
    description: '',
    baseRate: 0,
    baseOccupancy: 2,
    maxOccupancy: 2,
    maxAdults: 2,
    maxChildren: 0,
    defaultAdults: 2,
    defaultChildren: 0,
    extraBeds: 0,
    roomSizeSqFt: null,
    defaultBedTypeId: null,
    classificationIds: [],
    amenityIds: [],
    attributeValues: {},
    active: true,
  });

  return (
    <>
      <SectionCard
        icon={Lucide.BedDouble}
        title="Room Types & Categories"
        description="Room types with their code, occupancy, default guests, bed, rate, classification, attributes and amenities"
        action={
          <>
            <Button variant="secondary" type="button" onClick={onRefresh} title="Refresh room types" icon={<Lucide.RefreshCw size={13} />}>
              Refresh
            </Button>
            <Button variant="primary" type="button" onClick={() => setDraft(blankDraft())} icon={<Lucide.Plus size={15} strokeWidth={2.4} />}>
              Add Room Type
            </Button>
          </>
        }
      >
        <TableContainer>
          <table className="pms-table min-w-[1120px] w-full text-left">
            <thead>
              <tr>
                <th className="w-10 text-center">#</th>
                <th>CODE</th>
                <th>ROOM TYPE</th>
                <th>ROOMS</th>
                <th>OCCUPANCY</th>
                <th>DEFAULT GUESTS</th>
                <th>BED</th>
                <th>CLASSIFICATION</th>
                <th className="text-right">BASE RATE</th>
                <th>AMENITIES</th>
                <th>STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {roomTypes.map((type, idx) => {
                const profile: TypeProfile = { ...DEFAULT_TYPE_PROFILE, ...settings.typeProfiles[type.id] };
                const classifications = profile.classificationIds
                  .map((id) => settings.classifications.find((item) => item.id === id)?.label)
                  .filter((label): label is string => Boolean(label));
                const amenityNames = profile.amenityIds.length > 0
                  ? settings.amenities.filter((item) => profile.amenityIds.includes(item.id)).map((item) => item.name)
                  : type.amenities;
                return (
                  <tr key={type.id} className="transition-colors hover:bg-page/70 border-b border-divider last:border-b-0">
                    <td className="text-center font-medium text-ink-muted text-label py-3">{idx + 1}</td>
                    <td className="py-3 font-mono text-label text-ink-secondary">{type.code ?? '—'}</td>
                    <td className="py-3">
                      <span className="block font-bold text-ink text-label">{type.name}</span>
                      <span className="block max-w-[240px] truncate text-label text-ink-muted mt-0.5">
                        {type.description || 'Standard room category'}
                      </span>
                      {profile.roomSizeSqFt && (
                        <span className="block text-micro text-ink-muted tnum">{profile.roomSizeSqFt.toLocaleString()} sq. ft.</span>
                      )}
                    </td>
                    <td className="tnum font-semibold text-ink text-label py-3">{type.count}</td>
                    <td className="tnum text-ink-secondary text-label py-3">
                      Base {type.baseOccupancy ?? type.maxAdults} · Max {type.maxOccupancy}
                      {profile.extraBeds > 0 && <span className="block text-micro text-ink-muted">+{profile.extraBeds} extra bed</span>}
                    </td>
                    <td className="tnum text-ink-secondary text-label py-3">
                      {profile.defaultAdults} adults · {profile.defaultChildren} children
                    </td>
                    <td className="text-ink-secondary text-label py-3">{type.beds || '—'}</td>
                    <td className="py-3">
                      <div className="flex max-w-[200px] flex-wrap gap-1">
                        {classifications.length > 0
                          ? classifications.map((label) => (
                            <span key={label} className="text-micro font-medium bg-muted-surface text-ink-secondary px-1.5 py-0.5 rounded">{label}</span>
                          ))
                          : <span className="text-label text-ink-muted">—</span>}
                      </div>
                    </td>
                    <td className="tnum text-right font-bold text-ink text-label py-3">{formatCurrency(type.baseRate, currencyCode)}</td>
                    <td className="py-3">
                      <div className="flex max-w-[200px] flex-wrap gap-1">
                        {amenityNames.length > 0 ? (
                          amenityNames.slice(0, 3).map((name) => (
                            <span key={name} className="text-micro font-medium bg-muted-surface text-ink-secondary px-1.5 py-0.5 rounded">{name}</span>
                          ))
                        ) : (
                          <span className="text-label text-ink-muted">—</span>
                        )}
                        {amenityNames.length > 3 && (
                          <span className="text-micro font-bold text-ink-muted px-1 py-0.5">+{amenityNames.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label font-bold ${
                        type.active ? 'bg-success-bg text-success-text border border-success-border' : 'bg-muted-surface text-ink-secondary'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${type.active ? 'bg-success-text' : 'bg-ink-disabled'}`} />
                        {type.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right py-3">
                      <Button variant="secondary" type="button" onClick={() => setDraft(draftOf(type))} title={`Edit ${type.name}`}>
                        <Lucide.Pencil size={14} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {roomTypes.length === 0 && <p className="py-8 text-center text-label text-ink-muted">No room types configured yet.</p>}
        </TableContainer>
      </SectionCard>

      <RoomTypeDialog
        draft={draft}
        onChange={update}
        onClose={() => setDraft(null)}
        onSave={() => void save()}
        saving={saving}
        currencyCode={currencyCode}
        classifications={settings.classifications}
        bedTypes={activeBedTypes(draft?.defaultBedTypeId ?? null)}
        amenities={activeAmenities(draft?.amenityIds ?? [])}
        attributes={activeAttributes(draft?.attributeValues ?? {})}
      />
    </>
  );
}
