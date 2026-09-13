/**
 * @file auth.controller.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 认证 HTTP：公钥、登录、改密；退出为 MVP 空操作
 */
import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('public-key')
  publicKey() {
    return this.auth.getPublicKey();
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  /**
   * 修改当前登录用户密码；密文在服务端解密后再 bcrypt。
   */
  @Post('password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user!.userId, dto.oldPassword, dto.newPassword);
  }

  /** P1 黑名单前：客户端丢弃 Token 即可。 */
  @Post('logout')
  @HttpCode(204)
  logout(): void {
    return;
  }
}
