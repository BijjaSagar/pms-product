import { createContext } from 'react';
import type { ThemePresetId } from './presets';

export interface ThemeContextValue {
  preset: ThemePresetId;
  setPreset: (preset: ThemePresetId) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
