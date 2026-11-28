import { request } from './http';

/** A Relationship Manager: looks after up to `maxOwners` owner companies. */
export interface ManagerRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  maxOwners: number;
  ownerCount: number;
  mustChangePassword: boolean;
  createdAt: string;
}

/** The password is shown once, to whoever created the account; the person replaces it at first sign-in. */
export type NewManager = ManagerRow & { temporaryPassword: string };

/** Super Super Admin only. */
export const managerApi = {
  list: () => request<ManagerRow[]>('/relationship-managers'),
  create: (body: { name: string; email: string; maxOwners?: number }) => request<NewManager>('/relationship-managers', body),
  update: (id: string, body: { name?: string; maxOwners?: number; isActive?: boolean }) =>
    request<ManagerRow>(`/relationship-managers/${id}`, body, 'PATCH'),
  resetPassword: (id: string) => request<{ temporaryPassword: string }>(`/relationship-managers/${id}/reset-password`, {}),
};
