/**
 * Where the backend access token lives: sessionStorage, so it lasts only for
 * the browser tab and a shared workstation is signed out when it is closed.
 * The token does not expire server-side, so it is also cleared on sign out.
 */
const TOKEN_KEY = 'pms.accessToken';

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function saveAccessToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}
