/** The shortest password the API accepts (it also caps them at 128 characters). */
export const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

/** The first thing wrong with a new password, or null when it can be sent. The API checks the current one. */
export function newPasswordProblem(current: string, next: string, confirm: string): string | null {
  if (!current) return 'Enter your current password.';
  if (next.length < MIN_PASSWORD) return `Use a new password of at least ${MIN_PASSWORD} characters.`;
  if (next.length > MAX_PASSWORD) return `Use a new password of at most ${MAX_PASSWORD} characters.`;
  if (next === current) return 'The new password must be different from the current one.';
  if (next !== confirm) return 'The two new passwords do not match.';
  return null;
}
