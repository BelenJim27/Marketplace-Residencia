// @ts-nocheck — tipos pendientes de revisar (props sin tipar)
import { Eye, Trash2 } from "lucide-react";

export default function LotesAcciones({ lote, onVer, onEliminar, canDelete }) {
  return (
    <div className="flex items-center gap-1">
      {canDelete && <button
        type="button"
        onClick={() => onVer(lote)}
        title="Ver detalle"
        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-all duration-200"
      >
        <Eye size={16} />
      </button>}

      <button
        type="button"
        onClick={() => onEliminar(lote)}
        title="Eliminar lote"
        className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-all duration-200"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
