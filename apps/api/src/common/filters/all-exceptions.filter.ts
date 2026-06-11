import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Forma estandarizada de TODA respuesta de error de la API.
 *
 * El frontend (`ApiError` en `apps/web/src/lib/api.ts`) lee `message` para
 * mostrar el texto real del backend en las alertas centralizadas, y `code`
 * para ramificaciones específicas (p.ej. `INVALID_HS_CODE`).
 */
interface ErrorResponseBody {
  success: false;
  statusCode: number;
  message: string;
  code?: string;
}

/**
 * Filtro global que normaliza todos los errores a una forma consistente.
 *
 * - `HttpException`: conserva su status y su `message` real (uniendo arrays del
 *   ValidationPipe con " · "), más `code` si la excepción lo traía.
 * - Errores no controlados: 500 con un mensaje genérico (el detalle real se
 *   registra en el log, nunca se filtra al cliente).
 *
 * Registrado en `main.ts` con `app.useGlobalFilters(new AllExceptionsFilter())`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let code: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const body = res as Record<string, unknown>;
        const raw = body.message;
        if (Array.isArray(raw)) {
          message = raw.filter(Boolean).join(' · ') || message;
        } else if (typeof raw === 'string' && raw.trim()) {
          message = raw.trim();
        } else if (typeof body.error === 'string' && body.error.trim()) {
          message = body.error.trim();
        }
        if (typeof body.code === 'string') code = body.code;
      }
    } else {
      // Error inesperado: registrar el detalle real, responder genérico.
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const payload: ErrorResponseBody = { success: false, statusCode, message };
    if (code) payload.code = code;

    response.status(statusCode).json(payload);
  }
}
