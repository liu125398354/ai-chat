/**
 * @file change-password.dto.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 修改密码入参：字段为 RSA 密文
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: '原密码 RSA-OAEP 密文' })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  oldPassword!: string;

  @ApiProperty({ description: '新密码 RSA-OAEP 密文；明文解密后建议 8–128 位' })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  newPassword!: string;
}
