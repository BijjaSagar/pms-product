import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Badge, Card, CardTitle } from '../../components/ui';
import { Field, Switch } from '../../components/controls';
import { CardSkeleton } from '../../components/Skeleton';
import { ConfirmDialog, Modal } from '../../components/overlays';
import { Button, IconButton, TextArea, TextField } from '../../components/primitives';
import { toast } from '../../utils/toast';
import { displayApiError } from '../../lib/api/client';
import { subscriptionPlanApi } from '../../lib/api/pms';
import type { SubscriptionPlan, SubscriptionPlanInput } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { formatPlanPrice } from '../property-setup/setup-wizard/setupPlans';

interface Draft {
  name: string;
  tagline: string;
  price: string;
  currency: string;
  otaLimit: string;
  /** One feature per line. */
  features: string;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: string;
}

const emptyDraft = (sortOrder: number): Draft => ({
  name: '',
  tagline: '',
  price: '',
  currency: 'INR',
  otaLimit: '',
  features: '',
  isPopular: false,
  isActive: true,
  sortOrder: String(sortOrder),
});

const draftOf = (plan: SubscriptionPlan): Draft => ({
  name: plan.name,
  tagline: plan.tagline ?? '',
  price: String(plan.priceMonthly),
  currency: plan.currency,
  otaLimit: String(plan.otaLimit),
  features: plan.features.join('\n'),
  isPopular: plan.isPopular,
  isActive: plan.isActive,
  sortOrder: String(plan.sortOrder),
});

type Errors = Partial<Record<'name' | 'price' | 'currency' | 'otaLimit' | 'sortOrder', string>>;

function validate(d: Draft): Errors {
  const errors: Errors = {};
  if (d.name.trim().length < 2) errors.name = 'Enter a plan name.';
  const price = Number(d.price);
  if (d.price.trim() === '' || !Number.isFinite(price) || price < 0) errors.price = 'Enter the monthly price (0 or more).';
  else if (Math.round(price * 100) !== price * 100 && Math.abs(Math.round(price * 100) - price * 100) > 1e-6) errors.price = 'Use at most 2 decimal places.';
  if (!/^[A-Za-z]{3}$/.test(d.currency.trim())) errors.currency = 'Use a 3-letter currency code, such as INR.';
  const limit = Number(d.otaLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.otaLimit = 'Enter a whole number from 1 to 100.';
  const order = Number(d.sortOrder);
  if (!Number.isInteger(order) || order < 0) errors.sortOrder = 'Use a whole number, 0 or more.';
  return errors;
}

const toInput = (d: Draft): SubscriptionPlanInput => ({
  name: d.name.trim(),
  tagline: d.tagline.trim(),
  priceMonthly: Number(d.price),
  currency: d.currency.trim().toUpperCase(),
  otaLimit: Number(d.otaLimit),
  features: d.features
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean),
  isPopular: d.isPopular,
  isActive: d.isActive,
  sortOrder: Number(d.sortOrder),
});

function PlanDialog({ plan, nextOrder, onClose, onSaved }: { plan: SubscriptionPlan | null; nextOrder: number; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => (plan ? draftOf(plan) : emptyDraft(nextOrder)));
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errors = validate(draft);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async () => {
    setAttempted(true);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    setError(null);
    try {
      const input = toInput(draft);
      if (plan) await subscriptionPlanApi.update(plan.id, input);
      else await subscriptionPlanApi.create(input);
      toast(plan ? 'Plan updated' : 'Plan created', { detail: input.isActive ? `${input.name} is offered to new sign-ups.` : `${input.name} is switched off.`, tone: 'success' });
      onSaved();
    } catch (cause) {
      setError(displayApiError(cause));
      setSaving(false);
    }
  };

  const show = (key: keyof Errors) => (attempted ? errors[key] : undefined);

  return (
    <Modal
      open
      onClose={onClose}
      title={plan ? `Edit ${plan.name}` : 'New plan'}
      subtitle="New properties choose from the active plans while setting up."
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void save()}
            disabled={saving}
            icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Check size={14} />}
          >
            {saving ? 'Saving…' : plan ? 'Save changes' : 'Create plan'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 py-2 sm:grid-cols-2">
        <Field label="Plan name" required error={show('name')}>
          <TextField autoFocus value={draft.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} autoComplete="off" />
        </Field>
        <Field label="Tagline" hint="One short line under the name.">
          <TextField value={draft.tagline} maxLength={120} onChange={(e) => set({ tagline: e.target.value })} autoComplete="off" />
        </Field>
        <Field label="Monthly price" required error={show('price')}>
          <TextField inputMode="decimal" value={draft.price} onChange={(e) => set({ price: e.target.value })} autoComplete="off" />
        </Field>
        <Field label="Currency" required error={show('currency')} hint="ISO code, e.g. INR or USD.">
          <TextField value={draft.currency} maxLength={3} onChange={(e) => set({ currency: e.target.value.toUpperCase() })} autoComplete="off" />
        </Field>
        <Field label="OTAs allowed" required error={show('otaLimit')} hint="How many channels a property on this plan may connect.">
          <TextField inputMode="numeric" value={draft.otaLimit} onChange={(e) => set({ otaLimit: e.target.value })} autoComplete="off" />
        </Field>
        <Field label="Position" error={show('sortOrder')} hint="Lowest shows first.">
          <TextField inputMode="numeric" value={draft.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} autoComplete="off" />
        </Field>
        <Field label="Features" className="sm:col-span-2" hint="One per line; shown as ticks on the plan card.">
          <TextArea rows={5} value={draft.features} onChange={(e) => set({ features: e.target.value })} />
        </Field>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <span>
            <span className="block text-body font-semibold text-ink">Most popular</span>
            <span className="block text-label text-ink-secondary">Adds a highlight on the card.</span>
          </span>
          <Switch label="Most popular" checked={draft.isPopular} onChange={(isPopular) => set({ isPopular })} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <span>
            <span className="block text-body font-semibold text-ink">Offered to new sign-ups</span>
            <span className="block text-label text-ink-secondary">Off keeps it for existing properties only.</span>
          </span>
          <Switch label="Offered to new sign-ups" checked={draft.isActive} onChange={(isActive) => set({ isActive })} />
        </div>
        {error ? (
          <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text sm:col-span-2">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

type Dialog = { kind: 'none' } | { kind: 'edit'; plan: SubscriptionPlan | null } | { kind: 'delete'; plan: SubscriptionPlan };

/** SUPER_ADMIN only: the subscription plans new properties can pick at sign-up. */
export function PlansAdmin() {
  const plans = useApiResource(() => subscriptionPlanApi.listAll(), []);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });
  const [busy, setBusy] = useState<string | null>(null);
  const list = plans.data;

  const close = () => setDialog({ kind: 'none' });
  const saved = () => {
    close();
    plans.refresh();
  };

  const toggle = async (plan: SubscriptionPlan, isActive: boolean) => {
    setBusy(plan.id);
    try {
      await subscriptionPlanApi.update(plan.id, { isActive });
      toast(isActive ? 'Plan switched on' : 'Plan switched off', { detail: `${plan.name} is ${isActive ? 'offered to' : 'hidden from'} new sign-ups.`, tone: 'success' });
      plans.refresh();
    } catch (cause) {
      toast('Could not change the plan', { detail: displayApiError(cause), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (plan: SubscriptionPlan) => {
    setBusy(plan.id);
    try {
      await subscriptionPlanApi.remove(plan.id);
      toast('Plan deleted', { detail: `${plan.name} was removed.`, tone: 'success' });
      plans.refresh();
    } catch (cause) {
      toast('Could not delete the plan', { detail: displayApiError(cause), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardTitle
        title="Subscription plans"
        subtitle="What a new property chooses while setting up. Each plan caps how many OTAs it can connect."
        icon={Lucide.BadgeDollarSign}
        action={
          <Button variant="primary" onClick={() => setDialog({ kind: 'edit', plan: null })} icon={<Lucide.Plus size={14} />}>
            New plan
          </Button>
        }
      />

      {!list && plans.loading ? (
        <CardSkeleton lines={4} label="Loading plans" />
      ) : plans.error && !list ? (
        <p role="alert" className="py-6 text-center text-label text-danger-text">
          Could not load the plans: {plans.error}
        </p>
      ) : list && list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Lucide.BadgeDollarSign size={28} className="text-ink-muted" aria-hidden="true" />
          <p className="text-body font-semibold text-ink">No plans yet</p>
          <p className="text-label text-ink-secondary">New sign-ups cannot finish setting up until at least one active plan exists.</p>
        </div>
      ) : list ? (
        <ul className={`mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3 ${plans.loading ? 'opacity-60' : ''}`} aria-busy={plans.loading}>
          {list.map((plan) => (
            <li key={plan.id} className={`flex flex-col rounded-xl border bg-surface p-4 ${plan.isActive ? 'border-border' : 'border-dashed border-border opacity-80'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-body font-semibold text-ink">
                    {plan.name}
                    {plan.isPopular ? (
                      <Badge tone="info" size="sm">
                        Most popular
                      </Badge>
                    ) : null}
                    {!plan.isActive ? (
                      <Badge tone="neutral" size="sm">
                        Off
                      </Badge>
                    ) : null}
                  </p>
                  {plan.tagline ? <p className="text-label text-ink-secondary">{plan.tagline}</p> : null}
                </div>
                <Switch label={`${plan.name} offered to new sign-ups`} checked={plan.isActive} disabled={busy === plan.id} onChange={(next) => void toggle(plan, next)} />
              </div>

              <p className="mt-3 flex items-baseline gap-1">
                <span className="tnum text-disp2 font-bold text-ink">{formatPlanPrice(plan.priceMonthly, plan.currency)}</span>
                <span className="text-label text-ink-muted">/ month</span>
              </p>
              <p className="mt-2 flex items-center gap-2 text-label font-semibold text-primary">
                <Lucide.Share2 size={13} aria-hidden="true" /> {plan.otaLimit} OTA access
              </p>

              {plan.features.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-label text-ink">
                      <Lucide.Check size={13} className="mt-0.5 flex-none text-success-text" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                <span className="text-label text-ink-secondary">
                  {plan.propertyCount ?? 0} {plan.propertyCount === 1 ? 'property' : 'properties'} · position {plan.sortOrder}
                </span>
                <span className="flex items-center gap-1.5">
                  <IconButton title={`Edit ${plan.name}`} aria-label={`Edit ${plan.name}`} onClick={() => setDialog({ kind: 'edit', plan })}>
                    <Lucide.Pencil size={14} />
                  </IconButton>
                  <IconButton
                    title={plan.propertyCount ? 'In use: switch it off instead' : `Delete ${plan.name}`}
                    aria-label={`Delete ${plan.name}`}
                    disabled={busy === plan.id || (plan.propertyCount ?? 0) > 0}
                    onClick={() => setDialog({ kind: 'delete', plan })}
                  >
                    <Lucide.Trash2 size={14} />
                  </IconButton>
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {dialog.kind === 'edit' ? <PlanDialog plan={dialog.plan} nextOrder={(list?.reduce((m, p) => Math.max(m, p.sortOrder), 0) ?? 0) + 1} onClose={close} onSaved={saved} /> : null}
      {dialog.kind === 'delete' ? (
        <ConfirmDialog
          open
          danger
          onClose={close}
          title={`Delete ${dialog.plan.name}?`}
          body="The plan is removed for good. Switch it off instead if you only want to stop offering it."
          confirmLabel="Delete plan"
          onConfirm={() => remove(dialog.plan)}
        />
      ) : null}
    </Card>
  );
}
