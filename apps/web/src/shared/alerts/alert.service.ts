/**
 * AlertService — punto único de todas las alertas visuales del proyecto.
 *
 * Diseño (decisión: fachada sobre lo ya montado, sin librerías nuevas):
 *   - Toasts (éxito/error/advertencia/info/loading) → Sonner, ya montado en
 *     `app/providers.tsx`. Sonner es imperativo, así que no requiere hook ni JSX.
 *   - Confirmaciones → modal centrado renderizado por `<AlertConfirmHost/>`
 *     (montado una sola vez). El service publica la petición en un bus interno
 *     y el host resuelve la `Promise<boolean>`.
 *
 * Regla clave: los errores se muestran con el `message` real del backend vía
 * `extraerMensaje`; nunca un genérico cuando hay mensaje disponible.
 *
 * @example
 *   AlertService.showSuccess("Producto creado correctamente");
 *   AlertService.showError(err);                 // usa el message del backend
 *   if (await AlertService.showConfirm(CONFIRM_EDITAR)) { ... }
 */

import { toast } from "sonner";
import type {
  ConfirmOptions,
  ConfirmRequest,
  ConfirmSubscriber,
  LoadingHandle,
} from "./alert.types";
import { extraerMensaje } from "./alert.utils";

// ── Bus de confirmaciones ───────────────────────────────────────────────────
let confirmSubscriber: ConfirmSubscriber | null = null;
let pendingRequests: ConfirmRequest[] = [];
let requestSeq = 0;

/** Registrado por `<AlertConfirmHost/>`. Vacía la cola acumulada antes de montar. */
export function subscribeConfirm(subscriber: ConfirmSubscriber): () => void {
  confirmSubscriber = subscriber;
  if (pendingRequests.length) {
    const queued = pendingRequests;
    pendingRequests = [];
    queued.forEach(subscriber);
  }
  return () => {
    if (confirmSubscriber === subscriber) confirmSubscriber = null;
  };
}

export const AlertService = {
  showSuccess(message: string) {
    toast.success(message);
  },

  showError(error: unknown, fallback?: string) {
    toast.error(extraerMensaje(error, fallback));
  },

  showWarning(message: string) {
    toast.warning(message);
  },

  showInfo(message: string) {
    toast.info(message);
  },

  /** Toast de carga; usar el handle para transformarlo en éxito/error o cerrarlo. */
  showLoading(message: string): LoadingHandle {
    const id = toast.loading(message);
    return {
      success: (m: string) => toast.success(m, { id }),
      error: (err: unknown, fallback?: string) =>
        toast.error(extraerMensaje(err, fallback), { id }),
      close: () => toast.dismiss(id),
    };
  },

  /** Modal de confirmación. Resuelve `true` si el usuario confirma, `false` si cancela. */
  showConfirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const request: ConfirmRequest = { ...options, id: ++requestSeq, resolve };
      if (confirmSubscriber) {
        confirmSubscriber(request);
      } else {
        // El host aún no está montado: encolar para entregar al suscribirse.
        pendingRequests.push(request);
      }
    });
  },
};

export type { ConfirmOptions, LoadingHandle };
