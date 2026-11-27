export interface CategoryTone {
  /** The small colour dot next to a category name. */
  dot: string;
  /** A pill or room tile in the category's colour. */
  tile: string;
}

const TONES: CategoryTone[] = [
  { dot: 'bg-primary', tile: 'border-primary/25 bg-primary/10 text-primary' },
  { dot: 'bg-success-text', tile: 'border-success-border bg-success-bg text-success-text' },
  { dot: 'bg-info-text', tile: 'border-info-border bg-info-bg text-info-text' },
  { dot: 'bg-warning-text', tile: 'border-warning-border bg-warning-bg text-warning-text' },
  { dot: 'bg-neutral-text', tile: 'border-neutral-border bg-neutral-bg text-neutral-text' },
];

/** A category keeps its colour by its position in the list; the colours repeat after five. */
export const categoryTone = (index: number): CategoryTone => TONES[Math.max(index, 0) % TONES.length] as CategoryTone;

/** Used for rooms that have no category yet. */
export const NO_CATEGORY_TONE: CategoryTone = { dot: 'bg-ink-muted', tile: 'border-dashed border-border bg-white text-ink-secondary' };
