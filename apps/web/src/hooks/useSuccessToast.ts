"use client";

import { useState, useCallback } from "react";
import { SUCCESS_ALERT_CONFIG } from "@/config/success-alerts";

export type ToastType = "success" | "info";

export interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

/**
 * Hook para mostrar notificaciones de éxito en paneles de Administrador y Productor.
 *
 * @param entidad - Clave del SUCCESS_ALERT_CONFIG (ej: "usuario", "producto")
 *
 * @example
 * const toast = useSuccessToast("producto");
 *
 * // Tras crear:
 * await api.productos.create(...);
 * toast.mostrarRegistrado();
 *
 * // Tras actualizar:
 * await api.productos.update(...);
 * toast.mostrarActualizado();
 *
 * // En el JSX:
 * <SuccessToast toast={toast.estado} onClose={toast.cerrar} />
 */
export function useSuccessToast(entidad: string) {
  const config = SUCCESS_ALERT_CONFIG[entidad];

  const [estado, setEstado] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });

  const mostrar = useCallback(
    (message: string, type: ToastType = "success", duracion = 4000) => {
      setEstado({ visible: true, message, type });
      setTimeout(() => setEstado((prev) => ({ ...prev, visible: false })), duracion);
    },
    []
  );

  const mostrarRegistrado = useCallback(() => {
    mostrar(config?.registrado ?? "Registrado correctamente.");
  }, [config, mostrar]);

  const mostrarActualizado = useCallback(() => {
    mostrar(config?.actualizado ?? "Actualizado correctamente.");
  }, [config, mostrar]);

  const cerrar = useCallback(() => {
    setEstado((prev) => ({ ...prev, visible: false }));
  }, []);

  return { estado, mostrar, mostrarRegistrado, mostrarActualizado, cerrar };
}
