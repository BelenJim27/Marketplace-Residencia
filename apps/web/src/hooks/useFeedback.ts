"use client";

import { useMemo } from "react";
import { SUCCESS_ALERT_CONFIG } from "@/config/success-alerts";
import { AlertService, extraerMensaje } from "@/shared/alerts";

/**
 * Hook unificado de feedback al usuario (éxito / error / info).
 *
 * Wrapper delgado sobre el sistema centralizado `@/shared/alerts`. Se conserva
 * por compatibilidad con los llamadores existentes; el código nuevo puede usar
 * `AlertService` directamente.
 *
 * @param entidad - Clave de SUCCESS_ALERT_CONFIG (ej: "producto_productor").
 *   Opcional; solo se usa para los mensajes `creado/actualizado/eliminado`.
 *
 * @example
 * const fb = useFeedback("producto_productor");
 * try { await api.productos.create(...); fb.creado(); }
 * catch (e) { fb.error(e); }  // muestra el mensaje legible del backend
 */

/** Extrae un mensaje legible de cualquier valor lanzado. Re-exportado por compatibilidad. */
export { extraerMensaje };

export function useFeedback(entidad?: string) {
  return useMemo(() => {
    const config = entidad ? SUCCESS_ALERT_CONFIG[entidad] : undefined;

    const success = (message: string) => AlertService.showSuccess(message);
    const info = (message: string) => AlertService.showInfo(message);
    const error = (err: unknown, fallback?: string) => AlertService.showError(err, fallback);

    return {
      success,
      info,
      error,
      creado: () => success(config?.registrado ?? "Registrado correctamente."),
      actualizado: () => success(config?.actualizado ?? "Actualizado correctamente."),
      eliminado: () => success(config?.eliminado ?? "Eliminado correctamente."),
    };
  }, [entidad]);
}
