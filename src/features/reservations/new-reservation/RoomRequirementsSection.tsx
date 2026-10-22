import * as Lucide from 'lucide-react';
import type { AvailabilityRow } from '../../../lib/api/pms';
import { MEAL_PLANS, RATE_PLANS } from './data';
import type { BillingRoute, RoomCategoryOption, RoomOccupant, RoomRequirement } from './types';

interface Props {
  requirements: RoomRequirement[];
  roomTypes: RoomCategoryOption[];
  availableRoomsByType: Record<string, AvailabilityRow[]>;
  defaultRoomTypeId: string;
  defaultRatePlan: string;
  defaultMealPlan: string;
  samePlanAllRooms: boolean;
  overridePrice: boolean;
  roomCharges: number;
  mealPlanCharges: number;
  roomTax: number;
  totalRooms: number;
  nights: number;
  onDefaultRoomTypeChange: (roomTypeId: string) => void;
  onSamePlanChange: (same: boolean) => void;
  onOverridePriceChange: (enabled: boolean) => void;
  onAddRoom: () => void;
  onAddDriverRoom: () => void;
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
  defaultRoomTypeId,
  defaultRatePlan,
  defaultMealPlan,
  samePlanAllRooms,
  overridePrice,
  roomCharges,
  mealPlanCharges,
  roomTax,
  totalRooms,
  nights,
  onDefaultRoomTypeChange,
  onSamePlanChange,
  onOverridePriceChange,
  onAddRoom,
  onAddDriverRoom,
  onRemoveRoom,
  onUpdateRoom,
  onAddOccupant,
  onUpdateOccupant,
  onRemoveOccupant,
}: Props) {
  return (
    <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white font-bold text-xs shadow-xs">2</span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Room Requirements & Allocation</h2>
            <p className="text-[11px] text-slate-400">Add different room types and assign each room to its guests.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
            Default for new room
            <select value={defaultRoomTypeId} onChange={(event) => onDefaultRoomTypeChange(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800">
              {roomTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
          </label>
          <button type="button" onClick={onAddDriverRoom} className="pms-btn-ghost min-h-[34px] px-2.5 py-1 text-[11px]"><Lucide.CarFront size={13} /> Driver room</button>
          <button type="button" onClick={onAddRoom} className="pms-btn-primary min-h-[34px] px-2.5 py-1 text-[11px]"><Lucide.Plus size={13} /> Add room</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-700">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={samePlanAllRooms} onChange={(event) => onSamePlanChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] accent-[var(--color-primary)]" />
          <span>Same rate plan & meal plan for all rooms</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={overridePrice} onChange={(event) => onOverridePriceChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] accent-[var(--color-primary)]" />
          <span>Override room prices</span>
        </label>
      </div>
      {samePlanAllRooms && <p className="-mt-1 text-[10px] text-slate-500">Shared across rooms: {defaultRatePlan} · {defaultMealPlan}</p>}

      <div className="flex flex-col gap-3">
        {requirements.map((room) => {
          const roomType = roomTypes.find((item) => item.id === room.roomTypeId);
          const available = availableRoomsByType[room.roomTypeId] ?? [];
          const selectedElsewhere = new Set(requirements.filter((item) => item.id !== room.id && item.roomNo).map((item) => item.roomNo));
          const roomChoices = available.filter((option) => !selectedElsewhere.has(option.roomNumber));
          const tooManyAdults = Boolean(roomType && room.adults > roomType.maxAdults);
          const tooManyChildren = Boolean(roomType && room.children > roomType.maxChildren);

          return (
            <article key={room.id} className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-4 transition-all hover:border-slate-300">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs border border-indigo-100">{room.roomIndex}</span>
                    <span className="text-xs font-extrabold text-slate-900">Room {room.roomIndex}</span>
                    {room.occupants.some((occupant) => occupant.role === 'Driver') && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Driver room</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900 font-mono">₹{room.rate.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-500">/ night</span></span>
                    {requirements.length > 1 && <button type="button" onClick={() => onRemoveRoom(room.id)} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove room ${room.roomIndex}`}><Lucide.Trash2 size={14} /></button>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Room type
                    <select value={room.roomTypeId} onChange={(event) => {
                      const nextType = roomTypes.find((type) => type.id === event.target.value);
                      if (nextType) onUpdateRoom(room.id, { roomTypeId: nextType.id, category: nextType.name, rate: Number(nextType.baseRate), roomId: null, roomNo: '' });
                    }} className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case text-slate-900">
                      {roomTypes.map((type) => <option key={type.id} value={type.id}>{type.name} · ₹{type.baseRate.toLocaleString('en-IN')}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Room number
                    <select value={room.roomNo} onChange={(event) => {
                      const option = roomChoices.find((item) => item.roomNumber === event.target.value);
                      onUpdateRoom(room.id, { roomNo: event.target.value, roomId: option?.id ?? null });
                    }} className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case text-slate-900">
                      <option value="">Assign later</option>
                      {roomChoices.map((option) => <option key={option.id} value={option.roomNumber}>Room {option.roomNumber}{option.floor ? ` · Floor ${option.floor}` : ''}</option>)}
                    </select>
                  </label>
                  {!samePlanAllRooms && <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Rate plan
                    <select value={room.ratePlan} onChange={(event) => onUpdateRoom(room.id, { ratePlan: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case text-slate-900">
                      {RATE_PLANS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                    </select>
                  </label>}
                  {!samePlanAllRooms && <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Meal plan
                    <select value={room.mealPlan} onChange={(event) => onUpdateRoom(room.id, { mealPlan: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case text-slate-900">
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
                    <div key={field}><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</label><div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"><button type="button" aria-label={`Decrease ${label}`} onClick={() => onUpdateRoom(room.id, { [field]: Math.max(minimum, room[field] - 1) })} className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-100">−</button><span className="flex-1 text-center text-xs font-bold text-slate-900">{room[field]}</span><button type="button" aria-label={`Increase ${label}`} onClick={() => onUpdateRoom(room.id, { [field]: room[field] + 1 })} className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-100">+</button></div></div>
                  ))}
                  <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Bill room to
                    <select value={room.billingRoute} onChange={(event) => onUpdateRoom(room.id, { billingRoute: event.target.value as BillingRoute })} className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case text-slate-900">
                      <option value="Default">Use booking default</option><option value="To Guest">Guest</option><option value="To Company">Company</option><option value="To Travel Agent">Travel agent</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2"><div><p className="text-[11px] font-bold text-slate-700">Room occupants</p><p className="mt-0.5 text-[10px] text-slate-400">Assign a named lead guest, family member or driver.</p></div><button type="button" onClick={() => onAddOccupant(room.id)} className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline"><Lucide.UserPlus size={13} className="mr-1 inline" />Add occupant</button></div>
                  <div className="flex flex-col gap-2">
                    {room.occupants.map((occupant) => <div key={occupant.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_170px_32px]">
                      <input value={occupant.name} onChange={(event) => onUpdateOccupant(room.id, occupant.id, { name: event.target.value })} aria-label={`${occupant.role} name for room ${room.roomIndex}`} className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900" placeholder={occupant.role === 'Driver' ? 'Driver name' : 'Guest name'} />
                      <select value={occupant.role} onChange={(event) => onUpdateOccupant(room.id, occupant.id, { role: event.target.value as RoomOccupant['role'] })} aria-label={`Occupant role in room ${room.roomIndex}`} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900"><option>Primary guest</option><option>Family member</option><option>Driver</option><option>Other</option></select>
                      <button type="button" onClick={() => onRemoveOccupant(room.id, occupant.id)} disabled={room.occupants.length <= 1} aria-label="Remove occupant" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"><Lucide.X size={14} /></button>
                    </div>)}
                  </div>
                </div>

                {(tooManyAdults || tooManyChildren) && <p className="text-[11px] font-semibold text-rose-700" role="alert">This room exceeds its configured guest capacity.</p>}
                {room.roomNo && !roomChoices.some((choice) => choice.roomNumber === room.roomNo) && <p className="text-[11px] font-semibold text-amber-700" role="status">Room {room.roomNo} is no longer available for these dates.</p>}

                {overridePrice && <div className="flex items-center justify-between gap-3 border-t border-slate-200/70 pt-2"><span className="text-[11px] font-semibold text-amber-800">Custom nightly rate</span><label className="flex items-center gap-1.5"><span className="text-xs font-bold text-slate-500">₹</span><input type="number" min={0} value={room.rate} onChange={(event) => onUpdateRoom(room.id, { rate: Math.max(0, Number(event.target.value) || 0) })} aria-label={`Custom nightly rate for room ${room.roomIndex}`} className="w-28 rounded-lg border border-amber-300 bg-amber-50/50 px-2.5 py-1 text-xs font-bold font-mono text-slate-900" /><span className="text-[10px] text-slate-500">/ night</span></label></div>}
              </div>
            </article>
          );
        })}
      </div>

      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/70 p-4 text-xs">
        <div className="flex items-center justify-between text-slate-600"><span>Rooms & stay</span><span className="font-bold text-slate-900">{totalRooms} rooms · {nights} night(s)</span></div>
        <div className="mt-2 flex items-center justify-between text-slate-600"><span>Room charges</span><span className="font-bold font-mono text-slate-900">₹{roomCharges.toLocaleString('en-IN')}.00</span></div>
        <div className="mt-2 flex items-center justify-between text-slate-600"><span>Meal plan supplements</span><span className="font-bold font-mono text-slate-900">₹{mealPlanCharges.toLocaleString('en-IN')}.00</span></div>
        <div className="mt-2 flex items-center justify-between text-slate-600"><span>Tax on room charges</span><span className="font-bold font-mono text-slate-900">₹{roomTax.toLocaleString('en-IN')}.00</span></div>
      </div>
    </section>
  );
}
