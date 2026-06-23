import './instrument'; // Sentry must be imported before everything else
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { resolve } from 'path';
import { SanitizeBodyInterceptor } from './common/interceptors/sanitize.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { static as expressStatic } from 'express';
import * as cookieParser from 'cookie-parser';
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
  const logger = console; // Logger de NestJS no está disponible aún en este punto

  // Secretos JWT obligatorios en todo entorno; el resto solo en prod.
  const requiredAlways = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
  const requiredInProd = [
    'STRIPE_WEBHOOK_SECRET',
    'SENDGRID_API_KEY',
    'NEXTAUTH_SECRET',
    'CORS_ORIGINS',
    'FRONTEND_URL',
  ];

  const missing = requiredAlways.filter((k) => !process.env[k]);
  if (isProd) missing.push(...requiredInProd.filter((k) => !process.env[k]));

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

    // Advertencias no bloqueantes para vars opcionales recomendadas en prod
    const recommended = ['SENTRY_DSN', 'EMAIL_FROM', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
    const missingRec = recommended.filter((k) => !process.env[k]);
    if (missingRec.length) {
      logger.warn(`[config] ADVERTENCIA — variables recomendadas no configuradas: ${missingRec.join(', ')}`);
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
  app.use(cookieParser());
  const { UPLOADS_ROOT } = await import('./common/config/multer.config');
  app.use('/uploads', expressStatic(UPLOADS_ROOT));

  // Request ID para trazabilidad: reutiliza X-Request-ID entrante (de un proxy/LB) o
  // genera uno. Disponible en req.id y devuelto en la respuesta para correlacionar logs
  // del backend con un reporte del usuario/frontend.
  app.use((req: any, res: any, next: any) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && incoming.trim() ? incoming.trim().slice(0, 128) : randomUUID();
    req.id = id;
    res.setHeader('X-Request-ID', id);
    next();
  });

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

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Sin cabecera Origin (health checks, navegaciones directas, favicon,
      // peticiones server-to-server): permitir. CORS solo restringe las peticiones
      // cross-origin del navegador, que SÍ envían Origin; exigirla generaba 500s
      // espurios en los health checks y no aporta seguridad real.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Origen no permitido: no enviamos Access-Control-Allow-Origin. No lanzamos
        // un Error (evita 500 con stack en el log); el navegador bloquea la respuesta
        // por su cuenta al faltar la cabecera.
        callback(null, false);
      }
    },
    credentials: true,
  });

  app.useGlobalInterceptors(new SanitizeBodyInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Marketplace Residencia API')
      .setDescription('API del marketplace de mezcal')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`API running on http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
  
}
bootstrap();
