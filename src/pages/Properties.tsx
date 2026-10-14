import { useCallback } from 'react';
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
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle title="Properties" subtitle={resource.loading ? 'Loading your property access…' : 'Properties available to your account'} />
        {resource.error ? <p role="alert" className="pms-helper">Could not load properties: {resource.error}</p> : null}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {properties.map((property) => {
            const current = property.id === me?.activePropertyId;
            return (
              <article key={property.id} className="rounded-[12px] border p-4" style={{ borderColor: current ? 'var(--color-primary)' : 'var(--color-border)', background: current ? 'var(--color-hover-surface)' : 'var(--color-surface)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-brand text-[18px] font-bold" style={{ color: 'var(--color-ink)' }}>{property.name}</p><p className="text-[12.5px]" style={{ color: 'var(--color-ink-secondary)' }}>{[property.addressLine1, property.city].filter(Boolean).join(' · ') || property.slug}</p></div>
                  {current ? <Badge tone="success">Current</Badge> : <Badge tone="neutral">Available</Badge>}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-[8px] border p-2" style={{ borderColor: 'var(--color-border)' }}><p className="tnum text-[16px] font-semibold">{property.currencyCode}</p><p className="pms-helper">Currency</p></div>
                  <div className="rounded-[8px] border p-2" style={{ borderColor: 'var(--color-border)' }}><p className="tnum text-[16px] font-semibold">{property.timezone}</p><p className="pms-helper">Time zone</p></div>
                </div>
                {!current ? <button type="button" className="pms-btn-ghost mt-3 w-full px-3 py-2" onClick={() => void changeProperty(property.id)}>Switch context</button> : <p className="pms-helper mt-3">Your active property.</p>}
              </article>
            );
          })}
        </div>
        {!resource.loading && properties.length === 0 ? <p className="pms-helper py-5 text-center">No active properties are assigned to this account.</p> : null}
      </Card>
    </div>
  );
}
