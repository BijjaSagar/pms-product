import type { ThemeKey } from '../types/index';

const THEME_STORAGE_KEY = 'pms.theme';

export const themeApi = {
  get: async (): Promise<{ themeKey: ThemeKey }> => ({
    themeKey: (localStorage.getItem(THEME_STORAGE_KEY) ?? 'CRIMSON_RED') as ThemeKey,
  }),
  set: async (themeKey: ThemeKey) => {
    localStorage.setItem(THEME_STORAGE_KEY, themeKey);
    return { themeKey, applied: true };
  },
};
