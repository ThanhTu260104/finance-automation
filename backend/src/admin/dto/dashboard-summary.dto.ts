import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardSummaryDto {
  @ApiProperty({ description: 'Tổng tiền đề xuất đã duyệt tháng này' })
  revenue: number;

  @ApiProperty({ description: 'Đề xuất đang chờ duyệt' })
  pendingInvoices: number;

  @ApiProperty({ description: 'Tổng đề xuất tháng này' })
  monthlyExpenses: number;

  @ApiProperty({ description: 'Đề xuất đã duyệt tháng này' })
  reportsGenerated: number;

  @ApiPropertyOptional()
  totalProposals?: number;

  @ApiPropertyOptional()
  activeProposalTypes?: number;

  @ApiPropertyOptional()
  period?: string;

  @ApiPropertyOptional()
  periodStart?: string;

  @ApiPropertyOptional()
  periodEnd?: string;
}
