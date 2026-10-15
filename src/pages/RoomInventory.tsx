import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Badge, Card, CardTitle } from '../components/ui';
import { roomTone } from '../components/status';
import { inputClass } from '../components/inputClass';
import { loadRoomInventory } from '../lib/api/loaders';
import { useApiResource } from '../lib/api/useApiResource';
import { inventoryApi } from '../lib/api/pms';
import { useAuth } from '../features/auth/AuthContext';
import { Field } from '../components/controls';
import { ConfirmDialog, Modal, PromptDialog } from '../components/overlays';
import { toast } from '../components/toastStore';
import { displayApiError } from '../lib/api/client';
import { formatCurrency } from '../lib/api/format';
import type { Room } from '../data/mock';

export function RoomInventory() {
  const resource = useApiResource(() => loadRoomInventory());
  const rooms = useMemo(() => resource.data?.rooms ?? [], [resource.data?.rooms]);
  const roomTypes = resource.data?.roomTypes ?? [];
  const { can, me } = useAuth();
  const currencyCode =
    me?.user.propertyMemberships.find((membership) => membership.propertyId === me.activePropertyId)?.property
      .currencyCode ?? 'INR';
  const [q, setQ] = useState('');
  const [floor, setFloor] = useState('All');
  const [creating, setCreating] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [roomFloor, setRoomFloor] = useState('1');

  // Modals for notes and retire actions
  const [notesModal, setNotesModal] = useState<{ room: Room; notes: string } | null>(null);
  const [retireConfirm, setRetireConfirm] = useState<Room | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rooms.filter(
      (r) =>
        (floor === 'All' || r.floor === Number(floor)) &&
        (!needle ||
          r.number.includes(needle) ||
          r.type.toLowerCase().includes(needle) ||
          (r.guest ?? '').toLowerCase().includes(needle)),
    );
  }, [q, floor, rooms]);

  const floorOptions = useMemo(
    () => ['All', ...Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b).map(String)],
    [rooms],
  );

  const updateRoom = async (roomBackendId: string | undefined, patch: Record<string, unknown>, message: string) => {
    if (!roomBackendId) return;
    try {
      await inventoryApi.updateRoom(roomBackendId, patch);
      resource.refresh();
      toast('Room updated', { detail: message, tone: 'success' });
    } catch (error) {
      toast('Could not update room', { detail: displayApiError(error), tone: 'danger' });
    }
  };

  const createRoom = async () => {
    if (!roomNumber.trim() || !roomTypeId) return toast('Room number and room type are required', { tone: 'warning' });
    try {
      await inventoryApi.createRoom({
        roomNumber: roomNumber.trim(),
        roomTypeId,
        floor: Number(roomFloor) || 1,
      });
      setCreating(false);
      setRoomNumber('');
      setRoomFloor('1');
      resource.refresh();
      toast('Room created', { detail: `Room ${roomNumber.trim()} added to inventory.`, tone: 'success' });
    } catch (error) {
      toast('Could not create room', { detail: displayApiError(error), tone: 'danger' });
    }
  };

  const handleNotesSubmit = async (notes: string) => {
    if (!notesModal?.room.backendId) return;
    await updateRoom(notesModal.room.backendId, { notes }, `Room ${notesModal.room.number} notes updated.`);
    setNotesModal(null);
  };

  const handleRetireConfirm = async () => {
    if (!retireConfirm?.backendId) return;
    await updateRoom(retireConfirm.backendId, { isActive: false }, `Room ${retireConfirm.number} retired.`);
    setRetireConfirm(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.Boxes className="text-primary" size={26} />
            <span>Room Inventory & Units</span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Configure physical room units, floor assignments, keycards, and operational states
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border"
            title="Refresh rooms"
          >
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          {can('room.create') ? (
            <button
              type="button"
              className="pms-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-bold rounded-xl"
              onClick={() => {
                setRoomTypeId(roomTypes[0]?.id ?? '');
                setCreating(true);
              }}
            >
              <Lucide.Plus size={16} strokeWidth={2.4} />
              <span>Add Room</span>
            </button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardTitle
          title="Physical Room Units"
          subtitle={resource.loading ? 'Loading rooms…' : `${rows.length} of ${rooms.length} physical room units`}
        />
        {resource.error ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <Lucide.AlertCircle size={18} />
            <span>Could not load room inventory: {resource.error}</span>
          </div>
        ) : null}

        <div className="mb-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
          <div className="relative">
            <Lucide.Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search room number, type or guest…"
              aria-label="Search rooms"
              className={`${inputClass()} pl-9 w-full`}
            />
          </div>
          <select
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            aria-label="Filter by floor"
            className={inputClass()}
          >
            {floorOptions.map((f) => (
              <option key={f} value={f}>
                {f === 'All' ? 'All floors' : f === '0' ? 'Ground / Unassigned' : `Floor ${f}`}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="pms-btn-ghost px-3 py-2 text-xs font-semibold"
            onClick={() => { setQ(''); setFloor('All'); }}
          >
            Reset
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="pms-table min-w-[760px]">
            <thead>
              <tr>
                <th>Room</th>
                <th>Type</th>
                <th>Floor</th>
                <th>Status</th>
                <th>Housekeeping</th>
                <th>Occupant</th>
                <th className="text-right">Base rate</th>
                {can('room.update') ? <th className="text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.number} className="transition-colors hover:bg-black/[0.01]">
                  <td className="tnum font-mono font-semibold text-primary">Room {r.number}</td>
                  <td className="font-medium text-ink">{r.type}</td>
                  <td className="tnum text-ink-secondary">{r.floor}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={roomTone(r.status)}>{r.status}</Badge>
                      {r.active === false ? <Badge tone="neutral">Retired</Badge> : null}
                    </div>
                  </td>
                  <td className="text-ink-secondary">{r.hk}</td>
                  <td className="tnum text-ink-secondary">{r.guest ? `${r.guest} · ${r.reservationId}` : '—'}</td>
                  <td className="tnum text-right font-semibold">{formatCurrency(r.rate, currencyCode)}</td>
                  {can('room.update') ? (
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="pms-btn-ghost px-2.5 py-1 text-xs"
                          onClick={() => setNotesModal({ room: r, notes: r.notes || '' })}
                        >
                          Notes
                        </button>
                        {r.active === false ? (
                          <button
                            type="button"
                            className="pms-btn-ghost px-2.5 py-1 text-xs text-primary"
                            onClick={() =>
                              void updateRoom(r.backendId, { isActive: true }, `Room ${r.number} restored.`)
                            }
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="pms-btn-ghost px-2.5 py-1 text-xs text-danger"
                            onClick={() => setRetireConfirm(r)}
                          >
                            Retire
                          </button>
                        )}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="pms-helper py-8 text-center">No rooms match these filters.</p> : null}
        </div>
      </Card>

      {/* Add Room Modal */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add New Room"
        subtitle="Add a physical room unit to active property inventory"
      >
        <div className="flex flex-col gap-3.5 py-2">
          <Field label="Room number">
            <input
              value={roomNumber}
              onChange={(event) => setRoomNumber(event.target.value)}
              placeholder="e.g. 101, 204"
              className={inputClass()}
              autoFocus
            />
          </Field>
          <Field label="Room type">
            <select
              value={roomTypeId}
              onChange={(event) => setRoomTypeId(event.target.value)}
              className={inputClass()}
            >
              {roomTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Floor">
            <input
              value={roomFloor}
              onChange={(event) => setRoomFloor(event.target.value)}
              placeholder="e.g. 1, 2"
              className={inputClass()}
            />
          </Field>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="pms-btn-ghost flex-1 px-4 py-2.5"
              onClick={() => setCreating(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pms-btn-primary flex-[2] px-4 py-2.5 font-semibold"
              onClick={() => void createRoom()}
            >
              Create room
            </button>
          </div>
        </div>
      </Modal>

      {/* Room Notes PromptDialog */}
      <PromptDialog
        open={notesModal !== null}
        onClose={() => setNotesModal(null)}
        onSubmit={handleNotesSubmit}
        title={`Room ${notesModal?.room.number} Notes`}
        subtitle="Operational and internal staff notes for this room"
        label="Internal notes"
        defaultValue={notesModal?.notes ?? ''}
        placeholder="e.g. Quiet room requested, ocean view preferred"
        confirmLabel="Save Notes"
      />

      {/* Retire ConfirmDialog */}
      <ConfirmDialog
        open={retireConfirm !== null}
        onClose={() => setRetireConfirm(null)}
        onConfirm={handleRetireConfirm}
        title={`Retire Room ${retireConfirm?.number}?`}
        body={`Room ${retireConfirm?.number} will be hidden from the active room board. Historical reservations and records will remain preserved.`}
        confirmLabel="Yes, retire room"
        danger
      />
    </div>
  );
}
