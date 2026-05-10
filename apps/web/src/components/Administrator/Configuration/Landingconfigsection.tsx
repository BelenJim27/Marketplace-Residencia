"use client";

import { useState, useEffect } from "react";
import { Save, ChevronDown, ChevronUp, Type } from "lucide-react";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

// ─── Claves que se guardan en configuracion_sistema ───────────────────────────
const LANDING_DEFAULTS = {
  // Hero
  landing_hero_titulo_1: "Oaxaca auténtico,",
  landing_hero_titulo_2: "trazable y justo",
  landing_hero_subtitulo: "Conectamos el origen, la tradición y el talento de nuestras comunidades con el mundo.",
  landing_hero_boton: "Explorar productos",
  landing_hero_badge_1: "Trazabilidad completa",
  landing_hero_badge_2: "Comercio justo",
  landing_hero_badge_3: "Protección cultural",
  // Sobre el mezcal
  landing_sobre_texto_1: "Descubre el auténtico sabor del mezcal, un destilado artesanal nacido del corazón del agave.",
  landing_sobre_texto_2: "Elaborado con procesos tradicionales que respetan la tierra y el tiempo, cada botella guarda carácter y tradición.",
  landing_sobre_texto_3: "Sus notas ahumadas y matices únicos lo convierten en una experiencia inigualable.",
  landing_sobre_texto_4: "Perfecto para celebrar, compartir y disfrutar momentos especiales.",
  landing_sobre_cita: "El alma de Oaxaca en cada gota",
  // Productos del carrusel
  landing_prod_1_nombre: "Tobalá",
  landing_prod_1_subtitulo: "La expresión más pura de la naturaleza, custodiada por manos expertas que entienden el tiempo del agave.",
  landing_prod_2_nombre: "Espadín",
  landing_prod_2_subtitulo: "El alma del mezcal oaxaqueño, destilado con dedicación generación tras generación.",
  landing_prod_3_nombre: "Madrecuixe",
  landing_prod_3_subtitulo: "Un mezcal silvestre de carácter indomable, con la fiereza del agave en su estado más puro.",
  // Stats section
  landing_stats_titulo: "Impacto que construimos juntos",
  landing_stats_subtitulo: "Cada compra transforma vidas y preserva nuestra herencia cultural.",
};

type LandingConfig = typeof LANDING_DEFAULTS;
type LandingKey = keyof LandingConfig;

// ─── Sub-sección colapsable ───────────────────────────────────────────────────
function Seccion({
  titulo,
  children,
  defaultOpen = true,
}: {
  titulo: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
      >
        <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{titulo}</span>
        {open ? (
          <ChevronUp size={16} className="text-gray-500" />
        ) : (
          <ChevronDown size={16} className="text-gray-500" />
        )}
      </button>
      {open && <div className="p-5 space-y-4 bg-white dark:bg-gray-900">{children}</div>}
    </div>
  );
}

// ─── Campo de texto individual ────────────────────────────────────────────────
function Campo({
  label,
  name,
  value,
  onChange,
  multiline = false,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        {label}
      </label>
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

// ─── Componente principal ─────────────────────────────────────────────────────
export default function LandingConfigSection() {
  const token = getCookie("token");
  const [formData, setFormData] = useState<LandingConfig>(LANDING_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Cargar configuración existente
  useEffect(() => {
    const cargar = async () => {
      try {
        // FIX: eliminada la variable `mapa` sin usar que causaba error
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/configuracion/sistema/mapa`
        );
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
    if (!token) {
      setMessage({ type: "error", text: "No autenticado" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const items = Object.entries(formData).map(([clave, valor]) => ({
        clave,
        valor,
        tipo: "texto",
      }));
      await api.configuracion.bulkUpsert(token, items);
      setMessage({ type: "success", text: "¡Página de inicio actualizada! Los cambios se verán en la landing." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al guardar",
      });
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Página de Inicio
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Edita los textos que aparecen en la página principal de la tienda
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg p-4 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {/* ── Hero ── */}
        <Seccion titulo="🎬 Sección Hero (Banner principal)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo
              label="Título línea 1"
              name="landing_hero_titulo_1"
              value={formData.landing_hero_titulo_1}
              onChange={handleChange}
              hint='Ej: "Oaxaca auténtico,"'
            />
            <Campo
              label="Título línea 2"
              name="landing_hero_titulo_2"
              value={formData.landing_hero_titulo_2}
              onChange={handleChange}
              hint='Ej: "trazable y justo"'
            />
          </div>
          <Campo
            label="Subtítulo"
            name="landing_hero_subtitulo"
            value={formData.landing_hero_subtitulo}
            onChange={handleChange}
            multiline
          />
          <Campo
            label="Texto del botón principal"
            name="landing_hero_boton"
            value={formData.landing_hero_boton}
            onChange={handleChange}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Campo
              label="Badge 1"
              name="landing_hero_badge_1"
              value={formData.landing_hero_badge_1}
              onChange={handleChange}
            />
            <Campo
              label="Badge 2"
              name="landing_hero_badge_2"
              value={formData.landing_hero_badge_2}
              onChange={handleChange}
            />
            <Campo
              label="Badge 3"
              name="landing_hero_badge_3"
              value={formData.landing_hero_badge_3}
              onChange={handleChange}
            />
          </div>
        </Seccion>

        {/* ── Sobre el Mezcal ── */}
        <Seccion titulo="🌿 Sección Sobre el Mezcal" defaultOpen={false}>
          <Campo
            label="Párrafo 1 (itálica destacada)"
            name="landing_sobre_texto_1"
            value={formData.landing_sobre_texto_1}
            onChange={handleChange}
            multiline
          />
          <Campo
            label="Párrafo 2"
            name="landing_sobre_texto_2"
            value={formData.landing_sobre_texto_2}
            onChange={handleChange}
            multiline
          />
          <Campo
            label="Párrafo 3"
            name="landing_sobre_texto_3"
            value={formData.landing_sobre_texto_3}
            onChange={handleChange}
            multiline
          />
          <Campo
            label="Párrafo 4"
            name="landing_sobre_texto_4"
            value={formData.landing_sobre_texto_4}
            onChange={handleChange}
            multiline
          />
          <Campo
            label="Cita destacada (aparece en itálica dorada)"
            name="landing_sobre_cita"
            value={formData.landing_sobre_cita}
            onChange={handleChange}
            hint="Sin comillas — se agregan automáticamente"
          />
        </Seccion>

        {/* ── Carrusel Productos ── */}
        <Seccion titulo="🍶 Carrusel de Productos Destacados" defaultOpen={false}>
          <p className="text-xs text-gray-400 bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-100 dark:border-amber-800">
            💡 Estos son los textos del carrusel animado con las 3 variedades de mezcal. Las imágenes se
            configuran en el servidor (carpeta <code>/fotos/</code>).
          </p>
          {[1, 2, 3].map((n) => (
            <div key={n} className="border border-gray-100 dark:border-gray-800 rounded-lg p-4 space-y-3">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Producto {n}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Campo
                  label="Nombre"
                  name={`landing_prod_${n}_nombre`}
                  value={formData[`landing_prod_${n}_nombre` as LandingKey]}
                  onChange={handleChange}
                />
                <Campo
                  label="Subtítulo / descripción corta"
                  name={`landing_prod_${n}_subtitulo`}
                  value={formData[`landing_prod_${n}_subtitulo` as LandingKey]}
                  onChange={handleChange}
                  multiline
                />
              </div>
            </div>
          ))}
        </Seccion>

        {/* ── Stats ── */}
        <Seccion titulo="📊 Sección de Estadísticas" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo
              label="Título de la sección"
              name="landing_stats_titulo"
              value={formData.landing_stats_titulo}
              onChange={handleChange}
            />
            <Campo
              label="Subtítulo"
              name="landing_stats_subtitulo"
              value={formData.landing_stats_subtitulo}
              onChange={handleChange}
            />
          </div>
          <p className="text-xs text-gray-400 bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
            ℹ️ Los números de las estadísticas (productores, productos, ingresos) se calculan
            automáticamente desde la base de datos.
          </p>
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