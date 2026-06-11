/**
 * Tipos del sistema centralizado de alertas (`src/shared/alerts`).
 *
 * Toda alerta visual del proyecto pasa por `AlertService`:
 *   - éxito / error / advertencia / info / loading  → toasts (Sonner)
 *   - confirmaciones                                 → modal centrado
 */

/** Variante visual de una confirmación; define el color e icono del modal. */
export type AlertVariant = "danger" | "warning" | "info";

/** Opciones para `AlertService.showConfirm`. Devuelve `Promise<boolean>`. */
export interface ConfirmOptions {
  /** Título del modal. */
  title: string;
  /** Texto principal. Acepta saltos de línea (`\n`). */
  text?: string;
  /** Advertencia secundaria (consecuencias irreversibles, etc.). */
  warning?: string;
  /** Texto del botón de confirmación. Por defecto "Aceptar". */
  confirmText?: string;
  /** Texto del botón de cancelación. Por defecto "Cancelar". */
  cancelText?: string;
  /** Variante visual. Por defecto "warning". */
  variant?: AlertVariant;
}

/** Petición de confirmación interna que viaja del service al host. */
export interface ConfirmRequest extends ConfirmOptions {
  /** Identificador único de la petición. */
  id: number;
  /** Resuelve la `Promise<boolean>` devuelta por `showConfirm`. */
  resolve: (confirmed: boolean) => void;
}

/**
 * Handle devuelto por `AlertService.showLoading`. Permite transformar el toast
 * de carga en éxito/error o cerrarlo, reusando el mismo id de Sonner.
 */
export interface LoadingHandle {
  /** Reemplaza el toast de carga por uno de éxito. */
  success: (message: string) => void;
  /** Reemplaza el toast de carga por uno de error (lee el mensaje del backend). */
  error: (error: unknown, fallback?: string) => void;
  /** Cierra el toast de carga sin mostrar resultado. */
  close: () => void;
}

/** Suscriptor al bus de confirmaciones (lo usa `<AlertConfirmHost/>`). */
export type ConfirmSubscriber = (request: ConfirmRequest) => void;
