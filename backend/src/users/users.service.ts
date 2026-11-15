import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
      orderBy: { created_at: 'asc' },
    });

    const enriched = await Promise.all(
      users.map(async (u) => {
        const totalScans = await this.prisma.scanBatch.count({
          where: { created_by: u.id },
        });
        const totalVerifications = await this.prisma.verificationLog.count({
          where: { user_id: u.id },
        });
        const lastScan = await this.prisma.scanBatch.findFirst({
          where: { created_by: u.id },
          orderBy: { created_at: 'desc' },
          select: { created_at: true },
        });
        const lastVerification = await this.prisma.verificationLog.findFirst({
          where: { user_id: u.id },
          orderBy: { created_at: 'desc' },
          select: { created_at: true },
        });

        let lastActive = u.created_at;
        if (lastScan && (!lastVerification || lastScan.created_at > lastVerification.created_at)) {
          lastActive = lastScan.created_at;
        } else if (lastVerification) {
          lastActive = lastVerification.created_at;
        }

        return {
          ...u,
          totalScans,
          totalVerifications,
          lastActive,
        };
      })
    );

    return enriched;
  }

  async create(data: { name: string; email: string; password?: string; role?: string }) {
    if (!data.email || !data.name) {
      throw new BadRequestException('ឈ្មោះ និង អ៊ីមែល គឺចាំបាច់ (Name and email are required)');
    }

    const email = data.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException(`អ៊ីមែល ${email} មានរួចហើយក្នុងប្រព័ន្ធ (Email already exists)`);
    }

    const role = (data.role || 'TEACHER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'TEACHER';
    const password = data.password && data.password.trim() ? data.password.trim() : 'password123';

    return this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        password,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
    });
  }

  async updateRole(id: string, role: string) {
    const formattedRole = (role || '').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'TEACHER';
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('រកមិនឃើញគណនីនេះទេ (User not found)');
    }

    return this.prisma.user.update({
      where: { id },
      data: { role: formattedRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
    });
  }

  async delete(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('មិនអាចលុបគណនីដែលកំពុង Login បានឡើយ (Cannot delete your own account)');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('រកមិនឃើញគណនីនេះទេ (User not found)');
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true, message: `គណនី ${user.email} ត្រូវបានលុបដោយជោគជ័យ` };
  }
}

