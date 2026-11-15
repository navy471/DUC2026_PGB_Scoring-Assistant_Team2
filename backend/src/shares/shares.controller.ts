import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { SharesService } from './shares.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Get()
  getOverview(@Request() req: any) {
    return this.sharesService.getSharesOverview(req.user.userId);
  }

  @Post('request')
  sendRequest(@Body('email') email: string, @Request() req: any) {
    return this.sharesService.sendShareRequest(req.user.userId, email);
  }

  @Patch(':id/accept')
  accept(@Param('id') id: string, @Request() req: any) {
    return this.sharesService.acceptRequest(id, req.user.userId);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Request() req: any) {
    return this.sharesService.rejectRequest(id, req.user.userId);
  }

  @Delete(':id')
  revokeOrCancel(@Param('id') id: string, @Request() req: any) {
    return this.sharesService.revokeOrCancel(id, req.user.userId);
  }
}

