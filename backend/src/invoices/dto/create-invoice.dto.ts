import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { InvoiceType } from '@prisma/client';

export class InvoiceItemDto {
  @ApiProperty({ example: 'Dịch vụ tư vấn tháng 6' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 5000000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateInvoiceDto {
  @ApiPropertyOptional({ enum: InvoiceType, default: InvoiceType.OUTPUT })
  @IsOptional()
  @IsEnum(InvoiceType)
  type?: InvoiceType;

  @ApiProperty({ example: 'Công ty TNHH ABC' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional()
  @IsString()
  customerTaxCode?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Huệ, Q.1, TP.HCM' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiPropertyOptional({ example: 'contact@abc.com' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional({ example: '2026-07-30' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'Ghi chú hóa đơn' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @ApiPropertyOptional({
    description: 'true = lưu nháp (DRAFT), false = gửi chờ duyệt (PENDING)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  saveAsDraft?: boolean;
}
