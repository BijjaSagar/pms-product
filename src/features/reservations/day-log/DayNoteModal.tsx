import { useEffect, useState } from 'react';
import { Modal } from '../../../components/overlays';
import { Button, FieldLabel, TextArea } from '../../../components/primitives';
import { dayLogApi } from '../../../lib/api/pms';
import { toast } from '../../../utils/toast';
import { formatCalendarDate } from '../room-calendar/calendarData';

/** Write or edit the note for one calendar date. Saving calls `onChanged` so the header icon updates. */
export function DayNoteModal({
  date,
  onClose,
  onChanged,
}: {
  date: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [note, setNote] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const info = formatCalendarDate(date);
  const heading = `${info.weekday}, ${info.dayNum} ${info.month} ${info.year}`;

  useEffect(() => {
    let active = true;
    dayLogApi
      .note(date)
      .then((saved) => {
        if (!active) return;
        setNote(saved ?? '');
        setIsLoaded(true);
      })
      .catch(() => toast.error('Could not load the note', { detail: heading }));
    return () => {
      active = false;
    };
  }, [date, heading]);

  const saveNote = async () => {
    setIsSaving(true);
    try {
      await dayLogApi.saveNote(date, note);
      onChanged();
      toast.success(note.trim() ? 'Note saved' : 'Note cleared', { detail: heading });
    } catch {
      toast.error('Note not saved', { detail: heading });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Note · ${heading}`} subtitle="What the front desk should know about this day">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor="day-note">Note for the day</FieldLabel>
          <span
            className={`rounded-full px-2 py-0.5 text-micro font-bold ${note.trim() ? 'bg-warning-bg text-warning-text' : 'bg-muted-surface text-ink-secondary'}`}
          >
            {note.trim() ? 'Has note' : 'No note'}
          </span>
        </div>
        <TextArea
          id="day-note"
          rows={6}
          value={note}
          disabled={!isLoaded}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Write what the front desk should know about this day"
        />
        <div className="flex justify-end">
          <Button variant="primary" onClick={saveNote} disabled={!isLoaded || isSaving}>
            Save note
          </Button>
        </div>
      </div>
    </Modal>
  );
}
