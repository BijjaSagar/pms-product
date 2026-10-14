import { themeApi as pmsThemeApi } from './pms';
import type { ThemeKey } from '../../types';

export const themeApi = {
  get: async () => ({ themeKey: (await pmsThemeApi.get()).themeKey as ThemeKey }),
  set: async (themeKey: ThemeKey) => ({ ...(await pmsThemeApi.set(themeKey)), themeKey }),
};
