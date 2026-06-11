/**
 * Configuración central de alertas de eliminación para los paneles
 * de Administrador y Productor.
 *
 * Cada entrada define los textos y comportamiento del modal de confirmación
 * que aparece antes de ejecutar cualquier acción destructiva.
 *
 * Uso:
 *   const config = DELETE_ALERT_CONFIG.usuario;
 *   // o con el hook:
 *   const { abrir, modal } = useDeleteAlert("producto");
 */

export interface DeleteAlertConfig {
  /** Título del modal */
  titulo: string;
  /** Mensaje principal; recibe el nombre del elemento a eliminar */
  mensaje: (nombre?: string) => string;
  /** Texto de advertencia secundario (consecuencias irreversibles, etc.) */
  advertencia?: string;
  /** Texto del botón de confirmación */
  confirmText: string;
  /** Texto del botón de cancelación */
  cancelText: string;
}

export const DELETE_ALERT_CONFIG: Record<string, DeleteAlertConfig> = {
  // ── PANEL ADMINISTRADOR ─────────────────────────────────────────────────

  usuario: {
    titulo: "¿Eliminar usuario?",
    mensaje: (nombre) =>
      nombre
        ? `¿Estás seguro de que deseas eliminar al usuario "${nombre}"?`
        : "¿Estás seguro de que deseas eliminar este usuario?",
    advertencia:
      "Esta acción eliminará permanentemente la cuenta y todos sus datos asociados. No se puede deshacer.",
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
  },

  producto: {
    titulo: "¿Eliminar producto?",
    mensaje: (nombre) =>
      nombre
        ? `¿Estás seguro de que deseas eliminar el producto "${nombre}"?`
        : "¿Estás seguro de que deseas eliminar este producto?",
    advertencia: "Esta acción no se puede deshacer.",
    confirmText: "Sí, eliminar",
    cancelText: "No, cancelar",
  },

  productor: {
    titulo: "¿Eliminar productor?",
    mensaje: (nombre) =>
      nombre
        ? `¿Estás seguro de que deseas eliminar al productor "${nombre}"?`
        : "¿Estás seguro de que deseas eliminar este productor?",
    advertencia:
      "Se eliminarán también sus tiendas y productos asociados. Esta acción no se puede deshacer.",
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
  },

  pedido: {
    titulo: "¿Eliminar pedido?",
    mensaje: (nombre) =>
      nombre
        ? `¿Estás seguro de que deseas eliminar el pedido "${nombre}"?`
        : "¿Estás seguro de que deseas eliminar este pedido?",
    advertencia:
      "Se eliminarán los datos del pedido de forma permanente. Esta acción no se puede deshacer.",
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
  },

  categoria: {
    titulo: "¿Eliminar categoría?",
    mensaje: (nombre) =>
      nombre
        ? `¿Estás seguro de que deseas eliminar la categoría "${nombre}"?`
        : "¿Estás seguro de que deseas eliminar esta categoría?",
    advertencia:
      "Los productos asociados a esta categoría quedarán sin clasificar.",
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
  },

  rol: {
    titulo: "¿Eliminar rol?",
    mensaje: (nombre) =>
      nombre
        ? `¿Estás seguro de que deseas eliminar el rol "${nombre}"?`
        : "¿Estás seguro de que deseas eliminar este rol?",
    advertencia:
      "Los usuarios que tengan este rol asignado perderán sus permisos asociados.",
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
  },

  permiso: {
    titulo: "¿Eliminar permiso?",
    mensaje: (nombre) =>
      nombre
        ? `¿Estás seguro de que deseas eliminar el permiso "${nombre}"?`
        : "¿Estás seguro de que deseas eliminar este permiso?",
    advertencia:
      "Se eliminará de todos los roles que lo tengan asignado actualmente.",
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
  },

  // ── PANEL PRODUCTOR ─────────────────────────────────────────────────────

  tienda: {
    titulo: "¿Eliminar tienda?",
    mensaje: (nombre) =>
      nombre
        ? `¿Estás seguro de que deseas eliminar la tienda "${nombre}"?`
        : "¿Estás seguro de que deseas eliminar esta tienda?",
    advertencia: "Esta acción no se puede deshacer.",
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
  },

  lote: {
    titulo: "¿Eliminar lote?",
    mensaje: (nombre) =>
      nombre
        ? `¿Estás seguro de que deseas eliminar el lote "${nombre}" de forma permanente?`
        : "¿Estás seguro de que deseas eliminar este lote de forma permanente?",
    advertencia:
      "El inventario y los datos de producción asociados se perderán.",
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
  },

  asociacion: {
    titulo: "¿Eliminar asociación?",
    mensaje: (nombre) =>
      nombre
        ? `¿Estás seguro de que deseas eliminar "${nombre}" de la lista?`
        : "¿Estás seguro de que deseas eliminar esta asociación?",
    advertencia:
      "Los productores ya registrados conservarán su asociación. Esta acción no se puede deshacer.",
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
  },

  comision: {
    titulo: "¿Desactivar regla de comisión?",
    mensaje: (nombre) =>
      nombre
        ? `¿Estás seguro de que deseas desactivar la regla "${nombre}"?`
        : "¿Estás seguro de que deseas desactivar esta regla de comisión?",
    advertencia:
      "La regla dejará de aplicarse en los cálculos de comisión. Esta acción no se puede deshacer.",
    confirmText: "Sí, desactivar",
    cancelText: "Cancelar",
  },

  producto_productor: {
    titulo: "¿Eliminar producto?",
    mensaje: (nombre) =>
      nombre
        ? `¿Estás seguro de que deseas eliminar "${nombre}" de tu catálogo?`
        : "¿Estás seguro de que deseas eliminar este producto de tu catálogo?",
    advertencia:
      "El producto dejará de estar disponible para los compradores. Esta acción no se puede deshacer.",
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
  },

  // ── CLIENTE / TIENDA ────────────────────────────────────────────────────

  direccion: {
    titulo: "¿Eliminar dirección?",
    mensaje: (nombre) =>
      nombre
        ? `¿Estás seguro de que deseas eliminar la dirección "${nombre}"?`
        : "¿Estás seguro de que deseas eliminar esta dirección?",
    advertencia: "Esta acción no se puede deshacer.",
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
  },

  carrito_item: {
    titulo: "¿Quitar producto del carrito?",
    mensaje: (nombre) =>
      nombre
        ? `¿Deseas quitar "${nombre}" de tu carrito?`
        : "¿Deseas quitar este producto de tu carrito?",
    confirmText: "Sí, quitar",
    cancelText: "Cancelar",
  },
};
