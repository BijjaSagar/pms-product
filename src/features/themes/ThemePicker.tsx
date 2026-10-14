import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PRESET_LIST, type ThemePresetId } from '../../theme/presets';
import { useTheme } from '../../theme/useTheme';
import { themeApi } from '../../lib/api/phase3';
import type { ThemeKey } from '../../types/index';

const KEY_TO_PRESET: Record<ThemeKey, ThemePresetId> = {
  MIDNIGHT_NAVY: 'midnight',
  SKY_BLUE_WHITE: 'ocean',
  LUXURY_BEIGE_TAUPE: 'beige',
  SAGE_GREEN: 'sage',
  SOFT_BLUE_SLATE: 'slate',
  EUCALYPTUS: 'eucalyptus',
  OLIVE_CREAM: 'olive',
  DUSTY_LAVENDER: 'lavender',
};

const PRESET_TO_KEY = Object.fromEntries(
  Object.entries(KEY_TO_PRESET).map(([key, value]) => [value, key as ThemeKey]),
) as Record<ThemePresetId, ThemeKey>;

function remoteLabel(key: ThemeKey | undefined): string | null {
  if (!key) return null;
  const presetId = KEY_TO_PRESET[key];
  if (!presetId) return null;
  return PRESET_LIST.find((preset) => preset.id === presetId)?.name ?? null;
}

/** Shared by the appearance drawer and the full appearance settings route. */
export function ThemePicker() {
  const { preset, setPreset } = useTheme();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState<ThemeKey | null>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const { data: remote } = useQuery({
    queryKey: ['theme-pref'],
    queryFn: themeApi.get,
    staleTime: 5 * 60_000,
  });

  const save = useMutation({
    mutationFn: (key: ThemeKey) => themeApi.set(key),
    onSuccess: (data) => {
      setSaved(data.themeKey);
      void queryClient.invalidateQueries({ queryKey: ['theme-pref'] });
    },
  });

  const choose = (id: ThemePresetId) => {
    setPreset(id);
    save.mutate(PRESET_TO_KEY[id]);
  };

  const moveSelection = (index: number, key: string) => {
    const offset = key === 'ArrowRight' || key === 'ArrowDown' ? 1
      : key === 'ArrowLeft' || key === 'ArrowUp' ? -1
        : key === 'Home' ? -PRESET_LIST.length
          : key === 'End' ? PRESET_LIST.length
            : 0;
    if (!offset) return;
    const nextIndex = key === 'Home' ? 0
      : key === 'End' ? PRESET_LIST.length - 1
        : (index + offset + PRESET_LIST.length) % PRESET_LIST.length;
    choose(PRESET_LIST[nextIndex].id);
    cardRefs.current[nextIndex]?.focus();
  };

  return (
    <div>
      <div role="radiogroup" aria-label="Colour theme" className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
        {PRESET_LIST.map((presetItem, index) => {
          const selected = presetItem.id === preset;
          return (
            <button
              key={presetItem.id}
              ref={(element) => { cardRefs.current[index] = element; }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-labelledby={`theme-name-${presetItem.id}`}
              aria-describedby={`theme-description-${presetItem.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => choose(presetItem.id)}
              onKeyDown={(event) => {
                if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                  event.preventDefault();
                  moveSelection(index, event.key);
                }
              }}
              className={`tx-theme-option flex min-h-[176px] flex-col rounded-[16px] border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-hover-surface)] ring-1 ring-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]'
              }`}
            >
              <span className="flex w-full items-start justify-between gap-3">
                <span id={`theme-name-${presetItem.id}`} className="min-w-0 pt-0.5 text-[15px] font-bold leading-snug text-[var(--color-ink)]">
                  {presetItem.name}
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 transition-colors"
                  style={{
                    borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                    background: selected ? 'var(--color-primary)' : 'transparent',
                    color: selected ? 'var(--color-primary-foreground)' : 'transparent',
                  }}
                >
                  {selected ? <span className="text-[12px] font-bold leading-none">✓</span> : null}
                </span>
              </span>
              <span className="mt-4 flex items-center gap-2" aria-hidden="true">
                {presetItem.swatch.map((color) => (
                  <span
                    key={color}
                    className="h-8 w-8 flex-none rounded-full border shadow-sm sm:h-9 sm:w-9"
                    style={{ background: color, borderColor: 'color-mix(in srgb, var(--color-ink) 12%, transparent)' }}
                  />
                ))}
              </span>
              <span id={`theme-description-${presetItem.id}`} className="mt-auto block pt-3 text-[12.5px] leading-relaxed text-[var(--color-ink-secondary)]">
                {presetItem.description}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-[var(--color-text-muted)]" role="status" aria-live="polite">
        {save.isPending && 'Saving…'}
        {save.isError && 'Could not save the theme. It will apply again next visit.'}
        {saved && !save.isPending && !save.isError && `Saved: ${remoteLabel(saved) ?? saved}`}
        {!save.isPending && !save.isError && !saved && remote && `Saved on your account: ${remoteLabel(remote.themeKey)}`}
      </p>
    </div>
  );
}
