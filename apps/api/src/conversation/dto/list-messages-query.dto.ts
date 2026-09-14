/**
 * @file list-messages-query.dto.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 消息历史 keyset 分页（无 cursor 时返回最近一页）
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListMessagesQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: '当前已加载最早一条的游标，用于再取更早消息' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;
}
