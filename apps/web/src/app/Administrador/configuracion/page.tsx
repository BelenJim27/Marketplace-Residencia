"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";
import { useConfig } from "@/context/ConfigContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { useState, useEffect } from "react";
import { Save, RotateCcw } from "lucide-react";
import LandingConfigSection from "@/components/Administrator/Configuration/Landingconfigsection";

const FONT_OPTIONS = [
  { value: "Georgia, serif", label: "Georgia Serif" },
  { value: "Playfair Display, serif", label: "Playfair Display" },
  { value: "system-ui, -apple-system, sans-serif", label: "System UI" },
  { value: "Trebuchet MS, sans-serif", label: "Trebuchet MS" },
];

const DEFAULT_CONFIG = {
  nombre_app: "Marketplace Residencia",
  idioma_default: "es",
  color_primario: "#3b82f6",
  color_secundario: "#8b5cf6",
  color_acento: "#10b981",
  bio_color_fondo: "#faf8f4",
  bio_color_tarjeta: "#f0ebe0",
  bio_color_titulo: "#5c3d1e",
  bio_color_precio: "#8b6914",
  bio_color_boton: "#5c3d1e",
  bio_color_boton2: "#8b6914",
  bio_fuente_titulo: "Georgia, serif",
};

export default function ConfiguracionPage() {
  const { isAuthenticated } = useAuth();
  const { config, refreshAndUpdate } = useConfig();
  const token = getCookie("token");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formData, setFormData] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      nombre_app: config.nombre_app || DEFAULT_CONFIG.nombre_app,
      idioma_default: config.idioma_default || DEFAULT_CONFIG.idioma_default,
      color_primario: config.color_primario || DEFAULT_CONFIG.color_primario,
      color_secundario: config.color_secundario || DEFAULT_CONFIG.color_secundario,
      color_acento: config.color_acento || DEFAULT_CONFIG.color_acento,
      bio_color_fondo: config.bio_color_fondo || DEFAULT_CONFIG.bio_color_fondo,
      bio_color_tarjeta: config.bio_color_tarjeta || DEFAULT_CONFIG.bio_color_tarjeta,
      bio_color_titulo: config.bio_color_titulo || DEFAULT_CONFIG.bio_color_titulo,
      bio_color_precio: config.bio_color_precio || DEFAULT_CONFIG.bio_color_precio,
      bio_color_boton: config.bio_color_boton || DEFAULT_CONFIG.bio_color_boton,
      bio_color_boton2: config.bio_color_boton2 || DEFAULT_CONFIG.bio_color_boton2,
      bio_fuente_titulo: config.bio_fuente_titulo || DEFAULT_CONFIG.bio_fuente_titulo,
    }));
  }, [config]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRestore = () => {
    setFormData(DEFAULT_CONFIG);
    setMessage({ type: "success", text: "Valores restaurados a defaults" });
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
        valor: String(valor),
        tipo: ["color_primario", "color_secundario", "color_acento", "bio_color_fondo", "bio_color_tarjeta", "bio_color_titulo", "bio_color_precio", "bio_color_boton", "bio_color_boton2"].includes(clave) ? "color" : "texto",
      }));

      await api.configuracion.bulkUpsert(token, items);
      await refreshAndUpdate();
      setMessage({ type: "success", text: "Configuración guardada exitosamente" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Error al guardar configuración",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Configuración" />
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-7.5 space-y-8">
        <div>
          <h2 className="text-title-md2 font-bold text-black dark:text-white mb-2">
            Configuración del Sistema
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Personaliza la identidad visual y la configuración de tu tienda
          </p>
        </div>

        {message && (
          <div className={`rounded-lg p-4 ${message.type === "success" ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300" : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
          {/* SECCIÓN: Identidad de la tienda */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Identidad de la Tienda
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre de la Aplicación
                </label>
                <input
                  type="text"
                  name="nombre_app"
                  value={formData.nombre_app}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Idioma por Defecto
                </label>
                <select
                  name="idioma_default"
                  value={formData.idioma_default}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </section>

          {/* SECCIÓN: Colores generales */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Paleta de Colores (Sistema)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: "color_primario", label: "Color Primario" },
                { key: "color_secundario", label: "Color Secundario" },
                { key: "color_acento", label: "Color de Acento" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {label}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      name={key}
                      value={formData[key as keyof typeof formData]}
                      onChange={handleChange}
                      className="h-10 w-20 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData[key as keyof typeof formData]}
                      onChange={handleChange}
                      name={key}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECCIÓN: Diseño Biocultural */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Diseño Biocultural (Oaxaca)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { key: "bio_color_fondo", label: "Color Fondo Principal" },
                { key: "bio_color_tarjeta", label: "Color Tarjeta" },
                { key: "bio_color_titulo", label: "Color Títulos" },
                { key: "bio_color_precio", label: "Color Precio/Acento" },
                { key: "bio_color_boton", label: "Color Botón Primario" },
                { key: "bio_color_boton2", label: "Color Botón Secundario" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {label}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      name={key}
                      value={formData[key as keyof typeof formData]}
                      onChange={handleChange}
                      className="h-10 w-20 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData[key as keyof typeof formData]}
                      onChange={handleChange}
                      name={key}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fuente de Títulos
              </label>
              <select
                name="bio_fuente_titulo"
                value={formData.bio_fuente_titulo}
                onChange={handleChange}
                className="w-full md:w-1/3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {FONT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* VISTA PREVIA */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Vista Previa
            </h3>
            <div
              style={{
                backgroundColor: formData.bio_color_fondo,
                padding: "2rem",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  backgroundColor: formData.bio_color_tarjeta,
                  border: `2px solid ${formData.bio_color_precio}`,
                  padding: "1.5rem",
                  borderRadius: "12px",
                  maxWidth: "300px",
                }}
              >
                <h4
                  style={{
                    fontFamily: formData.bio_fuente_titulo,
                    color: formData.bio_color_titulo,
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    marginBottom: "0.5rem",
                  }}
                >
                  Mezcal Premium
                </h4>
                <p
                  style={{
                    color: formData.bio_color_titulo,
                    fontSize: "0.875rem",
                    marginBottom: "1rem",
                  }}
                >
                  Destilado artesanal de Oaxaca
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: formData.bio_fuente_titulo,
                      color: formData.bio_color_precio,
                      fontSize: "1.25rem",
                      fontWeight: "bold",
                    }}
                  >
                    $450.00
                  </span>
                  <button
                    style={{
                      backgroundColor: formData.bio_color_boton,
                      color: "white",
                      padding: "0.5rem 1rem",
                      borderRadius: "8px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN: Página de Inicio ← NUEVA SECCIÓN AGREGADA */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Página de Inicio
            </h3>
            <LandingConfigSection />
          </section>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleRestore}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RotateCcw size={18} />
              Restaurar Defaults
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              <Save size={18} />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}