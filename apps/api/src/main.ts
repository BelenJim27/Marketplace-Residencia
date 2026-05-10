import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
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
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();