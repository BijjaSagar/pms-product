import { useState } from 'react';
import type { Ref } from 'react';
import * as Lucide from 'lucide-react';
import type { Notice } from '../../types';
import { Button, IconButton } from '../primitives';

type Filter = 'all' | 'unread' | 'urgent';

interface ToneStyle {
  icon: Lucide.LucideIcon;
  label: string;
  /** Icon tile and label chip. */
  chip: string;
  /** The unread accent bar. */
  accent: string;
}

const TONES: Record<string, ToneStyle> = {
  danger: { icon: Lucide.AlertOctagon, label: 'Critical', chip: 'bg-danger-bg text-danger-text border-danger-border', accent: 'bg-danger-text' },
  warning: { icon: Lucide.AlertTriangle, label: 'Action needed', chip: 'bg-warning-bg text-warning-text border-warning-border', accent: 'bg-warning-text' },
  info: { icon: Lucide.Info, label: 'Notice', chip: 'bg-info-bg text-info-text border-info-border', accent: 'bg-info-text' },
  success: { icon: Lucide.CheckCircle2, label: 'Done', chip: 'bg-success-bg text-success-text border-success-border', accent: 'bg-success-text' },
};
const toneOf = (tone: string) => TONES[tone] ?? TONES.info!;

const isUrgent = (n: Notice) => n.tone === 'danger' || n.tone === 'warning';

/**
 * The bell and the notifications panel. From the small breakpoint up the panel is a popover under the
 * bell; on phones it spans the width of the screen so rows are never squeezed.
 */
export function NotificationHub({
  open,
  onToggle,
  containerRef,
  notices,
  readIds,
  onOpenNotice,
  onToggleRead,
  onDismiss,
  onMarkAllRead,
  onClearRead,
  onPreferences,
}: {
  open: boolean;
  onToggle: () => void;
  /** Attached while the panel is open, so a click outside can close it. */
  containerRef?: Ref<HTMLDivElement>;
  /** Notices the user may see, already without the dismissed ones. */
  notices: Notice[];
  readIds: string[];
  onOpenNotice: (target: string, id: string) => void;
  onToggleRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onMarkAllRead: () => void;
  onClearRead: () => void;
  onPreferences: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');

  const isRead = (id: string) => readIds.includes(id);
  const unreadCount = notices.filter((n) => !isRead(n.id)).length;
  const urgentCount = notices.filter(isUrgent).length;
  const readCount = notices.filter((n) => isRead(n.id)).length;
  const shown = notices.filter((n) => (filter === 'unread' ? !isRead(n.id) : filter === 'urgent' ? isUrgent(n) : true));

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: notices.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'urgent', label: 'Urgent', count: urgentCount },
  ];

  return (
    <div className="relative flex-none" ref={containerRef}>
      <IconButton
        variant="ghost"
        onClick={onToggle}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Notifications"
        className={`relative border text-ink transition-colors ${open ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface'}`}
      >
        <Lucide.Bell size={18} strokeWidth={1.9} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="tnum absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-text px-1 text-micro font-bold text-white ring-2 ring-surface"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </IconButton>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="pms-animate-pop fixed inset-x-3 top-[4.25rem] z-50 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-[420px]"
        >
          {/* Title and bulk actions */}
          <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
            <div className="min-w-0">
              <h2 className="text-title font-bold leading-tight text-ink">Notifications</h2>
              <p className="mt-0.5 text-label text-ink-secondary" aria-live="polite">
                {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
              </p>
            </div>
            <div className="flex flex-none items-center gap-1.5">
              {unreadCount > 0 ? (
                <Button variant="secondary" onClick={onMarkAllRead} icon={<Lucide.CheckCheck size={14} />} title="Mark all as read">
                  <span className="hidden xs:inline">Mark all read</span>
                  <span className="xs:hidden">All read</span>
                </Button>
              ) : null}
              {readCount > 0 ? (
                <IconButton onClick={onClearRead} title="Clear read notifications" aria-label="Clear read notifications">
                  <Lucide.Trash2 size={14} />
                </IconButton>
              ) : null}
            </div>
          </div>

          {/* Filter tabs */}
          <div role="tablist" aria-label="Filter notifications" className="flex gap-1 border-b border-divider px-3">
            {tabs.map((tab) => {
              const selected = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilter(tab.id)}
                  className={`-mb-px flex min-h-[40px] cursor-pointer items-center gap-1.5 border-b-2 px-3 text-body font-semibold transition-colors ${
                    selected ? 'border-primary text-ink' : 'border-transparent text-ink-secondary hover:text-ink'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`tnum rounded-full px-1.5 text-micro font-bold ${selected ? 'bg-primary/10 text-primary' : 'bg-muted-surface text-ink-muted'}`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* List */}
          <ul className="max-h-[min(60dvh,460px)] overflow-y-auto">
            {shown.map((n) => {
              const tone = toneOf(n.tone);
              const ToneIcon = tone.icon;
              const unread = !isRead(n.id);
              return (
                <li key={n.id} className="group relative border-b border-divider last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onOpenNotice(n.target, n.id)}
                    className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-hover-surface ${unread ? 'bg-primary/[0.04]' : ''}`}
                  >
                    {unread ? <span className={`absolute bottom-3 left-0 top-3 w-1 rounded-r-full ${tone.accent}`} aria-hidden="true" /> : null}
                    <span className={`mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl border ${tone.chip}`}>
                      <ToneIcon size={17} strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-body text-ink ${unread ? 'font-bold' : 'font-semibold'}`}>{n.title}</span>
                        <span className="tnum flex-none text-label text-ink-muted">{n.time}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-label text-ink-secondary">{n.detail}</span>
                      <span className={`mt-2 inline-flex rounded-full border px-2 py-px text-micro font-bold ${tone.chip}`}>{tone.label}</span>
                      {unread ? <span className="sr-only"> Unread</span> : null}
                    </span>
                  </button>

                  {/* Row actions: always there on touch screens, on hover or focus with a pointer. */}
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onToggleRead(n.id)}
                      title={unread ? 'Mark as read' : 'Mark as unread'}
                      aria-label={unread ? `Mark ${n.title} as read` : `Mark ${n.title} as unread`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-muted-surface hover:text-ink"
                    >
                      {unread ? <Lucide.Check size={15} /> : <Lucide.Undo2 size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDismiss(n.id)}
                      title="Dismiss"
                      aria-label={`Dismiss ${n.title}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger-text"
                    >
                      <Lucide.X size={15} />
                    </button>
                  </div>
                </li>
              );
            })}

            {shown.length === 0 ? (
              <li className="flex flex-col items-center px-6 py-12 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-success-border bg-success-bg text-success-text">
                  <Lucide.BellOff size={22} aria-hidden="true" />
                </span>
                <p className="text-body font-semibold text-ink">
                  {filter === 'all' ? 'No notifications' : filter === 'unread' ? 'Nothing unread' : 'Nothing urgent'}
                </p>
                <p className="mt-1 max-w-[240px] text-label text-ink-secondary">
                  {filter === 'all' ? 'New alerts from the front desk and housekeeping will appear here.' : 'Switch to All to see earlier notifications.'}
                </p>
              </li>
            ) : null}
          </ul>

          <div className="flex items-center justify-between gap-3 border-t border-divider bg-muted-surface/40 px-4 py-2.5">
            <span className="text-label text-ink-muted">{notices.length} in total</span>
            <Button variant="link" onClick={onPreferences} icon={<Lucide.SlidersHorizontal size={13} />}>
              Preferences
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
