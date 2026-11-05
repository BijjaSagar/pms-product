import { useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import { roomListingApi } from '../../../lib/api/pms';
import type { AmenityDetails, RoomCategoryDetails, RoomDetails, RoomTypeDetails } from '../../../lib/api/pms';
import { displayApiError } from '../../../lib/api/client';
import { toast } from '../../../utils/toast';
import { Button, Checkbox, IconButton, SelectField, TextArea, TextField } from '../../../components/primitives';
import { Field } from '../../../components/controls';
import { Modal } from '../../../components/overlays';
import { SegmentedControl } from '../../../components/SegmentedControl';
import { Card, CardTitle, TableContainer } from '../../../components/ui';
import type { RoomListing, RoomMedia } from './types';
import { StatStrip, StatTile } from './RoomSettingsKit';

interface RoomsSectionProps {
  /** The property whose rooms are managed; null until one is chosen. */
  propertyId: string | null;
  /** The property's rooms, from the backend. */
  rooms: RoomDetails[];
  /** The property's room types, from the backend. */
  roomTypes: RoomTypeDetails[];
  /** The property's room categories; their bed setups are the bed types. */
  categories: RoomCategoryDetails[];
  amenities: AmenityDetails[];
  /** The property's total number of rooms, when it has one. */
  totalRooms: number | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/** The edit form's view of a room; `id` is '' while a new room is being added. */
const toListing = (r: RoomDetails, media: RoomMedia[]): RoomListing => ({
  id: r.id,
  roomTypeId: r.roomTypeId,
  name: r.name,
  description: r.description ?? '',
  noOfRooms: r.roomCount,
  categoryId: r.categoryId ?? '',
  allowExtraBeds: r.allowExtraBeds,
  maxAdults: r.maxAdults,
  maxChildren: r.maxChildren,
  maxOccupancy: r.maxOccupancy,
  noOfBathrooms: r.bathrooms,
  amenityIds: r.amenityIds,
  media,
});

const EMPTY_ROOM: RoomListing = {
  id: '',
  roomTypeId: '',
  name: '',
  description: '',
  noOfRooms: 1,
  categoryId: '',
  allowExtraBeds: false,
  maxAdults: 2,
  maxChildren: 1,
  maxOccupancy: 3,
  noOfBathrooms: 1,
  amenityIds: [],
  media: [],
};

const EXTRA_BED_OPTIONS = [
  { id: 'yes', label: 'Yes', Icon: Lucide.Check },
  { id: 'no', label: 'No', Icon: Lucide.X },
] as const;

const isWhole = (n: number, min: number) => Number.isInteger(n) && n >= min;

export function RoomsSection({
  propertyId,
  rooms: apiRooms,
  roomTypes,
  categories,
  amenities,
  totalRooms,
  loading,
  error,
  onRefresh,
}: RoomsSectionProps) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<RoomListing | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Photos and videos are not stored by the backend yet; they live only for this session.
  const [mediaByRoom, setMediaByRoom] = useState<Record<string, RoomMedia[]>>({});
  const fileInput = useRef<HTMLInputElement>(null);

  const rooms = apiRooms.map((r) => toListing(r, mediaByRoom[r.id] ?? []));

  const typeName = (id: string) => roomTypes.find((t) => t.id === id)?.name ?? '—';
  const bedTypeLabel = (id: string) => {
    const c = categories.find((cat) => cat.id === id);
    return c ? `${c.name} — ${c.bedSetup}` : '—';
  };

  const query = search.trim().toLowerCase();
  const filtered = rooms.filter(
    (r) => !query || r.name.toLowerCase().includes(query) || typeName(r.roomTypeId).toLowerCase().includes(query),
  );

  const totalUnits = rooms.reduce((sum, r) => sum + r.noOfRooms, 0);
  // Rooms of a room type may not exceed that type's count; `exceptId` leaves out the room being edited.
  const roomsLeftInType = (typeId: string, exceptId: string): number | null => {
    const type = roomTypes.find((t) => t.id === typeId);
    if (!type) return null;
    const listed = rooms.filter((r) => r.roomTypeId === typeId && r.id !== exceptId).reduce((n, r) => n + r.noOfRooms, 0);
    return type.roomCount - listed;
  };
  const typeLeft = editing ? roomsLeftInType(editing.roomTypeId, editing.id) : null;
  const extraBedCount = rooms.filter((r) => r.allowExtraBeds).length;
  const mediaCount = rooms.reduce((sum, r) => sum + r.media.length, 0);

  const handleAdd = () => setEditing({ ...EMPTY_ROOM, roomTypeId: roomTypes.find((t) => t.status === 'ACTIVE')?.id ?? '' });

  const handlePickFiles = (files: FileList | null) => {
    if (!editing || !files) return;
    const added: RoomMedia[] = Array.from(files).map((f, i) => ({
      id: `md-${Date.now().toString(36)}-${i}`,
      name: f.name,
      kind: f.type.startsWith('video/') ? 'video' : 'image',
      url: URL.createObjectURL(f),
    }));
    setEditing({ ...editing, media: [...editing.media, ...added] });
    if (fileInput.current) fileInput.current.value = '';
  };

  // A saved room keeps showing its media until the edit is saved, so only unsaved URLs are released early.
  const isSavedMedia = (id: string) => rooms.some((r) => r.media.some((m) => m.id === id));

  const handleRemoveMedia = (media: RoomMedia) => {
    if (!editing) return;
    if (!isSavedMedia(media.id)) URL.revokeObjectURL(media.url);
    setEditing({ ...editing, media: editing.media.filter((m) => m.id !== media.id) });
  };

  const handleToggleAmenity = (id: string) => {
    if (!editing) return;
    const has = editing.amenityIds.includes(id);
    setEditing({
      ...editing,
      amenityIds: has ? editing.amenityIds.filter((a) => a !== id) : [...editing.amenityIds, id],
    });
  };

  const handleCancel = () => {
    editing?.media.filter((m) => !isSavedMedia(m.id)).forEach((m) => URL.revokeObjectURL(m.url));
    setEditing(null);
  };

  const handleSave = async () => {
    if (!editing || !propertyId) return;
    if (!editing.roomTypeId) {
      return toast('Room type required', { detail: 'Choose the room type this room belongs to.', tone: 'warning' });
    }
    if (editing.name.trim().length < 2) {
      return toast('Name required', { detail: 'Please specify a room name.', tone: 'warning' });
    }
    if (!isWhole(editing.noOfRooms, 1)) {
      return toast('Invalid room count', { detail: 'No. of rooms must be a whole number, 1 or more.', tone: 'warning' });
    }
    if (typeLeft !== null && editing.noOfRooms > typeLeft) {
      return toast('Too many rooms', {
        detail: `${typeName(editing.roomTypeId)} has ${Math.max(typeLeft, 0)} rooms left to list.`,
        tone: 'warning',
      });
    }
    if (!isWhole(editing.maxAdults, 1)) {
      return toast('Invalid adults', { detail: 'Maximum adults must be a whole number, 1 or more.', tone: 'warning' });
    }
    if (!isWhole(editing.maxChildren, 0)) {
      return toast('Invalid children', { detail: 'Maximum children must be a whole number, 0 or more.', tone: 'warning' });
    }
    if (!isWhole(editing.maxOccupancy, 1) || editing.maxOccupancy > editing.maxAdults + editing.maxChildren) {
      return toast('Invalid room occupancy', {
        detail: 'Maximum room occupancy must be at least 1 and no more than adults plus children.',
        tone: 'warning',
      });
    }
    if (!isWhole(editing.noOfBathrooms, 0)) {
      return toast('Invalid bathrooms', { detail: 'No. of bathrooms must be a whole number, 0 or more.', tone: 'warning' });
    }

    const name = editing.name.trim();
    const body = {
      roomTypeId: editing.roomTypeId,
      name,
      description: editing.description.trim(),
      roomCount: editing.noOfRooms,
      categoryId: editing.categoryId || null,
      allowExtraBeds: editing.allowExtraBeds,
      maxAdults: editing.maxAdults,
      maxChildren: editing.maxChildren,
      maxOccupancy: editing.maxOccupancy,
      bathrooms: editing.noOfBathrooms,
      amenityIds: editing.amenityIds,
    };

    setIsSaving(true);
    try {
      const saved = isNew
        ? await roomListingApi.create(propertyId, body)
        : await roomListingApi.update(propertyId, editing.id, body);
      // Release the object URLs of media removed during this edit.
      (mediaByRoom[saved.id] ?? [])
        .filter((m) => !editing.media.some((e) => e.id === m.id))
        .forEach((m) => URL.revokeObjectURL(m.url));
      setMediaByRoom({ ...mediaByRoom, [saved.id]: editing.media });
      toast(isNew ? 'Room created' : 'Room updated', {
        detail: `${name} ${isNew ? 'added to the room list' : 'specifications updated'}.`,
        tone: 'success',
      });
      onRefresh();
      setEditing(null);
    } catch (err) {
      toast('Could not save room', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (room: RoomListing) => {
    if (!propertyId) return;
    try {
      await roomListingApi.remove(propertyId, room.id);
      room.media.forEach((m) => URL.revokeObjectURL(m.url));
      setMediaByRoom(({ [room.id]: _removed, ...rest }) => rest);
      toast('Room removed', { detail: `${room.name} deleted from the room list.`, tone: 'info' });
      onRefresh();
    } catch (err) {
      toast('Could not remove room', { detail: displayApiError(err), tone: 'danger' });
    }
  };

  const isNew = editing !== null && editing.id === '';

  return (
    <div className="flex flex-col gap-5">
      <StatStrip>
        <StatTile label="Rooms Listed" icon={Lucide.DoorOpen} tone="info" value={rooms.length} caption="Named room offerings" />
        <StatTile
          label="Physical Units"
          icon={Lucide.BedDouble}
          tone="success"
          value={totalRooms ? `${totalUnits} / ${totalRooms}` : totalUnits}
          caption={totalRooms ? 'Listed of the property total' : 'Across all listed rooms'}
        />
        <StatTile
          label="Extra Beds"
          icon={Lucide.BedSingle}
          tone="warning"
          value={extraBedCount}
          caption="Rooms that accommodate extra beds"
        />
        <StatTile label="Photos & Videos" icon={Lucide.Images} tone="primary" value={mediaCount} caption="Uploaded media" />
      </StatStrip>

      <Card>
        <CardTitle
          title="Rooms"
          subtitle="Room offerings with bedding, occupancy, amenities and media"
          icon={Lucide.DoorOpen}
          action={
            <Button variant="primary" onClick={handleAdd} disabled={!propertyId} icon={<Lucide.Plus size={14} />}>
              Add Room
            </Button>
          }
        />

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            <Lucide.AlertCircle size={16} />
            <span>Could not load rooms: {error}</span>
          </div>
        )}

        <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Lucide.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by room name or type..."
              className="pl-8"
            />
          </div>
          <p className="text-label text-ink-secondary self-center">
            Showing <span className="font-semibold text-ink">{filtered.length}</span> of {rooms.length} rooms
          </p>
        </div>

        <TableContainer>
          <table className="pms-table min-w-[720px] w-full text-left">
            <thead>
              <tr>
                <th className="w-10 text-center">#</th>
                <th>ROOM</th>
                <th>ROOM TYPE</th>
                <th>BED TYPE</th>
                <th className="text-center">ROOMS</th>
                <th>OCCUPANCY</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const cover = r.media.find((m) => m.kind === 'image');
                return (
                  <tr key={r.id} className="transition-colors hover:bg-hover-surface/60 border-b border-divider last:border-b-0">
                    <td className="text-center font-medium text-ink-muted text-label py-3">{idx + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-lg bg-muted-surface text-ink-muted">
                          {cover ? (
                            <img src={cover.url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Lucide.Image size={16} />
                          )}
                        </span>
                        <div className="min-w-0">
                          <span className="block font-bold text-ink text-label">{r.name}</span>
                          {r.description && (
                            <span className="block max-w-[240px] truncate text-micro text-ink-secondary">{r.description}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-label font-semibold text-ink py-3">{typeName(r.roomTypeId)}</td>
                    <td className="text-label text-ink-secondary py-3">{bedTypeLabel(r.categoryId)}</td>
                    <td className="text-center tnum font-bold text-ink text-label py-3">{r.noOfRooms}</td>
                    <td className="py-3 text-label text-ink-secondary tnum">
                      <span className="block font-semibold text-ink">Max {r.maxOccupancy}</span>
                      <span className="block text-micro">
                        {r.maxAdults} adults · {r.maxChildren} children
                      </span>
                    </td>
                    <td className="text-right py-3">
                      <div className="inline-flex items-center gap-1.5">
                        <IconButton title={`Edit ${r.name}`} onClick={() => setEditing(r)}>
                          <Lucide.Pencil size={14} />
                        </IconButton>
                        <IconButton
                          title={`Delete ${r.name}`}
                          onClick={() => void handleDelete(r)}
                          className="hover:text-danger-text"
                        >
                          <Lucide.Trash2 size={14} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-label text-ink-muted">
                    {loading
                      ? 'Loading rooms…'
                      : rooms.length === 0
                        ? 'No rooms yet. Use Add Room to create one.'
                        : 'No rooms match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableContainer>
      </Card>

      <Modal
        open={editing !== null}
        onClose={handleCancel}
        title={isNew ? 'Add Room' : `Edit ${editing?.name}`}
        subtitle="Room type, bedding, occupancy, amenities and media"
        wide
      >
        {editing && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 py-2">
            <Field
              label="Room Type"
              hint={loading ? 'Loading room types…' : roomTypes.length === 0 ? 'Add a room type first' : undefined}
            >
              <SelectField
                value={editing.roomTypeId}
                onChange={(e) => setEditing({ ...editing, roomTypeId: e.target.value })}
              >
                <option value="">Select room type</option>
                {roomTypes
                  .filter((t) => t.status === 'ACTIVE' || t.id === editing.roomTypeId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.status === 'ACTIVE' ? '' : ' (inactive)'}
                    </option>
                  ))}
              </SelectField>
            </Field>

            <Field label="Room Name">
              <TextField
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Deluxe Sea View Room"
                autoFocus
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Room Description">
                <TextArea
                  rows={2}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Layout, size, furnishings and view"
                />
              </Field>
            </div>

            <Field
              label="No. of Rooms"
              hint={
                typeLeft === null
                  ? 'Choose a room type first'
                  : `${typeName(editing.roomTypeId)} has ${Math.max(typeLeft, 0)} rooms left to list`
              }
            >
              <TextField
                type="number"
                min={1}
                max={typeLeft === null ? undefined : Math.max(typeLeft, 1)}
                value={editing.noOfRooms}
                onChange={(e) => setEditing({ ...editing, noOfRooms: Number(e.target.value) })}
                className="tnum"
              />
            </Field>

            <Field label="Bed Type" hint="From Categories">
              <SelectField
                value={editing.categoryId}
                onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
              >
                <option value="">Not specified</option>
                {categories
                  .filter((c) => c.isActive || c.id === editing.categoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.bedSetup}
                      {c.isActive ? '' : ' (inactive)'}
                    </option>
                  ))}
              </SelectField>
            </Field>

            <Field label="Can this room accommodate extra beds?">
              <SegmentedControl
                label="Extra beds"
                options={EXTRA_BED_OPTIONS}
                value={editing.allowExtraBeds ? 'yes' : 'no'}
                onChange={(v) => setEditing({ ...editing, allowExtraBeds: v === 'yes' })}
              />
            </Field>

            <Field label="No. of Bathrooms">
              <TextField
                type="number"
                min={0}
                value={editing.noOfBathrooms}
                onChange={(e) => setEditing({ ...editing, noOfBathrooms: Number(e.target.value) })}
                className="tnum"
              />
            </Field>

            <div className="sm:col-span-2 border-t border-divider pt-3">
              <p className="mb-2 text-micro font-bold uppercase tracking-wider text-ink-muted">Occupancy</p>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <Field label="Maximum Adults">
                  <TextField
                    type="number"
                    min={1}
                    value={editing.maxAdults}
                    onChange={(e) => setEditing({ ...editing, maxAdults: Number(e.target.value) })}
                    className="tnum"
                  />
                </Field>
                <Field label="Maximum Children">
                  <TextField
                    type="number"
                    min={0}
                    value={editing.maxChildren}
                    onChange={(e) => setEditing({ ...editing, maxChildren: Number(e.target.value) })}
                    className="tnum"
                  />
                </Field>
                <Field label="Maximum Room Occupancy">
                  <TextField
                    type="number"
                    min={1}
                    value={editing.maxOccupancy}
                    onChange={(e) => setEditing({ ...editing, maxOccupancy: Number(e.target.value) })}
                    className="tnum"
                  />
                </Field>
              </div>
            </div>

            <div className="sm:col-span-2 border-t border-divider pt-3">
              <p className="mb-2 text-micro font-bold uppercase tracking-wider text-ink-muted">Amenity Details</p>
              {amenities.length === 0 ? (
                <p className="text-label text-ink-muted">No amenities defined yet. Add some in the Amenities section.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {amenities
                    .filter((a) => a.isActive || editing.amenityIds.includes(a.id))
                    .map((a) => (
                      <Checkbox
                        key={a.id}
                        checked={editing.amenityIds.includes(a.id)}
                        onChange={() => handleToggleAmenity(a.id)}
                        label={a.name}
                      />
                    ))}
                </div>
              )}
            </div>

            <div className="sm:col-span-2 border-t border-divider pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-micro font-bold uppercase tracking-wider text-ink-muted">Photos / Videos</p>
                <Button
                  variant="secondary"
                  onClick={() => fileInput.current?.click()}
                  icon={<Lucide.Upload size={13} />}
                >
                  Upload
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePickFiles(e.target.files)}
                />
              </div>
              {editing.media.length === 0 ? (
                <p className="text-label text-ink-muted">No photos or videos added.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {editing.media.map((m) => (
                    <div
                      key={m.id}
                      className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted-surface"
                    >
                      {m.kind === 'image' ? (
                        <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
                      ) : (
                        <video src={m.url} className="h-full w-full object-cover" muted />
                      )}
                      <IconButton
                        title={`Remove ${m.name}`}
                        onClick={() => handleRemoveMedia(m)}
                        className="absolute right-1 top-1 bg-surface/90"
                      >
                        <Lucide.X size={13} />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 sm:col-span-2 pt-3 border-t border-divider">
              <Button variant="secondary" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSave()}
                disabled={isSaving}
                icon={isSaving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
              >
                {isSaving ? 'Saving…' : isNew ? 'Create Room' : 'Save Room'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
