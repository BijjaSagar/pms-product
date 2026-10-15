import { useCallback } from 'react';
import { Badge, Card, CardTitle } from '../components/ui';
import { BarChart, DonutChart } from '../components/charts';
import type { NavTarget } from '../components/nav';
import { auditApi, nightAuditApi, reportsApi } from '../lib/api/pms';
import { useApiResource } from '../lib/api/useApiResource';
import { useAuth } from '../features/auth/AuthContext';
import { newIdempotencyKey, displayApiError, downloadApiFile } from '../lib/api/client';
import { toast } from '../components/toastStore';

export function Reports({ go }: { go: (t: NavTarget) => void }) {
  const { can } = useAuth();
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
    () => auditDate && can('night-audit.read') ? nightAuditApi.get(auditDate) : Promise.resolve(null),
    [auditDate, can],
  );

  const runNightAudit = async (action: 'preview' | 'close' | 'reopen') => {
    if (!auditDate) return;
    try {
      if (action === 'preview') await nightAuditApi.preview(auditDate);
      else if (action === 'close') await nightAuditApi.close(auditDate, newIdempotencyKey(`night-audit:${auditDate}`));
      else {
        const reason = window.prompt(`Reason for reopening ${auditDate}:`);
        if (!reason?.trim()) return;
        await nightAuditApi.reopen(auditDate, reason.trim());
      }
      nightAuditResource.refresh();
      toast(`Night audit ${action} complete`, { detail: auditDate, tone: 'success' });
    } catch (error) { toast(`Night audit ${action} failed`, { detail: displayApiError(error), tone: 'danger' }); }
  };

  const tiles: { title: string; desc: string; target: NavTarget }[] = [
    { title: 'Occupancy Report', desc: 'Available and sold room-nights', target: { view: 'occupancy-report' } },
    { title: 'Arrivals & Departures', desc: 'Reservation movement', target: { view: 'arrivals-departures' } },
  ];
  if (can('report.read.financial')) tiles.splice(1, 0, { title: 'Revenue Report', desc: 'Revenue, ADR and RevPAR', target: { view: 'revenue-report' } });

  return (
    <div className="flex flex-col gap-4">
      {resource.error ? <p role="alert" className="pms-helper">Could not load reports: {resource.error}</p> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <button key={tile.title} type="button" onClick={() => go(tile.target)} className="pms-card pms-card-hover p-5 text-left">
            <p className="pms-section-title">{tile.title}</p>
            <p className="pms-helper mt-1">{tile.desc}</p>
            <p className="mt-3 text-[13px] font-semibold" style={{ color: 'var(--color-primary)' }}>Open report →</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardTitle title="Occupancy snapshot" subtitle={data ? `Business date ${data.flash.businessDate}` : 'Loading operational report…'} />
          {data ? <BarChart label="Room occupancy" data={[{ label: 'Occupied', value: Number(data.occupancy.occupancyPct), highlight: true }]} /> : null}
          {data ? <p className="pms-helper mt-3">{data.occupancy.soldRoomNights} sold of {data.occupancy.availableRoomNights} available room-nights in the selected date range.</p> : null}
        </Card>
        <Card className="xl:col-span-2">
          <CardTitle title="Room-night mix" subtitle="Sold versus unsold inventory" />
          {data ? <DonutChart label="Sold and unsold room nights" slices={[
            { label: 'Sold', value: data.occupancy.soldRoomNights, color: 'var(--color-primary)' },
            { label: 'Unsold', value: data.occupancy.unsoldRoomNights, color: 'var(--color-warning-text)' },
          ]} /> : null}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle title="Operational snapshot" subtitle="Current property state from the backend" action={data && can('report.export') ? <button type="button" className="pms-btn-ghost px-3 py-2" onClick={() => void downloadApiFile(reportsApi.exportDailyFlash(data.flash.businessDate), `daily-flash-${data.flash.businessDate}.csv`).catch((error: unknown) => toast('Export failed', { detail: displayApiError(error), tone: 'danger' }))}>Export CSV</button> : undefined} />
          {data ? <ul className="flex flex-col gap-2">
            {[
              ['Arrivals', data.flash.arrivals.length],
              ['Departures', data.flash.departures.length],
              ['In house', data.flash.inHouseCount],
              ['Open housekeeping tasks', data.flash.housekeeping.open],
              ['Open maintenance tickets', data.flash.maintenance.open],
            ].map(([label, value]) => <li key={label} className="flex items-center justify-between rounded-control border px-3 py-2.5" style={{ borderColor: 'var(--color-border)' }}><span className="text-[13px]">{label}</span><Badge tone="neutral">{value}</Badge></li>)}
          </ul> : null}
        </Card>
        <Card>
          <CardTitle title="Financial snapshot" subtitle={data?.revenue ? `${data.revenue.currencyCode} · ${data.revenue.from} to ${data.revenue.to}` : 'Financial permission required for revenue data'} />
          {data?.revenue ? <ul className="flex flex-col gap-2">
            {[
              ['Room revenue', data.revenue.roomRevenue],
              ['Other revenue', data.revenue.otherRevenue],
              ['Tax', data.revenue.taxTotal],
              ['Payments net collected', data.revenue.paymentsNetCollected],
              ['ADR / RevPAR', `${data.revenue.adr} / ${data.revenue.revpar}`],
            ].map(([label, value]) => <li key={label} className="flex items-center justify-between gap-2 border-b py-2 last:border-0" style={{ borderColor: 'var(--color-divider)' }}><span className="pms-helper">{label}</span><span className="tnum font-semibold">{value}</span></li>)}
          </ul> : <p className="pms-helper">This role cannot read financial reports, or the backend returned no report.</p>}
        </Card>
      </div>

      {data?.housekeeping ? <Card>
        <CardTitle title="Housekeeping performance" subtitle={`${data.housekeeping.from} · ${data.housekeeping.completionRate}% completed · ${data.housekeeping.avgTurnaroundHours}h average turnaround`} />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            ['Total tasks', String(data.housekeeping.totalTasks)],
            ['Completed', String(data.housekeeping.completed)],
            ['Blocked', String(data.housekeeping.blocked)],
            ['Rooms touched', `${data.housekeeping.roomsTouched}/${data.housekeeping.roomsTotal}`],
          ].map(([label, value]) => <div key={label} className="rounded-control border p-3" style={{ borderColor: 'var(--color-border)' }}><p className="pms-helper">{label}</p><p className="tnum text-[18px] font-semibold">{value}</p></div>)}
        </div>
        <div className="mt-3 overflow-x-auto"><table className="pms-table min-w-[480px]">
          <thead><tr><th>Type</th><th className="text-right">Total</th><th className="text-right">Completed</th><th className="text-right">Blocked</th></tr></thead>
          <tbody>{data.housekeeping.byType.map((row) => <tr key={row.type}><td className="font-medium">{row.type}</td><td className="tnum text-right">{row.total}</td><td className="tnum text-right">{row.completed}</td><td className="tnum text-right">{row.blocked}</td></tr>)}</tbody>
        </table></div>
      </Card> : null}

      {can('night-audit.read') ? <Card>
        <CardTitle title="Night audit" subtitle={`Business date ${auditDate} · advisory close`} />
        {nightAuditResource.error ? <p role="alert" className="pms-helper mb-2">{nightAuditResource.error}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={nightAuditResource.data?.status === 'COMPLETED' ? 'success' : 'neutral'}>{nightAuditResource.data?.status ?? 'Not previewed'}</Badge>
          {nightAuditResource.data?.previewSummary?.exceptionCount !== undefined ? <span className="pms-helper">{nightAuditResource.data.previewSummary.exceptionCount} preview exceptions</span> : null}
          {can('night-audit.run') ? <button type="button" className="pms-btn-ghost px-3 py-2" onClick={() => void runNightAudit('preview')}>Run preview</button> : null}
          {can('night-audit.approve') && nightAuditResource.data?.status !== 'COMPLETED' ? <button type="button" className="pms-btn-primary px-3 py-2" onClick={() => void runNightAudit('close')}>Close business date</button> : null}
          {can('night-audit.approve') && nightAuditResource.data?.status === 'COMPLETED' ? <button type="button" className="pms-btn-ghost px-3 py-2" onClick={() => void runNightAudit('reopen')}>Reopen</button> : null}
        </div>
      </Card> : null}

      {data?.audit ? <Card>
        <CardTitle title="Recent audit events" subtitle={`${data.audit.total} events · latest ${data.audit.returned} shown`} action={can('audit-log.export') ? <button type="button" className="pms-btn-ghost px-3 py-2" onClick={() => void downloadApiFile(auditApi.export(), 'audit-log.csv').catch((error: unknown) => toast('Audit export failed', { detail: displayApiError(error), tone: 'danger' }))}>Export CSV</button> : undefined} />
        <div className="overflow-x-auto"><table className="pms-table min-w-[680px]">
          <thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Resource</th><th>Outcome</th></tr></thead>
          <tbody>{data.audit.rows.map((event) => <tr key={event.id}>
            <td className="tnum">{event.createdAt}</td><td className="font-medium">{event.action}</td><td>{event.actorName ?? 'System'}</td>
            <td>{event.resourceType}{event.resourceId ? ` · ${event.resourceId}` : ''}</td><td><Badge tone={event.outcome === 'SUCCESS' ? 'success' : 'danger'}>{event.outcome}</Badge></td>
          </tr>)}</tbody>
        </table></div>
      </Card> : null}
    </div>
  );
}
