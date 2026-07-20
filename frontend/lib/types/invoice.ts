export type InvoiceStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "PAID"
  | "CANCELLED";

export type InvoiceType = "INPUT" | "OUTPUT";

export type InvoiceItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
  sortOrder?: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  customerName: string;
  customerTaxCode?: string | null;
  customerAddress?: string | null;
  customerEmail?: string | null;
  issueDate: string;
  dueDate?: string | null;
  notes?: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  duplicatedFromId?: string | null;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
};

export type InvoiceListResponse = {
  data: Invoice[];
  total: number;
  page: number;
  limit: number;
};

export type CreateInvoicePayload = {
  type?: InvoiceType;
  customerName: string;
  customerTaxCode?: string;
  customerAddress?: string;
  customerEmail?: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  taxRate?: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  saveAsDraft?: boolean;
};

export type UpdateInvoicePayload = Partial<CreateInvoicePayload>;

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Nháp",
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  INPUT: "Đầu vào",
  OUTPUT: "Đầu ra",
};
