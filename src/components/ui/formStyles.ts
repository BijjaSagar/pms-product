/*
 * Shared form control classes, taken from the New Reservation screen so every form
 * in the app has the same sizes. Inputs use the theme's pms-input (34px tall on
 * phones, 32px from tablet up) so focus rings, hover and radius match the rest of
 * the app.
 */
export const labelClass = 'block text-label font-medium text-ink-muted tracking-wide mb-1.5';
export const fieldClass = 'pms-input w-full min-h-[34px] md:min-h-[32px] px-2.5 py-1 text-title font-semibold';
export const selectClass = `${fieldClass} cursor-pointer`;
