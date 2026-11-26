import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AssessmentsService } from './assessments.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post('get-or-create')
  getOrCreate(
    @Body('class_name') className: string,
    @Body('exam_type') examType: string,
    @Request() req: any
  ) {
    return this.assessmentsService.getOrCreate(className, examType, req?.user?.userId);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.assessmentsService.create({ ...body, created_by: req.user?.userId });
  }

  @Get()
  findAll(@Request() req: any) {
    return this.assessmentsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assessmentsService.findOne(id);
  }
}
