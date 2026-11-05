import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { amenityApi } from '../../../lib/api/pms';
import type { AmenityDetails } from '../../../lib/api/pms';
import { displayApiError } from '../../../lib/api/client';
import { toast } from '../../../utils/toast';
import { Button, IconButton, SelectField, TextArea, TextField } from '../../../components/primitives';
import { Field } from '../../../components/controls';
import { Modal } from '../../../components/overlays';
import { Badge, Card, CardTitle, TableContainer } from '../../../components/ui';
import { StatStrip, StatTile } from './RoomSettingsKit';

interface AmenitiesSectionProps {
  /** The property whose amenities are managed; null until one is chosen. */
  propertyId: string | null;
  amenities: AmenityDetails[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/** What the edit dialog works on. `id` is null while a new amenity is being added. */
interface AmenityForm {
  id: string | null;
  name: string;
  description: string;
  isActive: boolean;
}

const EMPTY_FORM: AmenityForm = { id: null, name: '', description: '', isActive: true };

const formFromAmenity = (a: AmenityDetails): AmenityForm => ({
  id: a.id,
  name: a.name,
  description: a.description ?? '',
  isActive: a.isActive,
});

export function AmenitiesSection({ propertyId, amenities, loading, error, onRefresh }: AmenitiesSectionProps) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AmenityForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const query = search.trim().toLowerCase();
  const filtered = amenities.filter(
    (a) => a.name.toLowerCase().includes(query) || (a.description ?? '').toLowerCase().includes(query),
  );
  const activeCount = amenities.filter((a) => a.isActive).length;

  const handleToggle = async (a: AmenityDetails) => {
    if (!propertyId) return;
    try {
      await amenityApi.update(propertyId, a.id, { isActive: !a.isActive });
      toast('Amenity status updated', { tone: 'success' });
      onRefresh();
    } catch (err) {
      toast('Could not change status', { detail: displayApiError(err), tone: 'danger' });
    }
  };

  const handleSave = async () => {
    if (!editing || !propertyId) return;
    const name = editing.name.trim();
    if (name.length < 1) {
      return toast('Name required', { detail: 'Please specify the amenity name.', tone: 'warning' });
    }

    const body = { name, description: editing.description.trim(), isActive: editing.isActive };

    setIsSaving(true);
    try {
      if (editing.id === null) {
        await amenityApi.create(propertyId, body);
        toast('Amenity created', { detail: `${name} added to amenities.`, tone: 'success' });
      } else {
        await amenityApi.update(propertyId, editing.id, body);
        toast('Amenity updated', { detail: `${name} updated successfully.`, tone: 'success' });
      }
      onRefresh();
      setEditing(null);
    } catch (err) {
      toast('Could not save amenity', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (a: AmenityDetails) => {
    if (!propertyId) return;
    try {
      await amenityApi.remove(propertyId, a.id);
      toast('Amenity removed', { detail: `${a.name} removed from the list.`, tone: 'info' });
      onRefresh();
    } catch (err) {
      toast('Could not remove amenity', { detail: displayApiError(err), tone: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <StatStrip>
        <StatTile
          label="Amenities"
          icon={Lucide.Sparkles}
          tone="info"
          value={amenities.length}
          caption="Offered at the property"
        />

        <StatTile
          label="Active"
          icon={Lucide.CheckCircle2}
          tone="success"
          value={activeCount}
          caption="Currently available"
        />

        <StatTile
          label="Disabled"
          icon={Lucide.PauseCircle}
          tone="warning"
          value={amenities.length - activeCount}
          caption="Temporarily unavailable"
        />

        <StatTile
          label="Described"
          icon={Lucide.FileText}
          tone="primary"
          value={amenities.filter((a) => a.description?.trim()).length}
          caption="With a guest-facing description"
        />
      </StatStrip>

      <Card>
        <CardTitle
          title="Property Amenities"
          icon={Lucide.Sparkles}
          action={
            <Button
              variant="primary"
              onClick={() => setEditing({ ...EMPTY_FORM })}
              disabled={!propertyId}
              icon={<Lucide.Plus size={14} />}
            >
              Add Amenity
            </Button>
          }
        />

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            <Lucide.AlertCircle size={16} />
            <span>Could not load amenities: {error}</span>
          </div>
        )}

        <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Lucide.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search amenities..."
              className="pl-8"
            />
          </div>
          <p className="text-label text-ink-secondary self-center">
            Showing <span className="font-semibold text-ink">{filtered.length}</span> of {amenities.length} amenities
          </p>
        </div>

        <TableContainer>
          <table className="pms-table min-w-[640px] w-full text-left">
            <thead>
              <tr>
                <th>AMENITY</th>
                <th>DESCRIPTION</th>
                <th className="text-center">STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-hover-surface/60 border-b border-divider last:border-b-0">
                  <td className="py-3">
                    <span className="block font-bold text-ink text-label">{a.name}</span>
                  </td>
                  <td className="py-3 text-label text-ink-secondary">{a.description || '—'}</td>
                  <td className="text-center py-3">
                    <Badge tone={a.isActive ? 'success' : 'neutral'} dot size="sm">
                      {a.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td className="text-right py-3">
                    <div className="inline-flex items-center gap-1.5">
                      <IconButton
                        title={a.isActive ? 'Disable amenity' : 'Enable amenity'}
                        onClick={() => void handleToggle(a)}
                        className={a.isActive ? 'hover:text-warning-text' : 'hover:text-success-text'}
                      >
                        {a.isActive ? <Lucide.PauseCircle size={15} /> : <Lucide.PlayCircle size={15} />}
                      </IconButton>
                      <IconButton title={`Edit ${a.name}`} onClick={() => setEditing(formFromAmenity(a))}>
                        <Lucide.Pencil size={14} />
                      </IconButton>
                      <IconButton
                        title={`Delete ${a.name}`}
                        onClick={() => void handleDelete(a)}
                        className="hover:text-danger-text"
                      >
                        <Lucide.Trash2 size={14} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-label text-ink-muted">
                    {loading
                      ? 'Loading amenities…'
                      : search
                        ? `No amenities found matching "${search}".`
                        : 'No amenities yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableContainer>
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id === null ? 'Add Amenity' : `Edit ${editing?.name}`}
        subtitle="Name the amenity, describe it for guests, and set whether it is currently offered"
        wide
      >
        {editing && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 py-2">
            <Field label="Amenity Name">
              <TextField
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Rooftop Pool"
                autoFocus
              />
            </Field>

            <Field label="Active Status">
              <SelectField
                value={editing.isActive ? 'active' : 'inactive'}
                onChange={(e) => setEditing({ ...editing, isActive: e.target.value === 'active' })}
              >
                <option value="active">Active (Currently offered)</option>
                <option value="inactive">Inactive</option>
              </SelectField>
            </Field>

            <div className="sm:col-span-2">
              <Field label="Description">
                <TextArea
                  rows={2}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="What guests get, opening hours, any restrictions"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 sm:col-span-2 pt-3 border-t border-divider">
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSave()}
                disabled={isSaving}
                icon={isSaving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
              >
                {isSaving ? 'Saving…' : 'Save Amenity'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
