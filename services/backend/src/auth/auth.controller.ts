import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { User } from '@/users/entity/user';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const token = await this.auth.register(dto.username, dto.password);
    return { token };
  }

  @Post('login')
  @UseGuards(AuthGuard('local'))
  login(@Req() req: Request) {
    const token = this.auth.login(req.user as User);
    return { token };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: Request) {
    const { userId, username, createdAt } = req.user as User;
    return { userId, username, createdAt };
  }
}
