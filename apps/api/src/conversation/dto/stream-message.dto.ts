/**
 * @file stream-message.dto.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 流式发送：content 非空且 ≤ 8000
 */
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class StreamMessageDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  content!: string;
}
