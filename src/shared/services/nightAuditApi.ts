import { store } from '../mocks/store';

export interface NightAuditRow {
  id?: string; businessDate: string; status: string | null; exists: boolean; today?: string;
  previewSummary?: { exceptionCount?: number; counts?: Record<string, number> } | null;
  finalSummary?: { exceptionCount?: number; counts?: Record<string, number> } | null;
  exceptionCount?: number; advisoryOnly?: boolean;
}

export function newIdempotencyKey(scope: string): string {
  return `${scope}:${globalThis.crypto.randomUUID()}`;
}

export const nightAuditApi = {
  get: async (date: string) => store.nightAuditGet(date),
  preview: async (date: string) => store.nightAuditPreview(date),
  close: async (date: string, _idempotencyKey: string) => store.nightAuditClose(date),
  reopen: async (date: string, reason: string) => store.nightAuditReopen(date, reason),
};
