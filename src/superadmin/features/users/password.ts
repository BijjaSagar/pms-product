/** No 0/O, 1/l/I: a password read out or typed from a screen should not be ambiguous. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** A random first password to hand to a new user, who must replace it at their first sign-in. */
export function generatePassword(length = 12): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}
