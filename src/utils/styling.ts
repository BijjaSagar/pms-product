/**
 * Shared input and form control styling classes.
 * Sizes come from the shared .pms-input rule (the New Reservation values), so
 * callers may only pass layout, colour or number-formatting classes here.
 */

const SIZE_CLASS = /^((md|lg|xl|2xl|sm):)?(text-(micro|label|body|title|disp2|disp3|xs|sm|base|lg|xl|2xl|\[\d+(\.\d+)?px\])|p[xytb]?-[\w.\[\]-]+|min-h-[\w.\[\]-]+|h-[\w.\[\]-]+|rounded(-[\w]+)?|font-(?!mono)[\w-]+|leading-[\w.\[\]-]+)$/;

export function inputClass(extra = ''): string {
  const kept = extra.split(/\s+/).filter((token) => token && !SIZE_CLASS.test(token)).join(' ');
  return kept ? `pms-input w-full ${kept}` : 'pms-input w-full';
}
