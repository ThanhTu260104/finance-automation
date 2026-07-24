import axios from "axios";

const USER_ID_KEY = "finance_current_user_id";
const DEFAULT_API_URL = "http://localhost:4001/api";
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL
).replace(/\/+$/, "");

export function getApiBaseUrl() {
  return API_BASE_URL;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_ID_KEY);
}

export function setStoredUserId(id: string) {
  localStorage.setItem(USER_ID_KEY, id);
}

export function clearStoredUserId() {
  localStorage.removeItem(USER_ID_KEY);
}

export function getApiOrigin(): string {
  if (process.env.NEXT_PUBLIC_API_ORIGIN) {
    return trimTrailingSlash(process.env.NEXT_PUBLIC_API_ORIGIN);
  }

  const base =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  return new URL(API_BASE_URL, base).origin;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const userId = getStoredUserId();
  if (userId) {
    config.headers["X-User-Id"] = userId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ??
      (Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(", ")
        : undefined) ??
      error.message ??
      "Có lỗi xảy ra";
    return Promise.reject(new Error(message));
  },
);

export type DashboardSummary = {
  revenue: number;
  pendingInvoices: number;
  monthlyExpenses: number;
  reportsGenerated: number;
  totalProposals?: number;
  activeProposalTypes?: number;
  period?: "week" | "month";
  periodStart?: string;
  periodEnd?: string;
};

export type DashboardPeriod = "day" | "week" | "month";

export type DashboardQuery = {
  period?: DashboardPeriod;
  date?: string;
};

export async function getDashboardSummary(
  params?: DashboardQuery,
): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>("/admin/dashboard", {
    params,
  });
  return data;
}

export default api;
