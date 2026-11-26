import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  getDashboard(@Request() req: any) {
    return this.reportsService.getDashboardStats(req.user);
  }

  @Get('notifications')
  getNotifications() {
    return this.reportsService.getNotifications();
  }
}
