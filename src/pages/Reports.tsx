import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Badge, Card, CardTitle } from '../components/ui';
import { BarChart, DonutChart } from '../components/charts';
import type { NavTarget } from '../components/nav';
import { auditApi, nightAuditApi, reportsApi } from '../lib/api/pms';
import { useApiResource } from '../lib/api/useApiResource';
import { useAuth } from '../features/auth/AuthContext';
import { newIdempotencyKey, displayApiError, downloadApiFile } from '../lib/api/client';
import { toast } from '../components/toastStore';
import { PromptDialog } from '../components/overlays';

export function Reports({ go }: { go: (t: NavTarget) => void }) {
  const { can } = useAuth();
  const [reopenModal, setReopenModal] = useState(false);

  const load = useCallback(async () => {
    const flash = await reportsApi.dailyFlash();
    const date = flash.businessDate;
    const [occupancy, revenue, audit, housekeeping] = await Promise.all([
      reportsApi.occupancy(date, date),
      can('report.read.financial') ? reportsApi.revenue(date, date) : Promise.resolve(null),
      can('audit-log.read') ? auditApi.list(10) : Promise.resolve(null),
      reportsApi.housekeeping(date, date),
    ]);
    return { flash, occupancy, revenue, audit, housekeeping };
  }, [can]);

  const resource = useApiResource(load);
  const data = resource.data;
  const auditDate = data?.flash.businessDate ?? '';
  const nightAuditResource = useApiResource(
    () => (auditDate && can('night-audit.read') ? nightAuditApi.get(auditDate) : Promise.resolve(null)),
    [auditDate, can],
  );

  const runNightAudit = async (action: 'preview' | 'close') => {
    if (!auditDate) return;
    try {
      if (action === 'preview') await nightAuditApi.preview(auditDate);
      else if (action === 'close') await nightAuditApi.close(auditDate, newIdempotencyKey(`night-audit:${auditDate}`));
      nightAuditResource.refresh();
      toast(`Night audit ${action} complete`, { detail: auditDate, tone: 'success' });
    } catch (error) {
      toast(`Night audit ${action} failed`, { detail: displayApiError(error), tone: 'danger' });
    }
  };

  const handleReopenSubmit = async (reason: string) => {
    if (!auditDate || !reason.trim()) return;
    try {
      await nightAuditApi.reopen(auditDate, reason.trim());
      nightAuditResource.refresh();
      setReopenModal(false);
      toast('Night audit reopened', { detail: auditDate, tone: 'success' });
    } catch (error) {
      toast('Night audit reopen failed', { detail: displayApiError(error), tone: 'danger' });
    }
  };

  const tiles = [
    {
      title: 'Occupancy Report',
      desc: 'Available and sold room-nights breakdown',
      target: { view: 'occupancy-report' } as NavTarget,
      Icon: Lucide.BedDouble,
    },
    ...(can('report.read.financial')
      ? [
          {
            title: 'Revenue Report',
            desc: 'ADR, RevPAR, gross revenue and tax breakdown',
            target: { view: 'revenue-report' } as NavTarget,
            Icon: Lucide.TrendingUp,
          },
        ]
      : []),
    {
      title: 'Arrivals & Departures',
      desc: 'Daily guest movements, check-ins and check-outs',
      target: { view: 'arrivals-departures' } as NavTarget,
      Icon: Lucide.ArrowLeftRight,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.BarChart3 className="text-primary" size={28} />
            <span>Operational & Financial Reports</span>
          </h1>
          <p className="mt-1 text-xs text-ink-secondary">
            Property performance analytics, occupancy forecasts, daily flash metrics, and manager audits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl border border-border"
            title="Refresh analytics"
          >
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {resource.error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <Lucide.AlertCircle size={18} />
          <span>Could not load reports: {resource.error}</span>
        </div>
      ) : null}

      {/* Navigation Quick Tiles */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {tiles.map((tile) => (
          <button
            key={tile.title}
            type="button"
            onClick={() => go(tile.target)}
            className="pms-card pms-card-hover p-3 sm:p-3.5 text-left flex flex-col justify-between transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.03] text-primary">
                  <tile.Icon size={20} />
                </span>
                <Lucide.ArrowUpRight size={18} className="text-ink-muted" />
              </div>
              <p className="pms-section-title font-bold text-ink text-[16px]">{tile.title}</p>
              <p className="pms-helper mt-1 text-xs leading-relaxed">{tile.desc}</p>
            </div>
            <p className="mt-4 text-xs font-semibold text-primary flex items-center gap-1">
              <span>View detailed report</span>
              <Lucide.ChevronRight size={13} />
            </p>
          </button>
        ))}
      </div>

      {/* Charts Overview */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardTitle
            title="Occupancy Snapshot"
            subtitle={data ? `Business date ${data.flash.businessDate}` : 'Loading operational report…'}
          />
          {data ? (
            <div className="mt-2">
              <BarChart
                label="Room occupancy"
                data={[{ label: 'Occupied', value: Number(data.occupancy.occupancyPct), highlight: true }]}
              />
              <p className="pms-helper mt-3 text-xs">
                {data.occupancy.soldRoomNights} sold of {data.occupancy.availableRoomNights} available room-nights in the selected range.
              </p>
            </div>
          ) : null}
        </Card>
        <Card className="xl:col-span-2">
          <CardTitle title="Room-Night Mix" subtitle="Sold versus unsold inventory" />
          {data ? (
            <div className="mt-2">
              <DonutChart
                label="Sold and unsold room nights"
                slices={[
                  { label: 'Sold', value: data.occupancy.soldRoomNights, color: 'var(--color-primary)' },
                  { label: 'Unsold', value: data.occupancy.unsoldRoomNights, color: 'var(--color-warning-text)' },
                ]}
              />
            </div>
          ) : null}
        </Card>
      </div>

      {/* Operational and Financial Snapshots */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle
            title="Operational Snapshot"
            subtitle="Current property front-desk movements"
            action={
              data && can('report.export') ? (
                <button
                  type="button"
                  className="pms-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                  onClick={() =>
                    void downloadApiFile(
                      reportsApi.exportDailyFlash(data.flash.businessDate),
                      `daily-flash-${data.flash.businessDate}.csv`,
                    ).catch((error: unknown) =>
                      toast('Export failed', { detail: displayApiError(error), tone: 'danger' }),
                    )
                  }
                >
                  <Lucide.Download size={14} />
                  <span>Export CSV</span>
                </button>
              ) : undefined
            }
          />
          {data ? (
            <ul className="flex flex-col gap-2 mt-2">
              {[
                { label: 'Arrivals', value: data.flash.arrivals.length, icon: Lucide.LogIn },
                { label: 'Departures', value: data.flash.departures.length, icon: Lucide.LogOut },
                { label: 'In-house Guests', value: data.flash.inHouseCount, icon: Lucide.Users },
                { label: 'Open Housekeeping Tasks', value: data.flash.housekeeping.open, icon: Lucide.Sparkles },
                { label: 'Open Maintenance Tickets', value: data.flash.maintenance.open, icon: Lucide.Wrench },
              ].map(({ label, value, icon: Icon }) => (
                <li
                  key={label}
                  className="flex items-center justify-between rounded-xl border px-3.5 py-2.5 transition-colors hover:bg-black/[0.01]"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                    <Icon size={15} className="text-ink-muted" />
                    <span>{label}</span>
                  </span>
                  <Badge tone="neutral">{value}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card>
          <CardTitle
            title="Financial Snapshot"
            subtitle={
              data?.revenue
                ? `${data.revenue.currencyCode} · ${data.revenue.from} to ${data.revenue.to}`
                : 'Financial permission required for revenue data'
            }
          />
          {data?.revenue ? (
            <ul className="flex flex-col gap-2 mt-2">
              {[
                ['Room Revenue', data.revenue.roomRevenue],
                ['Other Revenue', data.revenue.otherRevenue],
                ['Taxes Total', data.revenue.taxTotal],
                ['Payments Net Collected', data.revenue.paymentsNetCollected],
                ['ADR / RevPAR', `${data.revenue.adr} / ${data.revenue.revpar}`],
              ].map(([label, value]) => (
                <li
                  key={label}
                  className="flex items-center justify-between gap-2 border-b py-2.5 last:border-0"
                  style={{ borderColor: 'var(--color-divider)' }}
                >
                  <span className="text-[13px] text-ink-secondary">{label}</span>
                  <span className="tnum font-bold text-ink">{value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pms-helper py-8 text-center">
              This role cannot read financial reports, or the backend returned no report data.
            </p>
          )}
        </Card>
      </div>

      {/* Housekeeping Performance */}
      {data?.housekeeping ? (
        <Card>
          <CardTitle
            title="Housekeeping Performance"
            subtitle={`${data.housekeeping.from} · ${data.housekeeping.completionRate}% completion · ${data.housekeeping.avgTurnaroundHours}h avg turnaround`}
          />
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 mt-2">
            {[
              ['Total Tasks', String(data.housekeeping.totalTasks)],
              ['Completed', String(data.housekeeping.completed)],
              ['Blocked', String(data.housekeeping.blocked)],
              ['Rooms Serviced', `${data.housekeeping.roomsTouched} / ${data.housekeeping.roomsTotal}`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border p-3 shadow-xs"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
              >
                <p className="text-xs text-ink-muted">{label}</p>
                <p className="tnum text-[20px] font-bold text-ink mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
            <table className="pms-table min-w-[480px]">
              <thead>
                <tr>
                  <th>Task Type</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Completed</th>
                  <th className="text-right">Blocked</th>
                </tr>
              </thead>
              <tbody>
                {data.housekeeping.byType.map((row) => (
                  <tr key={row.type}>
                    <td className="font-semibold text-ink">{row.type.replace(/_/g, ' ')}</td>
                    <td className="tnum text-right">{row.total}</td>
                    <td className="tnum text-right font-semibold text-emerald-600">{row.completed}</td>
                    <td className="tnum text-right text-rose-600">{row.blocked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* Night Audit Card */}
      {can('night-audit.read') ? (
        <Card>
          <CardTitle
            title="Night Audit"
            subtitle={`Business date ${auditDate} · Advisory and day-close workflow`}
          />
          {nightAuditResource.error ? (
            <p role="alert" className="pms-helper mb-2 text-danger">
              {nightAuditResource.error}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <Badge tone={nightAuditResource.data?.status === 'COMPLETED' ? 'success' : 'neutral'}>
              {nightAuditResource.data?.status ?? 'Not previewed'}
            </Badge>
            {nightAuditResource.data?.previewSummary?.exceptionCount !== undefined ? (
              <span className="pms-helper text-xs">
                {nightAuditResource.data.previewSummary.exceptionCount} preview exceptions
              </span>
            ) : null}
            {can('night-audit.run') ? (
              <button
                type="button"
                className="pms-btn-ghost px-3.5 py-2 text-xs font-semibold"
                onClick={() => void runNightAudit('preview')}
              >
                Run preview
              </button>
            ) : null}
            {can('night-audit.approve') && nightAuditResource.data?.status !== 'COMPLETED' ? (
              <button
                type="button"
                className="pms-btn-primary px-3.5 py-2 text-xs font-semibold"
                onClick={() => void runNightAudit('close')}
              >
                Close business date
              </button>
            ) : null}
            {can('night-audit.approve') && nightAuditResource.data?.status === 'COMPLETED' ? (
              <button
                type="button"
                className="pms-btn-ghost px-3.5 py-2 text-xs text-amber-600 font-semibold"
                onClick={() => setReopenModal(true)}
              >
                Reopen business date
              </button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {/* Audit Log Card */}
      {data?.audit ? (
        <Card>
          <CardTitle
            title="Recent Audit Events"
            subtitle={`${data.audit.total} events recorded · latest ${data.audit.returned} shown`}
            action={
              can('audit-log.export') ? (
                <button
                  type="button"
                  className="pms-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                  onClick={() =>
                    void downloadApiFile(auditApi.export(), 'audit-log.csv').catch((error: unknown) =>
                      toast('Audit export failed', { detail: displayApiError(error), tone: 'danger' }),
                    )
                  }
                >
                  <Lucide.Download size={14} />
                  <span>Export CSV</span>
                </button>
              ) : undefined
            }
          />
          <div className="mt-3 overflow-x-auto">
            <table className="pms-table min-w-[680px]">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Resource</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.rows.map((event) => (
                  <tr key={event.id} className="transition-colors hover:bg-black/[0.01]">
                    <td className="tnum text-xs text-ink-secondary">{event.createdAt}</td>
                    <td className="font-semibold text-ink">{event.action}</td>
                    <td>{event.actorName ?? 'System'}</td>
                    <td className="font-mono text-xs text-ink-secondary">
                      {event.resourceType}
                      {event.resourceId ? ` · ${event.resourceId}` : ''}
                    </td>
                    <td>
                      <Badge tone={event.outcome === 'SUCCESS' ? 'success' : 'danger'}>
                        {event.outcome}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* Night Audit Reopen PromptDialog */}
      <PromptDialog
        open={reopenModal}
        onClose={() => setReopenModal(false)}
        onSubmit={handleReopenSubmit}
        title={`Reopen Night Audit for ${auditDate}`}
        subtitle="This action will unlock transactions and reverse the business date close status."
        label="Reason for reopening"
        placeholder="e.g. Late posting correction, financial reconciliation adjustment"
        confirmLabel="Reopen Business Date"
        danger
      />
    </div>
  );
}
