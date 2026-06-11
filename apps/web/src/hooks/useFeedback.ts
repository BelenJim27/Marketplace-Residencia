"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { SUCCESS_ALERT_CONFIG } from "@/config/success-alerts";

/**
 * Hook unificado de feedback al usuario (éxito / error / info).
 *
 * Construido sobre Sonner, que ya está montado globalmente en
 * `app/providers.tsx` (`<Toaster richColors closeButton />`). Por eso NO hay
 * ningún componente que renderizar en cada vista: basta con llamar a los
 * métodos del hook.
 *
 * @param entidad - Clave de SUCCESS_ALERT_CONFIG (ej: "producto_productor",
 *   "direccion"). Opcional; solo se usa para los mensajes predeterminados
 *   `creado/actualizado/eliminado`.
 *
 * @example
 * const fb = useFeedback("producto_productor");
 *
 * try {
 *   await api.productos.create(...);
 *   fb.creado();                 // "Producto registrado..."
 * } catch (e) {
 *   fb.error(e);                 // muestra el mensaje legible del error
 * }
 *
 * // Mensaje libre:
 * fb.success("Cambios guardados.");
 */

const MENSAJE_ERROR_GENERICO = "Ocurrió un error. Intenta de nuevo.";

/** Extrae un mensaje legible de cualquier valor lanzado (Error | string | API). */
export function extraerMensaje(err: unknown, fallback = MENSAJE_ERROR_GENERICO): string {
  if (!err) return fallback;
  if (typeof err === "string") return err.trim() || fallback;
  if (err instanceof Error) return err.message.trim() || fallback;
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const candidato = obj.message ?? obj.error ?? obj.mensaje;
    if (typeof candidato === "string" && candidato.trim()) return candidato.trim();
  }
  return fallback;
}

export function useFeedback(entidad?: string) {
  return useMemo(() => {
    const config = entidad ? SUCCESS_ALERT_CONFIG[entidad] : undefined;

    const success = (message: string) => toast.success(message);
    const info = (message: string) => toast.info(message);
    const error = (err: unknown, fallback?: string) =>
      toast.error(extraerMensaje(err, fallback));

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
