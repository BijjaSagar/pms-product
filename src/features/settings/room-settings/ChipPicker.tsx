interface ChipOption {
  value: string;
  label: string;
}

/* Pick any number of options as toggle chips. The caller owns the selection. */
export function ChipPicker({
  options,
  selected,
  onToggle,
  emptyText,
}: {
  options: ChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
  emptyText: string;
}) {
  if (options.length === 0) return <p className="text-label text-ink-muted">{emptyText}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const on = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(option.value)}
            className={`rounded-full border px-2.5 py-1 text-label font-medium transition-colors cursor-pointer ${
              on
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-surface text-ink-secondary hover:bg-hover-surface'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
