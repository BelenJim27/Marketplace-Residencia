import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join, resolve } from 'path';
import { static as expressStatic, raw } from 'express';

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
  app.use('/uploads', expressStatic(join(process.cwd(), 'uploads')));

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://marketplace-mezcal.vercel.app',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Marketplace-Residencia API')
    .setDescription('API para marketplace de mezcal con Stripe Connect y FedEx')
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT access token (15m expiry)',
    }, 'jwt-access')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT refresh token (30d expiry)',
    }, 'jwt-refresh')
    .addTag('Auth', 'Login, register, token refresh')
    .addTag('Productos', 'Product catalog management')
    .addTag('Pedidos', 'Order lifecycle')
    .addTag('Pagos', 'Payment records and Stripe')
    .addTag('Envios', 'Shipping and FedEx tracking')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: 2,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
}
bootstrap();