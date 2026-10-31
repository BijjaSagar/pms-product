import { useState } from 'react';
import { Modal } from '../../../components/overlays';
import { inputClass } from '../../../utils/styling';
import type { Season } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (season: Season) => void;
}

export function SeasonDialog({ open, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [endDate, setEndDate] = useState('2026-11-15');
  const [adjustment, setAdjustment] = useState('20');
  const [error, setError] = useState('');

  const handleSave = () => {
    const pct = Number(adjustment);
    if (!name.trim()) return setError('Enter a season name.');
    if (!startDate || !endDate || startDate > endDate) return setError('Choose a valid date range.');
    if (!Number.isFinite(pct) || pct < -100 || pct > 500) return setError('Adjustment must be between -100% and 500%.');
    onSave({ id: `season-${Date.now()}`, name: name.trim(), startDate, endDate, adjustmentPct: pct, status: 'Scheduled' });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add seasonal pricing" subtitle="Create a rate adjustment for a date range." footer={(
      <><button type="button" onClick={onClose} className="pms-btn-ghost px-4 py-2 text-label">Cancel</button><button type="button" onClick={handleSave} className="pms-btn-primary px-4 py-2 text-label">Add season</button></>
    )}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary sm:col-span-2">Season name
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} className={`${inputClass()} text-label`} placeholder="e.g. Winter holidays" />
        </label>
        <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary">Start date
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={`${inputClass()} text-label`} />
        </label>
        <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary">End date
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={`${inputClass()} text-label`} />
        </label>
        <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary sm:col-span-2">Rate adjustment (%)
          <input type="number" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} min={-100} max={500} className={`${inputClass()} text-label`} />
        </label>
      </div>
      {error && <p className="mt-3 text-label font-medium text-danger-text" role="alert">{error}</p>}
    </Modal>
  );
}
