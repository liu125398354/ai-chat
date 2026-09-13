/**
 * @file create-conversation.dto.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 创建会话入参
 */
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(200)
  title?: string;
}
