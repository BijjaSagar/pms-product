import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { STORAGE_KEYS, isHexColor, isPresetId } from './presets';
import type { ThemePresetId } from './presets';
import { ThemeContext } from './context';

const DEFAULT_PRESET: ThemePresetId = 'midnight';

function readStoredPreset(): ThemePresetId {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.preset);
    if (isPresetId(raw)) return raw;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_PRESET;
}

function readStoredAccent(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.accent);
    if (raw && isHexColor(raw)) return raw.toUpperCase();
  } catch {
    /* storage unavailable */
  }
  return null;
}

/** Darken/lighten a #RRGGBB hex by percent (-100..100). */
function shadeHex(hex: string, percent: number): string {
  const n = hex.replace('#', '');
  const num = parseInt(n, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<ThemePresetId>(() => readStoredPreset());
  const [customAccent, setCustomAccentState] = useState<string | null>(() => readStoredAccent());

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

  useEffect(() => {
    const root = document.documentElement;
    if (customAccent && isHexColor(customAccent)) {
      root.style.setProperty('--color-primary', customAccent.toUpperCase());
      root.style.setProperty('--color-primary-hover', shadeHex(customAccent, -10));
      root.style.setProperty('--color-primary-active', shadeHex(customAccent, -18));
      root.style.setProperty('--color-focus', customAccent.toUpperCase());
      try {
        localStorage.setItem(STORAGE_KEYS.accent, customAccent.toUpperCase());
      } catch {
        /* ignore */
      }
    } else {
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-primary-hover');
      root.style.removeProperty('--color-primary-active');
      root.style.removeProperty('--color-focus');
      try {
        localStorage.removeItem(STORAGE_KEYS.accent);
      } catch {
        /* ignore */
      }
    }
  }, [customAccent, preset]);

  const setPreset = useCallback((next: ThemePresetId) => {
    setPresetState(next);
  }, []);

  const setCustomAccent = useCallback((hex: string | null) => {
    if (hex === null || hex === '') {
      setCustomAccentState(null);
      return;
    }
    const normalized = hex.trim().toUpperCase();
    if (isHexColor(normalized)) setCustomAccentState(normalized);
  }, []);

  const resetPresetDefaults = useCallback(() => {
    setCustomAccentState(null);
  }, []);

  const resetAll = useCallback(() => {
    setPresetState(DEFAULT_PRESET);
    setCustomAccentState(null);
  }, []);

  const value = useMemo(
    () => ({
      preset,
      customAccent,
      setPreset,
      setCustomAccent,
      resetPresetDefaults,
      resetAll,
    }),
    [preset, customAccent, setPreset, setCustomAccent, resetPresetDefaults, resetAll],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
