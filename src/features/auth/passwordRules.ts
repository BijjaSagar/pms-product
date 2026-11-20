/** The shortest password the API accepts (it also caps them at 128 characters). */
export const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The first thing wrong with the create-account form, or null when it can be sent. The API checks it again. */
export function registrationProblem(name: string, email: string, password: string): string | null {
  if (name.trim().length < 2) return 'Enter your full name.';
  if (!EMAIL.test(email.trim())) return 'Enter a valid email address.';
  if (password.length < MIN_PASSWORD) return `Use a password of at least ${MIN_PASSWORD} characters.`;
  if (password.length > MAX_PASSWORD) return `Use a password of at most ${MAX_PASSWORD} characters.`;
  return null;
}

/** The first thing wrong with a new password, or null when it can be sent. The API checks the current one. */
export function newPasswordProblem(current: string, next: string, confirm: string): string | null {
  if (!current) return 'Enter your current password.';
  if (next.length < MIN_PASSWORD) return `Use a new password of at least ${MIN_PASSWORD} characters.`;
  if (next.length > MAX_PASSWORD) return `Use a new password of at most ${MAX_PASSWORD} characters.`;
  if (next === current) return 'The new password must be different from the current one.';
  if (next !== confirm) return 'The two new passwords do not match.';
  return null;
}
