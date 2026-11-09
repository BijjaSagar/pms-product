import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import * as Lucide from 'lucide-react';
import type { RoomDetails } from '../../lib/api/pms';
import { Modal } from '../../components/overlays';
import { Badge } from '../../components/ui';
import { RoomCategoryDetails } from './RoomCategoryDetails';
import { RoomImages } from './RoomImages';

type DialogTab = 'category' | 'rooms' | 'images';

const TABS: { id: DialogTab; label: string; hint: string; icon: Lucide.LucideIcon }[] = [
  { id: 'category', label: 'Details', hint: 'Name, occupancy, meals', icon: Lucide.SlidersHorizontal },
  { id: 'rooms', label: 'Rooms', hint: 'Others in this category', icon: Lucide.BedDouble },
  { id: 'images', label: 'Images', hint: 'Photos guests see', icon: Lucide.Image },
];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** What this room is at a glance, so the dialog says who you are editing before any field does. */
function Summary({ room }: { room: RoomDetails }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted-surface/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-primary-foreground shadow-xs shadow-primary/20">
          <Lucide.BedDouble size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-title font-bold leading-tight text-ink">{room.name}</p>
          <p className="truncate text-label text-ink-secondary">
            {room.roomType.name}
            {room.category ? ` · ${room.category.name}` : ''}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="neutral" size="sm">{plural(room.roomCount, 'room')}</Badge>
        <Badge tone="info" size="sm">Up to {plural(room.maxOccupancy, 'guest')}</Badge>
        {room.mealPlans.map((plan) => (
          <Badge key={plan} tone="success" size="sm">{plan}</Badge>
        ))}
      </div>
    </div>
  );
}

function RoomsInCategory({ room, others }: { room: RoomDetails; others: RoomDetails[] }) {
  if (!room.categoryId) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
        <Lucide.Tag size={26} className="text-ink-muted" aria-hidden="true" />
        <p className="max-w-xs text-label text-ink-muted">This room has no category yet, so it is not grouped with other rooms.</p>
      </div>
    );
  }
  const total = others.reduce((sum, r) => sum + r.roomCount, 0);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-label text-ink-secondary">
        <span className="font-semibold text-ink">{plural(others.length, 'offering')}</span> in{' '}
        {room.category?.name ?? 'this category'}, {plural(total, 'room')} in total.
      </p>
      <ul className="flex flex-col gap-2">
        {others.map((r) => (
          <li
            key={r.id}
            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
              r.id === room.id ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface'
            }`}
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate text-body font-semibold text-ink">
                <span className="truncate">{r.name}</span>
                {r.id === room.id ? <Badge tone="info" size="sm">This room</Badge> : null}
              </p>
              <p className="truncate text-label text-ink-secondary">
                {r.roomType.name} · up to {plural(r.maxOccupancy, 'guest')}
              </p>
            </div>
            <span className="flex-none text-label font-semibold text-ink-secondary tnum">{plural(r.roomCount, 'room')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RoomCategoryDialog({
  propertyId,
  room,
  rooms,
  canEdit,
  onSaved,
  onClose,
}: {
  propertyId: string;
  /** The room being viewed; null keeps the dialog closed. */
  room: RoomDetails | null;
  /** Every room of the property, to find the ones under the same category. */
  rooms: RoomDetails[];
  canEdit: boolean;
  /** Called after a section saves so the lists behind the dialog refresh. */
  onSaved: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DialogTab>('category');
  const sameCategory = room?.categoryId ? rooms.filter((r) => r.categoryId === room.categoryId) : [];

  // Arrow keys move between tabs, as a tab list is expected to.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const at = TABS.findIndex((t) => t.id === tab);
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
    const next = TABS[(at + step + TABS.length) % TABS.length]!;
    setTab(next.id);
    document.getElementById(`room-tab-${next.id}`)?.focus();
  };

  return (
    <Modal open={room !== null} onClose={onClose} title="Room category" subtitle={room ? room.name : undefined} xl>
      {room && (
        <div className="flex flex-col gap-4 py-1">
          <Summary room={room} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-5">
            <div
              role="tablist"
              aria-label="Room sections"
              aria-orientation="vertical"
              onKeyDown={onKeyDown}
              className="flex gap-1.5 overflow-x-auto pb-1 md:flex-col md:self-start md:overflow-visible md:pb-0"
            >
              {TABS.map(({ id, label, hint, icon: Icon }) => {
                const selected = tab === id;
                return (
                  <button
                    key={id}
                    id={`room-tab-${id}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`room-panel-${id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setTab(id)}
                    className={`flex min-h-[44px] flex-none cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors md:w-full ${
                      selected
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-transparent text-ink-secondary hover:bg-muted-surface hover:text-ink'
                    }`}
                  >
                    <Icon size={16} className="flex-none" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap text-body font-semibold leading-tight">{label}</span>
                      <span className="hidden truncate text-label font-normal text-ink-muted md:block">{hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div role="tabpanel" id={`room-panel-${tab}`} aria-labelledby={`room-tab-${tab}`} className="min-w-0">
              {tab === 'category' && <RoomCategoryDetails propertyId={propertyId} room={room} canEdit={canEdit} onSaved={onSaved} />}
              {tab === 'rooms' && <RoomsInCategory room={room} others={sameCategory} />}
              {tab === 'images' && <RoomImages propertyId={propertyId} room={room} canEdit={canEdit} />}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
