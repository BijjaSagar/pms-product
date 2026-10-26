import * as Lucide from 'lucide-react';
import type { AvailabilityRow } from '../../../lib/api/pms';
import { MEAL_PLANS, RATE_PLANS } from './data';
import type { BillingRoute, RoomCategoryOption, RoomOccupant, RoomRequirement } from './types';

interface Props {
  requirements: RoomRequirement[];
  roomTypes: RoomCategoryOption[];
  availableRoomsByType: Record<string, AvailabilityRow[]>;
  defaultRatePlan: string;
  defaultMealPlan: string;
  samePlanAllRooms: boolean;
  overridePrice: boolean;
  roomCharges: number;
  mealPlanCharges: number;
  roomTax: number;
  totalRooms: number;
  nights: number;
  onSamePlanChange: (same: boolean) => void;
  onOverridePriceChange: (enabled: boolean) => void;
  onAddRoom: () => void;
  onRemoveRoom: (id: string) => void;
  onUpdateRoom: (id: string, updates: Partial<RoomRequirement>) => void;
  onAddOccupant: (roomId: string) => void;
  onUpdateOccupant: (roomId: string, occupantId: string, updates: Partial<RoomOccupant>) => void;
  onRemoveOccupant: (roomId: string, occupantId: string) => void;
}

export function RoomRequirementsSection({
  requirements,
  roomTypes,
  availableRoomsByType,
  defaultRatePlan,
  defaultMealPlan,
  samePlanAllRooms,
  overridePrice,
  roomCharges,
  mealPlanCharges,
  roomTax,
  totalRooms,
  nights,
  onSamePlanChange,
  onOverridePriceChange,
  onAddRoom,
  onRemoveRoom,
  onUpdateRoom,
  onAddOccupant,
  onUpdateOccupant,
  onRemoveOccupant,
}: Props) {
  return (
    <section className="bg-surface rounded-3xl border border-border/80 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-divider pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white font-bold text-xs shadow-xs shadow-primary/20">2</span>
          <div>
            <h2 className="text-sm font-bold text-ink tracking-tight">Room Requirements & Allocation</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">Add different room types and assign each room to its guests.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onAddRoom} className="pms-btn-primary min-h-[34px] px-2.5 py-1 text-[11px]"><Lucide.Plus size={13} /> Add room</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-ink">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={samePlanAllRooms} onChange={(event) => onSamePlanChange(event.target.checked)} className="h-4 w-4 rounded border-ink-disabled text-[var(--color-primary)] accent-[var(--color-primary)]" />
          <span>Same rate plan & meal plan for all rooms</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={overridePrice} onChange={(event) => onOverridePriceChange(event.target.checked)} className="h-4 w-4 rounded border-ink-disabled text-[var(--color-primary)] accent-[var(--color-primary)]" />
          <span>Override room prices</span>
        </label>
      </div>
      {samePlanAllRooms && <p className="-mt-1 text-[10px] text-ink-secondary">Shared across rooms: {defaultRatePlan} · {defaultMealPlan}</p>}

      <div className="flex flex-col gap-3">
        {requirements.map((room) => {
          const roomType = roomTypes.find((item) => item.id === room.roomTypeId);
          const available = availableRoomsByType[room.roomTypeId] ?? [];
          const selectedElsewhere = new Set(requirements.filter((item) => item.id !== room.id && item.roomNo).map((item) => item.roomNo));
          const roomChoices = available.filter((option) => !selectedElsewhere.has(option.roomNumber));
          const tooManyAdults = Boolean(roomType && room.adults > roomType.maxAdults);
          const tooManyChildren = Boolean(roomType && room.children > roomType.maxChildren);

          return (
            <article key={room.id} className="rounded-2xl border border-border/90 bg-page/40 p-4 transition-all hover:border-ink-disabled">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs border border-primary/30">{room.roomIndex}</span>
                    <span className="text-xs font-extrabold text-ink">Room {room.roomIndex}</span>
                    {room.occupants.some((occupant) => occupant.role === 'Driver') && <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-semibold text-warning-text">Driver room</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-ink font-mono">₹{room.rate.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-ink-secondary">/ night</span></span>
                    {requirements.length > 1 && <button type="button" onClick={() => onRemoveRoom(room.id)} className="rounded-lg p-1 text-ink-muted hover:bg-danger-bg hover:text-danger-text" aria-label={`Remove room ${room.roomIndex}`}><Lucide.Trash2 size={14} /></button>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Room type
                    <select value={room.roomTypeId} onChange={(event) => {
                      const nextType = roomTypes.find((type) => type.id === event.target.value);
                      if (nextType) onUpdateRoom(room.id, { roomTypeId: nextType.id, category: nextType.name, rate: Number(nextType.baseRate), roomId: null, roomNo: '' });
                    }} className="w-full rounded-xl border border-border bg-surface px-2.5 py-2 text-xs font-semibold normal-case text-ink">
                      {roomTypes.map((type) => <option key={type.id} value={type.id}>{type.name} · ₹{type.baseRate.toLocaleString('en-IN')}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Room number
                    <select value={room.roomNo} onChange={(event) => {
                      const option = roomChoices.find((item) => item.roomNumber === event.target.value);
                      onUpdateRoom(room.id, { roomNo: event.target.value, roomId: option?.id ?? null });
                    }} className="w-full rounded-xl border border-border bg-surface px-2.5 py-2 text-xs font-semibold normal-case text-ink">
                      <option value="">Assign later</option>
                      {roomChoices.map((option) => <option key={option.id} value={option.roomNumber}>Room {option.roomNumber}{option.floor ? ` · Floor ${option.floor}` : ''}</option>)}
                    </select>
                  </label>
                  {!samePlanAllRooms && <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Rate plan
                    <select value={room.ratePlan} onChange={(event) => onUpdateRoom(room.id, { ratePlan: event.target.value })} className="w-full rounded-xl border border-border bg-surface px-2.5 py-2 text-xs font-semibold normal-case text-ink">
                      {RATE_PLANS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                    </select>
                  </label>}
                  {!samePlanAllRooms && <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Meal plan
                    <select value={room.mealPlan} onChange={(event) => onUpdateRoom(room.id, { mealPlan: event.target.value })} className="w-full rounded-xl border border-border bg-surface px-2.5 py-2 text-xs font-semibold normal-case text-ink">
                      {MEAL_PLANS.map((plan) => <option key={plan.code} value={plan.code}>{plan.label}</option>)}
                    </select>
                  </label>}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {([
                    { field: 'adults' as const, label: 'Adults', minimum: 1 },
                    { field: 'children' as const, label: 'Children (6–12)', minimum: 0 },
                    { field: 'infant' as const, label: 'Infants (<5)', minimum: 0 },
                  ]).map(({ field, label, minimum }) => (
                    <div key={field}><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-secondary">{label}</label><div className="flex items-center overflow-hidden rounded-xl border border-border bg-surface shadow-2xs"><button type="button" aria-label={`Decrease ${label}`} onClick={() => onUpdateRoom(room.id, { [field]: Math.max(minimum, room[field] - 1) })} className="px-2.5 py-1.5 text-ink-secondary hover:bg-muted-surface">−</button><span className="flex-1 text-center text-xs font-bold text-ink">{room[field]}</span><button type="button" aria-label={`Increase ${label}`} onClick={() => onUpdateRoom(room.id, { [field]: room[field] + 1 })} className="px-2.5 py-1.5 text-ink-secondary hover:bg-muted-surface">+</button></div></div>
                  ))}
                  <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Bill room to
                    <select value={room.billingRoute} onChange={(event) => onUpdateRoom(room.id, { billingRoute: event.target.value as BillingRoute })} className="w-full rounded-xl border border-border bg-surface px-2.5 py-2 text-xs font-semibold normal-case text-ink">
                      <option value="Default">Use booking default</option><option value="To Guest">Guest</option><option value="To Company">Company</option><option value="To Travel Agent">Travel agent</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-xl border border-border/80 bg-surface p-3">
                  <div className="mb-2 flex items-center justify-between gap-2"><div><p className="text-[11px] font-bold text-ink">Room occupants</p><p className="mt-0.5 text-[10px] text-ink-muted">Assign a named lead guest, family member or driver.</p></div><button type="button" onClick={() => onAddOccupant(room.id)} className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline"><Lucide.UserPlus size={13} className="mr-1 inline" />Add occupant</button></div>
                  <div className="flex flex-col gap-2">
                    {room.occupants.map((occupant) => <div key={occupant.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_170px_32px]">
                      <input value={occupant.name} onChange={(event) => onUpdateOccupant(room.id, occupant.id, { name: event.target.value })} aria-label={`${occupant.role} name for room ${room.roomIndex}`} className="w-full rounded-lg border border-border bg-page/60 px-3 py-2 text-xs text-ink" placeholder={occupant.role === 'Driver' ? 'Driver name' : 'Guest name'} />
                      <select value={occupant.role} onChange={(event) => onUpdateOccupant(room.id, occupant.id, { role: event.target.value as RoomOccupant['role'] })} aria-label={`Occupant role in room ${room.roomIndex}`} className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-ink"><option>Primary guest</option><option>Family member</option><option>Driver</option><option>Other</option></select>
                      <button type="button" onClick={() => onRemoveOccupant(room.id, occupant.id)} disabled={room.occupants.length <= 1} aria-label="Remove occupant" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-danger-bg hover:text-danger-text disabled:opacity-40"><Lucide.X size={14} /></button>
                    </div>)}
                  </div>
                </div>

                {(tooManyAdults || tooManyChildren) && <p className="text-[11px] font-semibold text-danger-text" role="alert">This room exceeds its configured guest capacity.</p>}
                {room.roomNo && !roomChoices.some((choice) => choice.roomNumber === room.roomNo) && <p className="text-[11px] font-semibold text-warning-text" role="status">Room {room.roomNo} is no longer available for these dates.</p>}

                {overridePrice && <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-2"><span className="text-[11px] font-semibold text-warning-text">Custom nightly rate</span><label className="flex items-center gap-1.5"><span className="text-xs font-bold text-ink-secondary">₹</span><input type="number" min={0} value={room.rate} onChange={(event) => onUpdateRoom(room.id, { rate: Math.max(0, Number(event.target.value) || 0) })} aria-label={`Custom nightly rate for room ${room.roomIndex}`} className="w-28 rounded-lg border border-warning-border bg-warning-bg/50 px-2.5 py-1 text-xs font-bold font-mono text-ink" /><span className="text-[10px] text-ink-secondary">/ night</span></label></div>}
              </div>
            </article>
          );
        })}
      </div>

      <div className="bg-page/80 rounded-2xl border border-border/70 p-4 text-xs">
        <div className="flex items-center justify-between text-ink-secondary"><span>Rooms & stay</span><span className="font-bold text-ink">{totalRooms} rooms · {nights} night(s)</span></div>
        <div className="mt-2 flex items-center justify-between text-ink-secondary"><span>Room charges</span><span className="font-bold font-mono text-ink">₹{roomCharges.toLocaleString('en-IN')}.00</span></div>
        <div className="mt-2 flex items-center justify-between text-ink-secondary"><span>Meal plan supplements</span><span className="font-bold font-mono text-ink">₹{mealPlanCharges.toLocaleString('en-IN')}.00</span></div>
        <div className="mt-2 flex items-center justify-between text-ink-secondary"><span>Tax on room charges</span><span className="font-bold font-mono text-ink">₹{roomTax.toLocaleString('en-IN')}.00</span></div>
      </div>
    </section>
  );
}
