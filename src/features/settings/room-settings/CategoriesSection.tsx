import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { roomCategoryApi } from '../../../lib/api/pms';
import type { RoomCategoryDetails } from '../../../lib/api/pms';
import { displayApiError } from '../../../lib/api/client';
import { toast } from '../../../utils/toast';
import { Button, IconButton, SelectField, TextArea, TextField } from '../../../components/primitives';
import { Field } from '../../../components/controls';
import { Modal } from '../../../components/overlays';
import { Badge, Card, CardTitle, TableContainer } from '../../../components/ui';
import { StatStrip, StatTile } from './RoomSettingsKit';

interface CategoriesSectionProps {
  /** The property whose categories are managed; null until one is chosen. */
  propertyId: string | null;
  categories: RoomCategoryDetails[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/** What the edit dialog works on. `id` is null while a new category is being added. */
interface CategoryForm {
  id: string | null;
  name: string;
  description: string;
  bedSetup: string;
  isActive: boolean;
}

const EMPTY_FORM: CategoryForm = {
  id: null,
  name: '',
  description: '',
  bedSetup: '1 King Bed (180x200 cm)',
  isActive: true,
};

const formFromCategory = (c: RoomCategoryDetails): CategoryForm => ({
  id: c.id,
  name: c.name,
  description: c.description ?? '',
  bedSetup: c.bedSetup,
  isActive: c.isActive,
});

export function CategoriesSection({ propertyId, categories, loading, error, onRefresh }: CategoriesSectionProps) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CategoryForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const query = search.trim().toLowerCase();
  const filtered = categories.filter(
    (c) => c.name.toLowerCase().includes(query) || c.bedSetup.toLowerCase().includes(query),
  );
  const activeCount = categories.filter((c) => c.isActive).length;

  const handleToggle = async (c: RoomCategoryDetails) => {
    if (!propertyId) return;
    try {
      await roomCategoryApi.update(propertyId, c.id, { isActive: !c.isActive });
      toast('Category status updated', { tone: 'success' });
      onRefresh();
    } catch (err) {
      toast('Could not change status', { detail: displayApiError(err), tone: 'danger' });
    }
  };

  const handleSave = async () => {
    if (!editing || !propertyId) return;
    if (editing.name.trim().length < 1) {
      return toast('Name required', { detail: 'Please specify category classification name.', tone: 'warning' });
    }
    if (editing.bedSetup.trim().length < 1) {
      return toast('Bed setup required', { detail: 'Please describe the standard bed setup.', tone: 'warning' });
    }

    const body = {
      name: editing.name.trim(),
      description: editing.description.trim(),
      bedSetup: editing.bedSetup.trim(),
      isActive: editing.isActive,
    };

    setIsSaving(true);
    try {
      if (editing.id === null) {
        await roomCategoryApi.create(propertyId, body);
        toast('Category created', { detail: `${body.name} added to classifications.`, tone: 'success' });
      } else {
        await roomCategoryApi.update(propertyId, editing.id, body);
        toast('Category updated', { detail: `${body.name} updated successfully.`, tone: 'success' });
      }
      onRefresh();
      setEditing(null);
    } catch (err) {
      toast('Could not save category', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (c: RoomCategoryDetails) => {
    if (!propertyId) return;
    try {
      await roomCategoryApi.remove(propertyId, c.id);
      toast('Category removed', { detail: `${c.name} removed from classification list.`, tone: 'info' });
      onRefresh();
    } catch (err) {
      toast('Could not remove category', { detail: displayApiError(err), tone: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <StatStrip>
        <StatTile
          label="Categories"
          icon={Lucide.Boxes}
          tone="info"
          value={categories.length}
          caption="Classification standards"
        />

        <StatTile
          label="Active"
          icon={Lucide.CheckCircle2}
          tone="success"
          value={activeCount}
          caption="Available for room allocation"
        />

        <StatTile
          label="Disabled"
          icon={Lucide.PauseCircle}
          tone="warning"
          value={categories.length - activeCount}
          caption="Hidden from allocation"
        />

        <StatTile
          label="Bed Layouts"
          icon={Lucide.BedDouble}
          tone="primary"
          value={new Set(categories.map((c) => c.bedSetup)).size}
          caption="Distinct bed setups"
        />
      </StatStrip>

      <Card>
        <CardTitle
          title="Room Categories & Architectural Classifications"
          icon={Lucide.LayoutGrid}
          action={
            <Button
              variant="primary"
              onClick={() => setEditing({ ...EMPTY_FORM })}
              disabled={!propertyId}
              icon={<Lucide.Plus size={14} />}
            >
              Add Classification
            </Button>
          }
        />

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            <Lucide.AlertCircle size={16} />
            <span>Could not load room categories: {error}</span>
          </div>
        )}

        <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Lucide.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category or bed layout..."
              className="pl-8"
            />
          </div>
          <p className="text-label text-ink-secondary self-center">
            Showing <span className="font-semibold text-ink">{filtered.length}</span> of {categories.length} categories
          </p>
        </div>

        <TableContainer>
          <table className="pms-table min-w-[760px] w-full text-left">
            <thead>
              <tr>
                <th>CLASSIFICATION NAME</th>
                <th>BED CONFIGURATION</th>
                <th className="text-center">STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cat) => (
                <tr key={cat.id} className="transition-colors hover:bg-hover-surface/60 border-b border-divider last:border-b-0">
                  <td className="py-3">
                    <span className="block font-bold text-ink text-label">{cat.name}</span>
                    {cat.description && (
                      <span className="block text-micro text-ink-secondary">{cat.description}</span>
                    )}
                  </td>
                  <td className="text-label text-ink-secondary py-3">
                    <div className="flex items-center gap-1.5 font-medium text-ink">
                      <Lucide.BedDouble size={13} className="text-ink-muted" />
                      <span>{cat.bedSetup}</span>
                    </div>
                  </td>
                  <td className="text-center py-3">
                    <Badge tone={cat.isActive ? 'success' : 'neutral'} dot size="sm">
                      {cat.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td className="text-right py-3">
                    <div className="inline-flex items-center gap-1.5">
                      <IconButton
                        title={cat.isActive ? 'Disable category' : 'Enable category'}
                        onClick={() => void handleToggle(cat)}
                        className={cat.isActive ? 'hover:text-warning-text' : 'hover:text-success-text'}
                      >
                        {cat.isActive ? <Lucide.PauseCircle size={15} /> : <Lucide.PlayCircle size={15} />}
                      </IconButton>
                      <IconButton title={`Edit ${cat.name}`} onClick={() => setEditing(formFromCategory(cat))}>
                        <Lucide.Pencil size={14} />
                      </IconButton>
                      <IconButton
                        title={`Delete ${cat.name}`}
                        onClick={() => void handleDelete(cat)}
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
                      ? 'Loading categories…'
                      : search
                        ? `No categories found matching "${search}".`
                        : 'No categories yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableContainer>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id === null ? 'Add Room Category' : `Edit ${editing?.name}`}
        subtitle="Configure physical room classification and standard bedding dimensions"
        wide
      >
        {editing && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 py-2">
            <div className="sm:col-span-2">
              <Field label="Classification Name">
                <TextField
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Accessible King Suite"
                  autoFocus
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Architectural Description">
                <TextArea
                  rows={2}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Details on floor space, entrance door width, bathroom layout, and special fixtures"
                />
              </Field>
            </div>

            <Field label="Standard Bed Setup">
              <TextField
                value={editing.bedSetup}
                onChange={(e) => setEditing({ ...editing, bedSetup: e.target.value })}
                placeholder="e.g. 1 King Bed (180x200 cm) or 2 Twins"
              />
            </Field>

            <Field label="Active Status">
              <SelectField
                value={editing.isActive ? 'active' : 'inactive'}
                onChange={(e) => setEditing({ ...editing, isActive: e.target.value === 'active' })}
              >
                <option value="active">Active (Permitted for room allocation)</option>
                <option value="inactive">Inactive</option>
              </SelectField>
            </Field>

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
                {isSaving ? 'Saving…' : 'Save Category'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
