import api from "@/lib/api/client";
import type { User } from "@/lib/api/users";

export async function login(
  email: string,
  password: string,
): Promise<User> {
  const { data } = await api.post<User>("/auth/login", { email, password });
  return data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/auth/password-reset/request", { email });
}

export async function resetPassword(payload: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<void> {
  await api.post("/auth/password-reset/confirm", payload);
}
