/**
 * The look of the pre-workspace screens (sign in, choose a property, property
 * setup and overview): Outfit for headings, Geist for the rest, soft cream
 * surfaces and the theme's primary colour for accents. Colours come from theme
 * tokens, so these follow the active theme.
 */
export const HEADING = "font-['Outfit',sans-serif]";
export const BODY = "font-['Geist',Inter,system-ui,sans-serif]";

export const EYEBROW = 'text-[12px] font-semibold uppercase tracking-[0.2em] text-primary';
export const LABEL = 'text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-secondary';

const CONTROL_BASE =
  'w-full rounded-[14px] border bg-white px-4 text-[14px] text-ink shadow-sm outline-none transition-colors placeholder:text-ink-muted focus-visible:!outline-0 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20';

/** Large control, used on the sign-in form. */
export const CONTROL = `h-12 border-border ${CONTROL_BASE}`;
/** Standard control for the setup forms. */
export const FIELD = `h-11 border-border ${CONTROL_BASE}`;
/** A field that failed validation. */
export const FIELD_INVALID = `h-11 border-danger-text ${CONTROL_BASE}`;

export const CARD = 'rounded-[20px] border border-border bg-white/80 shadow-sm';

export const BUTTON_PRIMARY =
  'inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-colors hover:bg-primary-hover active:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none';
export const BUTTON_SOFT =
  'inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border border-primary/20 bg-primary/10 px-3.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50';
export const BUTTON_PLAIN =
  'inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[14px] px-4 text-[14px] font-medium text-ink-secondary transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50';
