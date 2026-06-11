/**
 * Sistema centralizado de alertas del proyecto.
 *
 * Importar desde aquí en todo el frontend:
 *   import { AlertService, CONFIRM_EDITAR, confirmEliminar } from "@/shared/alerts";
 */

export { AlertService } from "./alert.service";
export { AlertConfirmHost } from "./alert.host";
export { extraerMensaje, MENSAJE_ERROR_GENERICO } from "./alert.utils";
export {
  CONFIRM_EDITAR,
  confirmEliminar,
  confirmOperacionMasiva,
  confirmCambioEstado,
} from "./alert.constants";
export type {
  AlertVariant,
  ConfirmOptions,
  LoadingHandle,
} from "./alert.types";
