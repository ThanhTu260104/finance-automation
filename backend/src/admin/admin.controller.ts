import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOkResponse({ type: DashboardSummaryDto })
  getDashboard(
    @Query('period') period?: string,
    @Query('date') date?: string,
  ): Promise<DashboardSummaryDto> {
    return this.adminService.getDashboardSummary({ period, date });
  }

  @Get('recent-proposals')
  getRecentProposals(
    @Query('period') period?: string,
    @Query('date') date?: string,
  ) {
    return this.adminService.getRecentProposals({ period, date });
  }

  @Get('pending-approvals')
  getPendingApprovals(
    @CurrentUserId() currentUserId: string,
    @Query('userId') userId: string,
    @Query('period') period?: string,
    @Query('date') date?: string,
  ) {
    return this.adminService.getPendingApprovals(currentUserId || userId, {
      period,
      date,
    });
  }

  @Get('report-departments')
  getReportDepartments() {
    return this.adminService.getReportDepartments();
  }

  @Get('department-report')
  getDepartmentReport(
    @Query('departmentId') departmentId?: string,
    @Query('period') period?: string,
    @Query('date') date?: string,
  ) {
    return this.adminService.getDepartmentReport({ departmentId, period, date });
  }
}
