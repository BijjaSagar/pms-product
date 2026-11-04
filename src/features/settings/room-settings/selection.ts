/* The list with `value` added when it is absent, and removed when it is present. */
export function toggled(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
