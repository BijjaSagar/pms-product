import { activationKeys } from '../mocks/platform';
import { recordActivity, requireSuperAdmin } from './session';

/** A single-use key a super admin issues; a new customer enters it to activate their property. */
export interface ActivationKey {
  id: string;
  code: string;
  note: string | null;
  status: 'unused' | 'used' | 'revoked';
  createdAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  /** The property the key activated, once used. */
  usedByProperty: { id: string; name: string; code: string } | null;
}
export interface ActivationKeyPage { data: ActivationKey[]; total: number; page: number; pageSize: number }

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const newCode = () =>
  Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (byte) => ALPHABET[byte % ALPHABET.length])
    .join('')
    .replace(/(.{4})(?=.)/g, '$1-');

/** SUPER_ADMIN only. */
export const activationKeyApi = {
  list: async (query: { status?: ActivationKey['status']; page?: number; pageSize?: number } = {}): Promise<ActivationKeyPage> => {
    requireSuperAdmin();
    const { status, page = 1, pageSize = 25 } = query;
    const rows = activationKeys.filter((k) => !status || k.status === status);
    return { data: structuredClone(rows.slice((page - 1) * pageSize, page * pageSize)), total: rows.length, page, pageSize };
  },
  create: async (body: { count?: number; note?: string }) => {
    requireSuperAdmin();
    const created = Array.from({ length: body.count ?? 1 }, (): ActivationKey => ({
      id: globalThis.crypto.randomUUID(), code: newCode(), note: body.note?.trim() || null, status: 'unused',
      createdAt: new Date().toISOString(), usedAt: null, revokedAt: null, usedByProperty: null,
    }));
    activationKeys.unshift(...created);
    recordActivity('activation-keys', 'create', `Issued ${created.length} activation key${created.length === 1 ? '' : 's'}`);
    return structuredClone(created);
  },
  /** Withdraws an unused key. */
  revoke: async (id: string) => {
    requireSuperAdmin();
    const key = activationKeys.find((item) => item.id === id);
    if (key?.status !== 'unused') throw new Error('Only an unused key can be revoked.');
    Object.assign(key, { status: 'revoked', revokedAt: new Date().toISOString() });
    recordActivity('activation-keys', 'revoke', 'Revoked an activation key', { resourceId: id });
    return structuredClone(key);
  },
};
