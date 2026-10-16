import { useCallback } from 'react';
import * as Lucide from 'lucide-react';
import { Badge, Card, CardTitle } from '../components/ui';
import { toast } from '../components/toastStore';
import { propertyApi } from '../lib/api/pms';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { useAuth } from '../features/auth/AuthContext';

export function Properties() {
  const { me, switchProperty } = useAuth();
  const load = useCallback(() => propertyApi.list(), []);
  const resource = useApiResource(load);
  const properties = resource.data ?? [];

  const changeProperty = async (id: string) => {
    try {
      await switchProperty(id);
      toast('Property switched', { detail: 'The current property context was updated.', tone: 'success' });
    } catch (error) { toast('Could not switch property', { detail: displayApiError(error), tone: 'danger' }); }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.Building2 className="text-primary" size={26} />
            <span>Properties & Portfolios</span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Active hotel properties, location details, multi-property portfolios, and access switching
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border"
            title="Refresh properties"
          >
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <Card elevated>
        <CardTitle
          title="Accessible Properties"
          subtitle={resource.loading ? 'Loading property access…' : `${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} accessible with your account`}
        />
        {resource.error ? <p role="alert" className="pms-helper">Could not load properties: {resource.error}</p> : null}
        
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 mt-1">
          {properties.map((property) => {
            const current = property.id === me?.activePropertyId;
            return (
              <article
                key={property.id}
                className="rounded-xl border p-3.5 sm:p-4 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  borderColor: current ? 'var(--color-primary)' : 'var(--color-border)',
                  background: current ? 'var(--color-hover-surface)' : 'var(--color-surface)',
                  boxShadow: current ? '0 0 0 1.5px var(--color-primary), var(--shadow-sm)' : 'var(--shadow-xs)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="rounded-control p-2.5 shrink-0"
                      style={{
                        background: current ? 'var(--color-primary)' : 'var(--color-muted-surface)',
                        color: current ? 'white' : 'var(--color-ink-secondary)',
                      }}
                    >
                      <Lucide.Building2 size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-brand text-[17px] font-bold text-ink truncate">{property.name}</p>
                      <p className="flex items-center gap-1 text-[12.5px] text-ink-secondary mt-0.5 truncate">
                        <Lucide.MapPin size={12} className="shrink-0 text-ink-muted" />
                        <span>{[property.addressLine1, property.city].filter(Boolean).join(' · ') || property.slug}</span>
                      </p>
                    </div>
                  </div>
                  {current ? (
                    <Badge tone="success">
                      <span className="flex items-center gap-1">
                        <Lucide.Check size={11} />
                        <span>Active</span>
                      </span>
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Available</Badge>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-[10px] border p-2.5 bg-surface" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="flex items-center justify-center gap-1 tnum text-[15px] font-semibold text-ink">
                      <Lucide.Coins size={14} className="text-ink-muted" />
                      <span>{property.currencyCode}</span>
                    </p>
                    <p className="pms-helper text-[11px] mt-0.5">Base currency</p>
                  </div>
                  <div className="rounded-[10px] border p-2.5 bg-surface" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="flex items-center justify-center gap-1 tnum text-[14px] font-semibold text-ink truncate" title={property.timezone}>
                      <Lucide.Clock size={13} className="text-ink-muted shrink-0" />
                      <span className="truncate">{property.timezone.split('/')[1]?.replace('_', ' ') || property.timezone}</span>
                    </p>
                    <p className="pms-helper text-[11px] mt-0.5">Time zone</p>
                  </div>
                </div>

                {!current ? (
                  <button
                    type="button"
                    className="pms-btn-ghost flex items-center justify-center gap-1.5 mt-4 w-full px-3 py-2.5 text-[13px] font-medium"
                    onClick={() => void changeProperty(property.id)}
                  >
                    <span>Switch context</span>
                    <Lucide.ArrowRight size={14} />
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 mt-4 py-2 text-[12px] font-medium text-primary">
                    <Lucide.CheckCircle2 size={14} />
                    <span>Current active property context</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {!resource.loading && properties.length === 0 ? (
          <p className="pms-helper py-8 text-center">No active properties are assigned to this account.</p>
        ) : null}
      </Card>
    </div>
  );
}
