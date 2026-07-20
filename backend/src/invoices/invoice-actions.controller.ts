import { Controller, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoice-actions')
@Controller('invoices/:id')
export class InvoiceActionsController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('duplicate')
  @ApiOperation({ summary: 'Nhân bản hóa đơn thành bản nháp mới' })
  @ApiCreatedResponse({ type: InvoiceResponseDto })
  duplicate(@Param('id') id: string) {
    return this.invoicesService.duplicate(id);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Gửi hóa đơn nháp để duyệt' })
  @ApiCreatedResponse({ type: InvoiceResponseDto })
  submit(@Param('id') id: string) {
    return this.invoicesService.submit(id);
  }
}
