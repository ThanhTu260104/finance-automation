import api from "@/lib/api/client";
import type { User } from "@/lib/api/users";

export async function login(
  email: string,
  password: string,
): Promise<User> {
  const { data } = await api.post<User>("/auth/login", { email, password });
  return data;
}
