import { Controller, Get, Patch, Param, Body, UseGuards, Res, Query, Request } from '@nestjs/common';
import { GradesService } from './grades.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { Response } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Patch(':id')
  updateGrade(
    @Param('id') id: string,
    @Body('score') score: number,
    @Request() req: any
  ) {
    return this.gradesService.updateGrade(id, score, req.user.userId);
  }

  @Get('export')
  async exportGrades(
    @Res() res: Response,
    @Query('class_name') className?: string,
    @Query('exam_type') examType?: string,
    @Request() req?: any
  ) {
    const buffer = await this.gradesService.exportGrades(className, examType, req?.user);
    const filename = className && className !== 'ALL' 
      ? `grades_${className}_${examType || 'all'}.xlsx`
      : 'grades_export.xlsx';
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  }

  @Get()
  findAll(
    @Query('class_name') className?: string,
    @Query('exam_type') examType?: string,
    @Request() req?: any
  ) {
    return this.gradesService.findAll(className, examType, req?.user);
  }
}
