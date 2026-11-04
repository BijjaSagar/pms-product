import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Button, IconButton, TextField } from '../../../components/primitives';
import { toast } from '../../../utils/toast';
import { SectionCard } from './SectionCard';
import type { CatalogItem } from './roomSettingsData';

/* An editable list of named options: classifications and out-of-order reasons. */
export function CatalogCard({
  icon,
  title,
  description,
  noun,
  emptyText,
  items,
  saving,
  onSave,
}: {
  icon: Lucide.LucideIcon;
  title: string;
  description: string;
  /* What one entry is called, for the messages: "classification", "reason". */
  noun: string;
  emptyText: string;
  items: CatalogItem[];
  saving: boolean;
  onSave: (items: CatalogItem[]) => void;
}) {
  const [list, setList] = useState<CatalogItem[]>(items);
  const [draft, setDraft] = useState('');
  const dirty = JSON.stringify(list) !== JSON.stringify(items);

  const add = () => {
    const label = draft.trim();
    if (!label) return;
    if (list.some((item) => item.label.toLowerCase() === label.toLowerCase())) {
      toast(`That ${noun} is already listed`, { tone: 'warning' });
      return;
    }
    setList([...list, { id: crypto.randomUUID(), label }]);
    setDraft('');
  };

  const save = () => {
    const labels = list.map((item) => item.label.trim().toLowerCase());
    if (labels.some((label) => label === '')) {
      toast(`Every ${noun} needs a name`, { tone: 'warning' });
      return;
    }
    if (new Set(labels).size !== labels.length) {
      toast(`Two ${noun}s have the same name`, { tone: 'warning' });
      return;
    }
    onSave(list.map((item) => ({ ...item, label: item.label.trim() })));
  };

  return (
    <SectionCard
      icon={icon}
      title={title}
      description={description}
      action={
        <Button variant="primary" type="button" onClick={save} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      }
    >
      {list.length === 0 && <p className="mb-3 text-label text-ink-muted">{emptyText}</p>}
      <ul className="flex flex-col gap-2">
        {list.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <TextField
              value={item.label}
              aria-label={`${noun} name`}
              onChange={(e) => setList(list.map((row) => (row.id === item.id ? { ...row, label: e.target.value } : row)))}
              className="min-w-0 flex-1"
            />
            <IconButton
              variant="ghost"
              type="button"
              aria-label={`Remove ${item.label}`}
              onClick={() => setList(list.filter((row) => row.id !== item.id))}
            >
              <Lucide.X size={14} />
            </IconButton>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <TextField
          value={draft}
          placeholder={`Add ${noun}`}
          aria-label={`New ${noun}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          className="min-w-0 flex-1"
        />
        <Button variant="secondary" type="button" onClick={add} icon={<Lucide.Plus size={14} />}>
          Add
        </Button>
      </div>
    </SectionCard>
  );
}
