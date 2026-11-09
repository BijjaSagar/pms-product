import { useCallback, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import { propertyBrandingApi } from '../../lib/api/pms';
import type { PropertyBrandingDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Button, IconButton, TextField } from '../../components/primitives';
import { Field } from '../../components/controls';
import { Card, CardTitle } from '../../components/ui';
import { ConfirmDialog } from '../../components/overlays';
import { useTheme } from '../../theme/useTheme';
import { PRESET_LIST } from '../../theme/presets';
import { AuthImage } from './AuthImage';
import { PanelLoadState } from '../../components/Skeleton';
import { FormSection, ReadOnlyNotice, SettingsHeader, ToggleRow, UnsavedBar } from './SettingsKit';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface BrandingForm {
  websiteUrl: string;
  accommodationNomenclature: string;
  /** At least one box, possibly empty. */
  phoneNumbers: string[];
  showPropertyNameOnBookingEngine: boolean;
}

const toForm = (b: PropertyBrandingDetails): BrandingForm => ({
  websiteUrl: b.websiteUrl ?? '',
  accommodationNomenclature: b.accommodationNomenclature ?? '',
  phoneNumbers: b.phoneNumbers.length > 0 ? b.phoneNumbers : [''],
  showPropertyNameOnBookingEngine: b.showPropertyNameOnBookingEngine,
});

/** Blank -> null; otherwise the trimmed text. */
const optional = (value: string) => (value.trim() === '' ? null : value.trim());

function BrandingForm({
  propertyId,
  branding,
  canEdit,
  onOpenThemes,
}: {
  propertyId: string;
  branding: PropertyBrandingDetails;
  canEdit: boolean;
  onOpenThemes?: () => void;
}) {
  const { preset, setPreset } = useTheme();
  const [form, setForm] = useState<BrandingForm>(() => toForm(branding));
  // What the server holds; the form is dirty while it differs from this.
  const [baseline, setBaseline] = useState<BrandingForm>(() => toForm(branding));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  // The logo changes on its own, apart from the Save button.
  const [logo, setLogo] = useState({ has: branding.hasLogo, version: branding.logoUpdatedAt });
  const [logoBusy, setLogoBusy] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const adminOnly = 'Only administrators can change branding';

  const handleSave = async () => {
    const phones = form.phoneNumbers.map((n) => n.trim()).filter((n) => n !== '');
    setSaving(true);
    try {
      const saved = await propertyBrandingApi.save(propertyId, {
        websiteUrl: optional(form.websiteUrl),
        accommodationNomenclature: optional(form.accommodationNomenclature),
        phoneNumbers: phones,
        showPropertyNameOnBookingEngine: form.showPropertyNameOnBookingEngine,
      });
      const next = toForm(saved);
      setForm(next);
      setBaseline(next);
      toast('Branding saved', { tone: 'success' });
    } catch (err) {
      toast('Could not save branding', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoFile = async (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type) || file.size > MAX_LOGO_BYTES) {
      toast(`Cannot upload ${file.name}`, { detail: 'Use a JPEG, PNG or WebP image of at most 2 MB.', tone: 'warning' });
      return;
    }
    setLogoBusy(true);
    try {
      const saved = await propertyBrandingApi.uploadLogo(propertyId, file);
      setLogo({ has: saved.hasLogo, version: saved.logoUpdatedAt });
      toast('Logo uploaded', { tone: 'success' });
    } catch (err) {
      toast('Could not upload the logo', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setLogoBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const removeLogo = async () => {
    setLogoBusy(true);
    try {
      await propertyBrandingApi.removeLogo(propertyId);
      setLogo({ has: false, version: null });
      toast('Logo deleted', { tone: 'success' });
    } catch (err) {
      toast('Could not delete the logo', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setLogoBusy(false);
    }
  };

  const setPhone = (index: number, value: string) =>
    setForm((prev) => ({ ...prev, phoneNumbers: prev.phoneNumbers.map((n, i) => (i === index ? value : n)) }));

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Branding" description="How your property appears on the booking engine" />
      {!canEdit ? <ReadOnlyNotice what="branding" /> : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
        {/* A disabled fieldset disables every input inside it for non-administrators. */}
        <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0">
          <FormSection icon={Lucide.Globe} title="Booking Engine Profile" subtitle="Public details guests see">
            <Field label="Website URL" className="sm:col-span-2">
              <TextField
                type="url"
                value={form.websiteUrl}
                placeholder="https://www.example.com/"
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              />
            </Field>

            <Field label="Accommodation nomenclature" hint="What a bookable unit is called, e.g. Room or Villa">
              <TextField
                value={form.accommodationNomenclature}
                maxLength={50}
                placeholder="Room"
                onChange={(e) => setForm({ ...form, accommodationNomenclature: e.target.value })}
              />
            </Field>

            <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
              <span className="pms-label">Phone numbers</span>
              {form.phoneNumbers.map((number, index) => (
                <div key={index} className="flex items-center gap-2">
                  <TextField
                    value={number}
                    onChange={(e) => setPhone(index, e.target.value)}
                    placeholder="+91 98765 43210"
                    aria-label={`Phone number ${index + 1}`}
                  />
                  {index === 0 ? (
                    <IconButton
                      title="Add a phone number"
                      aria-label="Add a phone number"
                      onClick={() => setForm({ ...form, phoneNumbers: [...form.phoneNumbers, ''] })}
                      disabled={form.phoneNumbers.length >= 10}
                    >
                      <Lucide.Plus size={15} />
                    </IconButton>
                  ) : (
                    <IconButton
                      title="Remove this phone number"
                      aria-label="Remove this phone number"
                      onClick={() => setForm({ ...form, phoneNumbers: form.phoneNumbers.filter((_, i) => i !== index) })}
                      className="hover:text-danger-text"
                    >
                      <Lucide.X size={15} />
                    </IconButton>
                  )}
                </div>
              ))}
            </div>

            <ToggleRow
              label="Show property name on the booking engine"
              description="Display the name next to the logo"
              checked={form.showPropertyNameOnBookingEngine}
              onChange={(checked) => setForm({ ...form, showPropertyNameOnBookingEngine: checked })}
              className="sm:col-span-2"
            />
          </FormSection>
        </fieldset>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardTitle icon={Lucide.Image} title="Logo" subtitle="JPEG, PNG or WebP, up to 2 MB" />
            <input
              ref={fileInput}
              type="file"
              accept={LOGO_TYPES.join(',')}
              className="hidden"
              onChange={(e) => void handleLogoFile(e.target.files?.[0])}
            />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted-surface sm:max-w-[16rem]">
                {logo.has ? (
                  <AuthImage key={logo.version} load={() => propertyBrandingApi.logo(propertyId)} alt="Property logo" fit="contain" />
                ) : (
                  <span className="text-label text-ink-muted">No logo yet</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-start">
                <Button
                  variant="secondary"
                  onClick={() => fileInput.current?.click()}
                  disabled={!canEdit || logoBusy}
                  title={canEdit ? undefined : adminOnly}
                  icon={logoBusy ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Upload size={14} />}
                >
                  {logo.has ? 'Change image' : 'Upload image'}
                </Button>
                {logo.has ? (
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmingRemoval(true)}
                    disabled={!canEdit || logoBusy}
                    icon={<Lucide.Trash2 size={14} />}
                    className="hover:text-danger-text"
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle
              icon={Lucide.Palette}
              title="Theme"
              subtitle="Colour palette for this workspace"
              action={
                onOpenThemes ? (
                  <Button variant="secondary" onClick={onOpenThemes} icon={<Lucide.SwatchBook size={14} />}>
                    Theme swatcher
                  </Button>
                ) : null
              }
            />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3" role="radiogroup" aria-label="Theme">
              {PRESET_LIST.map((p) => {
                const isActive = preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setPreset(p.id)}
                    className={`cursor-pointer rounded-xl border p-3 text-left transition-colors ${
                      isActive ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'border-border bg-surface hover:bg-hover-surface'
                    }`}
                  >
                    <span className="mb-2.5 flex gap-1" aria-hidden="true">
                      {p.swatch.slice(0, 4).map((color, i) => (
                        <span key={i} className="h-4 flex-1 rounded-full shadow-2xs" style={{ background: color }} />
                      ))}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-body font-semibold text-ink">{p.name}</span>
                      {isActive ? <Lucide.Check size={14} className="flex-none text-primary" aria-hidden="true" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {canEdit ? (
        <UnsavedBar dirty={dirty} saving={saving} onSave={() => void handleSave()} onDiscard={() => setForm(baseline)} />
      ) : null}

      <ConfirmDialog
        open={confirmingRemoval}
        onClose={() => setConfirmingRemoval(false)}
        onConfirm={() => removeLogo()}
        title="Delete logo"
        body="Delete the property logo? This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

export function BrandingTab({ propertyId, canEdit, onOpenThemes }: { propertyId: string; canEdit: boolean; onOpenThemes?: () => void }) {
  const load = useCallback(() => propertyBrandingApi.get(propertyId), [propertyId]);
  const resource = useApiResource(load);

  if (!resource.data) {
    return (
      <PanelLoadState error={resource.error} label="Loading branding" />
    );
  }

  return <BrandingForm key={propertyId} propertyId={propertyId} branding={resource.data} canEdit={canEdit} onOpenThemes={onOpenThemes} />;
}
