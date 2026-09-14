/**
 * @file conversation.service.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description 会话应用服务：归属校验、keyset 分页、标题搜索、列表不含 messages
 */
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from '@ai-chat/shared';
import { Prisma } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_CONVERSATION_TITLE } from './conversation-title';
import {
  CONVERSATION_PAGE_DEFAULT,
  MESSAGE_PAGE_DEFAULT,
  clampPageLimit,
  decodeCursor,
  encodeCursor,
  sanitizeTitleQuery,
} from './keyset-cursor';

const LIST_SELECT = {
  id: true,
  title: true,
  createdAt: true,
  updatedAt: true,
} as const;

const MESSAGE_SELECT = {
  id: true,
  conversationId: true,
  role: true,
  content: true,
  status: true,
  errorCode: true,
  createdAt: true,
} as const;

export type ConversationListResult = {
  items: Array<{
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  nextCursor: string | null;
};

export type MessageListResult = {
  items: Array<{
    id: string;
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    status: 'completed' | 'failed';
    errorCode: string | null;
    createdAt: Date;
  }>;
  nextCursor: string | null;
};

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * keyset（updatedAt, id）降序；q 仅 ILIKE title。永不 include messages。
   */
  async list(
    userId: string,
    query: { limit?: number; cursor?: string; q?: string } = {},
  ): Promise<ConversationListResult> {
    const limit = clampPageLimit(query.limit, CONVERSATION_PAGE_DEFAULT);
    const titleQ = query.q ? sanitizeTitleQuery(query.q) : '';
    if (query.q && !titleQ) {
      return { items: [], nextCursor: null };
    }

    const where: Prisma.ConversationWhereInput = { userId };
    if (titleQ) {
      where.title = { contains: titleQ, mode: 'insensitive' };
    }
    if (query.cursor) {
      const { t, id } = decodeCursor(query.cursor);
      where.AND = [
        {
          OR: [{ updatedAt: { lt: t } }, { AND: [{ updatedAt: t }, { id: { lt: id } }] }],
        },
      ];
    }

    const rows = await this.prisma.conversation.findMany({
      where,
      select: LIST_SELECT,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: hasMore && last ? encodeCursor(last.updatedAt, last.id) : null,
    };
  }

  create(userId: string, title?: string) {
    const resolved = title && title.length > 0 ? title : DEFAULT_CONVERSATION_TITLE;
    return this.prisma.conversation.create({
      data: { userId, title: resolved },
      select: LIST_SELECT,
    });
  }

  /**
   * 重命名须归属当前用户。
   */
  async rename(userId: string, conversationId: string, title: string) {
    await this.assertOwned(userId, conversationId);
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
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

  /**
   * 无 cursor：最近 limit 条（正序返回）。有 cursor：再取更早的一页。
   */
  async listMessages(
    userId: string,
    conversationId: string,
    query: { limit?: number; cursor?: string } = {},
  ): Promise<MessageListResult> {
    await this.assertOwned(userId, conversationId);
    const limit = clampPageLimit(query.limit, MESSAGE_PAGE_DEFAULT);
    const where: Prisma.MessageWhereInput = { conversationId };
    if (query.cursor) {
      const { t, id } = decodeCursor(query.cursor);
      where.AND = [
        {
          OR: [{ createdAt: { lt: t } }, { AND: [{ createdAt: t }, { id: { lt: id } }] }],
        },
      ];
    }

    const rows = await this.prisma.message.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: MESSAGE_SELECT,
    });
    const hasMore = rows.length > limit;
    const newestFirst = hasMore ? rows.slice(0, limit) : rows;
    const items = [...newestFirst].reverse();
    const oldest = items[0];
    return {
      items,
      nextCursor: hasMore && oldest ? encodeCursor(oldest.createdAt, oldest.id) : null,
    };
  }
}
