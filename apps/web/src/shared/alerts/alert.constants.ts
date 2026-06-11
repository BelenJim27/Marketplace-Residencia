/**
 * Presets de confirmación reutilizables para operaciones críticas.
 *
 * Reutiliza la configuración existente de borrado (`config/delete-alerts.ts`)
 * para no duplicar textos, y añade presets para editar, operaciones masivas y
 * cambios de estado — las confirmaciones que el proyecto aún no tenía.
 */

import { DELETE_ALERT_CONFIG } from "@/config/delete-alerts";
import type { ConfirmOptions } from "./alert.types";

/** Confirmación estándar antes de guardar cambios de una edición. */
export const CONFIRM_EDITAR: ConfirmOptions = {
  title: "Confirmar cambios",
  text: "¿Está seguro de guardar los cambios realizados?",
  confirmText: "Aceptar",
  cancelText: "Cancelar",
  variant: "warning",
};

/**
 * Confirmación de borrado a partir del `DELETE_ALERT_CONFIG` existente.
 * Si la entidad no está catalogada, cae a un texto genérico de borrado.
 */
export function confirmEliminar(entidad: string, nombre?: string): ConfirmOptions {
  const cfg = DELETE_ALERT_CONFIG[entidad];
  if (!cfg) {
    return {
      title: "¿Eliminar este registro?",
      text: "Esta acción no puede deshacerse.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger",
    };
  }
  return {
    title: cfg.titulo,
    text: cfg.mensaje(nombre),
    warning: cfg.advertencia,
    confirmText: cfg.confirmText,
    cancelText: cfg.cancelText,
    variant: "danger",
  };
}

/** Confirmación para operaciones masivas (importar, eliminar varios, etc.). */
export function confirmOperacionMasiva(
  text: string,
  opts?: Partial<ConfirmOptions>,
): ConfirmOptions {
  return {
    title: "Confirmar operación",
    text,
    confirmText: "Continuar",
    cancelText: "Cancelar",
    variant: "warning",
    ...opts,
  };
}

/** Confirmación para cambios de estado (pedidos, solicitudes, etc.). */
export function confirmCambioEstado(text: string, confirmText = "Confirmar"): ConfirmOptions {
  return {
    title: "Confirmar cambio de estado",
    text,
    confirmText,
    cancelText: "Cancelar",
    variant: "warning",
  };
}
