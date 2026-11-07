import { store } from '../../data/store';
import { clearAccessToken, getAccessToken } from './authToken';

/**
 * Only authentication talks to the backend (`apiRequest`). Everything else
 * still runs against the in-memory data store, so the remaining helpers (error
 * formatting, idempotency keys and file downloads) behave exactly as before.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';

/** Nest error bodies are `{ statusCode, message: string | string[], error }`. */
function errorMessage(body: unknown, fallback: string): string {
  const message = (body as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) return message.join(', ');
  return typeof message === 'string' && message ? message : fallback;
}

/** Empty (204) and non-JSON bodies, such as a proxy's HTML error page, read as null. */
async function readJsonBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Calls the PMS backend with the stored bearer token. A 401 on an
 * authenticated call means the session is gone, so the token is dropped.
 */
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = getAccessToken();
  const isForm = options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        // A FormData body sets its own multipart Content-Type (with the boundary).
        ...(options.body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  const body = await readJsonBody(response);
  if (!response.ok) {
    if (response.status === 401 && token) clearAccessToken();
    throw new ApiError(errorMessage(body, 'The request could not be completed.'), response.status);
  }
  return body as T;
}

/**
 * Fetches a binary file (such as an image) with the bearer token, since an
 * `<img src>` cannot send one.
 */
export async function apiBlob(path: string): Promise<Blob> {
  const token = getAccessToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }
  if (!response.ok) {
    if (response.status === 401 && token) clearAccessToken();
    throw new ApiError(errorMessage(await readJsonBody(response), 'The file could not be loaded.'), response.status);
  }
  return response.blob();
}

/** Generates a CSV for a report path and triggers a client-side download. */
export async function downloadApiFile(path: string, fallbackName: string): Promise<void> {
  const { filename, content } = store.exportCsv(path, fallbackName);
  const blobUrl = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

export function displayApiError(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed.';
}

export function newIdempotencyKey(scope: string): string {
  return `${scope}:${globalThis.crypto.randomUUID()}`;
}
