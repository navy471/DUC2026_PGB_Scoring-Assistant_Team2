import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: Record<string, any>) {
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  register(@Body() body: Record<string, any>) {
    return this.authService.register(body.name, body.email, body.password);
  }
}
