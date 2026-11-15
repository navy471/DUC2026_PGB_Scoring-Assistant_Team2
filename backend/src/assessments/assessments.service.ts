import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SharesService } from '../shares/shares.service.js';

@Injectable()
export class AssessmentsService {
  constructor(
    private prisma: PrismaService,
    private sharesService: SharesService,
  ) {}

  create(data: any) {
    return this.prisma.assessment.create({
      data: {
        name: data.name,
        subject_id: data.subject_id,
        class_name: data.class_name,
        max_score: data.max_score,
        passing_score: data.passing_score,
        exam_date: new Date(data.exam_date),
        created_by: data.created_by,
      }
    });
  }

  async findAll(user?: any) {
    const where: any = {};
    if (user && user.role !== 'ADMIN') {
      const allowedIds = await this.sharesService.getCollaboratorIds(user.userId);
      where.created_by = { in: allowedIds };
    }
    return this.prisma.assessment.findMany({
      where,
      include: { Subject: true }
    });
  }

  findOne(id: string) {
    return this.prisma.assessment.findUnique({
      where: { id },
      include: { Subject: true }
    });
  }

  async getOrCreate(className: string, examType: string, userId?: string) {
    const cleanClass = (className || 'General').trim();
    const cleanType = (examType || 'Midterm').trim(); // 'Midterm' or 'Final'
    const assessmentName = `${cleanClass} - ${cleanType} Exam`;

    // Try finding an assessment matching this class and exam type
    const where: any = {
      class_name: cleanClass,
      name: { contains: cleanType, mode: 'insensitive' }
    };
    if (userId) {
      const allowedIds = await this.sharesService.getCollaboratorIds(userId);
      where.created_by = { in: allowedIds };
    }

    let assessment = await this.prisma.assessment.findFirst({
      where,
      include: { Subject: true }
    });

    if (assessment) {
      return assessment;
    }

    // Ensure we have a subject
    let subject = await this.prisma.subject.findFirst();
    if (!subject) {
      subject = await this.prisma.subject.create({
        data: {
          name: 'Software Project Development I',
          code: 'SPD101'
        }
      });
    }

    const creatorId = userId || (await this.prisma.user.findFirst())?.id || 'system';

    return this.prisma.assessment.create({
      data: {
        name: assessmentName,
        class_name: cleanClass,
        subject_id: subject.id,
        max_score: 100,
        passing_score: 50,
        exam_date: new Date(),
        created_by: creatorId
      },
      include: { Subject: true }
    });
  }
}
