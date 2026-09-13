/**
 * @file password-crypto.service.ts
 * @author liunannan
 * @date 2026-09-13
 * @description RSA-OAEP 解密前端密码密文；公钥可匿名下发
 */
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from '@ai-chat/shared';
import { constants, generateKeyPairSync, privateDecrypt } from 'crypto';
import { AppError } from '../common/errors/app-error';

@Injectable()
export class PasswordCryptoService {
  private readonly logger = new Logger(PasswordCryptoService.name);
  private readonly publicKeyPem: string;
  private readonly privateKeyPem: string;

  constructor() {
    const pair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.publicKeyPem = pair.publicKey;
    this.privateKeyPem = pair.privateKey;
    this.logger.log(JSON.stringify({ op: 'password_rsa_ready' }));
  }

  getPublicKey(): string {
    return this.publicKeyPem;
  }

  /** 解密失败统一参数错误，不记录密文或明文。 */
  decrypt(cipherB64: string): string {
    try {
      const plain = privateDecrypt(
        {
          key: this.privateKeyPem,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(cipherB64, 'base64'),
      ).toString('utf8');
      if (!plain) {
        throw new Error('empty');
      }
      return plain;
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        '密码解密失败，请刷新后重试',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
