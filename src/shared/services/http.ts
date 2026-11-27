import { endSession } from './session';

/**
 * Calls to pms-backend's authentication service (accounts and property setup). Everything else still
 * runs on the in-memory mocks. The token lasts as long as the tab.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'pms.token';

export const saveToken = (token: string): void => sessionStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => sessionStorage.removeItem(TOKEN_KEY);

/** Sends one request with the session token and returns the response, or throws with the server's message. */
async function send(path: string, method: string, contentType?: string, body?: BodyInit): Promise<Response> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(contentType ? { 'Content-Type': contentType } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    });
  } catch {
    throw new Error('Cannot reach the server. Check that it is running and try again.');
  }

  if (!response.ok) {
    // A refused token means the session is over; a refused password on sign-in has no token yet.
    if (response.status === 401 && token) {
      clearToken();
      endSession();
    }
    const data = (await response.json().catch(() => undefined)) as { message?: unknown } | undefined;
    throw new Error(typeof data?.message === 'string' ? data.message : 'The request could not be completed.');
  }
  return response;
}

const readJson = async <T>(response: Response): Promise<T> =>
  (response.status === 204 ? undefined : await response.json().catch(() => undefined)) as T;

export async function request<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const response = await send(path, method, body === undefined ? undefined : 'application/json', body === undefined ? undefined : JSON.stringify(body));
  return readJson<T>(response);
}

/** Downloads a stored file, such as a property logo. */
export async function requestBlob(path: string): Promise<Blob> {
  return (await send(path, 'GET')).blob();
}

/** Sends a file as the raw request body. */
export async function uploadFile<T>(path: string, file: Blob, method = 'PUT'): Promise<T> {
  return readJson<T>(await send(path, method, file.type, file));
}
