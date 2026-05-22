"use client";

import { useState, useEffect, useRef } from "react";
import { Save, ChevronDown, ChevronUp, Type, Upload, Image as ImageIcon } from "lucide-react";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const LANDING_DEFAULTS = {
  // Hero
  landing_hero_titulo_1:   "Oaxaca auténtico,",
  landing_hero_titulo_2:   "trazable y justo",
  landing_hero_subtitulo:  "Conectamos el origen, la tradición y el talento de nuestras comunidades con el mundo.",
  landing_hero_boton:      "Explorar productos",
  landing_hero_badge_1:    "Trazabilidad completa",
  landing_hero_badge_2:    "Comercio justo",
  landing_hero_badge_3:    "Protección cultural",
  // Sobre el mezcal
  landing_sobre_texto_1:   "Descubre el auténtico sabor del mezcal, un destilado artesanal nacido del corazón del agave.",
  landing_sobre_texto_2:   "Elaborado con procesos tradicionales que respetan la tierra y el tiempo, cada botella guarda carácter y tradición. Sus notas ahumadas y matices únicos lo convierten en una experiencia inigualable.",
  landing_sobre_cita:      "El alma de Oaxaca en cada gota",
  // Stats
  landing_stats_titulo:    "Impacto que construimos juntos",
  landing_stats_subtitulo: "Cada compra transforma vidas y preserva nuestra herencia cultural.",
  // Imágenes grid "Sobre el mezcal"
  landing_sobre_img_1:     "/fotos/16.jpg",
  landing_sobre_img_2:     "/fotos/24.jpeg",
  landing_sobre_img_3:     "/fotos/5.jpg",
  landing_sobre_img_4:     "/fotos/22.jpeg",
  landing_sobre_img_5:     "/fotos/20.jpeg",
  // Imágenes botellas fallback
  landing_botella_1_img:   "/fotos/28.1.png",
  landing_botella_2_img:   "/fotos/29.1.png",
  landing_botella_3_img:   "/fotos/30.1.png",
  landing_botella_4_img:   "/fotos/31.1.png",
};

type LandingConfig = typeof LANDING_DEFAULTS;
type LandingKey = keyof LandingConfig;

const IMAGE_KEYS: LandingKey[] = [
  "landing_sobre_img_1","landing_sobre_img_2","landing_sobre_img_3",
  "landing_sobre_img_4","landing_sobre_img_5",
  "landing_botella_1_img","landing_botella_2_img","landing_botella_3_img","landing_botella_4_img",
];

// ─── Sección colapsable ───────────────────────────────────────────────────────
function Seccion({ titulo, children, defaultOpen = true }: { titulo: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
      >
        <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{titulo}</span>
        {open ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>
      {open && <div className="p-5 space-y-4 bg-white dark:bg-gray-900">{children}</div>}
    </div>
  );
}

// ─── Campo de texto ───────────────────────────────────────────────────────────
function Campo({ label, name, value, onChange, multiline = false, hint }: {
  label: string; name: string; value: string;
  onChange: (name: string, value: string) => void;
  multiline?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      )}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ─── Componente de upload de imagen ──────────────────────────────────────────
function ImageUpload({ label, name, value, onUploaded }: {
  label: string; name: string; value: string;
  onUploaded: (name: string, url: string) => void;
}) {
  const token = getCookie("token");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!token) { setError("No autenticado"); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Máximo 2 MB"); return; }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      fd.append("entidad_tipo", "landing");
      fd.append("entidad_id", "0");
      const res = await api.archivos.upload(token, fd);
      const url: string = (res?.url || res?.ruta || res?.path || "") as string;
      if (!url) throw new Error("No se recibió URL de la imagen");
      onUploaded(name, url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{label}</label>
      <div className="flex gap-3 items-start">
        {/* Preview */}
        <div className="relative w-24 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex-shrink-0">
          {value ? (
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = "/fotos/16.jpg"; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon size={24} className="text-gray-400" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
          >
            <Upload size={13} />
            {uploading ? "Subiendo..." : "Subir imagen"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
          <p className="text-xs text-gray-400 truncate max-w-[200px]" title={value}>{value || "Sin imagen"}</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function LandingConfigSection() {
  const token = getCookie("token");
  const [formData, setFormData] = useState<LandingConfig>(LANDING_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch(`${API_URL}/configuracion/sistema/mapa`);
        if (!res.ok) throw new Error("Error al cargar config");
        const data: Record<string, string> = await res.json();
        setFormData((prev) => {
          const updated = { ...prev };
          for (const key of Object.keys(LANDING_DEFAULTS) as LandingKey[]) {
            if (data[key]) updated[key] = data[key];
          }
          return updated;
        });
      } catch (err) {
        console.error("Error al cargar config landing:", err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!token) { setMessage({ type: "error", text: "No autenticado" }); return; }
    setSaving(true);
    setMessage(null);
    try {
      const items = Object.entries(formData).map(([clave, valor]) => ({
        clave,
        valor,
        tipo: IMAGE_KEYS.includes(clave as LandingKey) ? "texto" : "texto",
      }));
      await api.configuracion.bulkUpsert(token, items);
      setMessage({ type: "success", text: "¡Página de inicio actualizada! Los cambios se verán en la landing." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error al guardar" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <span className="ml-3 text-sm text-gray-500">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <Type size={20} className="text-amber-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Página de Inicio</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Edita los textos e imágenes que aparecen en la página principal
          </p>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg p-4 text-sm ${message.type === "success" ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300" : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">

        {/* ── Hero ── */}
        <Seccion titulo="🎬 Banner principal (Hero)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Título línea 1" name="landing_hero_titulo_1" value={formData.landing_hero_titulo_1} onChange={handleChange} hint='Ej: "Oaxaca auténtico,"' />
            <Campo label="Título línea 2 (verde)" name="landing_hero_titulo_2" value={formData.landing_hero_titulo_2} onChange={handleChange} hint='Ej: "trazable y justo"' />
          </div>
          <Campo label="Subtítulo" name="landing_hero_subtitulo" value={formData.landing_hero_subtitulo} onChange={handleChange} multiline />
          <Campo label="Texto del botón principal" name="landing_hero_boton" value={formData.landing_hero_boton} onChange={handleChange} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Campo label="Badge 1" name="landing_hero_badge_1" value={formData.landing_hero_badge_1} onChange={handleChange} />
            <Campo label="Badge 2" name="landing_hero_badge_2" value={formData.landing_hero_badge_2} onChange={handleChange} />
            <Campo label="Badge 3" name="landing_hero_badge_3" value={formData.landing_hero_badge_3} onChange={handleChange} />
          </div>
        </Seccion>

        {/* ── Sobre el Mezcal – Textos ── */}
        <Seccion titulo="🌿 Sección «Sobre el Mezcal» — Textos" defaultOpen={false}>
          <Campo label="Párrafo destacado (aparece en itálica con borde naranja)" name="landing_sobre_texto_1" value={formData.landing_sobre_texto_1} onChange={handleChange} multiline />
          <Campo label="Párrafo principal" name="landing_sobre_texto_2" value={formData.landing_sobre_texto_2} onChange={handleChange} multiline />
          <Campo label="Cita destacada (dorada, al pie de la sección)" name="landing_sobre_cita" value={formData.landing_sobre_cita} onChange={handleChange} hint="Sin comillas — se agregan automáticamente" />
        </Seccion>

        {/* ── Sobre el Mezcal – Imágenes ── */}
        <Seccion titulo="🖼️ Sección «Sobre el Mezcal» — Imágenes (grid de 5 fotos)" defaultOpen={false}>
          <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-100 dark:border-amber-800">
            💡 Estas 5 imágenes forman el mosaico fotográfico junto al texto. Tamaño máximo 2 MB por imagen.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ImageUpload label="Imagen 1 — fila superior (ancha)" name="landing_sobre_img_1" value={formData.landing_sobre_img_1} onUploaded={handleChange} />
            <ImageUpload label="Imagen 2 — fila superior (estrecha)" name="landing_sobre_img_2" value={formData.landing_sobre_img_2} onUploaded={handleChange} />
            <ImageUpload label="Imagen 3 — centro (grande)" name="landing_sobre_img_3" value={formData.landing_sobre_img_3} onUploaded={handleChange} />
            <ImageUpload label="Imagen 4 — derecha arriba (con texto «Proceso artesanal»)" name="landing_sobre_img_4" value={formData.landing_sobre_img_4} onUploaded={handleChange} />
            <ImageUpload label="Imagen 5 — derecha abajo (con línea naranja)" name="landing_sobre_img_5" value={formData.landing_sobre_img_5} onUploaded={handleChange} />
          </div>
        </Seccion>

        {/* ── Stats ── */}
        <Seccion titulo="📊 Sección de Estadísticas" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Título de la sección" name="landing_stats_titulo" value={formData.landing_stats_titulo} onChange={handleChange} />
            <Campo label="Subtítulo" name="landing_stats_subtitulo" value={formData.landing_stats_subtitulo} onChange={handleChange} />
          </div>
          <p className="text-xs text-gray-400 bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
            ℹ️ Los números (productores, productos, ingresos) se calculan automáticamente desde la base de datos.
          </p>
        </Seccion>

        {/* ── Productos destacados – Imágenes fallback ── */}
        <Seccion titulo="🍶 Productos Destacados — Imágenes de fallback" defaultOpen={false}>
          <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-100 dark:border-amber-800">
            💡 Estas imágenes se muestran cuando un producto no tiene foto propia. Normalmente se usan las imágenes de los productos más vendidos cargadas desde la tienda.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ImageUpload label="Botella 1 — Tobalá (fallback)" name="landing_botella_1_img" value={formData.landing_botella_1_img} onUploaded={handleChange} />
            <ImageUpload label="Botella 2 — Espadín (fallback)" name="landing_botella_2_img" value={formData.landing_botella_2_img} onUploaded={handleChange} />
            <ImageUpload label="Botella 3 — Madrecuixe (fallback)" name="landing_botella_3_img" value={formData.landing_botella_3_img} onUploaded={handleChange} />
            <ImageUpload label="Botella 4 — Tepeztate (fallback)" name="landing_botella_4_img" value={formData.landing_botella_4_img} onUploaded={handleChange} />
          </div>
        </Seccion>

      </div>

      {/* Botón guardar */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <Save size={16} />
          {saving ? "Guardando..." : "Guardar página de inicio"}
        </button>
      </div>
    </section>
  );
}
