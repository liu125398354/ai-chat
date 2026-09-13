/**
 * @file conversation.controller.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-13
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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiErrorResponses } from '../openapi/api-error.decorator';
import {
  ConversationDto,
  ConversationListDto,
  MessageListDto,
} from '../openapi/openapi.schemas';
import { ChatStreamService } from './chat-stream.service';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { StreamMessageDto } from './dto/stream-message.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Controller('v1/conversations')
@UseGuards(JwtAuthGuard)
@ApiTags('conversations')
@ApiBearerAuth('bearer')
@ApiExtraModels(ConversationDto, ConversationListDto, MessageListDto)
export class ConversationController {
  constructor(
    private readonly conversations: ConversationService,
    private readonly chatStream: ChatStreamService,
  ) {}

  @Get()
  @ApiOperation({ summary: '会话列表', description: '当前用户，updatedAt 降序；不含 messages' })
  @ApiOkResponse({ type: ConversationListDto })
  @ApiErrorResponses(401, 403)
  async list(@Req() req: Request) {
    const items = await this.conversations.list(req.user!.userId);
    return { items };
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: '创建会话' })
  @ApiCreatedResponse({ type: ConversationDto })
  @ApiErrorResponses(400, 401, 403)
  async create(@Req() req: Request, @Body() dto: CreateConversationDto) {
    return this.conversations.create(req.user!.userId, dto.title);
  }

  @Patch(':id')
  @ApiOperation({ summary: '重命名会话' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ConversationDto })
  @ApiErrorResponses(400, 401, 403, 404)
  async rename(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversations.rename(req.user!.userId, id, dto.title);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '删除会话（消息 CASCADE）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  @ApiErrorResponses(401, 403, 404)
  async remove(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    await this.conversations.remove(req.user!.userId, id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: '消息历史', description: '正序 createdAt 升序' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: MessageListDto })
  @ApiErrorResponses(401, 403, 404)
  async messages(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const items = await this.conversations.listMessages(req.user!.userId, id);
    return { items };
  }

  /**
   * POST .../messages:stream ；字面量冒号，避免被当成路径参数。
   */
  @Post(':id/messages\\:stream')
  @ApiOperation({
    summary: '发送消息并 SSE 流式生成',
    description: [
      '客户端必须用 fetch POST，不要 EventSource。',
      '成功：200 + text/event-stream；事件 meta → delta* → done|error。',
      '开始前失败仍为 JSON（401/403/400/404/409）。',
      'Swagger Try it out 不能完整演示流式，请对照 docs/API.md 第 5 节。',
    ].join('\n'),
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiProduces('text/event-stream', 'application/json')
  @ApiOkResponse({
    description: 'SSE：event meta/delta/done/error，data 为 JSON 行',
    content: {
      'text/event-stream': {
        schema: { type: 'string', example: 'event: meta\ndata: {"conversationId":"...","userMessageId":"..."}\n\n' },
      },
    },
  })
  @ApiErrorResponses(400, 401, 403, 404, 409)
  async stream(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StreamMessageDto,
  ): Promise<void> {
    const requestId = req.requestId || 'unknown';
    await this.chatStream.stream(req.user!.userId, id, dto.content, req, res, requestId);
  }
}
