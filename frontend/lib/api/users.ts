import api from "@/lib/api/client";
import type { Role } from "@/lib/api/roles";

export type User = {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  role: Role;
  isActive: boolean;
  canCreateProposal: boolean;
  canApprove: boolean;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  departments?: Array<{ id: string; name: string }>;
  welcomeEmailSent?: boolean;
  welcomeEmailError?: string;
};

export type CreateUserPayload = {
  email: string;
  fullName: string;
  password?: string;
  roleId?: string;
  departmentId?: string;
  departmentIds?: string[];
  canCreateProposal?: boolean;
  canApprove?: boolean;
  isActive?: boolean;
  sendWelcomeEmail?: boolean;
};

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>("/users");
  return data;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await api.post<User>("/users", payload);
  return data;
}

export async function updateUser(
  id: string,
  payload: Partial<CreateUserPayload>,
): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}`, payload);
  return data;
}

export async function setUserActive(id: string, isActive: boolean): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}/status`, { isActive });
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}
