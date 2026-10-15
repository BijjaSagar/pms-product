import { useState } from 'react';
import { formatCurrency } from '../lib/api/format';
import type { RoomType } from '../data/mock';
import { Badge, Card, CardTitle } from '../components/ui';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Modal } from '../components/overlays';
import { toast } from '../components/toastStore';
import { inventoryApi } from '../lib/api/pms';
import { loadRoomInventory } from '../lib/api/loaders';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { useAuth } from '../features/auth/AuthContext';

const EMPTY: RoomType = { id: '', name: '', description: '', count: 0, maxOccupancy: 2, maxAdults: 2, maxChildren: 0, beds: '', baseRate: 0, amenities: [], active: true };

export function RoomTypes() {
  const { me } = useAuth();
  const currencyCode = me?.user.propertyMemberships.find((membership) => membership.propertyId === me.activePropertyId)?.property.currencyCode ?? 'INR';
  const resource = useApiResource(() => loadRoomInventory());
  const types: RoomType[] = resource.data?.roomTypes ?? [];
  const [editing, setEditing] = useState<RoomType | null>(null);
  const [amenText, setAmenText] = useState('');


  const openAdd = () => { setEditing({ ...EMPTY, id: `RT-NEW-${types.length + 1}` }); setAmenText(''); };
  const openEdit = (t: RoomType) => { setEditing({ ...t, amenities: [...t.amenities] }); setAmenText(t.amenities.join(', ')); };

  const save = async () => {
    if (!editing) return;
    if (editing.name.trim().length < 2) return toast('Name required', { detail: 'Give the room type a name.', tone: 'warning' });
    if (editing.baseRate < 0) return toast('Check numbers', { detail: 'Base rate must be zero or above.', tone: 'warning' });
    const amenities = amenText.split(',').map((a) => a.trim()).filter(Boolean);
    try {
      if (editing.id.startsWith('RT-NEW')) {
        const code = editing.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 40);
        await inventoryApi.createRoomType({ code, name: editing.name.trim(), description: editing.description, maxAdults: Math.max(1, editing.maxAdults ?? editing.maxOccupancy), maxChildren: Math.max(0, editing.maxChildren ?? 0), baseRate: editing.baseRate, amenities });
      } else {
        await inventoryApi.updateRoomType(editing.id, { name: editing.name.trim(), description: editing.description, maxAdults: Math.max(1, editing.maxAdults ?? editing.maxOccupancy), maxChildren: Math.max(0, editing.maxChildren ?? 0), baseRate: editing.baseRate, isActive: editing.active, amenities });
      }
      resource.refresh();
      toast('Room type saved', { detail: 'Room type configuration updated.', tone: 'success' });
      setEditing(null);
    } catch (error) { toast('Could not save room type', { detail: displayApiError(error), tone: 'danger' }); }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle title="Room types" subtitle={resource.loading ? 'Loading room types…' : `${types.filter((t) => t.active).length} active · ${types.reduce((s, t) => s + t.count, 0)} rooms`} action={<button type="button" onClick={openAdd} className="pms-btn-primary px-3.5 py-2.5">+ Add room type</button>} />
        {resource.error ? <p role="alert" className="pms-helper">Could not load room types: {resource.error}</p> : null}
        <div className="overflow-x-auto">
          <table className="pms-table min-w-[820px]">
            <thead><tr><th>Type</th><th>Rooms</th><th>Sleeps</th><th className="text-right">Base rate</th><th>Amenities</th><th>Status</th><th><span className="sr-only">Edit</span></th></tr></thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="block font-semibold">{t.name}</span>
                    <span className="block max-w-[280px] truncate text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{t.description}</span>
                  </td>
                  <td className="tnum">{t.count}</td>
                  <td className="tnum">{t.maxOccupancy}</td>
                  <td className="tnum text-right font-semibold">{formatCurrency(t.baseRate, currencyCode)}</td>
                  <td className="max-w-[220px] truncate" style={{ color: 'var(--color-ink-secondary)' }}>{t.amenities.join(' · ')}</td>
                  <td><Badge tone={t.active ? 'success' : 'neutral'}>{t.active ? 'Active' : 'Inactive'}</Badge></td>
                  <td><button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => openEdit(t)} aria-label={`Edit ${t.name}`}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing?.id.startsWith('RT-NEW') ? 'Add room type' : `Edit ${editing?.name}`} subtitle="Room count is derived from the rooms assigned to this type" wide>
        {editing ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name"><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputClass()} /></Field>
            <div className="sm:col-span-2"><Field label="Description"><input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className={inputClass()} /></Field></div>
            <Field label="Max adults"><input type="number" min={1} max={8} value={editing.maxAdults ?? editing.maxOccupancy} onChange={(e) => setEditing({ ...editing, maxAdults: Number(e.target.value) })} className={inputClass('tnum')} /></Field>
            <Field label="Max children"><input type="number" min={0} max={6} value={editing.maxChildren ?? 0} onChange={(e) => setEditing({ ...editing, maxChildren: Number(e.target.value) })} className={inputClass('tnum')} /></Field>
            <Field label={`Base rate (${currencyCode})`}><input type="number" min={0} value={editing.baseRate} onChange={(e) => setEditing({ ...editing, baseRate: Number(e.target.value) })} className={inputClass('tnum')} /></Field>
            <Field label="Status">
              <select value={editing.active ? 'active' : 'inactive'} onChange={(e) => setEditing({ ...editing, active: e.target.value === 'active' })} className={inputClass()}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <div className="sm:col-span-2"><Field label="Amenities (comma separated)"><input value={amenText} onChange={(e) => setAmenText(e.target.value)} placeholder="Free Wi-Fi, Smart TV…" className={inputClass()} /></Field></div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => setEditing(null)}>Cancel</button>
              <button type="button" className="pms-btn-primary flex-[2] px-4 py-2.5" onClick={save}>Save room type</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
