import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Avatar, Badge, Card, CardTitle, TableContainer } from '../../components/ui/display';
import { FilterChip, Pagination } from '../../components/ui/controls';
import { CardSkeleton } from '../../components/feedback/Skeleton';
import { ConfirmDialog, Modal } from '../../components/ui/overlays';
import { Button, IconButton, TextField } from '../../components/ui/primitives';
import { toast } from '../../utils/toast';
import { displayApiError } from '../../lib/api/client';
import { propertyApi, userAdminApi } from '../../lib/api/pms';
import type { AdminUser, PropertyDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { useAuth } from '../auth/AuthContext';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const PAGE_SIZE = 10;
/** Fewest letters worth searching users for. */
const MIN_SEARCH = 2;

type StatusFilter = 'all' | 'active' | 'inactive';

const place = (p: PropertyDetails) => [p.city, p.state, p.country].filter(Boolean).join(', ');

/** Who works at one property: remove people, or find staff and add them. */
function TeamDialog({ property, onClose }: { property: PropertyDetails; onClose: () => void }) {
  const team = useApiResource(() => userAdminApi.forProperty(property.id), [property.id]);
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim());
  const searching = search.length >= MIN_SEARCH;
  const candidates = useApiResource(
    () => (searching ? userAdminApi.list({ search, isActive: true, pageSize: 6 }) : Promise.resolve(null)),
    [search, searching],
  );
  const [busy, setBusy] = useState<string | null>(null);

  const assigned = new Set((team.data ?? []).map((u) => u.id));
  const found = (candidates.data?.data ?? []).filter((u) => !assigned.has(u.id));

  const change = async (user: AdminUser, action: 'assign' | 'unassign') => {
    setBusy(user.id);
    try {
      if (action === 'assign') await userAdminApi.assign(property.id, user.id);
      else await userAdminApi.unassign(property.id, user.id);
      toast(action === 'assign' ? 'Added to the team' : 'Removed from the team', { detail: `${user.name} · ${property.name}`, tone: 'success' });
      team.refresh();
    } catch (cause) {
      toast('Could not change the team', { detail: displayApiError(cause), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${property.name} · team`}
      subtitle="The people who can open this property. A change applies on their next request."
      wide
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-5 py-2">
        <section aria-label="Current team">
          <h3 className="pms-label mb-2">On the team{team.data ? ` (${team.data.length})` : ''}</h3>
          {team.error ? (
            <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
              Could not load the team: {team.error}
            </p>
          ) : !team.data ? (
            <CardSkeleton lines={2} label="Loading the team" />
          ) : team.data.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted-surface/60 p-3 text-label text-ink-secondary">Nobody is assigned yet. Super admins can always open it.</p>
          ) : (
            <ul className="divide-y divide-divider rounded-xl border border-border bg-surface">
              {team.data.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={user.name} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-body font-semibold text-ink">{user.name}</p>
                      <p className="truncate text-label text-ink-secondary">{user.email}</p>
                    </div>
                  </div>
                  <span className="flex flex-none items-center gap-2">
                    {!user.isActive ? (
                      <Badge tone="danger" size="sm">
                        Inactive
                      </Badge>
                    ) : null}
                    <IconButton
                      title={`Remove ${user.name}`}
                      aria-label={`Remove ${user.name}`}
                      disabled={busy === user.id}
                      onClick={() => void change(user, 'unassign')}
                    >
                      <Lucide.UserMinus size={14} />
                    </IconButton>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Add a person">
          <h3 className="pms-label mb-2">Add a person</h3>
          <div className="relative">
            <Lucide.Search size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <TextField
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search staff by name or email"
              aria-label="Search staff to add"
              className="!pl-8"
            />
          </div>
          {searching ? (
            <ul className="mt-2 divide-y divide-divider rounded-xl border border-border bg-surface" aria-live="polite">
              {found.length === 0 ? (
                <li className="px-3 py-3 text-center text-label text-ink-secondary">{candidates.loading ? 'Searching…' : 'No other active staff match.'}</li>
              ) : (
                found.map((user) => (
                  <li key={user.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-body font-semibold text-ink">{user.name}</p>
                      <p className="truncate text-label text-ink-secondary">{user.email}</p>
                    </div>
                    <Button variant="secondary" disabled={busy === user.id} onClick={() => void change(user, 'assign')} icon={<Lucide.UserPlus size={13} />}>
                      Add
                    </Button>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <p className="pms-helper mt-1.5">Type at least {MIN_SEARCH} letters. Create new accounts under Users.</p>
          )}
        </section>
      </div>
    </Modal>
  );
}

/** SUPER_ADMIN only: every property, including inactive ones, with who works there. */
export function PropertiesAdmin({ onAddProperty, onViewActivity }: { onAddProperty: () => void; onViewActivity: (propertyId: string) => void }) {
  const { switchProperty } = useAuth();
  const list = useApiResource(() => propertyApi.list(), []);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);
  const [team, setTeam] = useState<PropertyDetails | null>(null);
  const [deactivating, setDeactivating] = useState<PropertyDetails | null>(null);
  const [busy, setBusy] = useState(false);

  const all = list.data ?? [];
  const needle = query.trim().toLowerCase();
  const matches = all.filter((p) => {
    if (status === 'active' && !p.isActive) return false;
    if (status === 'inactive' && p.isActive) return false;
    return !needle || [p.name, p.code, p.city, p.state ?? '', p.country].some((value) => value.toLowerCase().includes(needle));
  });
  const counts = { all: all.length, active: all.filter((p) => p.isActive).length, inactive: all.filter((p) => !p.isActive).length };
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = matches.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const chips: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: `All · ${counts.all}` },
    { id: 'active', label: `Active · ${counts.active}` },
    { id: 'inactive', label: `Inactive · ${counts.inactive}` },
  ];

  const open = async (property: PropertyDetails) => {
    try {
      // The hotel shell takes over once the property is active.
      await switchProperty(property.id);
    } catch (cause) {
      toast('Could not open the property', { detail: displayApiError(cause), tone: 'danger' });
    }
  };

  const setActive = async (property: PropertyDetails, isActive: boolean) => {
    setBusy(true);
    try {
      await propertyApi.update(property.id, { isActive });
      toast(isActive ? 'Property activated' : 'Property deactivated', { detail: property.name, tone: 'success' });
      list.refresh();
    } catch (cause) {
      toast('Could not change the property', { detail: displayApiError(cause), tone: 'danger' });
    } finally {
      setBusy(false);
      setDeactivating(null);
    }
  };

  const actions = (property: PropertyDetails) => (
    <span className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="secondary" onClick={() => void open(property)} icon={<Lucide.ArrowUpRight size={13} />}>
        Open
      </Button>
      <Button variant="secondary" onClick={() => setTeam(property)} icon={<Lucide.Users size={13} />}>
        Team
      </Button>
      <Button variant="secondary" onClick={() => onViewActivity(property.id)} icon={<Lucide.History size={13} />}>
        Activity
      </Button>
      {property.isActive ? (
        <Button variant="secondary" onClick={() => setDeactivating(property)} icon={<Lucide.PowerOff size={13} />} className="hover:text-danger-text">
          Deactivate
        </Button>
      ) : (
        <Button variant="secondary" disabled={busy} onClick={() => void setActive(property, true)} icon={<Lucide.Power size={13} />}>
          Activate
        </Button>
      )}
    </span>
  );

  const statusBadge = (property: PropertyDetails) => (
    <Badge tone={property.isActive ? 'success' : 'warning'} size="sm" dot>
      {property.isActive ? 'Active' : 'Inactive'}
    </Badge>
  );

  return (
    <div className="pms-page gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-primary-foreground shadow-xs shadow-primary/20">
            <Lucide.Building2 size={20} strokeWidth={2.4} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-disp3 font-bold leading-tight tracking-tight text-ink">Properties</h1>
            <p className="mt-0.5 text-label text-ink-secondary">Every hotel on the platform, and who can open it.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton title="Refresh properties" aria-label="Refresh properties" onClick={() => list.refresh()}>
            <Lucide.RefreshCw size={14} className={list.loading ? 'animate-spin' : ''} />
          </IconButton>
          <Button variant="primary" onClick={onAddProperty} icon={<Lucide.Plus size={15} strokeWidth={2.4} />}>
            Add property
          </Button>
        </div>
      </header>

      <Card>
        <CardTitle icon={Lucide.Building2} title="All properties" subtitle={list.data ? `${counts.all} in total` : 'Loading properties…'} />

        {list.error ? (
          <p role="alert" className="mb-3 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            Could not load properties: {list.error}
          </p>
        ) : null}

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Lucide.Search size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <TextField
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search by name, code or city"
              aria-label="Search properties"
              className="!pl-8"
            />
          </div>
          <div className="pms-chip-row gap-2" role="group" aria-label="Filter by status">
            {chips.map((chip) => (
              <FilterChip
                key={chip.id}
                active={status === chip.id}
                onClick={() => {
                  setStatus(chip.id);
                  setPage(0);
                }}
              >
                {chip.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {!list.data && list.loading ? (
          <CardSkeleton lines={5} label="Loading properties" />
        ) : list.data && matches.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Lucide.SearchX size={28} className="text-ink-muted" aria-hidden="true" />
            <p className="text-body font-semibold text-ink">{all.length === 0 ? 'No properties yet' : 'No property matches'}</p>
            <p className="text-label text-ink-secondary">{all.length === 0 ? 'Add the first one with the button above.' : 'Try a different search or filter.'}</p>
          </div>
        ) : list.data ? (
          <>
            {/* Phones: one card per property. */}
            <ul className="flex flex-col gap-2.5 md:hidden">
              {visible.map((property) => (
                <li key={property.id} className="rounded-xl border border-border bg-surface p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-body font-semibold text-ink">{property.name}</p>
                      <p className="truncate text-label text-ink-secondary">
                        {property.code} · {place(property)}
                      </p>
                    </div>
                    {statusBadge(property)}
                  </div>
                  <div className="mt-3">{actions(property)}</div>
                </li>
              ))}
            </ul>

            {/* Tablet and up: the same properties as a table. */}
            <div className="hidden md:block">
              <TableContainer>
                <table className="pms-table w-full text-left">
                  <thead>
                    <tr>
                      <th>CODE</th>
                      <th>PROPERTY</th>
                      <th>ROOMS</th>
                      <th>STATUS</th>
                      <th className="text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((property) => (
                      <tr key={property.id}>
                        <td>
                          <span className="inline-flex rounded-lg bg-primary/10 px-2.5 py-1 text-label font-bold tracking-wide text-primary">{property.code}</span>
                        </td>
                        <td>
                          <p className="truncate text-label font-semibold text-ink">{property.name}</p>
                          <p className="truncate text-label text-ink-secondary">{place(property)}</p>
                        </td>
                        <td className="text-label text-ink-secondary">
                          {property.totalRooms ?? 0} rooms · {property.numberOfFloors ?? 0} {property.numberOfFloors === 1 ? 'floor' : 'floors'}
                        </td>
                        <td>{statusBadge(property)}</td>
                        <td>{actions(property)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </div>

            <div className="mt-4">
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onChange={setPage}
                summary={`Showing ${safePage * PAGE_SIZE + 1} to ${Math.min((safePage + 1) * PAGE_SIZE, matches.length)} of ${matches.length} properties`}
              />
            </div>
          </>
        ) : null}
      </Card>

      {team ? <TeamDialog property={team} onClose={() => setTeam(null)} /> : null}
      <ConfirmDialog
        open={deactivating !== null}
        onClose={() => setDeactivating(null)}
        onConfirm={() => (deactivating ? setActive(deactivating, false) : undefined)}
        autoClose={false}
        busy={busy}
        danger
        title={`Deactivate ${deactivating?.name ?? 'this property'}?`}
        body="Its staff lose access to it straight away, and cannot sign in if it is their only property. Nothing is deleted, and you can activate it again at any time."
        confirmLabel="Deactivate"
      />
    </div>
  );
}
