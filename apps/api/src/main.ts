import * as dotenv from 'dotenv';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { join, resolve } from 'path';
import { SanitizeBodyInterceptor } from './common/interceptors/sanitize.interceptor';
import { static as expressStatic } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

dotenv.config({ path: resolve(process.cwd(), 'apps/api/.env'), override: true });
dotenv.config({ path: resolve(__dirname, '../.env'), override: false });
dotenv.config({ path: resolve(process.cwd(), '.env'), override: false });

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};
 
async function bootstrap() {
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    rawBody: true,
  });
  app.use('/uploads', expressStatic(join(__dirname, '..', 'uploads')));

  const rawOrigins = process.env.CORS_ORIGINS ?? 'http://localhost:3000';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);
  const isProd = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (isProd && !origin) {
        callback(new Error('Origin header required'));
        return;
      }
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  });

  app.useGlobalInterceptors(new SanitizeBodyInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Marketplace Residencia API')
    .setDescription('API del marketplace de mezcal')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`API running on http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  
}
bootstrap();