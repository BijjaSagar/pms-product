import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { grcSettingsApi, reservationSettingsApi } from '../../lib/api/pms';
import type { GrcPrintDetails, ReservationSettingsDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { TextField } from '../../components/primitives';
import { Field } from '../../components/controls';
import { PanelLoadState } from '../../components/Skeleton';
import { FormSection, ReadOnlyNotice, SettingsHeader, ToggleRow, UnsavedBar } from './SettingsKit';

type FlagKey = 'considerDirtyRoomForParkingLot' | 'softBlockForDoNotMove' | 'allowZeroRateBookings' | 'moveCheckInCheckOutBooking';

interface ReservationForm {
  reservationPrefix: string;
  maxReservationNumber: string;
  // The GRC numbering is stored with the GRC print details, so both pages show the same values.
  grcPrefix: string;
  maxGrcNumber: string;
  grcInfix: string;
  grcPostfixDigits: string;
  infantCount: string;
  infantDisplayText: string;
  infantMinAge: string;
  infantMaxAge: string;
  chargeableChildMinAge: string;
  chargeableChildMaxAge: string;
  daysBetweenCheckInCheckOut: string;
  flags: Record<FlagKey, boolean>;
}

type TextKey = Exclude<keyof ReservationForm, 'flags'>;

const FLAGS: { key: FlagKey; label: string }[] = [
  { key: 'considerDirtyRoomForParkingLot', label: 'Consider dirty room for parking lot' },
  { key: 'softBlockForDoNotMove', label: 'Soft block for do not move' },
  { key: 'allowZeroRateBookings', label: 'Allow zero-rate bookings' },
  { key: 'moveCheckInCheckOutBooking', label: 'Move check-in/check-out booking' },
];

const toForm = (r: ReservationSettingsDetails, g: GrcPrintDetails): ReservationForm => ({
  reservationPrefix: r.reservationPrefix ?? '',
  maxReservationNumber: String(r.maxReservationNumber),
  grcPrefix: g.prefix ?? '',
  maxGrcNumber: String(g.postfixNo),
  grcInfix: g.inPrefixNo ?? '',
  grcPostfixDigits: String(g.postfixDigits),
  infantCount: String(r.infantCount),
  infantDisplayText: r.infantDisplayText,
  infantMinAge: String(r.infantMinAge),
  infantMaxAge: String(r.infantMaxAge),
  chargeableChildMinAge: String(r.chargeableChildMinAge),
  chargeableChildMaxAge: String(r.chargeableChildMaxAge),
  daysBetweenCheckInCheckOut: String(r.daysBetweenCheckInCheckOut),
  flags: {
    considerDirtyRoomForParkingLot: r.considerDirtyRoomForParkingLot,
    softBlockForDoNotMove: r.softBlockForDoNotMove,
    allowZeroRateBookings: r.allowZeroRateBookings,
    moveCheckInCheckOutBooking: r.moveCheckInCheckOutBooking,
  },
});

function ReservationSettingsForm({
  propertyId,
  settings,
  grc,
  canEdit,
}: {
  propertyId: string;
  settings: ReservationSettingsDetails;
  grc: GrcPrintDetails;
  canEdit: boolean;
}) {
  const [form, setForm] = useState<ReservationForm>(() => toForm(settings, grc));
  // What the server holds; the form is dirty while it differs from this.
  const [baseline, setBaseline] = useState<ReservationForm>(() => toForm(settings, grc));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  const text = (key: TextKey, label: string, opts: { number?: boolean; maxLength?: number; hint?: string } = {}) => (
    <Field label={label} hint={opts.hint}>
      <TextField
        type={opts.number ? 'number' : 'text'}
        min={opts.number ? 0 : undefined}
        maxLength={opts.maxLength}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </Field>
  );

  /** A whole number within range, or null after a warning. */
  const whole = (value: string, label: string, min: number, max: number) => {
    const n = Number(value);
    if (value.trim() === '' || !Number.isInteger(n) || n < min || n > max) {
      toast(`Check ${label}`, { detail: `Use a whole number from ${min} to ${max}.`, tone: 'warning' });
      return null;
    }
    return n;
  };

  const handleSave = async () => {
    const numbers = {
      maxReservationNumber: whole(form.maxReservationNumber, 'Max Reservation Number', 0, 999_999_999),
      postfixNo: whole(form.maxGrcNumber, 'Max GRC Number', 0, 999_999_999),
      postfixDigits: whole(form.grcPostfixDigits, 'GRC Postfix Digits', 1, 12),
      infantCount: whole(form.infantCount, 'Infant count', 0, 20),
      infantMinAge: whole(form.infantMinAge, 'Minimum age of infant', 0, 17),
      infantMaxAge: whole(form.infantMaxAge, 'Maximum age of infant', 0, 17),
      chargeableChildMinAge: whole(form.chargeableChildMinAge, 'Minimum age of chargeable child', 0, 17),
      chargeableChildMaxAge: whole(form.chargeableChildMaxAge, 'Maximum age of chargeable child', 0, 17),
      daysBetweenCheckInCheckOut: whole(form.daysBetweenCheckInCheckOut, 'Days between Check in and Check out', 1, 365),
    };
    if (Object.values(numbers).some((n) => n === null)) return;
    const n = numbers as Record<keyof typeof numbers, number>;
    if (n.infantMinAge > n.infantMaxAge) return void toast('Infant ages are reversed', { detail: 'The minimum cannot be above the maximum.', tone: 'warning' });
    if (n.chargeableChildMinAge > n.chargeableChildMaxAge) return void toast('Chargeable child ages are reversed', { detail: 'The minimum cannot be above the maximum.', tone: 'warning' });
    if (n.chargeableChildMinAge <= n.infantMaxAge) return void toast('The age ranges overlap', { detail: 'A chargeable child must be older than the maximum infant age.', tone: 'warning' });
    if (form.infantDisplayText.trim() === '') return void toast('Infant display text is required', { tone: 'warning' });

    setSaving(true);
    try {
      const [savedSettings, savedGrc] = await Promise.all([
        reservationSettingsApi.update(propertyId, {
          reservationPrefix: form.reservationPrefix.trim() || null,
          maxReservationNumber: n.maxReservationNumber,
          infantCount: n.infantCount,
          infantDisplayText: form.infantDisplayText.trim(),
          infantMinAge: n.infantMinAge,
          infantMaxAge: n.infantMaxAge,
          chargeableChildMinAge: n.chargeableChildMinAge,
          chargeableChildMaxAge: n.chargeableChildMaxAge,
          daysBetweenCheckInCheckOut: n.daysBetweenCheckInCheckOut,
          ...form.flags,
        }),
        grcSettingsApi.updatePrint(propertyId, {
          prefix: form.grcPrefix.trim() || null,
          inPrefixNo: form.grcInfix.trim() || null,
          postfixDigits: n.postfixDigits,
          postfixNo: n.postfixNo,
        }),
      ]);
      const next = toForm(savedSettings, savedGrc);
      setForm(next);
      setBaseline(next);
      toast('Reservation settings saved', { tone: 'success' });
    } catch (err) {
      toast('Could not save the reservation settings', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0">
      <div className="flex flex-col gap-5">
        <SettingsHeader title="Reservation Settings" description="Numbering, guest ages and booking rules" />
        {!canEdit ? <ReadOnlyNotice what="reservation settings" /> : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
          <FormSection icon={Lucide.Hash} title="Reservation Numbering" subtitle="How booking numbers are issued">
            {text('reservationPrefix', 'Reservation prefix', { maxLength: 20 })}
            {text('maxReservationNumber', 'Max reservation number', { number: true })}
          </FormSection>

          <FormSection icon={Lucide.ClipboardList} title="GRC Numbering" subtitle="Numbers printed on guest registration cards">
            {text('grcPrefix', 'GRC prefix', { maxLength: 20 })}
            {text('maxGrcNumber', 'Max GRC number', { number: true })}
            {text('grcInfix', 'GRC infix', { maxLength: 20 })}
            {text('grcPostfixDigits', 'GRC postfix digits', { number: true, hint: '1 to 12 digits' })}
          </FormSection>

          <FormSection icon={Lucide.Baby} title="Guest Ages" subtitle="Whole years, 0 to 17">
            {text('infantCount', 'Infant count', { number: true })}
            {text('infantDisplayText', 'Infant display text', { maxLength: 20 })}
            {text('infantMinAge', 'Minimum age of infant', { number: true })}
            {text('infantMaxAge', 'Maximum age of infant', { number: true })}
            {text('chargeableChildMinAge', 'Minimum age of chargeable child', { number: true })}
            {text('chargeableChildMaxAge', 'Maximum age of chargeable child', { number: true })}
          </FormSection>

          <FormSection icon={Lucide.CalendarCheck} title="Stay & Booking Rules" subtitle="How bookings and rooms are treated">
            {text('daysBetweenCheckInCheckOut', 'Days between check-in and check-out', { number: true, hint: '1 to 365 days' })}
            <div className="flex flex-col gap-2.5 sm:col-span-2">
              {FLAGS.map(({ key, label }) => (
                <ToggleRow
                  key={key}
                  label={label}
                  checked={form.flags[key]}
                  onChange={(checked) => setForm({ ...form, flags: { ...form.flags, [key]: checked } })}
                />
              ))}
            </div>
          </FormSection>
        </div>

        {canEdit ? (
          <UnsavedBar dirty={dirty} saving={saving} onSave={() => void handleSave()} onDiscard={() => setForm(baseline)} />
        ) : null}
      </div>
    </fieldset>
  );
}

export function ReservationSettingsTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(
    () => Promise.all([reservationSettingsApi.get(propertyId), grcSettingsApi.print(propertyId)]),
    [propertyId],
  );
  const resource = useApiResource(load);

  if (!resource.data) {
    return (
      <PanelLoadState error={resource.error} label="Loading reservation settings" />
    );
  }

  const [settings, grc] = resource.data;
  return <ReservationSettingsForm key={propertyId} propertyId={propertyId} settings={settings} grc={grc} canEdit={canEdit} />;
}
