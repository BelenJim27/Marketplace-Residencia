import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

// Campos que NO deben sanitizarse: alterarlos cambiaría su valor real (p.ej. una
// contraseña con `<` o `&` dejaría de coincidir al verificar). Se comparan en minúsculas.
const SENSITIVE_KEYS = /pass|contrase|token|secret|refresh|firma|signature|hash/i;

// Neutraliza contenido HTML/JS activo sin codificar entidades (no toca `&`, `<`
// sueltos, etc.), para no corromper texto legítimo. Cubre bypasses comunes del
// regex anterior: saltos de línea dentro de la etiqueta y URIs data:/javascript:.
function stripHtml(value: string): string {
  return value
    .replace(/<\s*script[\s\S]*?>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*\/?\s*[a-z][\s\S]*?>/gi, '') // cualquier etiqueta (incluye <scr\nipt>)
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

function sanitize(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEYS.test(key)) return value; // no tocar campos sensibles
  if (typeof value === 'string') return stripHtml(value);
  if (Array.isArray(value)) return value.map((v) => sanitize(v));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitize(v, k)]),
    );
  }
  return value;
}

@Injectable()
export class SanitizeBodyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    if (request.body && typeof request.body === 'object') {
      request.body = sanitize(request.body);
    }

    // Cobertura de query params (antes solo se saneaba el body). request.query puede
    // ser un getter de solo lectura en algunos setups → mutamos sus claves en sitio.
    if (request.query && typeof request.query === 'object') {
      for (const k of Object.keys(request.query)) {
        request.query[k] = sanitize(request.query[k], k);
      }
    }

    return next.handle();
  }
}
