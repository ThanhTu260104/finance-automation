import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { calcInvoiceTotals, mapInvoice } from './invoice.mapper';

const EDITABLE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.DRAFT,
  InvoiceStatus.PENDING,
];

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: InvoiceQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              {
                invoiceNumber: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                customerName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: rows.map(mapInvoice),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!invoice) {
      throw new NotFoundException('Không tìm thấy hóa đơn');
    }
    return mapInvoice(invoice);
  }

  async create(dto: CreateInvoiceDto) {
    const taxRate = dto.taxRate ?? 10;
    const totals = calcInvoiceTotals(dto.items, taxRate);
    const status = dto.saveAsDraft !== false ? InvoiceStatus.DRAFT : InvoiceStatus.PENDING;
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        type: dto.type,
        status,
        customerName: dto.customerName,
        customerTaxCode: dto.customerTaxCode,
        customerAddress: dto.customerAddress,
        customerEmail: dto.customerEmail,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        taxRate,
        ...totals,
        items: {
          create: dto.items.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            sortOrder: index,
          })),
        },
      },
      include: { items: true },
    });

    return mapInvoice(invoice);
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const existing = await this.prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy hóa đơn');
    }
    if (!EDITABLE_STATUSES.includes(existing.status)) {
      throw new BadRequestException(
        'Chỉ có thể chỉnh sửa hóa đơn ở trạng thái Nháp hoặc Chờ duyệt',
      );
    }

    const items = dto.items ?? [];
    const taxRate = dto.taxRate ?? Number(existing.taxRate);
    const totals = items.length
      ? calcInvoiceTotals(items, taxRate)
      : {
          subtotal: Number(existing.subtotal),
          taxAmount: Number(existing.taxAmount),
          totalAmount: Number(existing.totalAmount),
        };

    let status = existing.status;
    if (dto.saveAsDraft === true) {
      status = InvoiceStatus.DRAFT;
    } else if (dto.saveAsDraft === false) {
      status = InvoiceStatus.PENDING;
    }

    const invoice = await this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      }

      return tx.invoice.update({
        where: { id },
        data: {
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          status,
          ...(dto.customerName !== undefined
            ? { customerName: dto.customerName }
            : {}),
          ...(dto.customerTaxCode !== undefined
            ? { customerTaxCode: dto.customerTaxCode }
            : {}),
          ...(dto.customerAddress !== undefined
            ? { customerAddress: dto.customerAddress }
            : {}),
          ...(dto.customerEmail !== undefined
            ? { customerEmail: dto.customerEmail }
            : {}),
          ...(dto.issueDate !== undefined
            ? { issueDate: new Date(dto.issueDate) }
            : {}),
          ...(dto.dueDate !== undefined
            ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
            : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          taxRate,
          ...totals,
          ...(dto.items
            ? {
                items: {
                  create: dto.items.map((item, index) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    amount: item.quantity * item.unitPrice,
                    sortOrder: index,
                  })),
                },
              }
            : {}),
        },
        include: { items: true },
      });
    });

    return mapInvoice(invoice);
  }

  async remove(id: string) {
    const existing = await this.prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy hóa đơn');
    }
    if (existing.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Chỉ có thể xóa hóa đơn nháp');
    }
    await this.prisma.invoice.delete({ where: { id } });
    return { success: true };
  }

  async duplicate(id: string) {
    const source = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!source) {
      throw new NotFoundException('Không tìm thấy hóa đơn nguồn');
    }

    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        type: source.type,
        status: InvoiceStatus.DRAFT,
        customerName: source.customerName,
        customerTaxCode: source.customerTaxCode,
        customerAddress: source.customerAddress,
        customerEmail: source.customerEmail,
        issueDate: new Date(),
        dueDate: source.dueDate,
        notes: source.notes
          ? `${source.notes}\n(Nhân bản từ ${source.invoiceNumber})`
          : `Nhân bản từ ${source.invoiceNumber}`,
        taxRate: source.taxRate,
        subtotal: source.subtotal,
        taxAmount: source.taxAmount,
        totalAmount: source.totalAmount,
        duplicatedFromId: source.id,
        items: {
          create: source.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: { items: true },
    });

    return mapInvoice(invoice);
  }

  async submit(id: string) {
    const existing = await this.prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy hóa đơn');
    }
    if (existing.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Chỉ có thể gửi duyệt hóa đơn nháp');
    }

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.PENDING },
      include: { items: true },
    });

    return mapInvoice(invoice);
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const last = await this.prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
    });

    const lastSeq = last
      ? Number.parseInt(last.invoiceNumber.replace(prefix, ''), 10)
      : 0;
    const nextSeq = Number.isNaN(lastSeq) ? 1 : lastSeq + 1;

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }
}
