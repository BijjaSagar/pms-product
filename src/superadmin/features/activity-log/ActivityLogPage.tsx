import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Avatar, Badge, Card, TableContainer } from '../../../shared/components/ui/display';
import { FilterChip, Pagination } from '../../../shared/components/ui/controls';
import { CardSkeleton } from '../../../shared/components/feedback/Skeleton';
import { Button, IconButton, SelectField, TextField } from '../../../shared/components/ui/primitives';
import { TONE_CLASSES } from '../../../shared/theme/tone';
import { activityApi, type ActivityEntry, type ActivityPage, type ActivityQuery } from '../../../shared/services/activityApi';
import { propertyApi } from '../../../shared/services/propertyApi';
import { useApiResource } from '../../../shared/services/useApiResource';
import { toast } from '../../../shared/utils/toast';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { ActivityDetailDrawer } from './ActivityDetailDrawer';
import { KIND_STYLES, activityKind, clockTime, entriesToCsv, fullStamp, shortDate } from './activityMeta';

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
  ['meal-plans', 'Meal plans'],
  ['reservation-settings', 'Reservation settings'],
  ['post-master-settings', 'Post master settings'],
  ['property-amenities', 'Property amenities'],
  ['properties', 'Properties'],
  ['users', 'Users'],
  ['auth', 'Sign-ins and passwords'],
];

type Range = 'hour' | 'day' | 'week' | 'month' | 'all' | 'custom';
const RANGES: Array<{ id: Exclude<Range, 'custom'>; label: string; ms: number | null }> = [
  { id: 'hour', label: 'Last hour', ms: 3_600_000 },
  { id: 'day', label: '24 hours', ms: 86_400_000 },
  { id: 'week', label: '7 days', ms: 7 * 86_400_000 },
  { id: 'month', label: '30 days', ms: 30 * 86_400_000 },
  { id: 'all', label: 'All time', ms: null },
];

/** Start and end of a local calendar day, as the ISO instants the data layer filters on. */
const dayStart = (day: string) => new Date(`${day}T00:00:00`).toISOString();
const dayEnd = (day: string) => new Date(`${day}T23:59:59.999`).toISOString();

function downloadCsv(entries: readonly ActivityEntry[]) {
  const url = URL.createObjectURL(new Blob([entriesToCsv(entries)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function RemovableChip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted-surface px-2.5 py-1 text-label text-ink">
      {children}
      <button type="button" aria-label="Remove filter" className="cursor-pointer text-ink-secondary hover:text-ink" onClick={onRemove}>
        <Lucide.X size={12} aria-hidden="true" />
      </button>
    </span>
  );
}

function ActivityRow({ entry, onOpen }: { entry: ActivityEntry; onOpen: () => void }) {
  const kind = KIND_STYLES[activityKind(entry)];
  const failed = entry.statusCode >= 400;
  return (
    <tr className="cursor-pointer" onClick={onOpen}>
      <td className="whitespace-nowrap">
        <time dateTime={entry.createdAt} title={fullStamp(entry.createdAt)}>
          <span className="block text-label font-semibold text-ink">{shortDate(entry.createdAt)}</span>
          <span className="block text-label text-ink-secondary">{clockTime(entry.createdAt)}</span>
        </time>
      </td>
      <td>
        <div className="min-w-0">
          <button
            type="button"
            className="cursor-pointer text-left text-label font-semibold text-ink hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            {entry.summary}
          </button>
          <p className="font-mono text-micro text-ink-muted">{entry.action}</p>
        </div>
      </td>
      <td>
        <Badge tone={kind.tone} size="sm">
          <kind.Icon size={11} aria-hidden="true" /> {kind.label}
        </Badge>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <Avatar name={entry.actor.name ?? '?'} size={28} />
          <div className="min-w-0">
            <p className="truncate text-label font-semibold text-ink">{entry.actor.name ?? 'Unknown'}</p>
            <p className="truncate text-label text-ink-secondary">{entry.actor.role === 'SUPER_ADMIN' ? 'Super admin' : (entry.actor.email ?? 'Staff')}</p>
          </div>
        </div>
      </td>
      <td>
        {entry.property ? (
          <Badge tone="info" size="sm">
            {entry.property.code} · {entry.property.name}
          </Badge>
        ) : (
          <Badge tone="neutral" size="sm">
            Platform
          </Badge>
        )}
      </td>
      <td>
        <Badge tone={failed ? 'danger' : 'success'} size="sm">
          {entry.statusCode}
        </Badge>
      </td>
      <td className="text-right">
        <IconButton title="View details" aria-label={`View details: ${entry.summary}`} onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          <Lucide.ChevronRight size={14} />
        </IconButton>
      </td>
    </tr>
  );
}

/**
 * SUPER_ADMIN only: everything people did through the data layer, newest first, for one property or all of them.
 * The properties page links here with a property already chosen.
 */
export function ActivityLogPage({ initialPropertyId }: { initialPropertyId?: string }) {
  const [property, setProperty] = useState(initialPropertyId ?? '');
  const [resource, setResource] = useState('');
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<Range>('week');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ActivityEntry | null>(null);
  const search = useDebouncedValue(query.trim());
  // Relative ranges are measured from the moment the filter was chosen or the list refreshed, not on every render.
  const [rangeAnchor, setRangeAnchor] = useState(() => Date.now());

  const properties = useApiResource(() => propertyApi.list(), []);
  const rangeMs = range === 'custom' ? null : RANGES.find((r) => r.id === range)?.ms ?? null;
  const log = useApiResource(() => {
    const request: ActivityQuery = {
      ...(property === PLATFORM ? { platformOnly: true } : property ? { propertyId: property } : {}),
      ...(resource ? { resource } : {}),
      ...(search ? { search } : {}),
      ...(range === 'custom'
        ? { ...(from ? { from: dayStart(from) } : {}), ...(to ? { to: dayEnd(to) } : {}) }
        : rangeMs
          ? { from: new Date(rangeAnchor - rangeMs).toISOString() }
          : {}),
      page: page + 1,
      pageSize: PAGE_SIZE,
    };
    return activityApi.list(request);
  }, [property, resource, search, range, from, to, page, rangeAnchor]);

  // Keep showing the previous page while a refresh or filter change loads, so the timeline does not blank.
  const [kept, setKept] = useState<ActivityPage | null>(null);
  if (log.data && log.data !== kept) setKept(log.data);
  const data = log.data ?? kept;

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const selectedProperty = properties.data?.find((p) => p.id === property);
  const resourceLabel = RESOURCE_OPTIONS.find(([value]) => value === resource)?.[1];
  const filtered = Boolean(property || resource || search);

  const change = (apply: () => void) => {
    apply();
    setPage(0);
    setSelected(null);
  };
  const chooseRange = (next: Range) =>
    change(() => {
      setRange(next);
      setRangeAnchor(Date.now());
      if (next !== 'custom') {
        setFrom('');
        setTo('');
      }
    });
  const clearAll = () =>
    change(() => {
      setProperty('');
      setResource('');
      setQuery('');
    });
  const reload = () => {
    setRangeAnchor(Date.now());
    log.refresh();
  };

  return (
    <div className="pms-page gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-disp3 font-bold leading-tight tracking-tight text-ink">Activity log</h2>
          <p className="mt-0.5 text-label text-ink-secondary">
            Who did what, and when{selectedProperty ? `, at ${selectedProperty.name}` : ', across every property'}. Select a row for its full details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={<Lucide.RefreshCw size={13} className={log.loading ? 'animate-spin' : ''} />} onClick={reload}>
            Refresh
          </Button>
          <Button
            variant="secondary"
            icon={<Lucide.Download size={13} />}
            disabled={!data || data.data.length === 0}
            onClick={() => {
              if (data) {
                downloadCsv(data.data);
                toast.success('Exported', `${data.data.length} entries from this page.`);
              }
            }}
          >
            Export page
          </Button>
        </div>
      </header>

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <FilterChip key={r.id} active={range === r.id} onClick={() => chooseRange(r.id)}>
                {r.label}
              </FilterChip>
            ))}
            <FilterChip active={range === 'custom'} onClick={() => chooseRange('custom')}>
              <Lucide.Calendar size={12} aria-hidden="true" /> Custom
            </FilterChip>
          </div>

          {range === 'custom' ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:max-w-md">
              <TextField type="date" value={from} max={to || undefined} onChange={(e) => change(() => setFrom(e.target.value))} aria-label="From date" />
              <TextField type="date" value={to} min={from || undefined} onChange={(e) => change(() => setTo(e.target.value))} aria-label="To date" />
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="relative">
              <Lucide.Search size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <TextField
                type="search"
                value={query}
                onChange={(e) => change(() => setQuery(e.target.value))}
                placeholder="Search by activity, person or email"
                aria-label="Search activity"
                className="!pl-8"
              />
            </div>
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
          </div>

          {filtered ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-label text-ink-secondary">Filtered by</span>
              {property ? (
                <RemovableChip onRemove={() => change(() => setProperty(''))}>{property === PLATFORM ? 'Platform only' : (selectedProperty?.name ?? 'Property')}</RemovableChip>
              ) : null}
              {resourceLabel ? <RemovableChip onRemove={() => change(() => setResource(''))}>{resourceLabel}</RemovableChip> : null}
              {search ? <RemovableChip onRemove={() => change(() => setQuery(''))}>“{search}”</RemovableChip> : null}
              <button type="button" className="cursor-pointer text-label font-semibold text-primary" onClick={clearAll}>
                Clear all
              </button>
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-label text-ink-secondary" aria-live="polite">
            {data ? (
              <>
                <span className="font-semibold text-ink">{data.total.toLocaleString('en-IN')}</span> {data.total === 1 ? 'event' : 'events'}
                {filtered || range !== 'all' ? ' match' : ''}
              </>
            ) : (
              'Loading…'
            )}
          </p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-micro text-ink-secondary" aria-label="Legend">
            {(['create', 'update', 'delete', 'signin', 'failed'] as const).map((k) => {
              const style = KIND_STYLES[k];
              return (
                <li key={k} className="inline-flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${TONE_CLASSES[style.tone].dot}`} aria-hidden="true" />
                  {style.label}
                </li>
              );
            })}
          </ul>
        </div>

        {log.error ? (
          <p role="alert" className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            <Lucide.AlertCircle size={15} aria-hidden="true" /> Could not load the activity log: {log.error}
            <button type="button" className="cursor-pointer font-semibold underline" onClick={reload}>
              Try again
            </button>
          </p>
        ) : null}

        {!data && !log.error ? (
          <CardSkeleton lines={6} label="Loading activity" />
        ) : data && data.data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Lucide.SearchX size={28} className="text-ink-muted" aria-hidden="true" />
            <p className="text-body font-semibold text-ink">{filtered || range !== 'all' ? 'No activity matches' : 'No activity yet'}</p>
            <p className="text-label text-ink-secondary">
              {filtered || range !== 'all' ? 'Try a wider time range or remove a filter.' : 'Changes appear here as soon as someone makes one.'}
            </p>
            {filtered || range !== 'all' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  clearAll();
                  chooseRange('all');
                }}
              >
                Reset filters
              </Button>
            ) : null}
          </div>
        ) : data ? (
          <div className={log.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <TableContainer>
              <table className="pms-table w-full text-left">
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>EVENT</th>
                    <th>TYPE</th>
                    <th>PERSON</th>
                    <th>PROPERTY</th>
                    <th>STATUS</th>
                    <th className="text-right">
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((entry) => (
                    <ActivityRow key={entry.id} entry={entry} onOpen={() => setSelected(entry)} />
                  ))}
                </tbody>
              </table>
            </TableContainer>
            <div className="mt-4">
              <Pagination
                page={Math.min(page, totalPages - 1)}
                totalPages={totalPages}
                onChange={(next) => {
                  setPage(next);
                  setSelected(null);
                }}
                summary={`Showing ${page * PAGE_SIZE + 1} to ${Math.min((page + 1) * PAGE_SIZE, data.total)} of ${data.total.toLocaleString('en-IN')} events`}
              />
            </div>
          </div>
        ) : null}
      </Card>

      <ActivityDetailDrawer entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
