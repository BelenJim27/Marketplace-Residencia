import * as dotenv from 'dotenv';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { join, resolve } from 'path';
import { SanitizeBodyInterceptor } from './common/interceptors/sanitize.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { static as expressStatic } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

dotenv.config({ path: resolve(process.cwd(), 'apps/api/.env'), override: true });
dotenv.config({ path: resolve(__dirname, '../.env'), override: false });
dotenv.config({ path: resolve(process.cwd(), '.env'), override: false });

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};
 
/**
 * Valida configuración crítica antes de levantar el servidor. En producción
 * abortamos si faltan secretos o las URLs públicas no usan HTTPS; así un
 * despliegue mal configurado falla en el arranque y no en la primera request.
 */
function assertProductionConfig() {
  const isProd = process.env.NODE_ENV === 'production';

  // Secretos JWT obligatorios en todo entorno; el webhook de Stripe solo en prod.
  const requiredSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  if (isProd) requiredSecrets.push('STRIPE_WEBHOOK_SECRET');
  const missing = requiredSecrets.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`[config] Faltan variables de entorno requeridas: ${missing.join(', ')}`);
  }

  if (isProd) {
    const httpsVars = ['FRONTEND_URL', 'GOOGLE_REDIRECT_URI'];
    const notHttps = httpsVars.filter((k) => {
      const v = process.env[k];
      return v && !v.startsWith('https://');
    });
    if (notHttps.length) {
      throw new Error(`[config] En producción estas URLs deben usar HTTPS: ${notHttps.join(', ')}`);
    }
    if (!process.env.CORS_ORIGINS) {
      throw new Error('[config] CORS_ORIGINS es obligatorio en producción (no se permite el default localhost).');
    }
  }
}

async function bootstrap() {
  assertProductionConfig();
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    rawBody: true,
  });
  app.use('/uploads', expressStatic(join(__dirname, '..', 'uploads')));

  // Cabeceras de seguridad (equivalente ligero a helmet, sin dependencia nueva).
  // No se fija CSP estricta aquí para no romper Swagger UI (/api/docs); la CSP de
  // cara al navegador se aplica en el frontend (next.config). CORP se omite para
  // que /uploads sea embebible desde el front en otro origen.
  const isProdHeaders = process.env.NODE_ENV === 'production';
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    if (isProdHeaders) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  const rawOrigins = process.env.CORS_ORIGINS ?? 'http://localhost:3000';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);
  const isProd = process.env.NODE_ENV === 'production';

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // En producción exigimos cabecera Origin: rechaza peticiones sin origin
      // (curl/scripts), que de otro modo saltarían la verificación de CORS.
      if (isProd && !origin) {
        callback(new Error('Origin header required'));
        return;
      }
      // En desarrollo se permite ausencia de origin (Swagger, health checks, etc.).
      if ((!isProd && !origin) || (origin && allowedOrigins.includes(origin))) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  });

  app.useGlobalInterceptors(new SanitizeBodyInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

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