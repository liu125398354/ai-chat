/**
 * @file conversation.controller.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 会话与消息 HTTP/SSE；userId 只来自 JWT
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatStreamService } from './chat-stream.service';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { StreamMessageDto } from './dto/stream-message.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Controller('v1/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(
    private readonly conversations: ConversationService,
    private readonly chatStream: ChatStreamService,
  ) {}

  @Get()
  async list(@Req() req: Request) {
    const items = await this.conversations.list(req.user!.userId);
    return { items };
  }

  @Post()
  @HttpCode(201)
  async create(@Req() req: Request, @Body() dto: CreateConversationDto) {
    return this.conversations.create(req.user!.userId, dto.title);
  }

  @Patch(':id')
  async rename(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversations.rename(req.user!.userId, id, dto.title);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    await this.conversations.remove(req.user!.userId, id);
  }

  @Get(':id/messages')
  async messages(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const items = await this.conversations.listMessages(req.user!.userId, id);
    return { items };
  }

  /**
   * POST .../messages:stream ；字面量冒号，避免被当成路径参数。
   */
  @Post(':id/messages\\:stream')
  async stream(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StreamMessageDto,
  ): Promise<void> {
    const requestId = req.requestId || 'unknown';
    await this.chatStream.stream(req.user!.userId, id, dto.content, res, requestId);
  }
}
