import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../../../components/ui/overlays';
import { Button, TextField } from '../../../components/ui/primitives';
import type { RatePlan } from './types';

interface Props {
  plan: RatePlan;
  onClose: () => void;
  onSave: (plan: RatePlan) => void;
}

/** Quick edit of a plan's name and colour from the rate editor. */
export function PlanDetailsDialog({ plan, onClose, onSave }: Props) {
  const [name, setName] = useState(plan.name);
  const [color, setColor] = useState(plan.color);
  const [error, setError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Enter a plan name.');
      return;
    }
    onSave({ ...plan, name: name.trim(), color });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={plan.name}
      footer={(
        <>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="plan-details-form">Submit</Button>
        </>
      )}
    >
      <form id="plan-details-form" onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-body text-ink-secondary">Please enter new rate plan details here</p>
        <label className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-3 text-body font-semibold text-ink">
          Name
          <TextField value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-3 text-body font-semibold text-ink">
          <label htmlFor="plan-details-color">Color</label>
          <div className="flex items-center gap-4">
            <input id="plan-details-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-8 w-10 cursor-pointer rounded border border-border bg-surface p-0.5" />
            <span aria-hidden="true" className="h-6 w-6 rounded shadow-xs" style={{ background: color }} />
          </div>
        </div>
        {error && <p className="text-label font-medium text-danger-text" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
