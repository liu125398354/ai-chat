/**
 * @file stream-message.dto.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 流式发送：content 非空且 ≤ 8000
 */
import { IsString, MaxLength, MinLength } from 'class-validator';

export class StreamMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  content!: string;
}
