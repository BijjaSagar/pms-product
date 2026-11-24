import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { BODY, EYEBROW, HEADING } from '../../../components/brand/brandStyles';
import { Button } from '../../../components/ui/primitives';
import { displayApiError } from '../../../lib/api/client';
import { floorPlanApi, onboardingApi, otaChannelApi, propertyApi, roomListingApi, subscriptionPlanApi } from '../../../lib/api/pms';
import { useApiResource } from '../../../lib/api/useApiResource';
import { toast } from '../../../utils/toast';
import { ApprovalStep } from './ApprovalStep';
import { CategoriesStep } from './CategoriesStep';
import { ChannelsStep } from './ChannelsStep';
import { FloorsStep } from './FloorsStep';
import { PlanStep } from './PlanStep';
import { PropertyStep } from './PropertyStep';
import { PropertyFolio } from './PropertyFolio';
import { toWizardPlan } from '../../../utils/setupPlans';
import { SetupStepBar } from './SetupStepBar';
import {
  autoFillFloors,
  categoryIssues,
  emptyProperty,
  floorsProblem,
  newCategory,
  propertyErrors,
  pruneFloors,
  roomsOnFloors,
  setupSteps,
} from './draft';
import type { CategoryDraft, FloorRooms, PropertyDraft } from './draft';

const STEP_HINTS = [
  'Tell us the basics about your property.',
  'List the room types you offer. Room numbers come next.',
  'Add rooms to each floor and choose a category for every room.',
  'Pick the plan that fits how many OTAs you want to connect.',
  '',
  'Our team is reviewing your request.',
];
/** Every room is saved with these until its rate and occupancy are set later in Settings. */
const DEFAULT_GUESTS = 2;

interface Progress {
  propertyId?: string;
  /** Draft category id to the saved room's id, so a retry does not create duplicates. */
  roomIds: Record<string, string>;
}

interface SetupWizardProps {
  /**
   * `platform`: a super admin adds a property that is live at once. `registration`: a new account sends
   * its first property for approval, in one request, and it stays inactive until a super admin approves.
   */
  mode?: 'platform' | 'registration';
  /** The top-right "Exit setup" action; absent when there is no property list to go back to. */
  exitAction?: ReactNode;
  /** Called once the property, its categories and its floor plan are all saved. */
  onDone: (propertyId: string) => void;
}

export function SetupWizard({ mode = 'platform', exitAction, onDone }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const [property, setProperty] = useState<PropertyDraft>(emptyProperty);
  const [categories, setCategories] = useState<CategoryDraft[]>(() => [newCategory()]);
  const [floors, setFloors] = useState<FloorRooms>({});
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const progress = useRef<Progress>({ roomIds: {} });
  // Only a new account picks a plan; a super admin adding a property skips the subscription steps.
  const planList = useApiResource(() => (mode === 'registration' ? subscriptionPlanApi.list() : Promise.resolve([])), [mode]);
  const otaList = useApiResource(() => (mode === 'registration' ? otaChannelApi.list() : Promise.resolve([])), [mode]);
  const plans = useMemo(() => planList.data?.map(toWizardPlan) ?? null, [planList.data]);
  const [chosenPlanId, setPlanId] = useState<string | null>(null);
  // Until one is picked, the most popular plan (or the first) is selected, as the design always showed.
  const planId = chosenPlanId && plans?.some((p) => p.id === chosenPlanId) ? chosenPlanId : (plans?.find((p) => p.popular) ?? plans?.[0])?.id ?? null;
  const [otas, setOtas] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<{ propertyId: string; at: Date } | null>(null);
  const steps = setupSteps(mode);
  const plan = plans?.find((p) => p.id === planId);

  const errors = propertyErrors(property);
  const categoryCheck = categoryIssues(categories);
  const placed = roomsOnFloors(floors, property.floors).filter((r) => r.categoryId).length;

  const goTo = (next: number) => {
    setStep(next);
    setReached((r) => Math.max(r, next));
    setTried(false);
    scroller.current?.scrollTo({ top: 0 });
  };

  const toCategories = () => {
    setTried(true);
    if (Object.keys(errors).length > 0) {
      toast('A few details are missing', { detail: 'Please complete the highlighted fields.', tone: 'warning' });
      return;
    }
    goTo(1);
  };

  const toFloors = () => {
    setTried(true);
    if (!categoryCheck.valid) {
      toast('Room categories need attention', { detail: 'Give every category a unique name.', tone: 'warning' });
      return;
    }
    // Keep what was drawn, but drop floors that no longer exist and unlink removed categories.
    const pruned = pruneFloors(floors, property.floors, categories);
    const hasRooms = roomsOnFloors(pruned, property.floors).length > 0;
    setFloors(hasRooms ? pruned : autoFillFloors(property.floors, property.rooms, categories));
    goTo(2);
  };

  /** True when the floors hold exactly the property's rooms; otherwise says what is wrong. */
  const floorsComplete = () => {
    const problem = floorsProblem(floors, property.floors, property.rooms);
    if (!problem) return true;
    setFailure(problem);
    toast('The floors are not complete', { detail: problem, tone: 'warning' });
    return false;
  };

  const toPlan = () => {
    if (!floorsComplete()) return;
    setFailure(null);
    goTo(3);
  };

  const toChannels = () => {
    if (!plan) return;
    // A smaller plan can hold fewer channels than were picked on an earlier visit.
    setOtas((current) => current.slice(0, plan.otaLimit));
    goTo(4);
  };

  const finish = async () => {
    if (!floorsComplete()) return;

    setSaving(true);
    setFailure(null);
    const done = progress.current;
    try {
      if (mode === 'registration') {
        // One request that saves everything or nothing, so a failed try leaves nothing to resume.
        const nameOf = new Map(categories.map((c) => [c.id, c.name.trim()]));
        if (!plan) return;
        const submitted = await onboardingApi.submit({
          planId: plan.id,
          channels: otas,
          property: {
            name: property.name.trim(),
            code: property.code,
            city: property.city.trim(),
            ...(property.state.trim() ? { state: property.state.trim() } : {}),
            country: property.country,
            defaultCurrency: property.currency,
            numberOfFloors: property.floors,
            totalRooms: property.rooms,
          },
          categories: categories.map((c) => ({ name: c.name.trim() })),
          floors: Array.from({ length: property.floors }, (_, i) => i + 1)
            .map((floor) => ({ floor, rooms: (floors[floor] ?? []).map((r) => ({ category: nameOf.get(r.categoryId) ?? '' })) }))
            .filter((f) => f.rooms.length > 0),
        });
        toast('Request sent for approval', { detail: `${property.name.trim()} will be ready to use once our team approves it.`, tone: 'success' });
        setSubmitted({ propertyId: submitted.propertyId, at: new Date() });
        goTo(5);
        return;
      }
      if (!done.propertyId) {
        const created = await propertyApi.create({
          name: property.name.trim(),
          code: property.code,
          city: property.city.trim(),
          ...(property.state.trim() ? { state: property.state.trim() } : {}),
          country: property.country,
          defaultCurrency: property.currency,
          numberOfFloors: property.floors,
          totalRooms: property.rooms,
        });
        done.propertyId = created.id;
      }
      const propertyId = done.propertyId;

      for (const c of categories) {
        if (done.roomIds[c.id]) continue;
        const room = await roomListingApi.create(propertyId, {
          name: c.name.trim(),
          baseRate: 0,
          allowExtraBeds: false,
          maxAdults: DEFAULT_GUESTS,
          maxChildren: 0,
          maxOccupancy: DEFAULT_GUESTS,
          bathrooms: 1,
          amenityIds: [],
        });
        done.roomIds[c.id] = room.id;
      }

      const floorPlan = Array.from({ length: property.floors }, (_, i) => i + 1)
        .map((floor) => {
          const rooms = floors[floor] ?? [];
          return {
            floor,
            roomCount: rooms.length,
            assignments: rooms.flatMap((r, i) => {
              const roomId = done.roomIds[r.categoryId];
              return roomId ? [{ position: i + 1, roomId }] : [];
            }),
          };
        })
        .filter((f) => f.roomCount > 0);
      await floorPlanApi.save(propertyId, { numberOfFloors: property.floors, floors: floorPlan });

      toast('Property ready', { detail: `${property.name.trim()} is set up with ${property.rooms} rooms.`, tone: 'success' });
      onDone(propertyId);
    } catch (cause) {
      const detail = displayApiError(cause);
      setFailure(done.propertyId ? `${detail} Your property is saved; press Finish setup again to continue where it stopped.` : detail);
      toast('Could not finish setup', { detail, tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`flex h-dvh flex-col bg-surface text-ink ${BODY}`}>
      <header className="flex h-14 flex-none items-center justify-between gap-3 border-b border-border bg-white/80 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Lucide.Compass size={17} aria-hidden="true" />
            </span>
            <span className={`text-[16px] font-semibold tracking-tight text-ink ${HEADING}`}>Triponx</span>
          </span>
          <span aria-hidden="true" className="h-5 w-px bg-border" />
          <span className="truncate text-[14px] text-ink-secondary">Property setup</span>
        </div>
        {exitAction}
      </header>

      <SetupStepBar steps={steps} step={step} reached={submitted ? 0 : reached} onJump={(next) => !saving && !submitted && goTo(next)} />

      <div className="flex min-h-0 flex-1">
        <PropertyFolio
          steps={steps}
          property={property}
          categories={categories}
          placed={placed}
          completed={submitted ? steps.length : step}
          plan={mode === 'registration' && step >= 3 ? plan : undefined}
          otaCount={otas.length}
          status={submitted ? 'review' : step >= 4 ? 'plan' : 'draft'}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Only this area scrolls; the header, step bar, folio and footer stay put. */}
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-[860px]">
              <p className={EYEBROW}>
                Step {step + 1} of {steps.length}
              </p>
              <h1 className={`mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink ${HEADING}`}>{step === 5 ? 'Waiting for approval' : steps[step]}</h1>
              <p className="mb-4 mt-1 text-[14px] text-ink-secondary">
                {step === 4 && plan ? `Your ${plan.name} plan lets you connect up to ${plan.otaLimit} OTAs.` : STEP_HINTS[step]}
              </p>

              {step === 0 && (
                <PropertyStep value={property} onChange={(patch) => setProperty((p) => ({ ...p, ...patch }))} errors={tried ? errors : {}} />
              )}
              {step === 1 && <CategoriesStep categories={categories} onChange={setCategories} showErrors={tried} />}
              {step === 2 && (
                <FloorsStep floorCount={property.floors} floors={floors} categories={categories} totalRooms={property.rooms} onChange={setFloors} />
              )}

              {step === 3 && <PlanStep plans={plans} error={planList.error} onRetry={planList.refresh} value={planId} onChange={setPlanId} />}
              {step === 4 && plan && <ChannelsStep channels={otaList.data} error={otaList.error} onRetry={otaList.refresh} limit={plan.otaLimit} value={otas} onChange={setOtas} />}
              {step === 5 && submitted && plan && <ApprovalStep property={property} plan={plan} otas={otas} floors={property.floors} submittedAt={submitted.at} />}

              {failure && (
                <div role="alert" className="mt-3 flex items-start gap-2 rounded-2xl border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-medium text-danger-text">
                  <Lucide.AlertCircle size={16} className="mt-px flex-none" aria-hidden="true" />
                  <span>{failure}</span>
                </div>
              )}
            </div>
          </div>

          <footer className="flex flex-none items-center justify-between gap-3 border-t border-border bg-white/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            {step === 5 && submitted ? (
              <>
                <p className="flex min-w-0 items-center gap-2 text-[12px] text-ink-secondary">
                  <Lucide.Mail size={14} className="flex-none text-primary" aria-hidden="true" />
                  <span className="truncate">We'll email you once it's approved.</span>
                </p>
                <Button variant="primary" onClick={() => onDone(submitted.propertyId)}>
                  Go to my properties <Lucide.ArrowRight size={14} />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" disabled={step === 0 || saving} onClick={() => goTo(step - 1)} icon={<Lucide.ArrowLeft size={14} />}>
                  Back
                </Button>
                {step === 3 && plan && (
                  <p className="hidden min-w-0 flex-1 truncate px-2 text-[13px] sm:block">
                    <span className="font-semibold text-ink">
                      {plan.name} · {plan.price}/month
                    </span>
                    <span className="block text-[12px] text-ink-secondary">No payment is taken at this step.</span>
                  </p>
                )}
                {step === 4 && (
                  <p className="hidden min-w-0 flex-1 truncate px-2 text-[12px] text-ink-secondary sm:block">
                    {otas.length === 0 ? 'Select at least one OTA to continue.' : otas.length === plan?.otaLimit ? 'Plan limit reached.' : `You can add ${(plan?.otaLimit ?? 0) - otas.length} more.`}
                  </p>
                )}
                {step === 0 && (
                  <Button variant="primary" className="max-sm:flex-1" onClick={toCategories}>
                    Continue <Lucide.ArrowRight size={14} />
                  </Button>
                )}
                {step === 1 && (
                  <Button variant="primary" className="max-sm:flex-1" onClick={toFloors}>
                    Continue <Lucide.ArrowRight size={14} />
                  </Button>
                )}
                {step === 2 && mode === 'registration' && (
                  <Button variant="primary" className="max-sm:flex-1" onClick={toPlan}>
                    Save &amp; choose plan <Lucide.ArrowRight size={14} />
                  </Button>
                )}
                {step === 2 && mode === 'platform' && (
                  <Button variant="primary" className="max-sm:flex-1" onClick={() => void finish()} disabled={saving}>
                    {saving ? (
                      <>
                        <Lucide.Loader2 size={14} className="animate-spin" /> Setting up…
                      </>
                    ) : (
                      <>
                        Finish setup <Lucide.Check size={14} />
                      </>
                    )}
                  </Button>
                )}
                {step === 3 && (
                  <Button variant="primary" className="max-sm:flex-1" onClick={toChannels} disabled={!plan}>
                    Continue with {plan?.name} <Lucide.ArrowRight size={14} />
                  </Button>
                )}
                {step === 4 && (
                  <Button variant="primary" className="max-sm:flex-1" onClick={() => void finish()} disabled={saving || otas.length === 0}>
                    {saving ? (
                      <>
                        <Lucide.Loader2 size={14} className="animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        Submit for approval <Lucide.ArrowRight size={14} />
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
