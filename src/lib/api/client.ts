import { store } from '../../data/store';

/**
 * This build runs entirely against an in-memory data store, so there is no
 * network transport. The helpers below are kept so the rest of the app (error
 * formatting, idempotency keys and file downloads) behaves exactly as before.
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
