import { createContext } from 'react';
import type { ThemePresetId } from './presets';

export interface ThemeContextValue {
  preset: ThemePresetId;
  customAccent: string | null;
  setPreset: (preset: ThemePresetId) => void;
  setCustomAccent: (hex: string | null) => void;
  resetPresetDefaults: () => void;
  resetAll: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
