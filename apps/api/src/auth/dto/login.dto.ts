/**
 * @file login.dto.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 登录入参；password 为 RSA-OAEP 密文
 */
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  password!: string;
}
