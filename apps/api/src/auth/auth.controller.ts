/**
 * @file auth.controller.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 认证 HTTP：登录；退出为 MVP 空操作
 */
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  /** P1 黑名单前：客户端丢弃 Token 即可。 */
  @Post('logout')
  @HttpCode(204)
  logout(): void {
    return;
  }
}
