import api from "@/lib/api/client";
import type {
  CreateInvoicePayload,
  Invoice,
  InvoiceListResponse,
  InvoiceStatus,
  InvoiceType,
  UpdateInvoicePayload,
} from "@/lib/types/invoice";

export type InvoiceQuery = {
  status?: InvoiceStatus;
  type?: InvoiceType;
  search?: string;
  page?: number;
  limit?: number;
};

export async function getInvoices(
  query: InvoiceQuery = {},
): Promise<InvoiceListResponse> {
  const { data } = await api.get<InvoiceListResponse>("/invoices", {
    params: query,
  });
  return data;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await api.get<Invoice>(`/invoices/${id}`);
  return data;
}

export async function createInvoice(
  payload: CreateInvoicePayload,
): Promise<Invoice> {
  const { data } = await api.post<Invoice>("/invoices", payload);
  return data;
}

export async function updateInvoice(
  id: string,
  payload: UpdateInvoicePayload,
): Promise<Invoice> {
  const { data } = await api.patch<Invoice>(`/invoices/${id}`, payload);
  return data;
}

export async function deleteInvoice(id: string): Promise<void> {
  await api.delete(`/invoices/${id}`);
}

export async function duplicateInvoice(id: string): Promise<Invoice> {
  const { data } = await api.post<Invoice>(`/invoices/${id}/duplicate`);
  return data;
}

export async function submitInvoice(id: string): Promise<Invoice> {
  const { data } = await api.post<Invoice>(`/invoices/${id}/submit`);
  return data;
}
