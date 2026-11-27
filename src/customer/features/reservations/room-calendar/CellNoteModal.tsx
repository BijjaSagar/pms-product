import { useState } from 'react';
import { Modal } from '../../../../shared/components/ui/overlays';
import { Button, FieldLabel, TextArea } from '../../../../shared/components/ui/primitives';

export type CellHoldKind = 'Hold' | 'Block';

const COPY: Record<CellHoldKind, { prompt: string; placeholder: string }> = {
  Hold: { prompt: 'Why is this room being held?', placeholder: 'e.g. Awaiting deposit from the guest' },
  Block: { prompt: 'Why is this room being blocked?', placeholder: 'e.g. Deep cleaning, VIP reserve' },
};

/** Small popup asking for the reason before a room-night is held or blocked. */
export function CellNoteModal({
  kind,
  room,
  date,
  onConfirm,
  onClose,
}: {
  kind: CellHoldKind;
  room: string;
  date: string;
  onConfirm: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const copy = COPY[kind];

  return (
    <Modal
      open
      onClose={onClose}
      title={`${kind} room`}
      subtitle={`Room ${room} · ${date}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!note.trim()} onClick={() => onConfirm(note.trim())}>
            {kind} room
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="cell-note">{copy.prompt}</FieldLabel>
        <TextArea
          id="cell-note"
          rows={4}
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={copy.placeholder}
        />
      </div>
    </Modal>
  );
}
