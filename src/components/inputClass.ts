/** Shared form input styling. Non-component module (see controls.tsx for components). */

export function inputClass(extra = ''): string {
  return `pms-input w-full min-h-[42px] px-3.5 py-2.5 ${extra}`;
}
