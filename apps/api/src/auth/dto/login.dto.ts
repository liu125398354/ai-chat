/**
 * @file login.dto.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 登录入参；password 为 RSA-OAEP 密文
 */
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'alice', maxLength: 64 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username!: string;

  @ApiProperty({
    description: 'RSA-OAEP 密文（先 GET /v1/auth/public-key），不是明文密码',
    maxLength: 4096,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  password!: string;
}
