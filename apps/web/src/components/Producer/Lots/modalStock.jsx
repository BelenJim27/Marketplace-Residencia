import { useState } from "react";
import { Loader2, X, PackagePlus } from "lucide-react";

const inputCls =
  "w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400";

export function ModalStock({ lote, onClose, onGuardar }) {
  const tieneProducto = !!lote?.productoVinculado;
  const stockActual   = lote?.productoVinculado?.stock ?? 0;

  const [tipo, setTipo]       = useState("entrada");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Preview del stock resultante
  const preview = (() => {
    const n = Number(cantidad);
    if (!cantidad || isNaN(n)) return null;
    if (tipo === "entrada") return stockActual + n;
    if (tipo === "salida")  return stockActual - n;
    return n; // ajuste
  })();

  async function handleSubmit(e) {
    e.preventDefault();
    const n = Number(cantidad);
    if (!n || n <= 0) { setError("Ingresa una cantidad válida mayor a 0."); return; }
    if (tipo === "salida" && n > stockActual) {
      setError(`No puedes sacar más del stock actual (${stockActual}).`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onGuardar({ idLote: lote.id_lote, cantidad: n, tipo, motivo });
      onClose();
    } catch (err) {
      setError(err?.message ?? "Error al guardar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold dark:text-white">Gestionar stock</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Lote: <span className="font-medium">{lote.lote}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Aviso si no tiene producto aún */}
        {!tieneProducto && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            ⚠ Este lote aún no tiene producto vinculado. Sincronízalo primero usando
            el botón <strong>Sincronizar</strong> para que aparezca en tus productos.
          </div>
        )}

        {/* Stock actual */}
        {tieneProducto && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Stock actual</span>
            <span className="text-2xl font-bold text-gray-800 dark:text-white">
              {stockActual}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-gray-500">
              Tipo de movimiento
            </label>
            <div className="flex gap-2">
              {[
                { key: "entrada", label: "➕ Entrada" },
                { key: "salida",  label: "➖ Salida"  },
                { key: "ajuste",  label: "✏ Ajuste"  },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTipo(key)}
                  disabled={!tieneProducto}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition
                    ${tipo === key
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}
                    disabled:opacity-40`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {tipo === "ajuste"
                ? "Establece el stock al número exacto que ingreses."
                : tipo === "entrada"
                ? "Suma unidades al stock actual."
                : "Resta unidades del stock actual."}
            </p>
          </div>

          {/* Cantidad */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
              {tipo === "ajuste" ? "Stock final deseado" : "Cantidad"}
            </label>
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => { setCantidad(e.target.value); setError(""); }}
              className={inputCls}
              placeholder="0"
              disabled={!tieneProducto}
              required
            />
            {/* Preview */}
            {preview !== null && (
              <p className={`mt-1 text-xs font-medium ${preview < 0 ? "text-red-500" : "text-green-600"}`}>
                Stock resultante: {preview} unidades
              </p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
              Motivo <span className="font-normal normal-case text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className={inputCls}
              placeholder="Ej. Producción nueva, merma, corrección..."
              disabled={!tieneProducto}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !tieneProducto}
              className="flex items-center gap-2 rounded-lg bg-green-500 px-6 py-2 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}