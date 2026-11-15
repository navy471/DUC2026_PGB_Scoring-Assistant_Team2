import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Request() req: any) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException(
        'មានតែ Administrator ប៉ុណ្ណោះដែលអាចមើលបញ្ជីគណនីបាន (Only Administrators can view system users)',
      );
    }
    return this.usersService.findAll();
  }

  @Post()
  create(
    @Body() body: { name: string; email: string; password?: string; role?: string },
    @Request() req: any,
  ) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException(
        'មានតែ Administrator ប៉ុណ្ណោះដែលអាចបង្កើតគណនីបាន (Only Administrators can create accounts)',
      );
    }
    return this.usersService.create(body);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @Request() req: any,
  ) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException(
        'មានតែ Administrator ប៉ុណ្ណោះដែលអាចកែប្រែ Role បាន (Only Administrators can change roles)',
      );
    }
    return this.usersService.updateRole(id, role);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException(
        'មានតែ Administrator ប៉ុណ្ណោះដែលអាចលុបគណនីបាន (Only Administrators can delete accounts)',
      );
    }
    return this.usersService.delete(id, req.user?.userId);
  }
}

