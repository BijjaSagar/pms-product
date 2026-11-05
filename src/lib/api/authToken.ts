/**
 * Where the backend access token lives. "Remember this workstation" keeps it
 * in localStorage so it survives closing the browser; otherwise it only lasts
 * for the tab (sessionStorage). The token does not expire server-side, so it is
 * always cleared on sign out.
 */
const TOKEN_KEY = 'pms.accessToken';

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function saveAccessToken(token: string, remember: boolean): void {
  clearAccessToken();
  (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
