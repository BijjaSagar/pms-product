import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { TextField } from '../../components/primitives';

export interface NavItem<T extends string> {
  id: T;
  label: string;
  icon: Lucide.LucideIcon;
}

export interface NavGroup<T extends string> {
  title: string;
  items: NavItem<T>[];
}

/**
 * Section navigation for Settings. From the large breakpoint up it is a sticky side list with a
 * filter box; below that it folds into one button showing the current section, so a phone is not
 * filled by a list of twenty links before any content.
 */
export function SettingsNav<T extends string>({
  groups,
  active,
  onSelect,
}: {
  groups: NavGroup<T>[];
  active: T;
  onSelect: (id: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const current = groups.flatMap((g) => g.items).find((i) => i.id === active);
  const CurrentIcon = current?.icon;
  const needle = query.trim().toLowerCase();
  const visible = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !needle || i.label.toLowerCase().includes(needle)) }))
    .filter((g) => g.items.length > 0);

  const choose = (id: T) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <aside className="pms-card w-full flex-none p-2 lg:sticky lg:top-2 lg:w-[272px] lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="settings-nav-list"
        className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left lg:hidden"
      >
        {CurrentIcon ? <CurrentIcon size={17} className="flex-none text-primary" aria-hidden="true" /> : null}
        <span className="min-w-0 flex-1">
          <span className="block text-micro font-bold uppercase tracking-[0.12em] text-ink-muted">Settings section</span>
          <span className="block truncate text-body font-semibold text-ink">{current?.label}</span>
        </span>
        <Lucide.ChevronDown
          size={17}
          aria-hidden="true"
          className={`flex-none text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div id="settings-nav-list" className={`${open ? 'block' : 'hidden'} lg:block`}>
        <div className="px-1 pb-3 pt-2 lg:pt-0">
          <div className="relative">
            <Lucide.Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <TextField
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a setting"
              aria-label="Find a setting"
              className="!pl-8"
            />
          </div>
        </div>

        <nav aria-label="Settings" className="flex flex-col gap-4">
          {visible.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-micro font-bold uppercase tracking-[0.14em] text-ink-muted">{group.title}</p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const isActive = item.id === active;
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => choose(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`relative flex min-h-[40px] w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-body transition-colors ${
                          isActive
                            ? 'bg-primary/10 font-semibold text-primary'
                            : 'font-medium text-ink-secondary hover:bg-muted-surface hover:text-ink'
                        }`}
                      >
                        {isActive ? (
                          <span className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r-full bg-primary" aria-hidden="true" />
                        ) : null}
                        <Icon
                          size={16}
                          strokeWidth={isActive ? 2.3 : 1.9}
                          aria-hidden="true"
                          className={`flex-none ${isActive ? 'text-primary' : 'text-ink-muted'}`}
                        />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {visible.length === 0 ? (
            <p className="px-3 py-4 text-center text-label text-ink-muted">No setting matches “{query.trim()}”.</p>
          ) : null}
        </nav>
      </div>
    </aside>
  );
}
