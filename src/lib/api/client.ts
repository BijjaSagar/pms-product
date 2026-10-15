const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

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

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
      ...options,
      headers,
      body,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Could not reach the PMS server. Check that the backend is running.', 0);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as
      | { message?: string | string[]; error?: string; code?: string }
      | null;
    const message = Array.isArray(payload?.message)
      ? payload.message.join('. ')
      : payload?.message || payload?.error || response.statusText || 'Request failed';
    throw new ApiError(message, response.status, payload?.code);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function downloadApiFile(path: string, fallbackName: string): Promise<void> {
  const response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, { credentials: 'include' });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
    throw new ApiError(Array.isArray(payload?.message) ? payload.message.join('. ') : payload?.message ?? response.statusText, response.status);
  }
  const disposition = response.headers.get('Content-Disposition');
  const filename = disposition?.match(/filename="?([^";]+)"?/)?.[1] ?? fallbackName;
  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function displayApiError(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed.';
}

export function newIdempotencyKey(scope: string): string {
  return `${scope}:${globalThis.crypto.randomUUID()}`;
}
