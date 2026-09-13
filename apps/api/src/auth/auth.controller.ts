/**
 * @file auth.controller.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-13
 * @description 认证 HTTP：公钥、登录、改密；退出为 MVP 空操作
 */
import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiErrorResponses } from '../openapi/api-error.decorator';
import {
  LoginResponseDto,
  OkResponseDto,
  PublicKeyResponseDto,
} from '../openapi/openapi.schemas';

@Controller('v1/auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('public-key')
  @ApiOperation({ summary: '获取登录/改密用 RSA 公钥' })
  @ApiOkResponse({ type: PublicKeyResponseDto })
  publicKey() {
    return this.auth.getPublicKey();
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: '登录',
    description: 'password 为 RSA-OAEP 密文。失败统一 401 AUTH_INVALID，不区分用户是否存在。',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiErrorResponses(400, 401)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  /**
   * 修改当前登录用户密码；密文在服务端解密后再 bcrypt。
   */
  @Post('password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '修改密码' })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiErrorResponses(400, 401, 403)
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user!.userId, dto.oldPassword, dto.newPassword);
  }

  /** P1 黑名单前：客户端丢弃 Token 即可。 */
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: '退出（MVP 空操作，客户端丢 Token）' })
  @ApiNoContentResponse()
  logout(): void {
    return;
  }
}
