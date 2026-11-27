import { useEffect, useState } from 'react';
import { themeApi } from '../services/themeApi';
import type { ThemeKey } from '../types/index';
import { useTheme } from './useTheme';
import type { ThemePresetId } from './presets';

const THEME_KEY_TO_PRESET: Record<ThemeKey, ThemePresetId> = {
  MIDNIGHT_NAVY: 'midnight',
  SKY_BLUE_WHITE: 'ocean',
  LUXURY_BEIGE_TAUPE: 'beige',
  SAGE_GREEN: 'sage',
  SOFT_BLUE_SLATE: 'slate',
  EUCALYPTUS: 'eucalyptus',
  OLIVE_CREAM: 'olive',
  DUSTY_LAVENDER: 'lavender',
  CRIMSON_RED: 'crimson',
};
const PRESET_TO_THEME_KEY = Object.fromEntries(Object.entries(THEME_KEY_TO_PRESET).map(([key, value]) => [value, key])) as Record<string, ThemeKey>;

/**
 * Keeps the colour theme saved on the data layer for one signed-in scope (an account, and the property it
 * has open): loads it when the scope appears and saves later changes. Pass null while signed out.
 */
export function useServerTheme(scope: string | null): void {
  const { preset, setPreset } = useTheme();
  const [loadedScope, setLoadedScope] = useState<string | null>(null);

  useEffect(() => {
    if (!scope) return;
    let active = true;
    themeApi.get().then(({ themeKey }) => {
      const presetId = THEME_KEY_TO_PRESET[themeKey];
      if (active && presetId) setPreset(presetId);
    }).catch(() => undefined).finally(() => {
      if (active) setLoadedScope(scope);
    });
    return () => { active = false; };
  }, [scope, setPreset]);

  useEffect(() => {
    if (!scope || loadedScope !== scope) return;
    const themeKey = PRESET_TO_THEME_KEY[preset];
    if (themeKey) void themeApi.set(themeKey).catch(() => undefined);
  }, [scope, loadedScope, preset]);
}
