import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { toast } from '../../utils/toast';
import { Button, TextField } from '../../components/primitives';
import { Field } from '../../components/controls';
import { Card, CardTitle } from '../../components/ui';
import { FormGrid, SettingsHeader, ToggleRow } from './SettingsKit';

const STAY_RULES = [
  { key: 'id', label: 'Government ID at check-in', description: 'Passport, driving licence or national identity card' },
  { key: 'deposit', label: 'Security deposit guarantee', description: 'Pre-authorisation hold of 20% on incidentals' },
  { key: 'age', label: 'Minimum check-in age of 18', description: 'The primary guest must be 18 years or older' },
] as const;

export function PoliciesTab() {
  const [rules, setRules] = useState<Record<(typeof STAY_RULES)[number]['key'], boolean>>({ id: true, deposit: true, age: true });
  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Policies" description="Guest-facing terms and the checks done at arrival" />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
        <Card>
          <CardTitle icon={Lucide.FileText} title="Booking & Cancellation" subtitle="Terms applied on confirmed bookings" />
          <FormGrid className="!grid-cols-1">
            <Field label="Cancellation policy">
              <TextField defaultValue="Free cancellation until 48h before arrival; first night charged thereafter." />
            </Field>
            <Field label="No-show policy">
              <TextField defaultValue="First night charged to the primary payment method on file." />
            </Field>
            <Field label="Child & extra bed policy">
              <TextField defaultValue="Children under 6 stay complimentary using existing bedding." />
            </Field>
          </FormGrid>
          <div className="mt-4 flex justify-end border-t border-divider pt-3">
            <Button variant="primary" onClick={() => toast('Policies saved', { tone: 'success' })} icon={<Lucide.Save size={14} />}>
              Save Policies
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle icon={Lucide.ShieldCheck} title="Stay Rules & Check-in" subtitle="Standard verification procedures" />
          <div className="flex flex-col gap-2.5">
            {STAY_RULES.map(({ key, label, description }) => (
              <ToggleRow
                key={key}
                label={label}
                description={description}
                checked={rules[key]}
                onChange={(checked) => setRules((prev) => ({ ...prev, [key]: checked }))}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
