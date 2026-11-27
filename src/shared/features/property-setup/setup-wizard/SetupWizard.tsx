import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { BODY, EYEBROW, HEADING } from '../../../components/brand/brandStyles';
import { Button } from '../../../components/ui/primitives';
import { displayError } from '../../../services/errors';
import { floorPlanApi } from '../../../services/floorPlanApi';
import { onboardingApi } from '../../../services/onboardingApi';
import { propertyApi } from '../../../services/propertyApi';
import { roomListingApi } from '../../../services/roomListingApi';
import { toast } from '../../../utils/toast';
import { ActivationStep } from './ActivationStep';
import { CategoriesStep } from './CategoriesStep';
import { FloorsStep } from './FloorsStep';
import { PropertyStep } from './PropertyStep';
import { PropertyFolio } from './PropertyFolio';
import { SetupStepBar } from './SetupStepBar';
import {
  ACTIVATION_KEY_LENGTH,
  DEFAULT_ACTIVATION_KEY,
  autoFillFloors,
  categoryIssues,
  emptyProperty,
  floorsProblem,
  formatActivationKey,
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
  'Enter the activation key you were given. It activates this property.',
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
   * its first property with an activation key, in one request; a valid key makes it live.
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
  const [activationKey, setActivationKey] = useState(DEFAULT_ACTIVATION_KEY);
  const steps = setupSteps(mode);
  const keyComplete = formatActivationKey(activationKey).length === ACTIVATION_KEY_LENGTH + 3;

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

  const toActivation = () => {
    if (!floorsComplete()) return;
    setFailure(null);
    goTo(3);
  };

  const finish = async () => {
    if (!floorsComplete()) return;
    if (mode === 'registration' && !keyComplete) {
      setFailure('Enter the full activation key (16 characters).');
      return;
    }

    setSaving(true);
    setFailure(null);
    const done = progress.current;
    try {
      if (mode === 'registration') {
        // One request that saves everything or nothing, so a failed try leaves nothing to resume.
        const nameOf = new Map(categories.map((c) => [c.id, c.name.trim()]));
        const { propertyId } = await onboardingApi.submit({
          activationKey: formatActivationKey(activationKey),
          property: {
            name: property.name.trim(),
            abbreviation: property.code,
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
        toast('Property activated', { detail: `${property.name.trim()} is ready to use.`, tone: 'success' });
        onDone(propertyId);
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
      const detail = displayError(cause);
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
            <span className={`text-[16px] font-semibold tracking-tight text-ink ${HEADING}`}>Hotel PMX</span>
          </span>
          <span aria-hidden="true" className="h-5 w-px bg-border" />
          <span className="truncate text-[14px] text-ink-secondary">Property setup</span>
        </div>
        {exitAction}
      </header>

      <SetupStepBar steps={steps} step={step} reached={reached} onJump={(next) => !saving && goTo(next)} />

      <div className="flex min-h-0 flex-1">
        <PropertyFolio
          steps={steps}
          property={property}
          categories={categories}
          placed={placed}
          completed={step}
          status={step >= 3 ? 'ready' : 'draft'}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Only this area scrolls; the header, step bar, folio and footer stay put. */}
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-[860px]">
              <p className={EYEBROW}>
                Step {step + 1} of {steps.length}
              </p>
              <h1 className={`mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink ${HEADING}`}>{steps[step]}</h1>
              <p className="mb-4 mt-1 text-[14px] text-ink-secondary">{STEP_HINTS[step]}</p>

              {step === 0 && (
                <PropertyStep value={property} onChange={(patch) => setProperty((p) => ({ ...p, ...patch }))} errors={tried ? errors : {}} />
              )}
              {step === 1 && <CategoriesStep categories={categories} onChange={setCategories} showErrors={tried} />}
              {step === 2 && (
                <FloorsStep floorCount={property.floors} floors={floors} categories={categories} totalRooms={property.rooms} onChange={setFloors} />
              )}

              {step === 3 && (
                <ActivationStep
                  value={activationKey}
                  onChange={(next) => {
                    setActivationKey(formatActivationKey(next));
                    setFailure(null);
                  }}
                  onSubmit={() => void finish()}
                  property={property}
                  categoryCount={categories.length}
                  disabled={saving}
                />
              )}

              {failure && (
                <div role="alert" className="mt-3 flex items-start gap-2 rounded-2xl border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-medium text-danger-text">
                  <Lucide.AlertCircle size={16} className="mt-px flex-none" aria-hidden="true" />
                  <span>{failure}</span>
                </div>
              )}
            </div>
          </div>

          <footer className="flex flex-none items-center justify-between gap-3 border-t border-border bg-white/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <Button variant="ghost" disabled={step === 0 || saving} onClick={() => goTo(step - 1)} icon={<Lucide.ArrowLeft size={14} />}>
              Back
            </Button>
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
              <Button variant="primary" className="max-sm:flex-1" onClick={toActivation}>
                Continue <Lucide.ArrowRight size={14} />
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
              <Button variant="primary" className="max-sm:flex-1" onClick={() => void finish()} disabled={saving || !keyComplete}>
                {saving ? (
                  <>
                    <Lucide.Loader2 size={14} className="animate-spin" /> Activating…
                  </>
                ) : (
                  <>
                    Activate property <Lucide.Check size={14} />
                  </>
                )}
              </Button>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
