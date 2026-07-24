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
    @CurrentUserId() userId: string,
    @Query('period') period?: string,
    @Query('date') date?: string,
  ): Promise<DashboardSummaryDto> {
    return this.adminService.getDashboardSummary(userId, { period, date });
  }

  @Get('recent-proposals')
  getRecentProposals(
    @CurrentUserId() userId: string,
    @Query('period') period?: string,
    @Query('date') date?: string,
  ) {
    return this.adminService.getRecentProposals(userId, { period, date });
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
  getReportDepartments(@CurrentUserId() userId: string) {
    return this.adminService.getReportDepartments(userId);
  }

  @Get('department-report')
  getDepartmentReport(
    @CurrentUserId() userId: string,
    @Query('departmentId') departmentId?: string,
    @Query('period') period?: string,
    @Query('date') date?: string,
  ) {
    return this.adminService.getDepartmentReport(userId, {
      departmentId,
      period,
      date,
    });
  }
}
