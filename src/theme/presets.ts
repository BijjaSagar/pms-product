// Central preset registry. Single source of truth for the swatcher UI.
// Runtime values live in tokens.css (must stay in sync). TS-only, erasable syntax.

export const PRESET_IDS = [
  'crimson',
  'ocean',
  'beige',
  'sage',
  'slate',
  'eucalyptus',
  'olive',
  'lavender',
  'midnight',
] as const;

export type ThemePresetId = (typeof PRESET_IDS)[number];

export interface PresetMeta {
  id: ThemePresetId;
  name: string;
  description: string;
  /** 5 chips shown in the swatcher: primary, dark accent, soft, sidebar, page bg */
  swatch: [string, string, string, string, string];
}

export const THEME_PRESETS: Record<ThemePresetId, PresetMeta> = {
  ocean: {
    id: 'ocean',
    name: 'Sky Blue & White',
    description: 'Light, friendly, and minimal — ideal for portfolios, education, and healthcare.',
    swatch: ['#0EA5E9', '#075985', '#7DD3FC', '#E0F2FE', '#F2F2F2'],
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Red',
    description: 'Bold crimson brand palette with light red accents and crisp white surfaces.',
    swatch: ['#C62828', '#7F0000', '#EF9A9A', '#FFEBEE', '#F2F2F2'],
  },
  beige: {
    id: 'beige',
    name: 'Luxury Beige & Taupe',
    description: 'Warm ivory and espresso wood house palette.',
    swatch: ['#8C715D', '#594638', '#D7C6B4', '#F0E8DE', '#F2F2F2'],
  },
  sage: {
    id: 'sage',
    name: 'Sage Green',
    description: 'Calm botanical green for long front-desk shifts.',
    swatch: ['#527565', '#344E43', '#B7C9BE', '#E9EFEB', '#F2F2F2'],
  },
  slate: {
    id: 'slate',
    name: 'Soft Blue & Slate',
    description: 'Crisp coastal slate with a corporate feel.',
    swatch: ['#536D86', '#34495E', '#C4D3E0', '#E8EDF2', '#F2F2F2'],
  },
  eucalyptus: {
    id: 'eucalyptus',
    name: 'Eucalyptus',
    description: 'Fresh spa-like teal, soft on the eyes at night.',
    swatch: ['#4C7770', '#31534E', '#B9D0C9', '#E6EEEB', '#F2F2F2'],
  },
  olive: {
    id: 'olive',
    name: 'Olive & Cream',
    description: 'Earthy olive grove tones with warm cream paper.',
    swatch: ['#687957', '#424E38', '#C7D0B9', '#E9EEE5', '#F2F2F2'],
  },
  lavender: {
    id: 'lavender',
    name: 'Dusty Lavender',
    description: 'Muted boutique violet, understated and quiet.',
    swatch: ['#796A96', '#504464', '#D4C9E2', '#F0EBF5', '#F2F2F2'],
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Navy',
    description: 'Deep navy navigation with bright blue actions.',
    swatch: ['#1D4ED8', '#12304A', '#60A5FA', '#DBEAFE', '#F2F2F2'],
  },
};

export const PRESET_LIST: PresetMeta[] = PRESET_IDS.map((id) => THEME_PRESETS[id]);

export const STORAGE_KEYS = {
  preset: 'pms-theme-preset',
} as const;

export function isPresetId(value: string | null): value is ThemePresetId {
  return value !== null && (PRESET_IDS as readonly string[]).includes(value);
}
