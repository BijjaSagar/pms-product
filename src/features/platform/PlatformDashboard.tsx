import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Avatar, Badge, Card, CardTitle } from '../../components/ui';
import { CardSkeleton } from '../../components/Skeleton';
import { Button, IconButton } from '../../components/primitives';
import { SummaryStrip } from '../../components/SummaryStrip';
import type { SummaryItem } from '../../components/SummaryStrip';
import { displayApiError } from '../../lib/api/client';
import { platformApi } from '../../lib/api/pms';
import type { PlatformOverview } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import type { BadgeTone } from '../../utils/status';
import { timeAgo } from '../../utils/date';
import { toast } from '../../utils/toast';
import { useAuth } from '../auth/AuthContext';
import type { PlatformView } from './platformNav';

interface Attention {
  key: string;
  count: number;
  /** "property has nobody assigned" / "properties have nobody assigned". */
  one: string;
  many: string;
  hint: string;
  tone: BadgeTone;
  view: PlatformView;
  /** Opens the sign-ups waiting for a decision instead of the whole page. */
  reviewSignups?: boolean;
}

function attentionItems({ properties, users }: PlatformOverview): Attention[] {
  const items: Attention[] = [
    {
      key: 'pending-approval',
      count: users.pendingApproval,
      one: 'sign-up is waiting for approval',
      many: 'sign-ups are waiting for approval',
      hint: 'They cannot use TriponX until you approve their property.',
      tone: 'warning',
      view: 'users',
      reviewSignups: true,
    },
    {
      key: 'staff-without-property',
      count: users.staffWithoutProperty,
      one: 'staff account has no property',
      many: 'staff accounts have no property',
      hint: 'They cannot sign in until you assign one.',
      tone: 'danger',
      view: 'users',
    },
    {
      key: 'properties-without-staff',
      count: properties.withoutStaff,
      one: 'property has nobody assigned',
      many: 'properties have nobody assigned',
      hint: 'Only super admins can open them until a team is added.',
      tone: 'warning',
      view: 'properties',
    },
    {
      key: 'pending-password',
      count: users.pendingPasswordChange,
      one: 'account is on a temporary password',
      many: 'accounts are on a temporary password',
      hint: 'They have not signed in and chosen their own yet.',
      tone: 'info',
      view: 'users',
    },
    {
      key: 'inactive-properties',
      count: properties.inactive,
      one: 'inactive property',
      many: 'inactive properties',
      hint: 'Their staff cannot open them.',
      tone: 'neutral',
      view: 'properties',
    },
  ];
  return items.filter((item) => item.count > 0);
}

function summaryItems({ properties, users, activeSessions, reservations, guests }: PlatformOverview): SummaryItem[] {
  const number = (value: number) => value.toLocaleString('en-IN');
  return [
    { label: 'Properties', value: number(properties.total), hint: `${properties.active} active · ${properties.inactive} inactive`, icon: Lucide.Building2, tone: 'primary' },
    { label: 'Rooms', value: number(properties.totalRooms), hint: 'Declared across all properties', icon: Lucide.BedDouble, tone: 'info' },
    { label: 'Active users', value: number(users.active), hint: `${users.superAdmins} super admin · ${users.staff} staff`, icon: Lucide.Users, tone: 'success' },
    { label: 'Open sessions', value: number(activeSessions), hint: 'Signed in and not signed out', icon: Lucide.KeyRound, tone: 'neutral' },
    { label: 'In-house now', value: number(reservations.inHouse), hint: `${number(guests)} guest profiles`, icon: Lucide.UserCheck, tone: 'warning' },
    { label: 'Arrivals today', value: number(reservations.arrivalsToday), hint: `${number(reservations.departuresToday)} departures due (UTC day)`, icon: Lucide.DoorOpen, tone: 'primary' },
  ];
}

/** The super admin's landing page: figures across every hotel, and what needs a decision. */
export function PlatformDashboard({ go, onReviewSignups }: { go: (view: PlatformView) => void; onReviewSignups: () => void }) {
  const { switchProperty } = useAuth();
  const overview = useApiResource(() => platformApi.overview(), []);
  const [opening, setOpening] = useState<string | null>(null);
  const data = overview.data;

  const open = async (propertyId: string) => {
    setOpening(propertyId);
    try {
      await switchProperty(propertyId);
    } catch (cause) {
      toast('Could not open the property', { detail: displayApiError(cause), tone: 'danger' });
      setOpening(null);
    }
  };

  return (
    <div className="pms-page gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-disp3 font-bold leading-tight tracking-tight text-ink">Platform overview</h2>
          <p className="mt-0.5 text-label text-ink-secondary">
            Every hotel on the platform{data ? ` · updated ${timeAgo(data.generatedAt)}` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton title="Refresh" aria-label="Refresh overview" onClick={() => overview.refresh()}>
            <Lucide.RefreshCw size={14} className={overview.loading ? 'animate-spin' : ''} />
          </IconButton>
          <Button variant="primary" onClick={() => go('new-property')} icon={<Lucide.Plus size={15} strokeWidth={2.4} />}>
            Add property
          </Button>
        </div>
      </header>

      {overview.error ? (
        <p role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
          <Lucide.AlertCircle size={15} aria-hidden="true" /> Could not load the overview: {overview.error}
          <button type="button" className="cursor-pointer font-semibold underline" onClick={() => overview.refresh()}>
            Try again
          </button>
        </p>
      ) : null}

      {data ? (
        <SummaryStrip label="Platform figures" items={summaryItems(data)} columns="xs:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" />
      ) : overview.error ? null : (
        <CardSkeleton lines={2} label="Loading platform figures" />
      )}

      {data ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardTitle
              icon={Lucide.Building2}
              title="Newest properties"
              subtitle={`${data.properties.total} in total`}
              action={
                <Button variant="secondary" onClick={() => go('properties')}>
                  View all
                </Button>
              }
            />
            {data.recentProperties.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Lucide.Building2 size={28} className="text-ink-muted" aria-hidden="true" />
                <p className="text-body font-semibold text-ink">No properties yet</p>
                <p className="text-label text-ink-secondary">Add the first hotel to get started.</p>
              </div>
            ) : (
              <ul className="divide-y divide-divider">
                {data.recentProperties.map((property) => (
                  <li key={property.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex flex-none rounded-lg bg-primary/10 px-2.5 py-1 text-label font-bold tracking-wide text-primary">{property.code}</span>
                      <div className="min-w-0">
                        <p className="truncate text-body font-semibold text-ink">{property.name}</p>
                        <p className="truncate text-label text-ink-secondary">
                          {property.city}, {property.country} · {property.totalRooms ?? 0} rooms · {property.staffCount} {property.staffCount === 1 ? 'user' : 'users'} · added {timeAgo(property.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className="flex flex-none items-center gap-2">
                      <Badge tone={property.isActive ? 'success' : 'warning'} size="sm" dot>
                        {property.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button variant="secondary" disabled={opening !== null} onClick={() => void open(property.id)} icon={<Lucide.ArrowUpRight size={13} />}>
                        Open
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle icon={Lucide.ShieldAlert} title="Needs attention" subtitle="Things only a super admin can fix" />
            {attentionItems(data).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Lucide.CheckCircle2 size={28} className="text-success-text" aria-hidden="true" />
                <p className="text-body font-semibold text-ink">All clear</p>
                <p className="text-label text-ink-secondary">Every property has a team and every account can sign in.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {attentionItems(data).map((item) => (
                  <li key={item.key} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-3">
                    <div className="min-w-0">
                      <p className="text-body font-semibold text-ink">
                        <Badge tone={item.tone} size="sm">
                          {item.count}
                        </Badge>{' '}
                        {item.count === 1 ? item.one : item.many}
                      </p>
                      <p className="mt-1 text-label text-ink-secondary">{item.hint}</p>
                    </div>
                    <Button variant="secondary" onClick={() => (item.reviewSignups ? onReviewSignups() : go(item.view))} icon={<Lucide.ArrowRight size={13} />}>
                      Review
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {data ? (
        <Card>
          <CardTitle icon={Lucide.History} title="Recent sign-ins" subtitle="The latest logins across the platform" />
          {data.recentSignIns.length === 0 ? (
            <p className="py-6 text-center text-label text-ink-secondary">Nobody has signed in yet.</p>
          ) : (
            <ul className="divide-y divide-divider">
              {data.recentSignIns.map((signIn) => (
                <li key={signIn.sessionId} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={signIn.name} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-body font-semibold text-ink">{signIn.name}</p>
                      <p className="truncate text-label text-ink-secondary">{signIn.email}</p>
                    </div>
                  </div>
                  <span className="flex flex-none flex-wrap items-center gap-2 text-label text-ink-secondary">
                    <Badge tone={signIn.role === 'SUPER_ADMIN' ? 'info' : 'neutral'} size="sm">
                      {signIn.role === 'SUPER_ADMIN' ? 'Super admin' : 'Staff'}
                    </Badge>
                    {signIn.ipAddress ? <span className="tnum">{signIn.ipAddress}</span> : null}
                    <span>{timeAgo(signIn.signedInAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}
