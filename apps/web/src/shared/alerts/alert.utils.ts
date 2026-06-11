/**
 * Utilidades del sistema de alertas.
 *
 * `extraerMensaje` es la pieza que garantiza la regla de negocio "los errores
 * deben venir del backend": dado cualquier valor lanzado (ApiError, Error,
 * string o respuesta cruda de la API) devuelve el `message` real del servidor,
 * cayendo a un genérico solo cuando no hay nada legible.
 */

export const MENSAJE_ERROR_GENERICO = "Ocurrió un error. Intenta de nuevo.";

/** Extrae un mensaje legible de cualquier valor lanzado (Error | string | API). */
export function extraerMensaje(err: unknown, fallback = MENSAJE_ERROR_GENERICO): string {
  if (!err) return fallback;
  if (typeof err === "string") return err.trim() || fallback;
  if (err instanceof Error) return err.message.trim() || fallback;
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const candidato = obj.message ?? obj.error ?? obj.mensaje;
    if (Array.isArray(candidato)) {
      const unido = candidato.filter(Boolean).join(" · ").trim();
      if (unido) return unido;
    }
    if (typeof candidato === "string" && candidato.trim()) return candidato.trim();
  }
  return fallback;
}
