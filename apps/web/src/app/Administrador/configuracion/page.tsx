"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";
import { useConfig } from "@/context/ConfigContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import React, { useState, useEffect } from "react";
import { Save, RotateCcw, Palette, Home } from "lucide-react";
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
  // Landing page colors
  land_color_bg: "#F4F0E3",
  land_color_bg_accent: "#2E4A33",
  land_color_heading: "#1F3A2E",
  land_color_body: "rgba(31,58,46,0.8)",
  land_color_accent: "#C97A3E",
  land_color_sage: "#A8C26B",
  land_color_cta: "#1F3A2E",
  // Tienda header colors
  tienda_header_bg: "#FFFFFF",
  tienda_header_border: "#E6EBF1",
  // System fonts
  font_family_ui: "Satoshi, system-ui, -apple-system, sans-serif",
  font_family_store: "'Playfair Display', Georgia, serif",
};

type Tab = "colores" | "landing";

export default function ConfiguracionPage() {
  const { isAuthenticated } = useAuth();
  const { config, refreshAndUpdate } = useConfig();
  const token = getCookie("token");
  const [activeTab, setActiveTab] = useState<Tab>("colores");
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
      land_color_bg: config.land_color_bg || DEFAULT_CONFIG.land_color_bg,
      land_color_bg_accent: config.land_color_bg_accent || DEFAULT_CONFIG.land_color_bg_accent,
      land_color_heading: config.land_color_heading || DEFAULT_CONFIG.land_color_heading,
      land_color_body: config.land_color_body || DEFAULT_CONFIG.land_color_body,
      land_color_accent: config.land_color_accent || DEFAULT_CONFIG.land_color_accent,
      land_color_sage: config.land_color_sage || DEFAULT_CONFIG.land_color_sage,
      land_color_cta: config.land_color_cta || DEFAULT_CONFIG.land_color_cta,
      tienda_header_bg: config.tienda_header_bg || DEFAULT_CONFIG.tienda_header_bg,
      tienda_header_border: config.tienda_header_border || DEFAULT_CONFIG.tienda_header_border,
      font_family_ui: config.font_family_ui || DEFAULT_CONFIG.font_family_ui,
      font_family_store: config.font_family_store || DEFAULT_CONFIG.font_family_store,
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
      const colorFields = [
        "color_primario", "color_secundario", "color_acento",
        "bio_color_fondo", "bio_color_tarjeta", "bio_color_titulo", "bio_color_precio", "bio_color_boton", "bio_color_boton2",
        "land_color_bg", "land_color_bg_accent", "land_color_heading", "land_color_body", "land_color_accent", "land_color_sage", "land_color_cta",
        "tienda_header_bg", "tienda_header_border",
      ];
      const fontFields = ["font_family_ui", "font_family_store"];

      const items = Object.entries(formData).map(([clave, valor]) => ({
        clave,
        valor: String(valor),
        tipo: colorFields.includes(clave) ? "color" : fontFields.includes(clave) ? "texto" : "texto",
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

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "colores", label: "Colores y Diseño", icon: <Palette size={16} /> },
    { id: "landing", label: "Página de Inicio", icon: <Home size={16} /> },
  ];

  return (
    <>
      <Breadcrumb pageName="Configuración" />
      <div className="rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)] p-7 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif] mb-2">
            Configuración del Sistema
          </h2>
          <p className="text-sm text-[#3D6B3F]/70">
            Personaliza la identidad visual y la configuración de tu tienda
          </p>
        </div>

        {/* TABS */}
        <div className="border-b border-[#C5CFB0]">
          <nav className="flex gap-1" aria-label="Tabs de configuración">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-[#3D6B3F] text-[#3D6B3F] bg-[#3D6B3F]/5"
                    : "border-transparent text-[#3D6B3F]/60 hover:text-[#3D6B3F] hover:border-[#C5CFB0]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* TAB: Colores y Diseño */}
        {activeTab === "colores" && (
          <>
            {message && (
              <div className={`rounded-xl border p-4 ${message.type === "success" ? "border-[#A8C26B]/40 bg-[#A8C26B]/10 text-[#3D6B3F]" : "border-red-200 bg-red-50 text-red-700"}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
              {/* SECCIÓN: Identidad de la tienda */}
              <section>
                <h3 className="text-lg font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif] mb-4 pb-2 border-b border-[#C5CFB0]">
                  Identidad de la Tienda
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1F3A2E] mb-2">
                      Nombre de la Aplicación
                    </label>
                    <input
                      type="text"
                      name="nombre_app"
                      value={formData.nombre_app}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#C5CFB0] bg-white px-4 py-2 text-[#1F3A2E] focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1F3A2E] mb-2">
                      Idioma por Defecto
                    </label>
                    <select
                      name="idioma_default"
                      value={formData.idioma_default}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#C5CFB0] bg-white px-4 py-2 text-[#1F3A2E] focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* SECCIÓN: Colores generales */}
              <section>
                <h3 className="text-lg font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif] mb-4 pb-2 border-b border-[#C5CFB0]">
                  Paleta de Colores (Sistema)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { key: "color_primario", label: "Color Primario" },
                    { key: "color_secundario", label: "Color Secundario" },
                    { key: "color_acento", label: "Color de Acento" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-[#1F3A2E] mb-2">
                        {label}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          name={key}
                          value={formData[key as keyof typeof formData]}
                          onChange={handleChange}
                          className="h-10 w-20 rounded-lg border border-[#C5CFB0] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData[key as keyof typeof formData]}
                          onChange={handleChange}
                          name={key}
                          className="flex-1 rounded-xl border border-[#C5CFB0] bg-white px-4 py-2 text-sm text-[#1F3A2E] focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* SECCIÓN: Diseño Biocultural */}
              <section>
                <h3 className="text-lg font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif] mb-4 pb-2 border-b border-[#C5CFB0]">
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
                      <label className="block text-sm font-medium text-[#1F3A2E] mb-2">
                        {label}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          name={key}
                          value={formData[key as keyof typeof formData]}
                          onChange={handleChange}
                          className="h-10 w-20 rounded-lg border border-[#C5CFB0] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData[key as keyof typeof formData]}
                          onChange={handleChange}
                          name={key}
                          className="flex-1 rounded-xl border border-[#C5CFB0] bg-white px-4 py-2 text-sm text-[#1F3A2E] focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1F3A2E] mb-2">
                    Fuente de Títulos
                  </label>
                  <select
                    name="bio_fuente_titulo"
                    value={formData.bio_fuente_titulo}
                    onChange={handleChange}
                    className="w-full md:w-1/3 rounded-xl border border-[#C5CFB0] bg-white px-4 py-2 text-[#1F3A2E] focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20"
                  >
                    {FONT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              {/* SECCIÓN: Página de Inicio (Landing) */}
              <section>
                <h3 className="text-lg font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif] mb-4 pb-2 border-b border-[#C5CFB0]">
                  Colores de la Página de Inicio (Cliente)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { key: "land_color_bg", label: "Fondo Principal" },
                    { key: "land_color_bg_accent", label: "Fondo Acento (Stats)" },
                    { key: "land_color_heading", label: "Color Títulos" },
                    { key: "land_color_body", label: "Color Texto" },
                    { key: "land_color_accent", label: "Color Acento (Dorado)" },
                    { key: "land_color_sage", label: "Verde Salvia" },
                    { key: "land_color_cta", label: "Botón CTA" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-[#1F3A2E] mb-2">
                        {label}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          name={key}
                          value={formData[key as keyof typeof formData]}
                          onChange={handleChange}
                          className="h-10 w-20 rounded-lg border border-[#C5CFB0] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData[key as keyof typeof formData]}
                          onChange={handleChange}
                          name={key}
                          className="flex-1 rounded-xl border border-[#C5CFB0] bg-white px-4 py-2 text-sm text-[#1F3A2E] focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* SECCIÓN: Cabecera de Tienda */}
              <section>
                <h3 className="text-lg font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif] mb-4 pb-2 border-b border-[#C5CFB0]">
                  Colores de la Cabecera de Tienda
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "tienda_header_bg", label: "Color Fondo Header" },
                    { key: "tienda_header_border", label: "Color Borde" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-[#1F3A2E] mb-2">
                        {label}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          name={key}
                          value={formData[key as keyof typeof formData]}
                          onChange={handleChange}
                          className="h-10 w-20 rounded-lg border border-[#C5CFB0] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData[key as keyof typeof formData]}
                          onChange={handleChange}
                          name={key}
                          className="flex-1 rounded-xl border border-[#C5CFB0] bg-white px-4 py-2 text-sm text-[#1F3A2E] focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* SECCIÓN: Tipografía del Sistema */}
              <section>
                <h3 className="text-lg font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif] mb-4 pb-2 border-b border-[#C5CFB0]">
                  Tipografía del Sistema
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1F3A2E] mb-2">
                      Fuente Panel Admin/Productor
                    </label>
                    <select
                      name="font_family_ui"
                      value={formData.font_family_ui}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#C5CFB0] bg-white px-4 py-2 text-[#1F3A2E] focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20"
                    >
                      <option value="Satoshi, system-ui, -apple-system, sans-serif">Satoshi (Default)</option>
                      <option value="'Playfair Display', Georgia, serif">Playfair Display (Elegante)</option>
                      <option value="'DM Sans', system-ui, sans-serif">DM Sans (Moderno)</option>
                      <option value="Georgia, serif">Georgia (Clásico)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1F3A2E] mb-2">
                      Fuente Tienda Cliente
                    </label>
                    <select
                      name="font_family_store"
                      value={formData.font_family_store}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#C5CFB0] bg-white px-4 py-2 text-[#1F3A2E] focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20"
                    >
                      <option value="'Playfair Display', Georgia, serif">Playfair Display (Default)</option>
                      <option value="Satoshi, system-ui, -apple-system, sans-serif">Satoshi (Moderno)</option>
                      <option value="'DM Sans', system-ui, sans-serif">DM Sans (Contemporáneo)</option>
                      <option value="Georgia, serif">Georgia (Clásico)</option>
                    </select>
                  </div>
                </div>
                {/* Font preview */}
                <div className="mt-4 p-4 rounded-xl bg-white border border-[#C5CFB0]">
                  <p className="text-sm text-[#3D6B3F]/70 mb-2">Vista previa panel admin:</p>
                  <p style={{ fontFamily: formData.font_family_ui }} className="text-base">
                    Esto es una vista previa de la tipografía del panel admin
                  </p>
                  <p className="text-sm text-[#3D6B3F]/70 mt-3 mb-2">Vista previa tienda cliente:</p>
                  <p style={{ fontFamily: formData.font_family_store }} className="text-base">
                    Esto es una vista previa de la tipografía de la tienda
                  </p>
                </div>
              </section>

              {/* VISTA PREVIA */}
              <section>
                <h3 className="text-lg font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif] mb-4 pb-2 border-b border-[#C5CFB0]">
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

              {/* BOTONES DE ACCIÓN */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 border border-[#C5CFB0] rounded-xl text-[#1F3A2E] hover:bg-[#C5CFB0]/30 transition-all duration-200"
                >
                  <RotateCcw size={18} />
                  Restaurar Defaults
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-[#3D6B3F] text-white rounded-xl hover:bg-[#1F3A2E] disabled:opacity-60 transition-all duration-200"
                >
                  <Save size={18} />
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </>
        )}

        {/* TAB: Página de Inicio */}
        {activeTab === "landing" && <LandingConfigSection />}
      </div>
    </>
  );
}