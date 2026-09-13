/**
 * @file conversation.service.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 会话应用服务：归属校验、列表不含 messages、CASCADE 删除
 */
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from '@ai-chat/shared';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';

const LIST_SELECT = {
  id: true,
  title: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      select: LIST_SELECT,
      orderBy: { updatedAt: 'desc' },
    });
  }

  create(userId: string, title?: string) {
    const resolved = title && title.length > 0 ? title : '新对话';
    return this.prisma.conversation.create({
      data: { userId, title: resolved },
      select: LIST_SELECT,
    });
  }

  /** 无归属视为不存在，防 IDOR。 */
  async assertOwned(userId: string, conversationId: string) {
    const row = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });
    if (!row) {
      throw new AppError(
        ERROR_CODES.CONVERSATION_NOT_FOUND,
        '会话不存在',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  async remove(userId: string, conversationId: string): Promise<void> {
    await this.assertOwned(userId, conversationId);
    await this.prisma.conversation.delete({ where: { id: conversationId } });
    this.logger.log(JSON.stringify({ op: 'conversation_delete', conversationId, userId }));
  }

  async listMessages(userId: string, conversationId: string) {
    await this.assertOwned(userId, conversationId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        conversationId: true,
        role: true,
        content: true,
        status: true,
        errorCode: true,
        createdAt: true,
      },
    });
  }
}
