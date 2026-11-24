import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { taxSetupApi } from '../../../lib/api/pms';
import type { TaxCategoryRow } from '../../../lib/api/pms';
import { useApiResource } from '../../../lib/api/useApiResource';
import { displayApiError } from '../../../lib/api/client';
import { toast } from '../../../utils/toast';
import { Button, TextArea, TextField } from '../../../components/ui/primitives';
import { Field } from '../../../components/ui/controls';
import { ConfirmDialog, Modal } from '../../../components/ui/overlays';
import { PanelLoadState } from '../../../components/feedback/Skeleton';
import { Card, TableActionBtn, TableContainer } from '../../../components/ui/display';
import { ReadOnlyNotice, SettingsHeader } from '../components/SettingsKit';

/** Add or edit one category; the form is remounted for each category, so it always starts from its values. */
function CategoryForm({
  category,
  taken,
  onSave,
  onClose,
}: {
  category: TaxCategoryRow | null;
  /** Names already in use by other categories. */
  taken: string[];
  onSave: (name: string, description: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [saving, setSaving] = useState(false);
  const trimmed = name.trim();
  const duplicate = taken.some((t) => t.toLowerCase() === trimmed.toLowerCase());

  const submit = async () => {
    if (!trimmed || duplicate) return;
    setSaving(true);
    try {
      await onSave(trimmed, description.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={category ? 'Edit Tax Category' : 'Add Tax Category'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={saving || !trimmed || duplicate} onClick={() => void submit()}>
            {category ? 'Save Changes' : 'Add Category'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field
          label="Name"
          required
          error={duplicate ? 'A category with this name already exists.' : undefined}
        >
          <TextField autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Room Tariff" />
        </Field>
        <Field label="Description">
          <TextArea
            rows={3}
            value={description}
            maxLength={200}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this category is used for"
          />
        </Field>
      </form>
    </Modal>
  );
}

export function TaxCategoryTab({ canManage }: { canManage: boolean }) {
  const load = useCallback(() => taxSetupApi.categories(), []);
  const resource = useApiResource(load);
  // `undefined` is closed, `null` is adding, a row is editing it.
  const [editing, setEditing] = useState<TaxCategoryRow | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<TaxCategoryRow | null>(null);

  const rows = resource.data ?? [];

  const save = async (name: string, description: string) => {
    try {
      if (editing) await taxSetupApi.updateCategory(editing.id, { name, description });
      else await taxSetupApi.createCategory({ name, description });
      resource.refresh();
      toast(editing ? 'Tax category updated' : 'Tax category added', { detail: name, tone: 'success' });
      setEditing(undefined);
    } catch (err) {
      toast('Could not save tax category', { detail: displayApiError(err), tone: 'danger' });
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await taxSetupApi.deleteCategory(deleting.id);
      resource.refresh();
      toast('Tax category deleted', { detail: deleting.name, tone: 'success' });
    } catch (err) {
      toast('Could not delete tax category', { detail: displayApiError(err), tone: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader
        title="Tax Category"
        description="Group charges so the right tax can be applied to them"
        action={
          canManage ? (
            <Button variant="primary" icon={<Lucide.Plus size={15} strokeWidth={2.4} />} onClick={() => setEditing(null)}>
              Add Category
            </Button>
          ) : null
        }
      />
      {!canManage ? <ReadOnlyNotice what="tax categories" /> : null}

      {!resource.data ? (
        <PanelLoadState error={resource.error} label="Loading tax categories" />
      ) : (
        <Card>
          <TableContainer>
            <table className="pms-table">
              <thead>
                <tr>
                  <th className="text-label font-semibold">NAME</th>
                  <th className="text-label font-semibold">DESCRIPTION</th>
                  {canManage ? <th className="w-28 text-right text-label font-semibold">ACTIONS</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="align-top text-label font-semibold text-ink">{row.name}</td>
                    <td className="break-words align-top text-label text-ink-secondary">{row.description || '—'}</td>
                    {canManage ? (
                      <td className="align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <TableActionBtn icon={Lucide.Pencil} title={`Edit ${row.name}`} onClick={() => setEditing(row)} />
                          <TableActionBtn icon={Lucide.Trash2} variant="danger" title={`Delete ${row.name}`} onClick={() => setDeleting(row)} />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-label text-ink-secondary">
              No tax categories yet.{canManage ? ' Use Add Category to create the first one.' : ''}
            </p>
          ) : null}
        </Card>
      )}

      {editing !== undefined ? (
        <CategoryForm
          key={editing?.id ?? 'new'}
          category={editing}
          taken={rows.filter((r) => r.id !== editing?.id).map((r) => r.name)}
          onSave={save}
          onClose={() => setEditing(undefined)}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void remove()}
        title="Delete tax category"
        body={`Delete "${deleting?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
