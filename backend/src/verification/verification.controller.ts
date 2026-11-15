import { Controller, Post, Get, Param, Body, UseGuards, Request, Delete, Query } from '@nestjs/common';
import { VerificationService } from './verification.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('pending')
  getPending(
    @Query('class_name') className?: string,
    @Query('exam_type') examType?: string,
    @Request() req?: any
  ) {
    return this.verificationService.getPendingVerifications(className, examType, req?.user);
  }

  @Post('approve-batch')
  approveBatch(
    @Body() body: { resultIds: string[] },
    @Request() req: any
  ) {
    return this.verificationService.approveBatch(body.resultIds || [], req.user.userId);
  }

  @Post('reject-batch')
  rejectBatch(
    @Body() body: { resultIds: string[] }
  ) {
    return this.verificationService.rejectBatch(body.resultIds || []);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() body: { finalScore?: number, finalStudentCode?: string },
    @Request() req: any
  ) {
    return this.verificationService.approveResult(id, req.user.userId, body.finalScore, body.finalStudentCode);
  }

  @Delete(':id')
  reject(@Param('id') id: string) {
    return this.verificationService.rejectResult(id);
  }
}
