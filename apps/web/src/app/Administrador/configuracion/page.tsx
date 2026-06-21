"use client";

import { useAuth } from "@/context/AuthContext";
import { useConfig } from "@/context/ConfigContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import React, { useState, useEffect } from "react";
import { Save, RotateCcw, Palette, Home } from "lucide-react";
import LandingConfigSection from "@/components/Administrator/Configuration/Landingconfigsection";

function ColorField({ name, label, hint, value, onChange }: {
  name: string; label: string; hint?: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#1F3A2E] dark:text-[#A8C26B]/80">{label}</label>
      {hint && <p className="text-[11px] text-[#3D6B3F]/50 dark:text-[#A8C26B]/40">{hint}</p>}
      <div className="flex items-center gap-2">
        <input type="color" name={name} value={value} onChange={onChange}
          className="h-9 w-14 rounded-lg border border-[#C5CFB0] dark:border-[#3D6B3F]/40 cursor-pointer p-0.5 bg-white dark:bg-[#0f1a10]" />
        <input type="text" name={name} value={value} onChange={onChange}
          className="flex-1 rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#0f1a10] px-3 py-1.5 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] font-mono focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20" />
        <div className="h-9 w-9 rounded-lg border border-[#C5CFB0] dark:border-[#3D6B3F]/40 shrink-0" style={{ backgroundColor: value }} />
      </div>
    </div>
  );
}

const DEFAULT_CONFIG = {
  // Catálogo
  catalog_accent:           "#C97A3E",
  catalog_bg:               "#F4F0E3",
  catalog_card_bg:          "#FFFFFF",
  catalog_card_featured_bg: "#C97A3E",
  catalog_text_primary:     "#1F3A2E",
  catalog_text_secondary:   "#3D6B3F",
  catalog_price:            "#C97A3E",
  catalog_hero_from:        "#3D6B3F",
  catalog_hero_to:          "#1F3A2E",
  // Sistema (necesarios para otros módulos)
  nombre_app: "Marketplace Residencia",
  idioma_default: "es",
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
      catalog_accent:           config.catalog_accent           || DEFAULT_CONFIG.catalog_accent,
      catalog_bg:               config.catalog_bg               || DEFAULT_CONFIG.catalog_bg,
      catalog_card_bg:          config.catalog_card_bg          || DEFAULT_CONFIG.catalog_card_bg,
      catalog_card_featured_bg: config.catalog_card_featured_bg || DEFAULT_CONFIG.catalog_card_featured_bg,
      catalog_text_primary:     config.catalog_text_primary     || DEFAULT_CONFIG.catalog_text_primary,
      catalog_text_secondary:   config.catalog_text_secondary   || DEFAULT_CONFIG.catalog_text_secondary,
      catalog_price:            config.catalog_price            || DEFAULT_CONFIG.catalog_price,
      catalog_hero_from:        config.catalog_hero_from        || DEFAULT_CONFIG.catalog_hero_from,
      catalog_hero_to:          config.catalog_hero_to          || DEFAULT_CONFIG.catalog_hero_to,
      nombre_app:               config.nombre_app               || DEFAULT_CONFIG.nombre_app,
      idioma_default:           config.idioma_default           || DEFAULT_CONFIG.idioma_default,
      font_family_store:        config.font_family_store        || DEFAULT_CONFIG.font_family_store,
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
    setSaving(true);
    setMessage(null);

    try {
      const colorFields = [
        "catalog_accent", "catalog_bg", "catalog_card_bg", "catalog_card_featured_bg",
        "catalog_text_primary", "catalog_text_secondary", "catalog_price",
        "catalog_hero_from", "catalog_hero_to",
      ];
      const fontFields = ["font_family_store"];

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
    { id: "colores", label: "Catálogo", icon: <Palette size={16} /> },
    { id: "landing", label: "Página de Inicio", icon: <Home size={16} /> },
  ];

  return (
    <div className="rounded-2xl bg-[#F4F0E3] dark:bg-[#1F3A2E]/30 border border-[#C5CFB0] dark:border-[#3D6B3F]/40 shadow-[0_2px_8px_rgba(61,107,63,0.08)] p-7 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif] mb-2">
            Configuración del Sistema
          </h2>
          <p className="text-sm text-[#3D6B3F]/70 dark:text-[#A8C26B]/70">
            Personaliza la identidad visual y la configuración de tu tienda
          </p>
        </div>

        {/* TABS */}
        <div className="border-b border-[#C5CFB0] dark:border-[#3D6B3F]/40">
          <nav className="flex gap-1" aria-label="Tabs de configuración">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-[#3D6B3F] text-[#3D6B3F] dark:text-[#A8C26B] bg-[#3D6B3F]/5 dark:bg-[#A8C26B]/10"
                    : "border-transparent text-[#3D6B3F]/60 dark:text-[#A8C26B]/50 hover:text-[#3D6B3F] dark:hover:text-[#A8C26B] hover:border-[#C5CFB0] dark:hover:border-[#3D6B3F]/40"
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
              <div className={`rounded-xl border p-4 text-sm ${message.type === "success" ? "border-[#A8C26B]/40 dark:border-[#A8C26B]/30 bg-[#A8C26B]/10 dark:bg-[#A8C26B]/15 text-[#3D6B3F] dark:text-[#A8C26B]" : "border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-7">

              {/* ── Sección: Colores del Catálogo ── */}
              <section className="space-y-5">
                <div className="pb-2 border-b border-[#C5CFB0] dark:border-[#3D6B3F]/40">
                  <h3 className="text-base font-semibold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">Colores del Catálogo</h3>
                  <p className="text-xs text-[#3D6B3F]/60 dark:text-[#A8C26B]/50 mt-0.5">Afectan directamente la vista de productos que ve el cliente</p>
                </div>

                {/* Fila 1: Acento + Fondo página + Precio */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { key: "catalog_accent",  label: "Acento / Botones CTA",   hint: "Color principal de botones y destacados" },
                    { key: "catalog_bg",       label: "Fondo de página",        hint: "Color de fondo general del catálogo" },
                    { key: "catalog_price",    label: "Color de precio",        hint: "Color del texto de precio en las tarjetas" },
                  ].map(({ key, label, hint }) => (
                    <ColorField key={key} name={key} label={label} hint={hint} value={formData[key as keyof typeof formData] as string} onChange={handleChange} />
                  ))}
                </div>

                {/* Fila 2: Tarjetas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { key: "catalog_card_bg",          label: "Fondo tarjeta normal",    hint: "Fondo de las tarjetas de producto comunes" },
                    { key: "catalog_card_featured_bg",  label: "Fondo tarjeta destacada", hint: "Fondo de la tarjeta de producto destacado" },
                    { key: "catalog_text_primary",      label: "Texto principal",         hint: "Color del nombre del producto y títulos" },
                  ].map(({ key, label, hint }) => (
                    <ColorField key={key} name={key} label={label} hint={hint} value={formData[key as keyof typeof formData] as string} onChange={handleChange} />
                  ))}
                </div>

                {/* Fila 3: Hero + Texto secundario */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { key: "catalog_hero_from",       label: "Hero — color inicio",     hint: "Inicio del degradado del banner hero" },
                    { key: "catalog_hero_to",         label: "Hero — color fin",        hint: "Fin del degradado del banner hero" },
                    { key: "catalog_text_secondary",  label: "Texto secundario",        hint: "Color del productor, descripción breve" },
                  ].map(({ key, label, hint }) => (
                    <ColorField key={key} name={key} label={label} hint={hint} value={formData[key as keyof typeof formData] as string} onChange={handleChange} />
                  ))}
                </div>
              </section>

              {/* ── Sección: Vista previa del catálogo ── */}
              <section className="space-y-3">
                <div className="pb-2 border-b border-[#C5CFB0] dark:border-[#3D6B3F]/40">
                  <h3 className="text-base font-semibold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">Vista Previa</h3>
                  <p className="text-xs text-[#3D6B3F]/60 dark:text-[#A8C26B]/50 mt-0.5">Aproximación de cómo se verán las tarjetas con los colores seleccionados</p>
                </div>

                {/* Mini hero */}
                <div
                  className="rounded-xl p-4 flex items-center justify-center text-center"
                  style={{ background: `linear-gradient(135deg, ${formData.catalog_hero_from} 0%, ${formData.catalog_hero_to} 100%)`, minHeight: "72px" }}
                >
                  <span className="text-sm font-semibold text-white/90 [font-family:'Playfair_Display',serif]">Banner Hero del Catálogo</span>
                </div>

                {/* Cards preview */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Tarjeta normal */}
                  <div className="rounded-xl overflow-hidden border border-[#C5CFB0]/60" style={{ backgroundColor: formData.catalog_card_bg }}>
                    <div className="h-24 flex items-center justify-center" style={{ backgroundColor: formData.catalog_bg }}>
                      <span className="text-xs" style={{ color: formData.catalog_text_secondary }}>Imagen producto</span>
                    </div>
                    <div className="p-3 space-y-1.5">
                      <p className="text-sm font-bold truncate" style={{ color: formData.catalog_text_primary, fontFamily: formData.font_family_store }}>Mezcal Artesanal</p>
                      <p className="text-xs" style={{ color: formData.catalog_text_secondary }}>Maestro mezcalero</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-base font-bold" style={{ color: formData.catalog_price }}>$450</span>
                        <button className="rounded-lg px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: formData.catalog_accent }}>
                          + Carrito
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta destacada */}
                  <div className="rounded-xl overflow-hidden border border-[#C5CFB0]/60" style={{ backgroundColor: formData.catalog_card_featured_bg }}>
                    <div className="h-24 flex items-center justify-center" style={{ backgroundColor: `${formData.catalog_card_featured_bg}cc` }}>
                      <span className="text-xs text-white/70">Imagen producto</span>
                    </div>
                    <div className="p-3 space-y-1.5">
                      <p className="text-sm font-bold truncate text-white" style={{ fontFamily: formData.font_family_store }}>Tobalá Premium</p>
                      <p className="text-xs text-white/70">Maestro mezcalero</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-base font-bold text-white">$850</span>
                        <button className="rounded-lg px-3 py-1 text-xs font-bold" style={{ backgroundColor: formData.catalog_card_bg, color: formData.catalog_text_primary }}>
                          + Carrito
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Sección: Tipografía del catálogo ── */}
              <section className="space-y-3">
                <div className="pb-2 border-b border-[#C5CFB0] dark:border-[#3D6B3F]/40">
                  <h3 className="text-base font-semibold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">Tipografía</h3>
                </div>
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-[#1F3A2E] dark:text-[#A8C26B]/80 mb-2">Fuente de productos y catálogo</label>
                  <select
                    name="font_family_store"
                    value={formData.font_family_store}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#0f1a10] px-4 py-2 text-[#1F3A2E] dark:text-[#E8E3D5] focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20"
                  >
                    <option value="'Playfair Display', Georgia, serif">Playfair Display</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Satoshi, system-ui, -apple-system, sans-serif">Satoshi</option>
                    <option value="'DM Sans', system-ui, sans-serif">DM Sans</option>
                  </select>
                </div>
              </section>

              {/* ── Botones ── */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleRestore} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 border border-[#C5CFB0] dark:border-[#3D6B3F]/40 rounded-xl text-sm text-[#1F3A2E] dark:text-[#E8E3D5] hover:bg-[#C5CFB0]/30 dark:hover:bg-[#1F3A2E]/60 transition-all duration-200">
                  <RotateCcw size={16} /> Restaurar defaults
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-[#3D6B3F] text-white text-sm rounded-xl hover:bg-[#1F3A2E] disabled:opacity-60 transition-all duration-200">
                  <Save size={16} /> {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </>
        )}

        {/* TAB: Página de Inicio */}
        {activeTab === "landing" && <LandingConfigSection />}
      </div>
  );
}