import { useEffect, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Modal } from '../../../components/overlays';
import { dayLogApi, type DayEnquiryRow } from '../../../lib/api/pms';
import { toast } from '../../../utils/toast';
import { formatCalendarDate } from '../room-calendar/calendarData';

/** The day's enquiries as a read-only list, with a remove action per row. */
export function DayEnquiriesModal({
  date,
  onClose,
  onChanged,
}: {
  date: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [enquiries, setEnquiries] = useState<DayEnquiryRow[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const info = formatCalendarDate(date);
  const heading = `${info.weekday}, ${info.dayNum} ${info.month} ${info.year}`;

  useEffect(() => {
    let active = true;
    dayLogApi
      .enquiries(date)
      .then((rows) => {
        if (!active) return;
        setEnquiries(rows);
        setIsLoaded(true);
      })
      .catch(() => toast.error('Could not load enquiries', { detail: heading }));
    return () => {
      active = false;
    };
  }, [date, heading]);

  const removeEnquiry = async (row: DayEnquiryRow) => {
    try {
      await dayLogApi.removeEnquiry(row.id);
      setEnquiries((prev) => prev.filter((e) => e.id !== row.id));
      onChanged();
      toast.success('Enquiry removed', { detail: row.guestName });
    } catch {
      toast.error('Enquiry not removed', { detail: row.guestName });
    }
  };

  return (
    <Modal open onClose={onClose} title={`Enquiries · ${heading}`} subtitle="Guest enquiries received for this date" wide>
      <div className="flex flex-col gap-3">
        <span
          className={`self-start rounded-full px-2 py-0.5 text-micro font-bold ${enquiries.length > 0 ? 'bg-info-bg text-info-text' : 'bg-muted-surface text-ink-secondary'}`}
        >
          {enquiries.length > 0 ? `${enquiries.length} enquir${enquiries.length === 1 ? 'y' : 'ies'}` : 'No enquiries'}
        </span>

        {enquiries.length > 0 ? (
          <ul className="flex max-h-[50vh] flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {enquiries.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-label font-semibold text-ink">
                    {row.guestName}
                    {row.phone ? <span className="ml-2 font-normal text-ink-secondary">{row.phone}</span> : null}
                  </p>
                  <p className="text-label text-ink-secondary text-pretty">{row.detail}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeEnquiry(row)}
                  aria-label={`Remove enquiry from ${row.guestName}`}
                  title="Remove enquiry"
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-secondary hover:text-danger-text"
                >
                  <Lucide.Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          isLoaded && <p className="py-6 text-center text-label text-ink-secondary">No enquiries recorded for this date.</p>
        )}
      </div>
    </Modal>
  );
}
