import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { appEnv } from './config/app-env';
import { ProposalAttachmentsService } from './proposals/proposal-attachments.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: appEnv.corsOrigin,
    credentials: appEnv.corsCredentials,
  });

  const attachmentsService = app.get(ProposalAttachmentsService);
  attachmentsService.ensureUploadDir();

  app.useStaticAssets(appEnv.uploadDir, {
    prefix: appEnv.uploadUrlPrefix,
  });

  if (appEnv.apiPrefix) {
    app.setGlobalPrefix(appEnv.apiPrefix);
  }
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const swaggerConfig = new DocumentBuilder()
    .setTitle(appEnv.appName)
    .setDescription('API cho hệ thống tự động hóa tài chính')
    .setVersion('1.0')
    .addTag('admin')
    .addTag('auth')
    .addTag('users')
    .addTag('proposals')
    .addTag('proposal-actions')
    .addTag('workflows')
    .addTag('proposal-types')
    .build();

  if (appEnv.swaggerEnabled) {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(appEnv.swaggerPath, app, document);
  }

  if (appEnv.host) {
    await app.listen(appEnv.port, appEnv.host);
    return;
  }

  await app.listen(appEnv.port);
}
bootstrap();
