"use client";

import { useState, useCallback } from "react";
import { DELETE_ALERT_CONFIG, type DeleteAlertConfig } from "@/config/delete-alerts";

export interface DeleteAlertState {
  open: boolean;
  nombre?: string;
  config: DeleteAlertConfig;
  onConfirm: () => void;
}

const DEFAULT_CONFIG: DeleteAlertConfig = {
  titulo: "¿Eliminar?",
  mensaje: () => "¿Estás seguro de que deseas eliminar este elemento?",
  advertencia: "Esta acción no se puede deshacer.",
  confirmText: "Sí, eliminar",
  cancelText: "Cancelar",
};

/**
 * Hook para gestionar el modal de confirmación de eliminación.
 *
 * @param entidad - Clave del DELETE_ALERT_CONFIG (ej: "usuario", "producto")
 *
 * @example
 * const { abrir, cerrar, estado } = useDeleteAlert("usuario");
 *
 * // Para abrir el modal:
 * abrir("Juan Pérez", () => handleDelete(id));
 *
 * // En el JSX:
 * <DeleteAlertModal estado={estado} onClose={cerrar} />
 */
export function useDeleteAlert(entidad: string) {
  const config = DELETE_ALERT_CONFIG[entidad] ?? DEFAULT_CONFIG;

  const [estado, setEstado] = useState<DeleteAlertState>({
    open: false,
    nombre: undefined,
    config,
    onConfirm: () => {},
  });

  const abrir = useCallback(
    (nombre: string | undefined, onConfirm: () => void) => {
      setEstado({ open: true, nombre, config, onConfirm });
    },
    [config]
  );

  const cerrar = useCallback(() => {
    setEstado((prev) => ({ ...prev, open: false }));
  }, []);

  return { abrir, cerrar, estado };
}
