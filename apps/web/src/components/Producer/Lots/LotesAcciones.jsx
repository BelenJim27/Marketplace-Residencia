import { Eye, Pencil, Trash2, PackagePlus } from "lucide-react";

export default function LotesAcciones({ lote, onVer, onEditar, onEliminar, onGestionarStock }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onVer(lote)}
        title="Ver detalle"
        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-all duration-200"
      >
        <Eye size={16} />
      </button>

      <button
        type="button"
        onClick={() => onEditar(lote)}
        title="Editar lote"
        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-all duration-200"
      >
        <Pencil size={16} />
      </button>

      {/* Botón nuevo de stock */}
      <button
        type="button"
        onClick={() => onGestionarStock(lote)}
        title="Gestionar stock"
        className="p-2 rounded-lg text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-all duration-200"
      >
        <PackagePlus size={16} />
      </button>

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
