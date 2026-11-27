import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { STORAGE_KEYS, isPresetId } from './presets';
import type { ThemePresetId } from './presets';
import { ThemeContext } from './context';

const DEFAULT_PRESET: ThemePresetId = 'crimson';

function readStoredPreset(): ThemePresetId {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.preset);
    if (isPresetId(raw)) return raw;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_PRESET;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<ThemePresetId>(() => readStoredPreset());

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.preset = preset;
    root.style.colorScheme = 'light';
    try {
      localStorage.setItem(STORAGE_KEYS.preset, preset);
    } catch {
      /* ignore */
    }
  }, [preset]);

  const setPreset = useCallback((next: ThemePresetId) => {
    setPresetState(next);
  }, []);

  const value = useMemo(
    () => ({
      preset,
      setPreset,
    }),
    [preset, setPreset],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
