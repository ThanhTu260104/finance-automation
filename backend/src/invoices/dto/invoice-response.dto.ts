import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus, InvoiceType } from '@prisma/client';

export class InvoiceItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  sortOrder: number;
}

export class InvoiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  invoiceNumber: string;

  @ApiProperty({ enum: InvoiceType })
  type: InvoiceType;

  @ApiProperty({ enum: InvoiceStatus })
  status: InvoiceStatus;

  @ApiProperty()
  customerName: string;

  @ApiPropertyOptional()
  customerTaxCode?: string | null;

  @ApiPropertyOptional()
  customerAddress?: string | null;

  @ApiPropertyOptional()
  customerEmail?: string | null;

  @ApiProperty()
  issueDate: string;

  @ApiPropertyOptional()
  dueDate?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  taxRate: number;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  totalAmount: number;

  @ApiPropertyOptional()
  duplicatedFromId?: string | null;

  @ApiProperty({ type: [InvoiceItemResponseDto] })
  items: InvoiceItemResponseDto[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class InvoiceListResponseDto {
  @ApiProperty({ type: [InvoiceResponseDto] })
  data: InvoiceResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
