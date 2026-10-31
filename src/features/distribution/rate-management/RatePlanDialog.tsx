import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Modal } from '../../../components/overlays';
import { inputClass } from '../../../utils/styling';
import type { RatePlan } from './types';
import { Button, Checkbox, SelectField, TextArea, TextField } from '../../../components/primitives';

interface Props {
  open: boolean;
  plan: RatePlan | null;
  roomTypes: string[];
  channelIds: string[];
  onClose: () => void;
  onSave: (plan: RatePlan) => void;
}

const EMPTY_PLAN = {
  name: '',
  code: '',
  status: 'Active' as RatePlan['status'],
  description: '',
  mealPlan: 'Room only',
  cancellationPolicy: 'Free cancellation up to 24 hours',
  adjustmentPct: 0,
};

export function RatePlanDialog({ open, plan, roomTypes, channelIds, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(() => plan ? {
    name: plan.name,
    code: plan.code,
    status: plan.status,
    description: plan.description,
    mealPlan: plan.mealPlan,
    cancellationPolicy: plan.cancellationPolicy,
    adjustmentPct: plan.adjustmentPct,
  } : EMPTY_PLAN);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>(() => plan?.roomTypes ?? ['All room types']);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(() => plan?.channels ?? channelIds);
  const [error, setError] = useState('');

  const toggleSelection = (items: string[], value: string, update: (next: string[]) => void) => {
    update(items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  };

  const handleSave = () => {
    if (!draft.name.trim() || !draft.code.trim()) {
      setError('Add both a plan name and a short plan code.');
      return;
    }
    if (selectedRoomTypes.length === 0 || selectedChannels.length === 0) {
      setError('Select at least one room type and one channel.');
      return;
    }
    onSave({
      ...draft,
      id: plan?.id ?? `plan-${Date.now()}`,
      name: draft.name.trim(),
      code: draft.code.trim().toUpperCase(),
      roomTypes: selectedRoomTypes,
      channels: selectedChannels,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plan ? 'Edit rate plan' : 'Create rate plan'}
      subtitle="Set eligibility, channel coverage and the pricing adjustment."
      wide
      footer={(
        <>
          <Button variant="secondary" type="button" onClick={onClose} >Cancel</Button>
          <Button variant="primary" type="button" onClick={handleSave} >
            <Lucide.Check size={14} /> {plan ? 'Save plan' : 'Create plan'}
          </Button>
        </>
      )}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3.5">
          <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary">Plan name
            <input autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass('text-body')} placeholder="e.g. Weekend Escape" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary">Plan code
              <input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} className={inputClass('text-label uppercase')} placeholder="WKND10" maxLength={12} />
            </label>
            <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary">Rate adjustment
              <span className="relative"><TextField type="number" value={draft.adjustmentPct} onChange={(event) => setDraft({ ...draft, adjustmentPct: Number(event.target.value) })} className={`${inputClass('')}`} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">%</span></span>
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary">Description
            <TextArea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={`${inputClass(' resize-y')}`} placeholder="Describe this offer" />
          </label>
          <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary">Status
            <SelectField value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as RatePlan['status'] })} className={`${inputClass()}`}>
              <option>Active</option><option>Inactive</option><option>Scheduled</option>
            </SelectField>
          </label>
        </div>

        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-label font-semibold text-ink-secondary">Room types</legend>
            <div className="grid grid-cols-2 gap-2 rounded-control border p-3" style={{ borderColor: 'var(--color-border)' }}>
              {['All room types', ...roomTypes].map((roomType) => (
                <label key={roomType} className="flex items-center gap-2 text-label text-ink">
                  <Checkbox type="checkbox" checked={selectedRoomTypes.includes(roomType)} onChange={() => toggleSelection(selectedRoomTypes, roomType, (next) => setSelectedRoomTypes(roomType === 'All room types' && !selectedRoomTypes.includes(roomType) ? ['All room types'] : next.filter((item) => item !== 'All room types')))} />
                  {roomType}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-label font-semibold text-ink-secondary">Channels</legend>
            <div className="grid grid-cols-2 gap-2 rounded-control border p-3" style={{ borderColor: 'var(--color-border)' }}>
              {channelIds.map((channelId) => (
                <label key={channelId} className="flex items-center gap-2 text-label capitalize text-ink">
                  <Checkbox type="checkbox" checked={selectedChannels.includes(channelId)} onChange={() => toggleSelection(selectedChannels, channelId, setSelectedChannels)} />
                  {{ booking: 'Booking.com', expedia: 'Expedia', airbnb: 'Airbnb', agoda: 'Agoda', makemytrip: 'MakeMyTrip', goibibo: 'Goibibo' }[channelId] ?? channelId}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary">Meal plan
              <SelectField value={draft.mealPlan} onChange={(event) => setDraft({ ...draft, mealPlan: event.target.value })} className={`${inputClass()}`}>
                <option>Room only</option><option>Breakfast included</option><option>Half board</option><option>Full board</option>
              </SelectField>
            </label>
            <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary">Cancellation
              <SelectField value={draft.cancellationPolicy} onChange={(event) => setDraft({ ...draft, cancellationPolicy: event.target.value })} className={`${inputClass()}`}>
                <option>Free cancellation up to 24 hours</option><option>Free cancellation up to 48 hours</option><option>Non-refundable</option><option>Free cancellation up to 72 hours</option>
              </SelectField>
            </label>
          </div>
        </div>
      </div>
      {error && <p className="mt-4 text-label font-medium text-danger-text" role="alert">{error}</p>}
    </Modal>
  );
}
