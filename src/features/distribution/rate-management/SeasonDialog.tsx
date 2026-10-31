import { useState } from 'react';
import { Modal } from '../../../components/overlays';
import { inputClass } from '../../../utils/styling';
import type { Season } from './types';
import { Button, TextField } from '../../../components/primitives';

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
      <><Button variant="secondary" type="button" onClick={onClose} >Cancel</Button><Button variant="primary" type="button" onClick={handleSave} >Add season</Button></>
    )}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary sm:col-span-2">Season name
          <TextField autoFocus value={name} onChange={(event) => setName(event.target.value)} className={`${inputClass()}`} placeholder="e.g. Winter holidays" />
        </label>
        <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary">Start date
          <TextField type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={`${inputClass()}`} />
        </label>
        <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary">End date
          <TextField type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={`${inputClass()}`} />
        </label>
        <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary sm:col-span-2">Rate adjustment (%)
          <TextField type="number" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} min={-100} max={500} className={`${inputClass()}`} />
        </label>
      </div>
      {error && <p className="mt-3 text-label font-medium text-danger-text" role="alert">{error}</p>}
    </Modal>
  );
}
