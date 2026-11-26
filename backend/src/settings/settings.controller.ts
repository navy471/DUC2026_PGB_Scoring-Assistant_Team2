import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { SettingsService, SystemSettingsData } from './settings.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  updateSettings(@Body() body: Partial<SystemSettingsData>, @Request() req: any) {
    return this.settingsService.updateSettings(body, req.user?.role);
  }
}

