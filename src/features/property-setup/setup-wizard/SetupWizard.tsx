import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { BrandShell } from '../../../components/brand/BrandShell';
import { HEADING } from '../../../components/brand/brandStyles';
import { Button } from '../../../components/primitives';
import { displayApiError } from '../../../lib/api/client';
import { floorPlanApi, propertyApi, roomListingApi } from '../../../lib/api/pms';
import { toast } from '../../../utils/toast';
import { CategoriesStep } from './CategoriesStep';
import { FloorsStep } from './FloorsStep';
import { PropertyStep } from './PropertyStep';
import { SetupRail } from './SetupRail';
import {
  autoFillFloors,
  categoryIssues,
  emptyProperty,
  floorsProblem,
  newCategory,
  propertyErrors,
  pruneFloors,
  roomsOnFloors,
} from './draft';
import type { CategoryDraft, FloorRooms, PropertyDraft } from './draft';

const STEP_TITLES = ['Property', 'Room categories', 'Floors & rooms'];
/** Every room is saved with these until its rate and occupancy are set later in Settings. */
const DEFAULT_GUESTS = 2;

interface Progress {
  propertyId?: string;
  /** Draft category id to the saved room's id, so a retry does not create duplicates. */
  roomIds: Record<string, string>;
}

interface SetupWizardProps {
  /** The top-right action: "Exit setup" when there are other properties, "Sign out" otherwise. */
  exitAction: ReactNode;
  /** Called once the property, its categories and its floor plan are all saved. */
  onDone: (propertyId: string) => void;
}

export function SetupWizard({ exitAction, onDone }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [property, setProperty] = useState<PropertyDraft>(emptyProperty);
  const [categories, setCategories] = useState<CategoryDraft[]>(() => [newCategory({ count: emptyProperty().rooms })]);
  const [floors, setFloors] = useState<FloorRooms>({});
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const progress = useRef<Progress>({ roomIds: {} });

  const errors = propertyErrors(property);
  const categoryCheck = categoryIssues(categories, property.rooms);
  const placed = roomsOnFloors(floors, property.floors).filter((r) => r.categoryId).length;

  const goTo = (next: number) => {
    setStep(next);
    setTried(false);
    window.scrollTo({ top: 0 });
  };

  const toCategories = () => {
    setTried(true);
    if (Object.keys(errors).length > 0) {
      toast('A few details are missing', { detail: 'Please complete the highlighted fields.', tone: 'warning' });
      return;
    }
    // One untouched category simply takes every room, the common case for a new property.
    setCategories((list) => (list.length === 1 ? list.map((c) => ({ ...c, count: property.rooms })) : list));
    goTo(1);
  };

  const toFloors = () => {
    setTried(true);
    if (!categoryCheck.valid) {
      toast('Room categories need attention', {
        detail: categoryCheck.allocated === property.rooms ? 'Check the highlighted categories.' : `Categories must add up to exactly ${property.rooms} rooms.`,
        tone: 'warning',
      });
      return;
    }
    // Keep what was drawn, but drop floors that no longer exist and unlink removed categories.
    const pruned = pruneFloors(floors, property.floors, categories);
    const hasRooms = roomsOnFloors(pruned, property.floors).length > 0;
    setFloors(hasRooms ? pruned : autoFillFloors(property.floors, property.rooms, categories));
    goTo(2);
  };

  const finish = async () => {
    const problem = floorsProblem(floors, property.floors, categories, property.rooms);
    if (problem) {
      setFailure(problem);
      toast('The floors are not complete', { detail: problem, tone: 'warning' });
      return;
    }

    setSaving(true);
    setFailure(null);
    const done = progress.current;
    try {
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
          roomCount: c.count,
          allowExtraBeds: false,
          maxAdults: DEFAULT_GUESTS,
          maxChildren: 0,
          maxOccupancy: DEFAULT_GUESTS,
          bathrooms: 1,
          amenityIds: [],
        });
        done.roomIds[c.id] = room.id;
      }

      const plan = Array.from({ length: property.floors }, (_, i) => i + 1)
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
      await floorPlanApi.save(propertyId, { numberOfFloors: property.floors, floors: plan });

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
    <BrandShell>
      <div className="grid grid-cols-1 gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
        <SetupRail step={step} property={property} categories={categories} placed={placed} />

        <div className="flex min-w-0 flex-col lg:min-h-0">
          <div className="mb-3 flex flex-none flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div>
              <p className="text-[12px] font-medium text-ink-muted">Step {step + 1} of 3</p>
              <h2 className={`mt-0.5 text-[24px] font-bold tracking-[-0.04em] text-ink ${HEADING}`}>{STEP_TITLES[step]}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted-surface" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1} aria-label="Setup progress">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${((step + 1) / 3) * 100}%` }} />
              </div>
              {exitAction}
            </div>
          </div>

          {/* The steps scroll in here when they are taller than the screen, so the page itself never does. */}
          <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-1">
            {step === 0 && (
              <PropertyStep value={property} onChange={(patch) => setProperty((p) => ({ ...p, ...patch }))} errors={tried ? errors : {}} />
            )}
            {step === 1 && <CategoriesStep categories={categories} totalRooms={property.rooms} onChange={setCategories} showErrors={tried} />}
            {step === 2 && (
              <FloorsStep floorCount={property.floors} floors={floors} categories={categories} totalRooms={property.rooms} onChange={setFloors} />
            )}
          </div>

          {failure && (
            <div role="alert" className="mt-3 flex flex-none items-start gap-2 rounded-2xl border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-medium text-danger-text">
              <Lucide.AlertCircle size={16} className="mt-px flex-none" aria-hidden="true" />
              <span>{failure}</span>
            </div>
          )}

          <footer className="mt-3 flex flex-none items-center justify-between gap-3 border-t border-border/70 pt-3">
            <Button variant="ghost" disabled={step === 0 || saving} onClick={() => goTo(step - 1)} icon={<Lucide.ArrowLeft size={14} />}>
              Back
            </Button>
            {step === 0 && (
              <Button variant="primary" onClick={toCategories}>
                Continue <Lucide.ArrowRight size={14} />
              </Button>
            )}
            {step === 1 && (
              <Button variant="primary" onClick={toFloors} disabled={categoryCheck.allocated !== property.rooms}>
                Continue <Lucide.ArrowRight size={14} />
              </Button>
            )}
            {step === 2 && (
              <Button variant="primary" onClick={() => void finish()} disabled={saving}>
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
          </footer>
        </div>
      </div>
    </BrandShell>
  );
}
