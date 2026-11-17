import { fieldClass } from '../formStyles';

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

/** Text fields in the setup forms: the same size as the New Reservation fields. Phones use 16px so iOS does not zoom the page on focus. */
export const FIELD = `${fieldClass} max-md:text-[16px]`;
/** A field that failed validation. */
export const FIELD_INVALID = `${FIELD} !border-danger-text`;

export const CARD = 'rounded-[20px] border border-border bg-white/80 shadow-sm';
