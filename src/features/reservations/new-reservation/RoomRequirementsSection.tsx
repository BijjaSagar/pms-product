import * as Lucide from 'lucide-react';
import type { AvailabilityRow } from '../../../lib/api/pms';
import { RATE_PLANS } from './data';
import type { RoomCategoryOption, RoomRequirement } from './types';

interface Props {
  requirements: RoomRequirement[];
  roomTypes: RoomCategoryOption[];
  availableRoomsByType: Record<string, AvailabilityRow[]>;
  samePlanAllRooms: boolean;
  overridePrice: boolean;
  roomCharges: number;
  mealPlanCharges: number;
  roomTax: number;
  totalRooms: number;
  nights: number;
  onOverridePriceChange: (enabled: boolean) => void;
  onRemoveRoom: (id: string) => void;
  onUpdateRoom: (id: string, updates: Partial<RoomRequirement>) => void;
  onOverrideRoomTotalChange: (total: number) => void;
}

export function RoomRequirementsSection({
  requirements,
  roomTypes,
  availableRoomsByType,
  samePlanAllRooms,
  overridePrice,
  roomCharges,
  mealPlanCharges,
  roomTax,
  totalRooms,
  nights,
  onOverridePriceChange,
  onRemoveRoom,
  onUpdateRoom,
  onOverrideRoomTotalChange,
}: Props) {
  return (
    <section className="bg-surface rounded-3xl border border-border/80 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-divider pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white font-bold text-xs shadow-xs shadow-primary/20">2</span>
          <div>
            <h2 className="text-sm font-bold text-ink tracking-tight">Room Requirements & Allocation</h2>
          </div>
        </div>
        <div className="w-full sm:w-auto sm:flex-none">
          <button type="button" onClick={() => onOverridePriceChange(!overridePrice)} className={`flex min-h-[34px] w-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all sm:w-auto ${overridePrice ? 'bg-warning-bg text-warning-text border-warning-border' : 'bg-surface text-ink border-border hover:bg-page'}`}><Lucide.Tag size={13} /> Override Price</button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {requirements.map((room) => {
          const roomType = roomTypes.find((item) => item.id === room.roomTypeId);
          const available = availableRoomsByType[room.roomTypeId] ?? [];
          const selectedElsewhere = new Set(requirements.filter((item) => item.id !== room.id && item.roomNo).map((item) => item.roomNo));
          const roomChoices = available.filter((option) => !selectedElsewhere.has(option.roomNumber));

          return (
            <article key={room.id} className="rounded-2xl border border-border/90 bg-page/40 p-4 transition-all hover:border-ink-disabled">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs border border-primary/30">{room.roomIndex}</span>
                    <span className="text-xs font-extrabold text-ink">Room {room.roomIndex} | {room.category || roomType?.name || ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-ink font-mono">₹{room.rate.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-ink-secondary">/ night</span></span>
                    {requirements.length > 1 && <button type="button" onClick={() => onRemoveRoom(room.id)} className="rounded-lg p-1 text-ink-muted hover:bg-danger-bg hover:text-danger-text" aria-label={`Remove room ${room.roomIndex}`}><Lucide.Trash2 size={14} /></button>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {([
                    { field: 'adults' as const, label: 'Adults', minimum: 1, maximum: 6 },
                    { field: 'children' as const, label: 'Children (6–12)', minimum: 0, maximum: undefined },
                    { field: 'infant' as const, label: 'Infants (<5)', minimum: 0, maximum: undefined },
                  ]).map(({ field, label, minimum, maximum }) => (
                    <div key={field}>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-secondary">{label}</label>
                      <div className="flex items-center overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
                        <button type="button" aria-label={`Decrease ${label}`} onClick={() => onUpdateRoom(room.id, { [field]: Math.max(minimum, room[field] - 1) })} className="px-2.5 py-1.5 text-ink-secondary hover:bg-muted-surface">−</button>
                        <span className="flex-1 text-center text-xs font-bold text-ink">{room[field]}</span>
                        <button type="button" aria-label={`Increase ${label}`} disabled={maximum !== undefined && room[field] >= maximum} onClick={() => onUpdateRoom(room.id, { [field]: Math.min(maximum ?? Number.POSITIVE_INFINITY, room[field] + 1) })} className="px-2.5 py-1.5 text-ink-secondary hover:bg-muted-surface disabled:cursor-not-allowed disabled:opacity-40">+</button>
                      </div>
                    </div>
                  ))}
                  <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Room number
                    <select value={room.roomNo} onChange={(event) => {
                      const option = roomChoices.find((item) => item.roomNumber === event.target.value);
                      onUpdateRoom(room.id, { roomNo: event.target.value, roomId: option?.id ?? null });
                    }} className="w-full rounded-xl border border-border bg-surface px-2.5 py-2 text-xs font-semibold normal-case text-ink">
                      <option value="">Assign later</option>
                      {roomChoices.map((option) => <option key={option.id} value={option.roomNumber}>Room {option.roomNumber}{option.floor ? ` · Floor ${option.floor}` : ''}</option>)}
                    </select>
                  </label>
                </div>

                {!samePlanAllRooms && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">Rate Plan
                      <select value={room.ratePlan} onChange={(event) => onUpdateRoom(room.id, { ratePlan: event.target.value })} className="w-full rounded-lg border border-border bg-page/50 px-3 py-1.5 text-xs font-semibold normal-case text-ink focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all">
                        <option value="Best Available Rates">Best Available Rates</option>
                        {RATE_PLANS.filter((plan) => plan !== 'Best Available Rates').map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">Meal Type
                      <select value={room.mealPlan} onChange={(event) => onUpdateRoom(room.id, { mealPlan: event.target.value })} className="w-full rounded-lg border border-border bg-page/50 px-3 py-1.5 text-xs font-semibold normal-case text-ink focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all">
                        <option value="EP">EP</option>
                        <option value="CP">CP</option>
                      </select>
                    </label>
                  </div>
                )}

                {room.roomNo && !roomChoices.some((choice) => choice.roomNumber === room.roomNo) && <p className="text-[11px] font-semibold text-warning-text" role="status">Room {room.roomNo} is no longer available for these dates.</p>}
              </div>
            </article>
          );
        })}
      </div>

      <div className="bg-page/80 rounded-2xl border border-border/70 p-4 text-xs">
        <div className="flex items-center justify-between text-ink-secondary"><span>Total Rooms</span><span className="font-bold text-ink">{totalRooms} room(s) · {nights} night(s)</span></div>
        <div className="mt-2 flex items-center justify-between gap-3 text-ink-secondary">
          <label htmlFor="room-total" className="shrink-0">Room total</label>
          <label className={`flex min-w-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 ${overridePrice ? 'border-warning-border bg-warning-bg/50' : 'border-border bg-surface'}`}>
            <span className="font-bold text-ink-secondary">₹</span>
            <input
              id="room-total"
              type="number"
              min={0}
              step="0.01"
              value={roomCharges}
              readOnly={!overridePrice}
              onChange={(event) => onOverrideRoomTotalChange(Math.max(0, Number(event.target.value) || 0))}
              aria-label="Room total"
              className="w-32 min-w-0 bg-transparent text-right font-bold font-mono text-ink outline-none read-only:cursor-default"
            />
          </label>
        </div>
        <div className="mt-2 flex items-center justify-between text-ink-secondary"><span>Meal plan supplements</span><span className="font-bold font-mono text-ink">₹{mealPlanCharges.toLocaleString('en-IN')}.00</span></div>
        <div className="mt-2 flex items-center justify-between text-ink-secondary"><span>Tax on room charges</span><span className="font-bold font-mono text-ink">₹{roomTax.toLocaleString('en-IN')}.00</span></div>
      </div>
    </section>
  );
}
