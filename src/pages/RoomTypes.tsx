import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { formatCurrency } from '../lib/api/format';
import type { RoomType } from '../types';
import { Badge, Card, CardTitle, TableContainer, TableActionBtn } from '../components/ui';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Modal } from '../components/overlays';
import { toast } from '../components/toastStore';
import { inventoryApi } from '../lib/api/pms';
import { loadRoomInventory } from '../lib/api/loaders';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { useAuth } from '../features/auth/AuthContext';

const EMPTY: RoomType = {
  id: '',
  name: '',
  description: '',
  count: 0,
  maxOccupancy: 2,
  maxAdults: 2,
  maxChildren: 0,
  beds: '',
  baseRate: 0,
  amenities: [],
  active: true,
};

export function RoomTypes() {
  const { me } = useAuth();
  const currencyCode =
    me?.user.propertyMemberships.find((membership) => membership.propertyId === me.activePropertyId)?.property
      .currencyCode ?? 'INR';
  const resource = useApiResource(() => loadRoomInventory());
  const types: RoomType[] = resource.data?.roomTypes ?? [];
  const [editing, setEditing] = useState<RoomType | null>(null);
  const [amenText, setAmenText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openAdd = () => {
    setEditing({ ...EMPTY, id: `RT-NEW-${types.length + 1}` });
    setAmenText('');
  };

  const openEdit = (t: RoomType) => {
    setEditing({ ...t, amenities: [...t.amenities] });
    setAmenText(t.amenities.join(', '));
  };

  const save = async () => {
    if (!editing) return;
    if (editing.name.trim().length < 2) {
      return toast('Name required', { detail: 'Give the room type a descriptive name.', tone: 'warning' });
    }
    if (editing.baseRate < 0) {
      return toast('Check base rate', { detail: 'Base rate must be zero or above.', tone: 'warning' });
    }
    const amenities = amenText
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      if (editing.id.startsWith('RT-NEW')) {
        const code = editing.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 40);
        await inventoryApi.createRoomType({
          code,
          name: editing.name.trim(),
          description: editing.description,
          maxAdults: Math.max(1, editing.maxAdults ?? editing.maxOccupancy),
          maxChildren: Math.max(0, editing.maxChildren ?? 0),
          baseRate: editing.baseRate,
          amenities,
        });
      } else {
        await inventoryApi.updateRoomType(editing.id, {
          name: editing.name.trim(),
          description: editing.description,
          maxAdults: Math.max(1, editing.maxAdults ?? editing.maxOccupancy),
          maxChildren: Math.max(0, editing.maxChildren ?? 0),
          baseRate: editing.baseRate,
          isActive: editing.active,
          amenities,
        });
      }
      resource.refresh();
      toast('Room type saved', { detail: 'Configuration updated successfully.', tone: 'success' });
      setEditing(null);
    } catch (error) {
      toast('Could not save room type', { detail: displayApiError(error), tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.Layers className="text-primary" size={28} />
            <span>Room Types & Categories</span>
          </h1>
          <p className="mt-1 text-xs text-ink-secondary">
            Manage room categories, base rates, guest occupancy limits, and luxury amenities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl border border-border"
            title="Refresh room types"
          >
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="pms-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl"
          >
            <Lucide.Plus size={16} strokeWidth={2.4} />
            <span>Add Room Type</span>
          </button>
        </div>
      </div>

      <Card>
        <CardTitle
          title="Configured Categories"
          subtitle={
            resource.loading
              ? 'Loading room types…'
              : `${types.filter((t) => t.active).length} active categories · ${types.reduce((s, t) => s + t.count, 0)} total rooms`
          }
        />
        {resource.error ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <Lucide.AlertCircle size={18} />
            <span>Could not load room types: {resource.error}</span>
          </div>
        ) : null}

        <TableContainer className="mt-2">
          <table className="pms-table min-w-[820px]">
            <thead>
              <tr>
                <th className="w-12 text-center">#</th>
                <th>CATEGORY</th>
                <th>ROOMS</th>
                <th>CAPACITY</th>
                <th className="text-right">BASE RATE</th>
                <th>AMENITIES</th>
                <th>STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t, idx) => (
                <tr key={t.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="text-center font-medium text-slate-400 text-xs">
                    {idx + 1}
                  </td>
                  <td>
                    <span className="block font-bold text-slate-900 text-sm">{t.name}</span>
                    <span className="block max-w-[280px] truncate text-xs text-slate-400 mt-0.5">
                      {t.description || 'Standard room category'}
                    </span>
                  </td>
                  <td className="tnum font-semibold text-slate-800 text-sm">{t.count}</td>
                  <td className="tnum text-slate-600 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Lucide.Users size={13} className="text-slate-400" />
                      <span>{t.maxOccupancy} max</span>
                    </span>
                  </td>
                  <td className="tnum text-right font-bold text-slate-900 text-sm">
                    {formatCurrency(t.baseRate, currencyCode)}
                  </td>
                  <td className="max-w-[220px] truncate text-xs text-slate-500">
                    {t.amenities.length > 0 ? t.amenities.join(' · ') : '—'}
                  </td>
                  <td>
                    <Badge tone={t.active ? 'success' : 'neutral'}>
                      {t.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <TableActionBtn
                        icon={Lucide.Pencil}
                        title={`Edit ${t.name}`}
                        onClick={() => openEdit(t)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {types.length === 0 ? <p className="pms-helper py-8 text-center text-slate-400">No room types configured yet.</p> : null}
        </TableContainer>
      </Card>

      {/* Edit / Add Room Type Modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id.startsWith('RT-NEW') ? 'Add Room Type' : `Edit ${editing?.name}`}
        subtitle="Manage rates, occupant limits, and amenity specifications"
        wide
      >
        {editing ? (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 py-2">
            <Field label="Category name">
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className={inputClass()}
                placeholder="e.g. Deluxe Suite, Executive King"
                autoFocus
              />
            </Field>
            <Field label={`Standard base rate per night (${currencyCode})`}>
              <input
                type="number"
                min={0}
                value={editing.baseRate}
                onChange={(e) => setEditing({ ...editing, baseRate: Number(e.target.value) })}
                className={inputClass('tnum')}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <input
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className={inputClass()}
                  placeholder="Summary of room size, view, and furnishings"
                />
              </Field>
            </div>
            <Field label="Max adults">
              <input
                type="number"
                min={1}
                max={8}
                value={editing.maxAdults ?? editing.maxOccupancy}
                onChange={(e) => setEditing({ ...editing, maxAdults: Number(e.target.value) })}
                className={inputClass('tnum')}
              />
            </Field>
            <Field label="Max children">
              <input
                type="number"
                min={0}
                max={6}
                value={editing.maxChildren ?? 0}
                onChange={(e) => setEditing({ ...editing, maxChildren: Number(e.target.value) })}
                className={inputClass('tnum')}
              />
            </Field>
            <Field label="Active catalog status">
              <select
                value={editing.active ? 'active' : 'inactive'}
                onChange={(e) => setEditing({ ...editing, active: e.target.value === 'active' })}
                className={inputClass()}
              >
                <option value="active">Active (Available for booking)</option>
                <option value="inactive">Inactive (Hidden from sales)</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Amenities (comma-separated list)">
                <input
                  value={amenText}
                  onChange={(e) => setAmenText(e.target.value)}
                  placeholder="Free Wi-Fi, King Bed, Mini Bar, Balcony"
                  className={inputClass()}
                />
              </Field>
            </div>
            <div className="flex gap-2 sm:col-span-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                className="pms-btn-ghost flex-1 px-4 py-2.5"
                onClick={() => setEditing(null)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pms-btn-primary flex-[2] px-4 py-2.5 font-semibold"
                onClick={save}
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Save Room Type'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
