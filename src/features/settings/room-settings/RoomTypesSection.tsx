import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { formatCurrency } from '../../../lib/api/format';
import { roomTypeApi } from '../../../lib/api/pms';
import type {
  RoomCategoryDetails,
  RoomDetails,
  RoomTypeDetails,
  RoomTypeInput,
  RoomTypeStatus,
} from '../../../lib/api/pms';
import { displayApiError } from '../../../lib/api/client';
import { toast } from '../../../utils/toast';
import type { BadgeTone } from '../../../utils/status';
import { Button, IconButton, SelectField, TextArea, TextField } from '../../../components/primitives';
import { Field } from '../../../components/controls';
import { Modal } from '../../../components/overlays';
import { Badge, Card, CardTitle, TableContainer } from '../../../components/ui';
import { StatStrip, StatTile } from './RoomSettingsKit';

interface RoomTypesSectionProps {
  /** The property whose room types are managed; null until one is chosen. */
  propertyId: string | null;
  types: RoomTypeDetails[];
  /** The property's room categories, offered as bed classifications. */
  categories: RoomCategoryDetails[];
  /** The property's total number of rooms, when it has one; room types may not exceed it. */
  totalRooms: number | null;
  /** The property's rooms; a room type cannot hold fewer rooms than are listed under it. */
  rooms: RoomDetails[];
  currencyCode: string;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/** What the edit dialog works on. `id` is null while a new room type is being added. */
interface RoomTypeForm extends Omit<RoomTypeInput, 'categoryId'> {
  id: string | null;
  /** Selected room category id; empty when none. */
  categoryId: string;
  // The backend has no fields for these yet: they can be filled in but are not saved.
  description: string;
  maxChildren: number;
}

const EMPTY_FORM: RoomTypeForm = {
  id: null,
  name: '',
  roomCount: 1,
  capacity: 2,
  baseRate: 4000,
  status: 'ACTIVE',
  categoryId: '',
  description: '',
  maxChildren: 1,
};

const STATUS_LABEL: Record<RoomTypeStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  MAINTENANCE: 'Maintenance',
};

const STATUS_TONE: Record<RoomTypeStatus, BadgeTone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  MAINTENANCE: 'warning',
};

type StatusFilter = 'all' | RoomTypeStatus;

const NOT_SAVED_HINT = 'Not saved yet: the backend has no field for this';

const formFromType = (t: RoomTypeDetails): RoomTypeForm => ({
  id: t.id,
  name: t.name,
  roomCount: t.roomCount,
  capacity: t.capacity,
  baseRate: Number(t.baseRate),
  status: t.status,
  categoryId: t.categoryId ?? '',
  description: '',
  maxChildren: 0,
});

const isWhole = (n: number, min: number) => Number.isInteger(n) && n >= min;

export function RoomTypesSection({
  propertyId,
  types,
  categories,
  totalRooms,
  rooms,
  currencyCode,
  loading,
  error,
  onRefresh,
}: RoomTypesSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<RoomTypeForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredTypes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return types.filter(
      (t) =>
        (!query || t.name.toLowerCase().includes(query)) &&
        (statusFilter === 'all' || t.status === statusFilter),
    );
  }, [types, searchQuery, statusFilter]);

  const countByStatus = (status: RoomTypeStatus) => types.filter((t) => t.status === status).length;
  const totalInventoryRooms = types.reduce((sum, t) => sum + t.roomCount, 0);
  // Rooms the room type being edited may hold: the property total minus every other room type.
  const allocatedElsewhere = types
    .filter((t) => t.id !== editing?.id)
    .reduce((sum, t) => sum + t.roomCount, 0);
  const roomsAvailable = totalRooms ? totalRooms - allocatedElsewhere : null;
  // Rooms already listed under the room type being edited; it cannot shrink below them.
  const listedUnderType = rooms
    .filter((r) => r.roomTypeId === editing?.id)
    .reduce((sum, r) => sum + r.roomCount, 0);
  const unallocatedRooms = totalRooms ? totalRooms - totalInventoryRooms : null;
  const rates = types.map((t) => Number(t.baseRate));
  const lowestRate = rates.length > 0 ? Math.min(...rates) : 0;
  const highestRate = rates.length > 0 ? Math.max(...rates) : 0;

  const handleToggleStatus = async (t: RoomTypeDetails) => {
    if (!propertyId) return;
    const next: RoomTypeStatus = t.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await roomTypeApi.update(propertyId, t.id, { status: next });
      toast(`Room type marked as ${STATUS_LABEL[next]}`, { tone: 'success' });
      onRefresh();
    } catch (err) {
      toast('Could not change status', { detail: displayApiError(err), tone: 'danger' });
    }
  };

  const handleSave = async () => {
    if (!editing || !propertyId) return;
    if (editing.name.trim().length < 2) {
      return toast('Name required', { detail: 'Please specify a room type title.', tone: 'warning' });
    }
    if (!isWhole(editing.roomCount, 0)) {
      return toast('Invalid room count', { detail: 'Rooms must be a whole number, 0 or more.', tone: 'warning' });
    }
    if (roomsAvailable !== null && editing.roomCount > roomsAvailable) {
      return toast('Too many rooms', {
        detail: `The property has ${totalRooms} rooms in total; only ${Math.max(roomsAvailable, 0)} are left to allocate.`,
        tone: 'warning',
      });
    }
    if (editing.roomCount < listedUnderType) {
      return toast('Too few rooms', {
        detail: `${listedUnderType} rooms are already listed under this room type; it cannot hold fewer.`,
        tone: 'warning',
      });
    }
    if (!isWhole(editing.capacity, 1)) {
      return toast('Invalid capacity', { detail: 'Max guests must be a whole number, 1 or more.', tone: 'warning' });
    }
    if (!(editing.baseRate >= 0) || Math.round(editing.baseRate * 100) / 100 !== editing.baseRate) {
      return toast('Invalid rate', {
        detail: 'Base nightly rate must be 0 or more, with at most two decimals.',
        tone: 'warning',
      });
    }

    const body: RoomTypeInput = {
      name: editing.name.trim(),
      roomCount: editing.roomCount,
      capacity: editing.capacity,
      baseRate: editing.baseRate,
      status: editing.status,
      categoryId: editing.categoryId || null,
    };

    setIsSaving(true);
    try {
      if (editing.id === null) {
        await roomTypeApi.create(propertyId, body);
        toast('New room type created', { detail: `${body.name} added to catalog.`, tone: 'success' });
      } else {
        await roomTypeApi.update(propertyId, editing.id, body);
        toast('Room type updated', { detail: `${body.name} specifications updated.`, tone: 'success' });
      }
      onRefresh();
      setEditing(null);
    } catch (err) {
      toast('Could not save room type', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <StatStrip>
        <StatTile
          label="Room Types"
          icon={Lucide.Layers}
          tone="info"
          value={types.length}
          caption={<>{countByStatus('ACTIVE')} active in catalog</>}
        />

        <StatTile
          label="Physical Units"
          icon={Lucide.BedDouble}
          tone="success"
          value={totalRooms ? `${totalInventoryRooms} / ${totalRooms}` : totalInventoryRooms}
          caption={
            unallocatedRooms === null
              ? 'Assigned to inventory'
              : unallocatedRooms > 0
                ? `${unallocatedRooms} not yet allocated`
                : unallocatedRooms === 0
                  ? 'Fully allocated'
                  : `${-unallocatedRooms} over the property total`
          }
        />

        <StatTile
          label="Starting Rate"
          icon={Lucide.Tag}
          tone="warning"
          value={formatCurrency(lowestRate, currencyCode)}
          caption={<>Peak {formatCurrency(highestRate, currencyCode)}</>}
        />

        <StatTile
          label="Configuration Health"
          icon={Lucide.CheckCircle2}
          tone="primary"
          valueTone="success"
          value="100%"
          caption="Base rates & amenities mapped"
        />
      </StatStrip>

      {/* Main Table Card */}
      <Card>
        <CardTitle
          title="Room Types & Rate Plans"
          icon={Lucide.BedDouble}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={onRefresh}
                icon={<Lucide.RefreshCw size={13} className={loading ? 'animate-spin' : ''} />}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                onClick={() => setEditing({ ...EMPTY_FORM })}
                disabled={!propertyId}
                icon={<Lucide.Plus size={14} />}
              >
                Add Room Type
              </Button>
            </div>
          }
        />

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            <Lucide.AlertCircle size={16} />
            <span>Could not load room types: {error}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Lucide.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <TextField
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by room type name..."
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-label text-ink-secondary whitespace-nowrap">Filter status:</span>
            <SelectField
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-44"
            >
              <option value="all">All ({types.length})</option>
              <option value="ACTIVE">Active only ({countByStatus('ACTIVE')})</option>
              <option value="INACTIVE">Inactive ({countByStatus('INACTIVE')})</option>
              <option value="MAINTENANCE">Maintenance ({countByStatus('MAINTENANCE')})</option>
            </SelectField>
          </div>
        </div>

        <TableContainer>
          <table className="pms-table min-w-[760px] w-full text-left">
            <thead>
              <tr>
                <th className="w-10 text-center">#</th>
                <th>ROOM TYPE</th>
                <th>BED CLASSIFICATION</th>
                <th className="text-center">ROOMS</th>
                <th>CAPACITY</th>
                <th className="text-right">BASE RATE / NIGHT</th>
                <th className="text-center">STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredTypes.map((t, idx) => (
                <tr key={t.id} className="transition-colors hover:bg-hover-surface/60 border-b border-divider last:border-b-0">
                  <td className="text-center font-medium text-ink-muted text-label py-3">{idx + 1}</td>
                  <td className="py-3">
                    <span className="block font-bold text-ink text-label">{t.name}</span>
                  </td>
                  <td className="py-3 text-label">
                    {t.category ? (
                      <>
                        <span className="block font-semibold text-ink">{t.category.name}</span>
                        <span className="block text-micro text-ink-secondary">{t.category.bedSetup}</span>
                      </>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="text-center tnum font-semibold text-ink text-label py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted-surface text-ink font-bold">
                      {t.roomCount}
                    </span>
                  </td>
                  <td className="tnum text-ink-secondary text-label py-3">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-ink">
                      <Lucide.Users size={12} className="shrink-0 text-ink-secondary" />
                      <span>
                        {t.capacity} {t.capacity === 1 ? 'Guest' : 'Guests'}
                      </span>
                    </span>
                  </td>
                  <td className="tnum text-right font-black text-ink text-label py-3">
                    {formatCurrency(Number(t.baseRate), currencyCode)}
                  </td>
                  <td className="text-center py-3">
                    <Badge tone={STATUS_TONE[t.status]} dot size="sm">
                      {STATUS_LABEL[t.status]}
                    </Badge>
                  </td>
                  <td className="text-right py-3">
                    <div className="inline-flex items-center gap-1.5">
                      <IconButton
                        title={t.status === 'ACTIVE' ? 'Deactivate room type' : 'Activate room type'}
                        onClick={() => void handleToggleStatus(t)}
                        className={t.status === 'ACTIVE' ? 'hover:text-warning-text' : 'hover:text-success-text'}
                      >
                        {t.status === 'ACTIVE' ? <Lucide.PauseCircle size={15} /> : <Lucide.PlayCircle size={15} />}
                      </IconButton>
                      <IconButton title={`Edit ${t.name}`} onClick={() => setEditing(formFromType(t))}>
                        <Lucide.Pencil size={14} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTypes.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-label text-ink-muted">
                    {loading ? 'Loading room types…' : 'No room types match the criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableContainer>
      </Card>

      {/* Edit / Add Modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id === null ? 'Add New Room Type' : `Edit ${editing?.name}`}
        subtitle="Manage room category code, base rates, occupant boundaries, and luxury inclusions"
        wide
      >
        {editing && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 py-2">
            <Field label="Room Type Name">
              <TextField
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Presidential Panoramic Suite"
                autoFocus
              />
            </Field>

            <Field label={`Base Rate per Night (${currencyCode})`}>
              <TextField
                type="number"
                min={0}
                value={editing.baseRate}
                onChange={(e) => setEditing({ ...editing, baseRate: Number(e.target.value) })}
                className="tnum"
              />
            </Field>

            <Field
              label="Number of Rooms"
              hint={[
                roomsAvailable === null
                  ? 'Physical rooms of this type'
                  : `At most ${Math.max(roomsAvailable, 0)} of the property's ${totalRooms} rooms`,
                listedUnderType > 0 ? `at least ${listedUnderType} (already listed as rooms)` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            >
              <TextField
                type="number"
                min={listedUnderType}
                max={roomsAvailable === null ? undefined : Math.max(roomsAvailable, 0)}
                value={editing.roomCount}
                onChange={(e) => setEditing({ ...editing, roomCount: Number(e.target.value) })}
                className="tnum"
              />
            </Field>

            <Field label="Max Guests per Room">
              <TextField
                type="number"
                min={1}
                max={100}
                value={editing.capacity}
                onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) })}
                className="tnum"
              />
            </Field>

            <Field label="Status">
              <SelectField
                value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value as RoomTypeStatus })}
              >
                <option value="ACTIVE">Active (Available for booking & OTA mapping)</option>
                <option value="INACTIVE">Inactive (Hidden from booking engine)</option>
                <option value="MAINTENANCE">Maintenance (Temporarily unavailable)</option>
              </SelectField>
            </Field>

            <Field label="Bed Classification" hint="From Room Categories">
              <SelectField
                value={editing.categoryId}
                onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
              >
                <option value="">Not classified</option>
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

            <Field label="Max Children Allowed" hint={NOT_SAVED_HINT}>
              <TextField
                type="number"
                min={0}
                max={6}
                value={editing.maxChildren}
                onChange={(e) => setEditing({ ...editing, maxChildren: Number(e.target.value) })}
                className="tnum"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Description" hint={NOT_SAVED_HINT}>
                <TextArea
                  rows={2}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Summary of room layout, square footage, furnishings, and view orientation"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 sm:col-span-2 pt-3 border-t border-divider">
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSave()}
                disabled={isSaving}
                icon={isSaving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
              >
                {isSaving ? 'Saving…' : 'Save Room Type'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
