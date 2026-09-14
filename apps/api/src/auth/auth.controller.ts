/**
 * @file auth.controller.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description 认证 HTTP：公钥、登录、注册、改密；退出将 jti 列入黑名单
 */
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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
  @ApiOperation({ summary: '获取登录/注册/改密用 RSA 公钥' })
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
  @ApiErrorResponses(400, 401, 429)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  /**
   * 注册成功即签发 JWT，与登录响应同形；用户名冲突 400 AUTH_USERNAME_TAKEN。
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '注册',
    description: 'password 为 RSA-OAEP 密文。明文须 8–128 字符。冲突返回 AUTH_USERNAME_TAKEN。',
  })
  @ApiCreatedResponse({ type: LoginResponseDto })
  @ApiErrorResponses(400, 429)
  register(@Body() dto: LoginDto) {
    return this.auth.register(dto.username, dto.password);
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

  /** 服务端作废当前 JWT；客户端仍须丢弃 Token。 */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '退出：将当前 Token jti 列入黑名单至 exp' })
  @ApiNoContentResponse()
  @ApiErrorResponses(401, 403)
  async logout(@Req() req: Request): Promise<void> {
    const expiresAt = req.user?.exp ? new Date(req.user.exp * 1000) : undefined;
    await this.auth.logout(req.user?.jti, expiresAt);
  }
}
