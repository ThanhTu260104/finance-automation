import api from "@/lib/api/client";
import type { AppPermission } from "@/lib/permissions";

export type Role = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  permissions: AppPermission[];
  canCreateProposal: boolean;
  canApprove: boolean;
  sortOrder: number;
};

export async function getRoles(): Promise<Role[]> {
  const { data } = await api.get<Role[]>("/roles");
  return Array.isArray(data) ? data : [];
}

export async function getRole(id: string): Promise<Role> {
  const { data } = await api.get<Role>(`/roles/${id}`);
  return data;
}

export async function createRole(payload: {
  code: string;
  name: string;
  description?: string;
  permissions?: AppPermission[];
  canCreateProposal?: boolean;
  canApprove?: boolean;
  sortOrder?: number;
}): Promise<Role> {
  const { data } = await api.post<Role>("/roles", payload);
  return data;
}

export async function updateRole(
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    isActive: boolean;
    permissions: AppPermission[];
    canCreateProposal: boolean;
    canApprove: boolean;
    sortOrder: number;
  }>,
): Promise<Role> {
  const { data } = await api.patch<Role>(`/roles/${id}`, payload);
  return data;
}

export async function deleteRole(id: string): Promise<void> {
  await api.delete(`/roles/${id}`);
}
