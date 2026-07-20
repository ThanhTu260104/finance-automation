import type { Invoice, InvoiceItem } from '@prisma/client';
import type { InvoiceResponseDto } from './dto/invoice-response.dto';

type DecimalLike = { toString(): string } | number;

function toNumber(value: DecimalLike): number {
  return typeof value === 'number' ? value : Number(value);
}

type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

export function mapInvoice(invoice: InvoiceWithItems): InvoiceResponseDto {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    type: invoice.type,
    status: invoice.status,
    customerName: invoice.customerName,
    customerTaxCode: invoice.customerTaxCode,
    customerAddress: invoice.customerAddress,
    customerEmail: invoice.customerEmail,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString() ?? null,
    notes: invoice.notes,
    subtotal: toNumber(invoice.subtotal),
    taxRate: toNumber(invoice.taxRate),
    taxAmount: toNumber(invoice.taxAmount),
    totalAmount: toNumber(invoice.totalAmount),
    duplicatedFromId: invoice.duplicatedFromId,
    items: invoice.items
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        id: item.id,
        description: item.description,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        amount: toNumber(item.amount),
        sortOrder: item.sortOrder,
      })),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export function calcInvoiceTotals(
  items: { quantity: number; unitPrice: number }[],
  taxRate: number,
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}
