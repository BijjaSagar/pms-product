import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { propertyBrandingApi } from '../../lib/api/pms';
import type { PropertyBrandingDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Button, Checkbox, IconButton, TextField } from '../../components/primitives';
import { ConfirmDialog } from '../../components/overlays';
import { useTheme } from '../../theme/useTheme';
import { PRESET_LIST } from '../../theme/presets';
import { AuthImage } from './AuthImage';
import { PanelLoadState } from '../../components/Skeleton';

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

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      className="grid grid-cols-1 gap-2 border-b p-4 last:border-b-0 sm:grid-cols-[14rem_1fr] sm:gap-4"
      style={{ borderColor: 'var(--color-border-subtle)' }}
    >
      <div className="text-label font-bold text-ink">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

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
  const [saving, setSaving] = useState(false);
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
      setForm(toForm(saved));
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
    <section
      className="overflow-hidden rounded-2xl border shadow-sm"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="text-title font-bold text-ink">Branding</h2>
          <p className="mt-0.5 text-label text-ink-secondary">How your property appears on the booking engine</p>
        </div>
        <Button
          variant="primary"
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !canEdit}
          title={canEdit ? undefined : adminOnly}
          className="w-fit disabled:opacity-50"
        >
          Save Changes
        </Button>
      </div>

      {/* A disabled fieldset disables every input inside it for non-administrators. */}
      <fieldset disabled={!canEdit} title={canEdit ? undefined : adminOnly} className="m-0 min-w-0 border-0 p-0">
        <Row label="Website URL">
          <TextField
            type="url"
            value={form.websiteUrl}
            placeholder="https://www.example.com/"
            onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
          />
        </Row>

        <Row label="Accommodation Nomenclature">
          <TextField
            value={form.accommodationNomenclature}
            maxLength={50}
            placeholder="Room"
            onChange={(e) => setForm({ ...form, accommodationNomenclature: e.target.value })}
          />
        </Row>

        <Row label="Phone Number">
          <div className="flex flex-col gap-2">
            {form.phoneNumbers.map((number, index) => (
              <div key={index} className="flex items-center gap-2">
                <TextField value={number} onChange={(e) => setPhone(index, e.target.value)} placeholder="+91 98765 43210" />
                {index === 0 ? (
                  <IconButton
                    title="Add a phone number"
                    onClick={() => setForm({ ...form, phoneNumbers: [...form.phoneNumbers, ''] })}
                    disabled={form.phoneNumbers.length >= 10}
                  >
                    <Lucide.Plus size={15} />
                  </IconButton>
                ) : (
                  <IconButton
                    title="Remove this phone number"
                    onClick={() => setForm({ ...form, phoneNumbers: form.phoneNumbers.filter((_, i) => i !== index) })}
                    className="hover:text-danger-text"
                  >
                    <Lucide.X size={15} />
                  </IconButton>
                )}
              </div>
            ))}
          </div>
        </Row>

        <Row label="Show Property Name on Booking Engine">
          <Checkbox
            type="checkbox"
            checked={form.showPropertyNameOnBookingEngine}
            aria-label="Show Property Name on Booking Engine"
            onChange={(e) => setForm({ ...form, showPropertyNameOnBookingEngine: e.target.checked })}
          />
        </Row>

      </fieldset>

      <Row label="Theme">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 sm:gap-2.5">
            {PRESET_LIST.map((p) => {
              const isActive = preset === p.id;
              return (
                <Button
                  variant="secondary"
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className="text-left transition-all"
                  style={{
                    borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                    background: isActive ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' : 'var(--color-surface)',
                    boxShadow: isActive ? '0 0 0 2px var(--color-primary)' : undefined,
                  }}
                >
                  <div className="mb-2.5 flex gap-1">
                    {p.swatch.slice(0, 4).map((color, i) => (
                      <span key={i} className="h-4 flex-1 rounded-full shadow-2xs" style={{ background: color }} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="truncate text-body font-semibold text-ink">{p.name}</span>
                    {isActive ? <Lucide.Check size={14} className="flex-none text-primary" /> : null}
                  </div>
                </Button>
              );
            })}
          </div>
          {onOpenThemes ? (
            <Button variant="secondary" type="button" onClick={onOpenThemes} icon={<Lucide.Palette size={14} />} className="w-fit">
              Open Theme Swatcher
            </Button>
          ) : null}
        </div>
      </Row>

      <Row label="Logo">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileInput}
            type="file"
            accept={LOGO_TYPES.join(',')}
            className="hidden"
            onChange={(e) => void handleLogoFile(e.target.files?.[0])}
          />
          <div
            className="flex h-32 w-full max-w-xs items-center justify-center overflow-hidden rounded-lg border bg-muted-surface"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {logo.has ? (
              <AuthImage key={logo.version} load={() => propertyBrandingApi.logo(propertyId)} alt="Property logo" fit="contain" />
            ) : (
              <span className="text-label text-ink-muted">No logo yet</span>
            )}
          </div>
          <div className="flex flex-col items-start gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={!canEdit || logoBusy}
              title={canEdit ? undefined : adminOnly}
              icon={logoBusy ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Image size={14} />}
            >
              {logo.has ? 'Change Image' : 'Select Image'}
            </Button>
            {logo.has ? (
              <Button
                variant="secondary"
                type="button"
                onClick={() => setConfirmingRemoval(true)}
                disabled={!canEdit || logoBusy}
                icon={<Lucide.Trash2 size={14} />}
                className="hover:text-danger-text"
              >
                Delete
              </Button>
            ) : null}
            <p className="text-label text-ink-muted">JPEG, PNG or WebP, up to 2 MB</p>
          </div>
        </div>
      </Row>

      <ConfirmDialog
        open={confirmingRemoval}
        onClose={() => setConfirmingRemoval(false)}
        onConfirm={() => removeLogo()}
        title="Delete logo"
        body="Delete the property logo? This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </section>
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
