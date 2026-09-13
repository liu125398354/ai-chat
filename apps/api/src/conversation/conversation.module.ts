/**
 * @file conversation.module.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 会话、消息与流式编排模块
 */
import { Module } from '@nestjs/common';
import { ConversationLockService } from '../infrastructure/lock/conversation-lock.service';
import { QianfanAdapter } from '../infrastructure/qianfan/qianfan.adapter';
import { ChatStreamService } from './chat-stream.service';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';

@Module({
  controllers: [ConversationController],
  providers: [
    ConversationService,
    ChatStreamService,
    ConversationLockService,
    QianfanAdapter,
  ],
})
export class ConversationModule {}
