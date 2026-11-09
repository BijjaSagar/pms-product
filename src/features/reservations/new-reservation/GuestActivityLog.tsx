import { useCallback } from "react";
import { CardSkeleton } from '../../../components/Skeleton';
import * as Lucide from "lucide-react";
import { auditApi } from "../../../lib/api/pms";
import { useApiResource } from "../../../lib/api/useApiResource";

// Readable wording for the audit actions a Guest's history can contain
const ACTION_LABELS: Record<string, string> = {
  "guest.create": "Guest added",
  "guest.update": "Profile updated",
  "reservation.create": "Reservation created",
  "reservation.cancel": "Reservation cancelled",
  "stay.check-in": "Checked in",
  "folio.payment": "Payment recorded",
  "payment.refund": "Payment refunded",
  "invoice.issue": "Invoice issued",
};

/** The selected Guest's activity: their record and their reservations, newest first. */
export function GuestActivityLog({ guestId }: { guestId: string | null }) {
  const loadActivity = useCallback(
    async () => (guestId ? (await auditApi.forGuest(guestId)).rows : []),
    [guestId]
  );
  const activity = useApiResource(loadActivity, [guestId]);
  const rows = activity.data ?? [];

  return (
    <div className="min-w-0 bg-surface rounded-3xl border border-border/90 shadow-sm p-3 min-[1440px]:p-5 flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-info-bg text-info-text">
            <Lucide.History size={15} />
          </div>
          <h3 className="min-w-0 flex-1 text-title font-bold text-ink uppercase tracking-wider">
            Activity Log
          </h3>
        </div>
        {guestId && activity.data && (
          <span className="flex-none text-micro font-bold px-2 py-0.5 rounded-full bg-muted-surface text-ink">
            {rows.length} {rows.length === 1 ? "Entry" : "Entries"}
          </span>
        )}
      </div>

      {!guestId ? (
        <p className="text-label text-ink-secondary">Select or add a Guest to see their activity.</p>
      ) : activity.error ? (
        <p role="alert" className="text-label text-danger-text">Could not load activity: {activity.error}</p>
      ) : activity.loading ? (
        <CardSkeleton lines={3} label="Loading activity" />
      ) : rows.length === 0 ? (
        <p className="text-label text-ink-secondary">No activity recorded for this Guest yet.</p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start gap-2.5">
              <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-[var(--color-primary)]" />
              <div className="min-w-0 flex-1">
                <p className="text-label font-semibold text-ink break-words">
                  {ACTION_LABELS[row.action] ?? row.action}
                  {row.resourceId ? <span className="tnum font-mono font-normal text-ink-secondary"> · {row.resourceId}</span> : null}
                </p>
                {row.reason ? <p className="text-label text-ink-secondary break-words">{row.reason}</p> : null}
                <p className="tnum text-label text-ink-secondary">
                  {row.createdAt}
                  {row.actorName ? ` · ${row.actorName}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
