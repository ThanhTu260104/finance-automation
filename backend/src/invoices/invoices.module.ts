import { Module } from '@nestjs/common';
import { InvoiceActionsController } from './invoice-actions.controller';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  controllers: [InvoicesController, InvoiceActionsController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
