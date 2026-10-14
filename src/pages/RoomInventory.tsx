import { useMemo, useState } from 'react';
import { Badge, Card, CardTitle } from '../components/ui';
import { roomTone } from '../components/status';
import { inputClass } from '../components/inputClass';
import { loadRoomInventory } from '../lib/api/loaders';
import { useApiResource } from '../lib/api/useApiResource';
import { inventoryApi } from '../lib/api/pms';
import { useAuth } from '../features/auth/AuthContext';
import { Field } from '../components/controls';
import { Modal } from '../components/overlays';
import { toast } from '../components/toastStore';
import { displayApiError } from '../lib/api/client';
import { formatCurrency } from '../lib/api/format';

export function RoomInventory() {
  const resource = useApiResource(() => loadRoomInventory());
  const rooms = useMemo(() => resource.data?.rooms ?? [], [resource.data?.rooms]);
  const roomTypes = resource.data?.roomTypes ?? [];
  const { can, me } = useAuth();
  const currencyCode = me?.user.propertyMemberships.find((membership) => membership.propertyId === me.activePropertyId)?.property.currencyCode ?? 'INR';
  const [q, setQ] = useState('');
  const [floor, setFloor] = useState('All');
  const [creating, setCreating] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [roomFloor, setRoomFloor] = useState('1');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rooms.filter(
      (r) => (floor === 'All' || r.floor === Number(floor)) && (!needle || r.number.includes(needle) || r.type.toLowerCase().includes(needle) || (r.guest ?? '').toLowerCase().includes(needle)),
    );
  }, [q, floor, rooms]);

  const updateRoom = async (roomBackendId: string | undefined, patch: Record<string, unknown>, message: string) => {
    if (!roomBackendId) return;
    try {
      await inventoryApi.updateRoom(roomBackendId, patch);
      resource.refresh();
      toast('Room updated', { detail: message, tone: 'success' });
    } catch (error) { toast('Could not update room', { detail: displayApiError(error), tone: 'danger' }); }
  };

  const createRoom = async () => {
    if (!roomNumber.trim() || !roomTypeId) return toast('Room number and room type are required', { tone: 'warning' });
    try {
      await inventoryApi.createRoom({ roomTypeId, roomNumber: roomNumber.trim(), floor: roomFloor });
      resource.refresh();
      setCreating(false); setRoomNumber('');
      toast('Room created', { detail: `Room ${roomNumber} added to inventory.`, tone: 'success' });
    } catch (error) { toast('Could not create room', { detail: displayApiError(error), tone: 'danger' }); }
  };

  return (
    <div className="flex flex-col gap-4">
    <Card>
      <CardTitle title="Room inventory" subtitle={resource.loading ? 'Loading property inventory…' : `${rows.length} rooms shown`} action={can('room.create') ? <button type="button" className="pms-btn-primary px-3.5 py-2.5" onClick={() => { setRoomTypeId(roomTypes[0]?.id ?? ''); setCreating(true); }}>+ Add room</button> : undefined} />
      {resource.error ? <p role="alert" className="pms-helper">Could not load rooms: {resource.error}</p> : null}
      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Number, type or guest…" aria-label="Search inventory" className={inputClass()} />
        <select value={floor} onChange={(e) => setFloor(e.target.value)} aria-label="Filter by floor" className={inputClass()}>
          {['All', '1', '2', '3', '4', '5'].map((f) => <option key={f} value={f}>{f === 'All' ? 'All floors' : `Floor ${f}`}</option>)}
        </select>
        <button type="button" className="pms-btn-ghost px-3 py-2.5" onClick={() => { setQ(''); setFloor('All'); }}>Clear</button>
      </div>
      <div className="overflow-x-auto">
        <table className="pms-table min-w-[760px]">
          <thead><tr><th>Room</th><th>Type</th><th>Floor</th><th>Status</th><th>Housekeeping</th><th>Guest / booking</th><th className="text-right">Rate</th>{can('room.update') ? <th><span className="sr-only">Actions</span></th> : null}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.number}>
                <td className="tnum font-mono font-semibold">{r.number}</td>
                <td>{r.type}</td>
                <td className="tnum">{r.floor}</td>
                <td><Badge tone={roomTone(r.status)}>{r.status}</Badge></td>
                <td style={{ color: 'var(--color-ink-secondary)' }}>{r.hk}</td>
                <td className="tnum" style={{ color: 'var(--color-ink-secondary)' }}>{r.guest ? `${r.guest} · ${r.reservationId}` : '—'}</td>
                <td className="tnum text-right font-semibold">{formatCurrency(r.rate, currencyCode)}</td>
                {can('room.update') ? <td><div className="flex gap-1.5">
                  <button type="button" className="pms-btn-ghost px-2.5 py-1.5" onClick={() => { const notes = window.prompt(`Notes for room ${r.number}:`); if (notes !== null) void updateRoom(r.backendId, { notes }, `Room ${r.number} notes saved.`); }}>Notes</button>
                  <button type="button" className="pms-btn-ghost px-2.5 py-1.5" onClick={() => void updateRoom(r.backendId, { isActive: false }, `Room ${r.number} retired. History is preserved.`)}>Retire</button>
                </div></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="pms-helper py-6 text-center">No rooms match.</p> : null}
      </div>
    </Card>
    <Modal open={creating} onClose={() => setCreating(false)} title="Add room" subtitle="Creates a room in the active property">
      <div className="flex flex-col gap-3">
        <Field label="Room number"><input value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} className={inputClass()} /></Field>
        <Field label="Room type"><select value={roomTypeId} onChange={(event) => setRoomTypeId(event.target.value)} className={inputClass()}>{roomTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></Field>
        <Field label="Floor"><input value={roomFloor} onChange={(event) => setRoomFloor(event.target.value)} className={inputClass()} /></Field>
        <button type="button" className="pms-btn-primary px-4 py-2.5" onClick={() => void createRoom()}>Create room</button>
      </div>
    </Modal>
    </div>
  );
}
