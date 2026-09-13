/**
 * @file update-conversation.dto.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 重命名会话入参
 */
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateConversationDto {
  @ApiProperty({ example: '周报讨论', minLength: 1, maxLength: 200 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;
}
