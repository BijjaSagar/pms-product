/**
 * Where the backend access token lives: sessionStorage, so it lasts only for
 * the browser tab and a shared workstation is signed out when it is closed.
 * It is also cleared on sign out.
 *
 * The hotel app (`/`) and the platform console (`/admin`) are separate apps on one origin, so each
 * entry point picks its own namespace before anything renders and the two never see each other's
 * session. The default is the hotel app.
 */
let namespace = 'pms';

/** Called once, by an entry point, before the first render. */
export function setStorageNamespace(value: string): void {
  namespace = value;
}

/** A sessionStorage key private to the running app. */
export function scopedKey(name: string): string {
  return `${namespace}.${name}`;
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(scopedKey('accessToken'));
}

export function saveAccessToken(token: string): void {
  sessionStorage.setItem(scopedKey('accessToken'), token);
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(scopedKey('accessToken'));
}
