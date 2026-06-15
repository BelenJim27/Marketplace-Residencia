import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

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
  requestId?: string;
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
    const requestId = (request as any).id as string | undefined;

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
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Errores conocidos de Prisma: mapear a un HTTP claro en lugar de un 500 opaco.
      // Así una violación de unicidad/FK deja de "colgar" flujos como el checkout con
      // "Error interno del servidor", y el `code` (PRISMA_Pxxxx) ayuda a diagnosticar.
      code = `PRISMA_${exception.code}`;
      switch (exception.code) {
        case 'P2002': // unique constraint
          statusCode = HttpStatus.CONFLICT;
          message = 'El registro ya existe o entra en conflicto con uno existente.';
          break;
        case 'P2003': // foreign key constraint
          statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
          message = 'Referencia inválida: un dato relacionado no existe.';
          break;
        case 'P2025': // record required but not found
          statusCode = HttpStatus.NOT_FOUND;
          message = 'El registro solicitado no existe.';
          break;
        case 'P2028': // transaction API timeout
          statusCode = HttpStatus.SERVICE_UNAVAILABLE;
          message = 'La operación tardó demasiado. Intenta de nuevo.';
          break;
        default:
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'No se pudo procesar la operación en la base de datos.';
      }
    }

    // Log estructurado (JSON) para trazabilidad: correlaciona por requestId. Solo
    // registramos errores del servidor (5xx) con stack; los 4xx son del cliente y ya
    // viajan en la respuesta. Errores no-HttpException siempre son 5xx (inesperados).
    if (statusCode >= 500) {
      this.logger.error(
        JSON.stringify({
          requestId,
          method: request.method,
          url: request.url,
          statusCode,
          message,
        }),
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const payload: ErrorResponseBody = { success: false, statusCode, message };
    if (code) payload.code = code;
    if (requestId) payload.requestId = requestId;

    response.status(statusCode).json(payload);
  }
}
