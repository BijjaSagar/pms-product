import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { taxSetupApi, type TaxSetupRuleInput, type TaxSetupRuleRow } from '../../../../shared/services/taxSetupApi';
import { useApiResource } from '../../../../shared/services/useApiResource';
import { displayError } from '../../../../shared/services/errors';
import { toast } from '../../../../shared/utils/toast';
import { Button } from '../../../../shared/components/ui/primitives';
import { ConfirmDialog } from '../../../../shared/components/ui/overlays';
import { PanelLoadState } from '../../../../shared/components/feedback/Skeleton';
import { Card, TableActionBtn, TableContainer } from '../../../../shared/components/ui/display';
import { ReadOnlyNotice, SettingsHeader } from '../components/SettingsKit';
import { TaxRuleForm } from '../components/TaxRuleForm';

/** "2026-10-14" -> "14 Oct 2026"; a rule with no end date has nothing to show. */
const formatDay = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export function TaxRuleTab({ canManage }: { canManage: boolean }) {
  const load = useCallback(async () => {
    const [rules, categories] = await Promise.all([taxSetupApi.rules(), taxSetupApi.categories()]);
    return { rules, categories };
  }, []);
  const resource = useApiResource(load);
  // `undefined` is closed, `null` is adding, a row is editing it.
  const [editing, setEditing] = useState<TaxSetupRuleRow | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<TaxSetupRuleRow | null>(null);

  const rules = resource.data?.rules ?? [];
  const categories = resource.data?.categories ?? [];

  const save = async (body: TaxSetupRuleInput) => {
    try {
      if (editing) await taxSetupApi.updateRule(editing.id, body);
      else await taxSetupApi.createRule(body);
      resource.refresh();
      toast(editing ? 'Tax rule updated' : 'Tax rule added', { detail: body.name, tone: 'success' });
      setEditing(undefined);
    } catch (err) {
      toast('Could not save tax rule', { detail: displayError(err), tone: 'danger' });
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await taxSetupApi.deleteRule(deleting.id);
      resource.refresh();
      toast('Tax rule deleted', { detail: deleting.name, tone: 'success' });
    } catch (err) {
      toast('Could not delete tax rule', { detail: displayError(err), tone: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader
        title="Tax Rule"
        description="Which tax applies to a category, and the slabs it is charged in"
        action={
          canManage ? (
            <Button variant="primary" icon={<Lucide.Plus size={15} strokeWidth={2.4} />} onClick={() => setEditing(null)}>
              Add Rule
            </Button>
          ) : null
        }
      />
      {!canManage ? <ReadOnlyNotice what="tax rules" /> : null}

      {!resource.data ? (
        <PanelLoadState error={resource.error} label="Loading tax rules" />
      ) : (
        <Card>
          <TableContainer>
            <table className="pms-table">
              <thead>
                <tr>
                  <th className="text-label font-semibold">NAME</th>
                  <th className="text-label font-semibold">DESCRIPTION</th>
                  <th className="whitespace-nowrap text-label font-semibold">START DATE</th>
                  <th className="whitespace-nowrap text-label font-semibold">END DATE</th>
                  {canManage ? <th className="w-28 text-right text-label font-semibold">ACTIONS</th> : null}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="align-top text-label font-semibold text-ink">{rule.name}</td>
                    <td className="break-words align-top text-label text-ink-secondary">{rule.description || '—'}</td>
                    <td className="whitespace-nowrap align-top text-label text-ink">{formatDay(rule.startDate)}</td>
                    <td className="whitespace-nowrap align-top text-label text-ink">{formatDay(rule.endDate)}</td>
                    {canManage ? (
                      <td className="align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <TableActionBtn icon={Lucide.Pencil} title={`Edit ${rule.name}`} onClick={() => setEditing(rule)} />
                          <TableActionBtn icon={Lucide.Trash2} variant="danger" title={`Delete ${rule.name}`} onClick={() => setDeleting(rule)} />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
          {rules.length === 0 ? (
            <p className="py-8 text-center text-label text-ink-secondary">
              No tax rules yet.{canManage ? ' Use Add Rule to create the first one.' : ''}
            </p>
          ) : null}
        </Card>
      )}

      {editing !== undefined ? (
        <TaxRuleForm key={editing?.id ?? 'new'} rule={editing} categories={categories} onSave={save} onClose={() => setEditing(undefined)} />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void remove()}
        title="Delete tax rule"
        body={`Delete "${deleting?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
