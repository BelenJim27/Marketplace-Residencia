/**
 * Configuración central de notificaciones de éxito para los paneles
 * de Administrador y Productor.
 *
 * Cada entrada define los mensajes que se muestran después de registrar
 * o actualizar correctamente una entidad.
 *
 * Uso con el hook:
 *   const toast = useSuccessToast("producto");
 *   toast.mostrarRegistrado();   // al crear
 *   toast.mostrarActualizado();  // al editar
 *
 * O con un mensaje personalizado:
 *   toast.mostrar("Operación completada.");
 */

export interface SuccessAlertConfig {
  /** Mensaje que aparece al registrar/crear un nuevo elemento */
  registrado: string;
  /** Mensaje que aparece al actualizar un elemento existente */
  actualizado: string;
}

export const SUCCESS_ALERT_CONFIG: Record<string, SuccessAlertConfig> = {
  // ── PANEL ADMINISTRADOR ─────────────────────────────────────────────────

  usuario: {
    registrado: "Usuario registrado correctamente.",
    actualizado: "Usuario actualizado correctamente.",
  },

  producto: {
    registrado: "Producto registrado correctamente.",
    actualizado: "Producto actualizado correctamente.",
  },

  productor: {
    registrado: "Productor registrado correctamente.",
    actualizado: "Productor actualizado correctamente.",
  },

  pedido: {
    registrado: "Pedido registrado correctamente.",
    actualizado: "Pedido actualizado correctamente.",
  },

  categoria: {
    registrado: "Categoría registrada correctamente.",
    actualizado: "Categoría actualizada correctamente.",
  },

  reembolso: {
    registrado: "Reembolso marcado como resuelto correctamente.",
    actualizado: "Reembolso actualizado correctamente.",
  },

  solicitud_productor: {
    registrado: "Solicitud procesada correctamente.",
    actualizado: "Solicitud actualizada correctamente.",
  },

  asociacion: {
    registrado: "Asociación guardada correctamente.",
    actualizado: "Asociación actualizada correctamente.",
  },

  comision: {
    registrado: "Regla de comisión creada correctamente.",
    actualizado: "Regla de comisión actualizada correctamente.",
  },

  rol: {
    registrado: "Rol creado correctamente.",
    actualizado: "Rol actualizado correctamente.",
  },

  permiso: {
    registrado: "Permiso creado correctamente.",
    actualizado: "Permiso actualizado correctamente.",
  },

  // ── PANEL PRODUCTOR ─────────────────────────────────────────────────────

  tienda: {
    registrado: "Tienda registrada correctamente.",
    actualizado: "Tienda actualizada correctamente.",
  },

  lote: {
    registrado: "Lote registrado correctamente.",
    actualizado: "Lote actualizado correctamente.",
  },

  producto_productor: {
    registrado: "Producto registrado en tu catálogo correctamente.",
    actualizado: "Producto actualizado correctamente.",
  },
};
