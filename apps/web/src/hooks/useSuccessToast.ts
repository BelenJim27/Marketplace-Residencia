"use client";

import { useCallback, useMemo } from "react";
import { SUCCESS_ALERT_CONFIG } from "@/config/success-alerts";
import { AlertService } from "@/shared/alerts";

export type ToastType = "success" | "info";

export interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

/**
 * Hook de notificaciones de éxito para los paneles de Administrador y Productor.
 *
 * Consolidado sobre el sistema centralizado `@/shared/alerts` (Sonner). Se
 * conserva la API pública por compatibilidad con los llamadores existentes:
 * `estado` queda siempre oculto (el `<SuccessToast/>` asociado ya no renderiza
 * nada; el toast lo emite Sonner), por lo que no hay notificaciones duplicadas.
 *
 * El código nuevo debe usar `AlertService.showSuccess` directamente.
 *
 * @param entidad - Clave del SUCCESS_ALERT_CONFIG (ej: "usuario", "producto")
 */
export function useSuccessToast(entidad: string) {
  // `estado` permanece oculto: el `<SuccessToast/>` legacy renderiza null y el
  // toast real lo muestra Sonner vía AlertService.
  const estado = useMemo<ToastState>(
    () => ({ visible: false, message: "", type: "success" }),
    [],
  );

  const mostrar = useCallback(
    (message: string, type: ToastType = "success") => {
      if (type === "info") AlertService.showInfo(message);
      else AlertService.showSuccess(message);
    },
    [],
  );

  const mostrarRegistrado = useCallback(() => {
    mostrar(SUCCESS_ALERT_CONFIG[entidad]?.registrado ?? "Registrado correctamente.");
  }, [entidad, mostrar]);

  const mostrarActualizado = useCallback(() => {
    mostrar(SUCCESS_ALERT_CONFIG[entidad]?.actualizado ?? "Actualizado correctamente.");
  }, [entidad, mostrar]);

  const cerrar = useCallback(() => {}, []);

  return { estado, mostrar, mostrarRegistrado, mostrarActualizado, cerrar };
}
