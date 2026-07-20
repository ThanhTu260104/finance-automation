import api from "@/lib/api/client";

export type Department = { id: string; name: string };

export async function getDepartments(): Promise<Department[]> {
  const { data } = await api.get<Department[]>("/departments");
  return data;
}

export async function createDepartment(payload: { name: string }) {
  const { data } = await api.post<Department>("/departments", payload);
  return data;
}

export async function updateDepartment(id: string, payload: Partial<{ name: string; isActive: boolean }>) {
  const { data } = await api.patch<Department>(`/departments/${id}`, payload);
  return data;
}
