import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'; // 引入 Swagger

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors();

  // 1. 配置 Swagger 文档基本信息
  const config = new DocumentBuilder()
    .setTitle('Reader Node.js API')
    .setDescription('电子书阅读平台后端服务接口文档')
    .setVersion('1.0')
    .addTag('books', '书籍管理模块')
    .addBearerAuth() // 如果后续需要 JWT 认证，可以加上这个
    .build();

  // 2. 生成文档并挂载到指定路由
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  
  await app.listen(3000);
}
bootstrap();