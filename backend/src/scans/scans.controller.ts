import { Controller, Post, Get, Param, UseInterceptors, UploadedFiles, UploadedFile, Body, UseGuards, Request } from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ScansService } from './scans.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Post('quick-match')
  @UseInterceptors(FileInterceptor('file'))
  async quickMatch(
    @UploadedFile() file: Express.Multer.File,
    @Body('assessment_id') assessmentId?: string
  ) {
    return this.scansService.quickMatchPreview(file, assessmentId);
  }

  @Post('batch')
  @UseInterceptors(FilesInterceptor('files', 100))
  async uploadBatch(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('assessment_id') assessmentId: string,
    @Request() req: any
  ) {
    const userId = req.user.userId;
    return this.scansService.createBatch(assessmentId, userId, files);
  }

  @Get(':id/status')
  getBatchStatus(@Param('id') id: string) {
    return this.scansService.getBatchStatus(id);
  }

  @Get()
  getBatches(@Request() req: any) {
    return this.scansService.getBatches(req.user);
  }
}
