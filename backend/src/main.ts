import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // This is for local development only.
  // In test and production environments the HTTPS is provided by a separate AWS load balancer.
  let httpsOptions = null;
  if (
    fs.existsSync('./certs/nutakortti-test_private_key.pem') &&
    fs.existsSync('./certs/nutakortti-test.cer')
  ) {
    httpsOptions = {
      key: fs.readFileSync('./certs/nutakortti-test_private_key.pem'),
      cert: fs.readFileSync('./certs/nutakortti-test.cer'),
    };
  }

  const config = new DocumentBuilder()
    .setTitle('Nutakortti')
    .setDescription('API for Nutakortti project')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'super-admin',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'admin',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'junior',
    )
    .build();

  const app = httpsOptions
    ? await NestFactory.create<NestExpressApplication>(AppModule, {
        ...httpsOptions,
        bufferLogs: true,
      })
    : await NestFactory.create<NestExpressApplication>(AppModule, {
        bufferLogs: true,
      });

  if (process.env.JSON_LOGS) {
    app.useLogger(app.get(Logger));
  }

  app.enableCors();

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.useStaticAssets(join(__dirname, '..', 'public-admin'));

  app.use(cookieParser(process.env.COOKIE_SECRET));

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/swagger', app, document);

  await app.listen(process.env.APPLICATION_PORT || 3000);

  // SIGINT and SIGTERM are deliberate shutdowns, not errors.
  const shutdown = () => {
    void app.close().finally(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
bootstrap();
