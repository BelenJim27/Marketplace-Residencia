"use client";

import { ImagenProducto } from "@/components/Producer/Products/ImagenProducto";
import type {
  FormState,
  ModalMode,
  StoreItem,
  CategoriaItem,
  LoteItem,
  ProductItem,
} from "@/hooks/useProductos";
import type { ImagenProductoState } from "@/components/Producer/Products/ImagenProducto";

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  disabled,
  textarea,
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  textarea?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
}) {
  const base =
    "w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2";
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-dark dark:text-white">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={4}
          placeholder={placeholder}
          className={base}
        />
      ) : (
        <input
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={base}
        />
      )}
    </label>
  );
}

// ─── SelectField ──────────────────────────────────────────────────────────────

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-dark dark:text-white">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type ProductoModalProps = {
  mode: ModalMode;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  imagen: ImagenProductoState;
  setImagen: (next: ImagenProductoState) => void;
  selected: ProductItem | null;
  stores: StoreItem[];
  categorias: CategoriaItem[];
  lotes: LoteItem[];
  saving: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function ProductoModal({
  mode,
  form,
  setForm,
  imagen,
  setImagen,
  selected,
  stores,
  categorias,
  lotes,
  saving,
  onSubmit,
  onClose,
}: ProductoModalProps) {
  const title =
    mode === "create"
      ? "Nuevo producto"
      : mode === "edit"
        ? "Editar producto"
        : "Detalle de producto";

  // Corrección 1: Definir la variable que faltaba
  const tieneLoTeVinculado = !!form.id_lote;

  const set = (key: keyof FormState) => (value: string) =>
    setForm((c) => ({ ...c, [key]: value }));

  const handleLoteChange = (value: string) => {
    const lote = lotes.find((l) => String(l.id_lote) === value);
    setForm((c) => ({
      ...c,
      id_lote: value,
      // Nota: Asegúrate de que stock_inicial esté definido en la interfaz FormState
      stock_inicial: lote?.unidades != null ? String(lote.unidades) : (c as any).stock_inicial,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-dark dark:text-white">{title}</h2>
            {tieneLoTeVinculado && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                🔗 Vinculado a un lote — el stock se gestiona desde Mis Lotes
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">

          {/* Nombre y Precio */}
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Nombre"
              value={form.nombre}
              onChange={set("nombre")}
              disabled={mode === "view"}
            />
            <Field
              label="Precio base"
              value={form.precio_base}
              onChange={set("precio_base")}
              disabled={mode === "view"}
              inputMode="decimal"
              placeholder="0.00"
            />
          </div>

          {/* Descripción */}
          <Field
            label="Descripción"
            value={form.descripcion}
            onChange={set("descripcion")}
            disabled={mode === "view"}
            textarea
          />

          {/* Imagen */}
          <ImagenProducto
            label="Imagen"
            disabled={mode === "view"}
            imagen={imagen}
            fallbackPreview={selected?.imagen_url ?? selected?.imagen_principal_url ?? null}
            onChange={setImagen}
          />

          {/* Tienda / Moneda / Status */}
          <div className="grid gap-4 md:grid-cols-3">
            <SelectField
              label="Tienda"
              value={form.id_tienda}
              onChange={set("id_tienda")}
              disabled={mode === "view"}
              options={stores.map((s) => ({ label: s.nombre, value: String(s.id_tienda) }))}
            />
            <SelectField
              label="Moneda"
              value={form.moneda_base}
              onChange={set("moneda_base")}
              disabled={mode === "view"}
              options={[
                { label: "MXN", value: "MXN" },
                { label: "USD", value: "USD" },
              ]}
            />
            <SelectField
              label="Status"
              value={form.status}
              onChange={set("status")}
              disabled={mode === "view"}
              options={[
                { label: "Activo", value: "activo" },
                { label: "Inactivo", value: "inactivo" },
              ]}
            />
          </div>

          {/* Categoría */}
          <SelectField
            label="Categoría"
            value={form.id_categoria}
            onChange={set("id_categoria")}
            disabled={mode === "view"}
            placeholder="Selecciona una categoría"
            options={categorias.map((c) => ({
              label: c.nombre,
              value: String(c.id_categoria),
            }))}
          />

          {/* Lote y Stock inicial */}
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Lote"
              // Corrección 2: Asegurar que el value no sea undefined
              value={form.id_lote ?? ""}
              onChange={handleLoteChange}
              disabled={mode === "view"}
              placeholder="Sin lote asignado"
              options={lotes.map((l) => ({
                label: `${l.codigo_lote}${l.nombre_comun ? ` - ${l.nombre_comun}` : ""}`,
                value: String(l.id_lote),
              }))}
            />
            <Field
              label="Stock inicial"
              // Corrección 3: Asegurar acceso a stock_inicial
              value={(form as any).stock_inicial ?? ""}
              onChange={set("stock_inicial" as keyof FormState)}
              disabled={mode === "view"}
              inputMode="numeric"
              placeholder="0"
            />
          </div>

          {/* Dimensiones y peso */}
          <div>
            <p className="mb-3 text-sm font-semibold text-dark dark:text-white">
              Dimensiones y peso{" "}
              <span className="font-normal text-gray-400">(opcional)</span>
            </p>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Peso (kg)" value={form.peso_kg} onChange={set("peso_kg")} disabled={mode === "view"} inputMode="decimal" placeholder="0.0" />
              <Field label="Alto (cm)" value={form.alto_cm} onChange={set("alto_cm")} disabled={mode === "view"} inputMode="decimal" placeholder="0.0" />
              <Field label="Ancho (cm)" value={form.ancho_cm} onChange={set("ancho_cm")} disabled={mode === "view"} inputMode="decimal" placeholder="0.0" />
              <Field label="Largo (cm)" value={form.largo_cm} onChange={set("largo_cm")} disabled={mode === "view"} inputMode="decimal" placeholder="0.0" />
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stroke px-5 py-3 font-medium text-dark dark:border-dark-3 dark:text-white"
            >
              Cerrar
            </button>
            {mode !== "view" && (
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary px-5 py-3 font-medium text-white hover:bg-opacity-90 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}