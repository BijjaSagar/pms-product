import { useState, type ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { Button, SelectField } from '../../../components/primitives';
import { propertyApi } from '../../../lib/api/pms';
import { clockDisplay } from '../../../lib/api/propertyMapping';
import { SectionCard } from './SectionCard';
import { saveRoomSetting, type RoomSettingsData } from './roomSettingsData';
import type { RunSave } from './useRoomSave';

/* The standard steps of a select, plus the saved value when it is not one of them. */
function stepOptions(standard: number[], current: number): number[] {
  return standard.includes(current) ? standard : [...standard, current].sort((a, b) => a - b);
}

function RuleField({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="pms-label">{label}</span>
      {children}
      <span className="text-label text-ink-secondary">{hint}</span>
    </div>
  );
}

export function OperationalRulesCard({ data, saving, run }: { data: RoomSettingsData; saving: boolean; run: RunSave }) {
  const { settings, holdMinutes, checkInTime, checkOutTime } = data;
  const [turnaround, setTurnaround] = useState(settings.turnaroundMinutes);
  const [buffer, setBuffer] = useState(settings.turnaroundBufferMinutes);
  const [keycards, setKeycards] = useState(settings.keycardsPerRoom);
  const [hold, setHold] = useState(holdMinutes ?? 15);

  const save = () => {
    void run('Room operational rules', async () => {
      await saveRoomSetting('turnaroundMinutes', turnaround);
      await saveRoomSetting('turnaroundBufferMinutes', buffer);
      await saveRoomSetting('keycardsPerRoom', keycards);
      await propertyApi.update({ holdMinutes: hold });
    });
  };

  return (
    <SectionCard
      icon={Lucide.Clock}
      title="Room Operations & Holding Rules"
      description="Cleaning time between guests, keycards, holds, and the check-in and check-out times"
      action={
        <Button variant="primary" type="button" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Rules'}
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RuleField label="Cleaning duration" hint="Housekeeping time allocated per departure">
          <SelectField value={turnaround} onChange={(e) => setTurnaround(Number(e.target.value))} className="w-full">
            {stepOptions([20, 30, 45, 60], turnaround).map((minutes) => (
              <option key={minutes} value={minutes}>{minutes} minutes</option>
            ))}
          </SelectField>
        </RuleField>

        <RuleField label="Turnaround buffer" hint="Gap kept between one stay's checkout and the next arrival">
          <SelectField value={buffer} onChange={(e) => setBuffer(Number(e.target.value))} className="w-full">
            {stepOptions([0, 10, 15, 30], buffer).map((minutes) => (
              <option key={minutes} value={minutes}>{minutes === 0 ? 'No buffer' : `${minutes} minutes`}</option>
            ))}
          </SelectField>
        </RuleField>

        <RuleField label="Default keycards" hint="Keycards issued to a room at check-in">
          <SelectField value={keycards} onChange={(e) => setKeycards(Number(e.target.value))} className="w-full">
            {stepOptions([1, 2, 3], keycards).map((count) => (
              <option key={count} value={count}>{count} {count === 1 ? 'keycard' : 'keycards'}</option>
            ))}
          </SelectField>
        </RuleField>

        <RuleField label="Auto-release hold" hint="Minutes a held room stays locked before it is released">
          <SelectField value={hold} onChange={(e) => setHold(Number(e.target.value))} className="w-full">
            {stepOptions([10, 15, 30], hold).map((minutes) => (
              <option key={minutes} value={minutes}>{minutes} minutes</option>
            ))}
          </SelectField>
        </RuleField>

        <RuleField label="Check-in time" hint="Set under General">
          <p className="text-body font-semibold text-ink tnum">{checkInTime ? clockDisplay(checkInTime) : 'Not set'}</p>
        </RuleField>

        <RuleField label="Check-out time" hint="Set under General">
          <p className="text-body font-semibold text-ink tnum">{checkOutTime ? clockDisplay(checkOutTime) : 'Not set'}</p>
        </RuleField>
      </div>
    </SectionCard>
  );
}
