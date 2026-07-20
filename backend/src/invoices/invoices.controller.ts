import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import {
  InvoiceListResponseDto,
  InvoiceResponseDto,
} from './dto/invoice-response.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách hóa đơn' })
  @ApiOkResponse({ type: InvoiceListResponseDto })
  findAll(@Query() query: InvoiceQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo hóa đơn mới (nháp hoặc chờ duyệt)' })
  @ApiCreatedResponse({ type: InvoiceResponseDto })
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết hóa đơn' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật hóa đơn' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hóa đơn nháp' })
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }
}
