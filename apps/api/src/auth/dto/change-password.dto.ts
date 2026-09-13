/**
 * @file change-password.dto.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 修改密码入参：字段为 RSA 密文
 */
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  oldPassword!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  newPassword!: string;
}
