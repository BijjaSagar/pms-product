import { request } from './http';

/** A department role every property has. */
export interface StaffRole {
  key: string;
  label: string;
}

/** A person who works at a property, with one department role. */
export interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export type NewStaff = StaffRow & { temporaryPassword: string };

const base = (propertyId: string) => `/properties/${propertyId}`;

/** The people of one property and their department roles (Property Admin, Front Office, Housekeeping, ...). */
export const staffApi = {
  roles: (propertyId: string) => request<StaffRole[]>(`${base(propertyId)}/staff-roles`),
  list: (propertyId: string) => request<StaffRow[]>(`${base(propertyId)}/staff`),
  create: (propertyId: string, body: { name: string; email: string; role: string }) => request<NewStaff>(`${base(propertyId)}/staff`, body),
  update: (propertyId: string, userId: string, body: { name?: string; role?: string; isActive?: boolean }) =>
    request<StaffRow>(`${base(propertyId)}/staff/${userId}`, body, 'PATCH'),
  resetPassword: (propertyId: string, userId: string) => request<{ temporaryPassword: string }>(`${base(propertyId)}/staff/${userId}/reset-password`, {}),
};
