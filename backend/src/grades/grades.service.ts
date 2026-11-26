import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SharesService } from '../shares/shares.service.js';
import * as ExcelJS from 'exceljs';

@Injectable()
export class GradesService {
  constructor(
    private prisma: PrismaService,
    private sharesService: SharesService,
  ) {}

  async findAll(className?: string, examType?: string, user?: any) {
    const where: any = {};
    if (user && user.role !== 'ADMIN') {
      const allowedIds = await this.sharesService.getCollaboratorIds(user.userId);
      where.Assessment = { created_by: { in: allowedIds } };
    }
    if (className && className !== 'ALL') {
      where.Assessment = { ...(where.Assessment || {}), class_name: className };
    }
    if (examType && examType !== 'ALL') {
      where.Assessment = {
        ...(where.Assessment || {}),
        name: { contains: examType, mode: 'insensitive' }
      };
    }

    return this.prisma.grade.findMany({
      where,
      include: {
        Assessment: { include: { Subject: true } },
        Student: true,
      },
      orderBy: { verified_at: 'desc' }
    });
  }

  async updateGrade(gradeId: string, score: number, userId: string) {
    const existing = await this.prisma.grade.findUnique({
      where: { id: gradeId },
      include: { Assessment: true }
    });
    if (!existing) {
      throw new Error('Grade not found');
    }
    const maxScore = existing.Assessment?.max_score || 100;
    const percentage = (score / maxScore) * 100;

    const updated = await this.prisma.grade.update({
      where: { id: gradeId },
      data: {
        score,
        percentage,
        verified_by: userId,
        verified_at: new Date()
      },
      include: {
        Assessment: { include: { Subject: true } },
        Student: true
      }
    });

    await this.prisma.verificationLog.create({
      data: {
        grade_id: gradeId,
        old_score: existing.score,
        new_score: score,
        action: 'EDITED',
        user_id: userId
      }
    });

    return updated;
  }

  async exportGrades(className?: string, examType?: string, user?: any) {
    const grades = await this.findAll(className, examType, user);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Grades');

    sheet.columns = [
      { header: 'Student Code', key: 'student_code', width: 15 },
      { header: 'Student Name', key: 'student_name', width: 25 },
      { header: 'Assessment', key: 'assessment', width: 25 },
      { header: 'Subject', key: 'subject', width: 20 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Percentage (%)', key: 'percentage', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Verified At', key: 'verified_at', width: 20 },
    ];

    grades.forEach(grade => {
      sheet.addRow({
        student_code: grade.Student?.student_code || 'N/A',
        student_name: grade.Student?.name || 'Unknown',
        assessment: grade.Assessment?.name || 'N/A',
        subject: grade.Assessment?.Subject?.name || 'N/A',
        score: grade.score || 0,
        percentage: grade.percentage ? grade.percentage.toFixed(2) : '0.00',
        status: grade.status || 'PENDING',
        verified_at: grade.verified_at ? new Date(grade.verified_at).toISOString().split('T')[0] : ''
      });
    });

    return workbook.xlsx.writeBuffer();
  }
}
