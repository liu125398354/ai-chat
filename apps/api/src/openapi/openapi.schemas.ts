/**
 * @file openapi.schemas.ts
 * @author liunannan
 * @date 2026-09-13
 * @description OpenAPI 响应模型：给 /docs 页面展示字段，不替代业务 DTO
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorBodyDto {
  @ApiProperty({ example: 'AUTH_INVALID' })
  code!: string;

  @ApiProperty({ example: '用户名或密码错误' })
  message!: string;

  @ApiProperty({ example: '9c1e2f3a-4b5c-6d7e-8f90-a1b2c3d4e5f6' })
  requestId!: string;
}

export class PublicKeyResponseDto {
  @ApiProperty({ description: 'RSA 公钥 PEM，登录/注册/改密前先拉取' })
  publicKey!: string;
}

export class PublicUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'alice' })
  username!: string;

  @ApiProperty({ example: '2026-09-13T07:00:00.000Z' })
  createdAt!: Date;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT Access Token，2 小时有效' })
  token!: string;

  @ApiProperty({ type: PublicUserDto })
  user!: PublicUserDto;
}

export class OkResponseDto {
  @ApiProperty({ example: true })
  ok!: true;
}

export class ConversationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '新对话' })
  title!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ConversationListDto {
  @ApiProperty({ type: [ConversationDto] })
  items!: ConversationDto[];

  @ApiPropertyOptional({ nullable: true, description: '下一页 keyset 游标；无更多则为 null' })
  nextCursor!: string | null;
}

export class MessageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  conversationId!: string;

  @ApiProperty({ enum: ['user', 'assistant'] })
  role!: 'user' | 'assistant';

  @ApiProperty({ description: '原文 Markdown/纯文本，不是 HTML' })
  content!: string;

  @ApiProperty({ enum: ['completed', 'failed'] })
  status!: 'completed' | 'failed';

  @ApiPropertyOptional({ nullable: true, example: null })
  errorCode!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class MessageListDto {
  @ApiProperty({ type: [MessageDto] })
  items!: MessageDto[];

  @ApiPropertyOptional({ nullable: true, description: '更早消息的 keyset 游标；无更多则为 null' })
  nextCursor!: string | null;
}
