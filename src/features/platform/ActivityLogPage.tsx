import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Avatar, Badge, Card, CardTitle } from '../../components/ui';
import { Pagination } from '../../components/controls';
import { CardSkeleton } from '../../components/Skeleton';
import { IconButton, SelectField, TextField } from '../../components/primitives';
import { activityApi, propertyApi } from '../../lib/api/pms';
import type { ActivityEntry, ActivityQuery } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { timeAgo } from '../../utils/date';
import { useDebouncedValue } from './useDebouncedValue';

const PAGE_SIZE = 25;
/** Select value for "changes that belong to no property". */
const PLATFORM = 'platform';

/** What each route's resource is called in the filter. */
const RESOURCE_OPTIONS: Array<[string, string]> = [
  ['reservations', 'Reservations'],
  ['guests', 'Guests'],
  ['room-listings', 'Rooms'],
  ['room-categories', 'Room categories'],
  ['amenities', 'Amenities'],
  ['floor-plan', 'Floor plan'],
  ['maintenance-reasons', 'Maintenance reasons'],
  ['housekeeping-statuses', 'Housekeeping statuses'],
  ['cancellation-rules', 'Cancellation rules'],
  ['terms-inclusions', 'Terms and inclusions'],
  ['branding', 'Branding'],
  ['meal-plans', 'Meal plans'],
  ['grc-settings', 'GRC settings'],
  ['reservation-settings', 'Reservation settings'],
  ['post-master-settings', 'Post master settings'],
  ['property-amenities', 'Property amenities'],
  ['properties', 'Properties'],
  ['users', 'Users'],
  ['auth', 'Sign-ins and passwords'],
];

const stamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Start and end of a local calendar day, as the ISO instants the API filters on. */
const dayStart = (day: string) => new Date(`${day}T00:00:00`).toISOString();
const dayEnd = (day: string) => new Date(`${day}T23:59:59.999`).toISOString();

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="pms-label">{label}</dt>
      <dd className="mt-0.5 break-words text-label text-ink">{children}</dd>
    </div>
  );
}

function EntryDetails({ entry }: { entry: ActivityEntry }) {
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-border bg-muted-surface/50 p-3">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Time">{stamp(entry.createdAt)}</Detail>
        <Detail label="Request">
          <span className="font-mono">
            {entry.method} {entry.path}
          </span>{' '}
          · {entry.statusCode}
        </Detail>
        <Detail label="Action">
          <span className="font-mono">{entry.action}</span>
        </Detail>
        <Detail label="Record">{entry.resourceId ? <span className="font-mono">{entry.resourceId}</span> : '—'}</Detail>
        <Detail label="Who">
          {entry.actor.name ?? 'Unknown'}
          {entry.actor.email ? ` · ${entry.actor.email}` : ''}
          {entry.actor.id ? '' : ' (account deleted)'}
        </Detail>
        <Detail label="From">
          {entry.ipAddress ?? '—'}
          {entry.userAgent ? <span className="block text-ink-secondary">{entry.userAgent}</span> : null}
        </Detail>
      </dl>
      {entry.details ? (
        <div>
          <p className="pms-label">What was sent</p>
          <pre className="mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-surface p-3 font-mono text-label text-ink">
            {JSON.stringify(entry.details, null, 2)}
          </pre>
        </div>
      ) : (
        <p className="text-label text-ink-secondary">The request carried no data.</p>
      )}
    </div>
  );
}

/**
 * SUPER_ADMIN only: everything people did through the API, newest first, for one property or all of them.
 * The properties page links here with a property already chosen.
 */
export function ActivityLogPage({ initialPropertyId }: { initialPropertyId?: string }) {
  const [property, setProperty] = useState(initialPropertyId ?? '');
  const [resource, setResource] = useState('');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const search = useDebouncedValue(query.trim());

  const properties = useApiResource(() => propertyApi.list(), []);
  const log = useApiResource(() => {
    const request: ActivityQuery = {
      ...(property === PLATFORM ? { platformOnly: true } : property ? { propertyId: property } : {}),
      ...(resource ? { resource } : {}),
      ...(search ? { search } : {}),
      ...(from ? { from: dayStart(from) } : {}),
      ...(to ? { to: dayEnd(to) } : {}),
      page: page + 1,
      pageSize: PAGE_SIZE,
    };
    return activityApi.list(request);
  }, [property, resource, search, from, to, page]);

  const data = log.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const selected = properties.data?.find((p) => p.id === property);
  const filtered = Boolean(property || resource || search || from || to);

  const change = (apply: () => void) => {
    apply();
    setPage(0);
    setOpen(null);
  };

  return (
    <div className="pms-page gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-primary-foreground shadow-xs shadow-primary/20">
            <Lucide.History size={20} strokeWidth={2.4} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-disp3 font-bold leading-tight tracking-tight text-ink">Activity log</h2>
            <p className="mt-0.5 text-label text-ink-secondary">
              Every change made through the system and every sign-in{selected ? `, for ${selected.name}` : ''}.
            </p>
          </div>
        </div>
        <IconButton title="Refresh activity" aria-label="Refresh activity" onClick={() => log.refresh()}>
          <Lucide.RefreshCw size={14} className={log.loading ? 'animate-spin' : ''} />
        </IconButton>
      </header>

      <Card>
        <CardTitle icon={Lucide.ListFilter} title="Entries" subtitle={data ? `${data.total.toLocaleString('en-IN')} ${data.total === 1 ? 'entry' : 'entries'}${filtered ? ' match' : ''}` : 'Loading…'} />

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SelectField value={property} onChange={(e) => change(() => setProperty(e.target.value))} aria-label="Property">
            <option value="">All properties</option>
            <option value={PLATFORM}>Platform only (no property)</option>
            {(properties.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </SelectField>
          <SelectField value={resource} onChange={(e) => change(() => setResource(e.target.value))} aria-label="What changed">
            <option value="">Everything</option>
            {RESOURCE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <div className="relative">
            <Lucide.Search size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <TextField
              type="search"
              value={query}
              onChange={(e) => change(() => setQuery(e.target.value))}
              placeholder="Search activity or person"
              aria-label="Search activity"
              className="!pl-8"
            />
          </div>
          <TextField type="date" value={from} max={to || undefined} onChange={(e) => change(() => setFrom(e.target.value))} aria-label="From date" />
          <TextField type="date" value={to} min={from || undefined} onChange={(e) => change(() => setTo(e.target.value))} aria-label="To date" />
        </div>

        {log.error ? (
          <p role="alert" className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            <Lucide.AlertCircle size={15} aria-hidden="true" /> Could not load the activity log: {log.error}
            <button type="button" className="cursor-pointer font-semibold underline" onClick={() => log.refresh()}>
              Try again
            </button>
          </p>
        ) : null}

        {!data && !log.error ? (
          <CardSkeleton lines={6} label="Loading activity" />
        ) : data && data.data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Lucide.SearchX size={28} className="text-ink-muted" aria-hidden="true" />
            <p className="text-body font-semibold text-ink">{filtered ? 'No activity matches' : 'No activity yet'}</p>
            <p className="text-label text-ink-secondary">{filtered ? 'Try a different property, date or search.' : 'Changes appear here as soon as someone makes one.'}</p>
          </div>
        ) : data ? (
          <>
            <ul className="divide-y divide-divider">
              {data.data.map((entry) => {
                const expanded = open === entry.id;
                return (
                  <li key={entry.id} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <Avatar name={entry.actor.name ?? '?'} size={32} />
                        <div className="min-w-0">
                          <p className="text-body font-semibold text-ink">{entry.summary}</p>
                          <p className="truncate text-label text-ink-secondary">
                            {entry.actor.name ?? 'Unknown'}
                            {entry.actor.email ? ` · ${entry.actor.email}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="flex flex-none flex-wrap items-center gap-2 text-label text-ink-secondary">
                        {entry.property ? (
                          <Badge tone="info" size="sm">
                            {entry.property.code} · {entry.property.name}
                          </Badge>
                        ) : (
                          <Badge tone="neutral" size="sm">
                            Platform
                          </Badge>
                        )}
                        <Badge tone={entry.actor.role === 'SUPER_ADMIN' ? 'warning' : 'neutral'} size="sm">
                          {entry.actor.role === 'SUPER_ADMIN' ? 'Super admin' : 'Staff'}
                        </Badge>
                        <time dateTime={entry.createdAt} title={stamp(entry.createdAt)}>
                          {timeAgo(entry.createdAt)}
                        </time>
                        <IconButton
                          title={expanded ? 'Hide details' : 'Show details'}
                          aria-label={expanded ? 'Hide details' : 'Show details'}
                          aria-expanded={expanded}
                          onClick={() => setOpen(expanded ? null : entry.id)}
                        >
                          <Lucide.ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </IconButton>
                      </span>
                    </div>
                    {expanded ? <EntryDetails entry={entry} /> : null}
                  </li>
                );
              })}
            </ul>
            <div className="mt-4">
              <Pagination
                page={Math.min(page, totalPages - 1)}
                totalPages={totalPages}
                onChange={(next) => {
                  setPage(next);
                  setOpen(null);
                }}
                summary={`Showing ${page * PAGE_SIZE + 1} to ${Math.min((page + 1) * PAGE_SIZE, data.total)} of ${data.total.toLocaleString('en-IN')} entries`}
              />
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}
