import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { BODY, EYEBROW, HEADING } from '../../../components/brand/brandStyles';
import { CredentialsDialog } from '../../../components/ui/CredentialsDialog';
import type { Credentials } from '../../../components/ui/CredentialsDialog';
import { Button } from '../../../components/ui/primitives';
import { displayError } from '../../../services/errors';
import { ownerApi } from '../../../services/ownerApi';
import { toast } from '../../../utils/toast';
import { AdminStep } from './AdminStep';
import { CategoriesStep } from './CategoriesStep';
import { FloorsStep } from './FloorsStep';
import { PropertyStep } from './PropertyStep';
import { PropertyFolio } from './PropertyFolio';
import { SetupStepBar } from './SetupStepBar';
import {
  SETUP_STEPS,
  adminErrors,
  autoFillFloors,
  categoryIssues,
  emptyAdmin,
  emptyProperty,
  floorsProblem,
  newCategory,
  propertyErrors,
  pruneFloors,
  roomsOnFloors,
} from './draft';
import type { AdminDraft, CategoryDraft, FloorRooms, PropertyDraft } from './draft';

const STEP_HINTS = [
  'Tell us the basics about the property.',
  'List the room types it offers. Room numbers come next.',
  'Add rooms to each floor and choose a category for every room.',
  'Who runs this property day to day? You can also add them later.',
];

interface SetupWizardProps {
  /** The owner company the new property belongs to. */
  ownerId: string;
  /** The top-right "Exit setup" action. */
  exitAction?: ReactNode;
  /** Called once the property, its categories, rooms and (if asked for) its first Property Admin are saved. */
  onDone: (propertyId: string) => void;
}

/** Adds one property to an owner company: details, room categories, floors and rooms, then its first Property Admin. */
export function SetupWizard({ ownerId, exitAction, onDone }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const [property, setProperty] = useState<PropertyDraft>(emptyProperty);
  const [categories, setCategories] = useState<CategoryDraft[]>(() => [newCategory()]);
  const [floors, setFloors] = useState<FloorRooms>({});
  const [admin, setAdmin] = useState<AdminDraft>(emptyAdmin);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // Shown once after saving; the wizard then hands over to `onDone` when it is closed.
  const [handover, setHandover] = useState<{ propertyId: string; credentials: Credentials } | null>(null);

  const errors = propertyErrors(property);
  const categoryCheck = categoryIssues(categories);
  const adminCheck = adminErrors(admin);
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

  const toAdmin = () => {
    if (!floorsComplete()) return;
    setFailure(null);
    goTo(3);
  };

  const finish = async () => {
    setTried(true);
    if (!floorsComplete()) return;
    if (Object.keys(adminCheck).length > 0) return;

    setSaving(true);
    setFailure(null);
    try {
      // One request that saves everything or nothing, so a failed try leaves nothing to resume.
      const nameOf = new Map(categories.map((c) => [c.id, c.name.trim()]));
      const created = await ownerApi.addProperty(ownerId, {
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
        ...(admin.name.trim() ? { propertyAdmin: { name: admin.name.trim(), email: admin.email.trim() } } : {}),
      });
      toast('Property created', { detail: `${property.name.trim()} is ready to use.`, tone: 'success' });
      if (created.propertyAdmin) {
        const { name, email, temporaryPassword } = created.propertyAdmin;
        setHandover({ propertyId: created.propertyId, credentials: { name, email, password: temporaryPassword } });
      } else {
        onDone(created.propertyId);
      }
    } catch (cause) {
      const detail = displayError(cause);
      setFailure(detail);
      toast('Could not create the property', { detail, tone: 'danger' });
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
          <span className="truncate text-[14px] text-ink-secondary">Add a property</span>
        </div>
        {exitAction}
      </header>

      <SetupStepBar steps={SETUP_STEPS} step={step} reached={reached} onJump={(next) => !saving && goTo(next)} />

      <div className="flex min-h-0 flex-1">
        <PropertyFolio
          steps={SETUP_STEPS}
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
                Step {step + 1} of {SETUP_STEPS.length}
              </p>
              <h1 className={`mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink ${HEADING}`}>{SETUP_STEPS[step]}</h1>
              <p className="mb-4 mt-1 text-[14px] text-ink-secondary">{STEP_HINTS[step]}</p>

              {step === 0 && (
                <PropertyStep value={property} onChange={(patch) => setProperty((p) => ({ ...p, ...patch }))} errors={tried ? errors : {}} />
              )}
              {step === 1 && <CategoriesStep categories={categories} onChange={setCategories} showErrors={tried} />}
              {step === 2 && (
                <FloorsStep floorCount={property.floors} floors={floors} categories={categories} totalRooms={property.rooms} onChange={setFloors} />
              )}
              {step === 3 && (
                <AdminStep
                  value={admin}
                  onChange={(patch) => {
                    setAdmin((current) => ({ ...current, ...patch }));
                    setFailure(null);
                  }}
                  errors={tried ? adminCheck : {}}
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
            {step === 2 && (
              <Button variant="primary" className="max-sm:flex-1" onClick={toAdmin}>
                Continue <Lucide.ArrowRight size={14} />
              </Button>
            )}
            {step === 3 && (
              <Button variant="primary" className="max-sm:flex-1" onClick={() => void finish()} disabled={saving}>
                {saving ? (
                  <>
                    <Lucide.Loader2 size={14} className="animate-spin" /> Creating…
                  </>
                ) : (
                  <>
                    Create property <Lucide.Check size={14} />
                  </>
                )}
              </Button>
            )}
          </footer>
        </div>
      </div>

      <CredentialsDialog credentials={handover?.credentials ?? null} onClose={() => handover && onDone(handover.propertyId)} />
    </div>
  );
}
