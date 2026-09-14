/**
 * @file setup-openapi.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description 挂载 Swagger UI：/docs 给人看，/docs-json 给工具导入
 */
import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ConversationDto,
  ConversationListDto,
  ErrorBodyDto,
  LoginResponseDto,
  MessageDto,
  MessageListDto,
  OkResponseDto,
  PublicKeyResponseDto,
  PublicUserDto,
} from './openapi.schemas';

const DOCS_PATH = 'docs';

/**
 * 根据 Controller/DTO 生成 OpenAPI 3 文档并提供交互页。
 * 不改变 /v1 业务路径；密钥仍只走环境变量。
 */
export function setupOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('AI Chat API')
    .setDescription(
      [
        '前后端联调契约的交互文档，字段 camelCase，前缀 `/v1`。',
        '',
        '**鉴权：** 除登录、公钥、探活外，先点右上角 Authorize，填入 `Bearer` 后的 JWT（登录接口返回的 `token`）。',
        '',
        '**错误体：** `{ code, message, requestId }`。登录失败统一 `AUTH_INVALID`。无归属会话一律 `CONVERSATION_NOT_FOUND`（404）。',
        '',
        '**流式：** `POST /v1/conversations/:id/messages:stream` 成功时为 `text/event-stream`（event: meta / delta / done / error），Swagger「Try it out」无法完整演示 SSE，请用 fetch。',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '登录成功后的 token，不要带 Bearer 前缀以外的空格问题：只粘贴 JWT 本身',
      },
      'bearer',
    )
    .addTag('health', '探活')
    .addTag('auth', '认证：公钥、登录、改密、退出')
    .addTag('conversations', '会话与消息；写操作校验 JWT 归属')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      ErrorBodyDto,
      PublicKeyResponseDto,
      PublicUserDto,
      LoginResponseDto,
      OkResponseDto,
      ConversationDto,
      ConversationListDto,
      MessageDto,
      MessageListDto,
    ],
  });
  SwaggerModule.setup(DOCS_PATH, app, document, {
    jsonDocumentUrl: 'docs-json',
    customSiteTitle: 'AI Chat API',
  });
  Logger.log(`OpenAPI UI http://localhost:${process.env.PORT || 3000}/${DOCS_PATH}`, 'Bootstrap');
}
