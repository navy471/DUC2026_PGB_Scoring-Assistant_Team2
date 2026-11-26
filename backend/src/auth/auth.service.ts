import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== pass) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }

  async register(name: string, email: string, pass: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('ឈ្មោះគឺចាំបាច់ (Name is required)');
    }
    if (!email || !email.trim()) {
      throw new BadRequestException('អ៊ីមែលគឺចាំបាច់ (Email is required)');
    }
    if (!pass || pass.trim().length < 6) {
      throw new BadRequestException('ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ (Password must be at least 6 characters)');
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      throw new ConflictException(`អ៊ីមែល ${cleanEmail} ត្រូវបានចុះឈ្មោះរួចហើយ (Email is already registered)`);
    }

    const user = await this.prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: pass.trim(),
        role: 'TEACHER',
      },
    });

    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
