import api from "@/lib/api/client";

export type Department = {
  id: string;
  name: string;
  isActive: boolean;
};

export async function getDepartments(options?: { includeInactive?: boolean }): Promise<Department[]> {
  const { data } = await api.get<Department[]>("/departments", { params: options });
  return data;
}

export async function deleteDepartment(id: string): Promise<void> {
  await api.delete(`/departments/${id}`);
}

export async function createDepartment(payload: { name: string }) {
  const { data } = await api.post<Department>("/departments", payload);
  return data;
}

export async function updateDepartment(id: string, payload: Partial<{ name: string; isActive: boolean }>) {
  const { data } = await api.patch<Department>(`/departments/${id}`, payload);
  return data;
}
