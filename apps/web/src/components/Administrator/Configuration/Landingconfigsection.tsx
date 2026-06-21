"use client";

import { useState, useEffect, useRef } from "react";
import { Save, ChevronDown, ChevronUp, Type, Upload, Image as ImageIcon, Palette, Film, BookOpen, Images, BarChart2, QrCode, Package, ImagePlus } from "lucide-react";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const LANDING_DEFAULTS = {
  // ── Colores ──
  land_color_bg:         "#F4F0E3",
  land_color_bg_accent:  "#2E4A33",
  land_color_heading:    "#1F3A2E",
  land_color_body:       "rgba(31,58,46,0.8)",
  land_color_accent:     "#C97A3E",
  land_color_sage:       "#A8C26B",
  land_color_cta:        "#1F3A2E",
  // ── Hero ──
  landing_hero_eyebrow:  "Trazabilidad · Origen · Identidad",
  landing_hero_titulo_1: "Oaxaca auténtico,",
  landing_hero_titulo_2: "trazable y justo",
  landing_hero_subtitulo:"Conectamos el origen, la tradición y el talento de nuestras comunidades con el mundo.",
  landing_hero_boton:    "Explorar productos",
  landing_hero_boton_2:  "Ser productor",
  landing_hero_badge_1:  "Trazabilidad completa",
  landing_hero_badge_2:  "Comercio justo",
  landing_hero_badge_3:  "Protección cultural",
  // ── Ticker ──
  landing_ticker_1: "Mezcal artesanal",
  landing_ticker_2: "Trazabilidad completa",
  landing_ticker_3: "Comercio justo",
  landing_ticker_4: "Oaxaca, México",
  // ── Historia ──
  landing_sobre_eyebrow:    "Nuestra historia",
  landing_sobre_heading:    "El alma del",
  landing_sobre_heading_em: "agave",
  landing_sobre_texto_1:    "Descubre el auténtico sabor del mezcal, un destilado artesanal nacido del corazón del agave.",
  landing_sobre_texto_2:    "Elaborado con procesos tradicionales que respetan la tierra y el tiempo, cada botella guarda carácter y tradición. Sus notas ahumadas y matices únicos lo convierten en una experiencia inigualable.",
  landing_sobre_cita:       "El alma de Oaxaca en cada gota",
  // ── Stats ──
  landing_stats_eyebrow:   "Nuestro impacto",
  landing_stats_titulo:    "Impacto que construimos juntos",
  landing_stats_subtitulo: "Cada compra transforma vidas y preserva nuestra herencia cultural.",
  landing_stat_label_1:    "Productores registrados",
  landing_stat_label_2:    "Comunidades participantes",
  landing_stat_label_3:    "Productos trazables",
  // ── Trazabilidad ──
  landing_traza_eyebrow:   "Cada botella, una historia",
  landing_traza_heading:   "Escanea, descubre,",
  landing_traza_heading_em:"confía",
  landing_traza_desc:      "Cada producto trae un código QR único. Verás el productor, la comunidad, el lote y cuánto del precio vuelve al artesano.",
  landing_traza_cta:       "Ver trazabilidad por botella",
  landing_paso_1_titulo:   "Recolección",
  landing_paso_1_desc:     "Agave silvestre cosechado a mano en su punto óptimo de madurez.",
  landing_paso_2_titulo:   "Cocción",
  landing_paso_2_desc:     "Las piñas se cuecen en horno cónico de tierra durante 4 días.",
  landing_paso_3_titulo:   "Molienda",
  landing_paso_3_desc:     "Machacado con tahona de piedra jalada por animal.",
  landing_paso_4_titulo:   "Fermentación",
  landing_paso_4_desc:     "Fermentación natural en tinas de madera con levaduras silvestres.",
  landing_paso_5_titulo:   "Destilación",
  landing_paso_5_desc:     "Doble destilación en alambique de cobre artesanal.",
  // ── Productos destacados ──
  landing_productos_eyebrow:   "Explora",
  landing_productos_heading:   "Productos destacados",
  landing_productos_subtitulo: "Descubre nuestra selección de mezcales, cada uno con su propia historia.",
  // ── Imágenes ──
  landing_sobre_img_1:   "/fotos/16.jpg",
  landing_sobre_img_2:   "/fotos/24.jpeg",
  landing_sobre_img_3:   "/fotos/5.jpg",
  landing_sobre_img_4:   "/fotos/22.jpeg",
  landing_sobre_img_5:   "/fotos/20.jpeg",
  landing_botella_1_img: "/fotos/28.1.png",
  landing_botella_2_img: "/fotos/29.1.png",
  landing_botella_3_img: "/fotos/30.1.png",
  landing_botella_4_img: "/fotos/31.1.png",
};

type LandingConfig = typeof LANDING_DEFAULTS;
type LandingKey = keyof LandingConfig;

const COLOR_KEYS: LandingKey[] = [
  "land_color_bg", "land_color_bg_accent", "land_color_heading",
  "land_color_body", "land_color_accent", "land_color_sage", "land_color_cta",
];
const IMAGE_KEYS: LandingKey[] = [
  "landing_sobre_img_1","landing_sobre_img_2","landing_sobre_img_3",
  "landing_sobre_img_4","landing_sobre_img_5",
  "landing_botella_1_img","landing_botella_2_img","landing_botella_3_img","landing_botella_4_img",
];

// ─── Sección colapsable ───────────────────────────────────────────────────────
function Seccion({ titulo, children, defaultOpen = true, icon }: {
  titulo: string; children: React.ReactNode; defaultOpen?: boolean; icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-[#1F3A2E]/5 hover:bg-[#C5CFB0]/20 transition-all duration-200 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[#1F3A2E] [font-family:'DM_Sans',sans-serif]">
          {icon}{titulo}
        </span>
        {open ? <ChevronUp size={16} className="text-[#3D6B3F]/50" /> : <ChevronDown size={16} className="text-[#3D6B3F]/50" />}
      </button>
      {open && <div className="p-5 space-y-4 bg-[#F4F0E3]">{children}</div>}
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
      <label className="block text-sm font-medium text-[#1F3A2E] mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[#C5CFB0] bg-white px-3 py-2 text-sm text-[#1F3A2E] focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/30 resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full rounded-lg border border-[#C5CFB0] bg-white px-3 py-2 text-sm text-[#1F3A2E] focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/30"
        />
      )}
      {hint && <p className="mt-1 text-xs text-[#3D6B3F]/50">{hint}</p>}
    </div>
  );
}

// ─── Campo de color ───────────────────────────────────────────────────────────
function ColorCampo({ label, name, value, onChange, hint }: {
  label: string; name: string; value: string;
  onChange: (name: string, value: string) => void;
  hint?: string;
}) {
  const isRgba = value.startsWith("rgba") || value.startsWith("rgb");
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[#1F3A2E]">{label}</label>
      {hint && <p className="text-[11px] text-[#3D6B3F]/50">{hint}</p>}
      <div className="flex items-center gap-2">
        {!isRgba && (
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
            className="h-9 w-12 rounded-lg border border-[#C5CFB0] cursor-pointer p-0.5 bg-white shrink-0"
          />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          className="flex-1 rounded-lg border border-[#C5CFB0] bg-white px-3 py-1.5 text-sm text-[#1F3A2E] font-mono focus:border-[#3D6B3F] focus:outline-none focus:ring-1 focus:ring-[#3D6B3F]/20"
        />
        <div
          className="h-9 w-9 rounded-lg border border-[#C5CFB0] shrink-0"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  );
}

// ─── Upload de imagen ─────────────────────────────────────────────────────────
function ImageUpload({ label, name, value, onUploaded }: {
  label: string; name: string; value: string;
  onUploaded: (name: string, url: string) => void;
}) {
  const token = getCookie("token");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { setError("Máximo 2 MB"); return; }
    setUploading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      fd.append("entidad_tipo", "landing");
      fd.append("entidad_id", "0");
      const res = await api.archivos.upload(token ?? "", fd);
      const url: string = (res?.url || res?.ruta || res?.path || "") as string;
      if (!url) throw new Error("No se recibió URL");
      onUploaded(name, url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir");
    } finally { setUploading(false); }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-[#1F3A2E] mb-1">{label}</label>
      <div className="flex gap-3 items-start">
        <div className="relative w-24 h-20 rounded-lg overflow-hidden border border-[#C5CFB0] bg-[#C5CFB0]/20 flex-shrink-0">
          {value ? (
            <Image src={value} alt={label} width={0} height={0} sizes="100vw" className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = "/fotos/16.jpg"; }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon size={24} className="text-[#3D6B3F]/40" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-[#C5CFB0] rounded-lg hover:bg-[#C5CFB0]/20 text-[#1F3A2E] transition-all duration-200 disabled:opacity-50">
            <Upload size={13} />{uploading ? "Subiendo..." : "Subir imagen"}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          <p className="text-xs text-[#3D6B3F]/50 truncate max-w-[200px]" title={value}>{value || "Sin imagen"}</p>
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
        const t = getCookie("token");
        const res = await fetch(`${API_URL}/configuracion/sistema/mapa`, {
          headers: t ? { Authorization: `Bearer ${t}` } : {},
        });
        if (!res.ok) throw new Error("Error al cargar");
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
      } finally { setLoading(false); }
    };
    cargar();
  }, []);

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true); setMessage(null);
    try {
      const items = Object.entries(formData).map(([clave, valor]) => ({
        clave, valor,
        tipo: COLOR_KEYS.includes(clave as LandingKey) ? "color" : "texto",
      }));
      await api.configuracion.bulkUpsert(token ?? "", items);
      setMessage({ type: "success", text: "¡Página de inicio actualizada! Recarga la landing para ver los cambios." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error al guardar" });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C5CFB0] border-t-[#3D6B3F]" />
        <span className="ml-3 text-sm text-[#3D6B3F]/70">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-[#C5CFB0]">
        <div className="p-2 bg-[#A8C26B]/20 rounded-lg"><Type size={20} className="text-[#3D6B3F]" /></div>
        <div>
          <h3 className="text-lg font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Página de Inicio</h3>
          <p className="text-xs text-[#3D6B3F]/70">Edita colores, textos e imágenes de la landing page</p>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl p-4 text-sm border ${message.type === "success" ? "bg-[#A8C26B]/15 text-[#3D6B3F] border-[#A8C26B]/30" : "bg-red-50 text-red-700 border-red-200"}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">

        {/* ── COLORES ── */}
        <Seccion titulo="Colores de la página" icon={<Palette size={15} className="text-[#C97A3E] shrink-0" />}>
          <p className="text-xs text-[#3D6B3F]/60 bg-[#3D6B3F]/5 rounded-lg px-3 py-2 border border-[#3D6B3F]/10">
            Estos colores afectan toda la página de inicio. Los cambios se aplican al guardar y recargar.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ColorCampo label="Fondo principal" name="land_color_bg" value={formData.land_color_bg} onChange={handleChange} hint="Fondo de secciones claras (crema)" />
            <ColorCampo label="Fondo secciones oscuras" name="land_color_bg_accent" value={formData.land_color_bg_accent} onChange={handleChange} hint="Stats, trazabilidad (verde oscuro)" />
            <ColorCampo label="Color títulos" name="land_color_heading" value={formData.land_color_heading} onChange={handleChange} hint="Texto principal y encabezados" />
            <ColorCampo label="Color cuerpo" name="land_color_body" value={formData.land_color_body} onChange={handleChange} hint="Texto de párrafos (acepta rgba)" />
            <ColorCampo label="Acento / Cobre" name="land_color_accent" value={formData.land_color_accent} onChange={handleChange} hint="Botones CTA, eyebrows, líneas decorativas" />
            <ColorCampo label="Verde salvia" name="land_color_sage" value={formData.land_color_sage} onChange={handleChange} hint="Título 2 del hero y énfasis secundario" />
            <ColorCampo label="Botón CTA fondo" name="land_color_cta" value={formData.land_color_cta} onChange={handleChange} hint="Fondo del botón «Explorar productos»" />
          </div>
          {/* Mini preview */}
          <div className="rounded-xl overflow-hidden border border-[#C5CFB0] mt-2">
            <div style={{ background: `linear-gradient(135deg, ${formData.land_color_bg_accent} 0%, ${formData.land_color_heading} 100%)`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#fff", fontSize: "13px", fontWeight: 700 }}>Vista previa sección oscura</span>
              <span style={{ color: formData.land_color_accent, fontSize: "18px", fontWeight: 800 }}>$450</span>
            </div>
            <div style={{ background: formData.land_color_bg, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: formData.land_color_heading, fontSize: "15px", fontWeight: 700 }}>Mezcal Artesanal</span>
              <button style={{ background: formData.land_color_accent, color: "#fff", border: "none", borderRadius: "6px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "default" }}>
                Explorar
              </button>
            </div>
          </div>
        </Seccion>

        {/* ── HERO ── */}
        <Seccion titulo="Banner principal (Hero)" defaultOpen={false} icon={<Film size={15} className="text-[#3D6B3F] shrink-0" />}>
          <Campo label="Eyebrow (texto pequeño sobre el título)" name="landing_hero_eyebrow" value={formData.landing_hero_eyebrow} onChange={handleChange} hint='Ej: "Trazabilidad · Origen · Identidad"' />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Título línea 1" name="landing_hero_titulo_1" value={formData.landing_hero_titulo_1} onChange={handleChange} />
            <Campo label="Título línea 2 (color verde salvia)" name="landing_hero_titulo_2" value={formData.landing_hero_titulo_2} onChange={handleChange} />
          </div>
          <Campo label="Subtítulo" name="landing_hero_subtitulo" value={formData.landing_hero_subtitulo} onChange={handleChange} multiline />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Botón principal" name="landing_hero_boton" value={formData.landing_hero_boton} onChange={handleChange} />
            <Campo label="Botón secundario" name="landing_hero_boton_2" value={formData.landing_hero_boton_2} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Campo label="Badge 1" name="landing_hero_badge_1" value={formData.landing_hero_badge_1} onChange={handleChange} />
            <Campo label="Badge 2" name="landing_hero_badge_2" value={formData.landing_hero_badge_2} onChange={handleChange} />
            <Campo label="Badge 3" name="landing_hero_badge_3" value={formData.landing_hero_badge_3} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-[#C5CFB0]/40">
            <Campo label="Ticker — texto 1" name="landing_ticker_1" value={formData.landing_ticker_1} onChange={handleChange} />
            <Campo label="Ticker — texto 2" name="landing_ticker_2" value={formData.landing_ticker_2} onChange={handleChange} />
            <Campo label="Ticker — texto 3" name="landing_ticker_3" value={formData.landing_ticker_3} onChange={handleChange} />
            <Campo label="Ticker — texto 4" name="landing_ticker_4" value={formData.landing_ticker_4} onChange={handleChange} />
          </div>
        </Seccion>

        {/* ── HISTORIA ── */}
        <Seccion titulo="Historia / Sobre el Mezcal" defaultOpen={false} icon={<BookOpen size={15} className="text-[#3D6B3F] shrink-0" />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Campo label="Eyebrow" name="landing_sobre_eyebrow" value={formData.landing_sobre_eyebrow} onChange={handleChange} />
            <Campo label="Título principal" name="landing_sobre_heading" value={formData.landing_sobre_heading} onChange={handleChange} />
            <Campo label="Título en cursiva (acento)" name="landing_sobre_heading_em" value={formData.landing_sobre_heading_em} onChange={handleChange} />
          </div>
          <Campo label="Párrafo destacado (aparece en itálica con borde)" name="landing_sobre_texto_1" value={formData.landing_sobre_texto_1} onChange={handleChange} multiline />
          <Campo label="Párrafo principal" name="landing_sobre_texto_2" value={formData.landing_sobre_texto_2} onChange={handleChange} multiline />
          <Campo label="Cita destacada (al pie)" name="landing_sobre_cita" value={formData.landing_sobre_cita} onChange={handleChange} hint="Sin comillas — se agregan automáticamente" />
        </Seccion>

        {/* ── IMÁGENES HISTORIA ── */}
        <Seccion titulo="Imágenes — Historia (mosaico de 5 fotos)" defaultOpen={false} icon={<Images size={15} className="text-[#3D6B3F] shrink-0" />}>
          <p className="text-xs text-[#C97A3E] bg-[#C97A3E]/8 rounded-lg p-3 border border-[#C97A3E]/20">
            Estas 5 imágenes forman el mosaico fotográfico junto al texto. Máximo 2 MB por imagen.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ImageUpload label="Imagen 1 — fila superior (ancha)" name="landing_sobre_img_1" value={formData.landing_sobre_img_1} onUploaded={handleChange} />
            <ImageUpload label="Imagen 2 — fila superior (estrecha)" name="landing_sobre_img_2" value={formData.landing_sobre_img_2} onUploaded={handleChange} />
            <ImageUpload label="Imagen 3 — centro (grande)" name="landing_sobre_img_3" value={formData.landing_sobre_img_3} onUploaded={handleChange} />
            <ImageUpload label="Imagen 4 — derecha arriba (con texto «Proceso artesanal»)" name="landing_sobre_img_4" value={formData.landing_sobre_img_4} onUploaded={handleChange} />
            <ImageUpload label="Imagen 5 — derecha abajo (con línea de acento)" name="landing_sobre_img_5" value={formData.landing_sobre_img_5} onUploaded={handleChange} />
          </div>
        </Seccion>

        {/* ── STATS ── */}
        <Seccion titulo="Estadísticas (Nuestro Impacto)" defaultOpen={false} icon={<BarChart2 size={15} className="text-[#3D6B3F] shrink-0" />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Campo label="Eyebrow" name="landing_stats_eyebrow" value={formData.landing_stats_eyebrow} onChange={handleChange} />
            <Campo label="Título" name="landing_stats_titulo" value={formData.landing_stats_titulo} onChange={handleChange} />
            <Campo label="Subtítulo" name="landing_stats_subtitulo" value={formData.landing_stats_subtitulo} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-[#C5CFB0]/40">
            <Campo label="Etiqueta stat 1 (Productores)" name="landing_stat_label_1" value={formData.landing_stat_label_1} onChange={handleChange} />
            <Campo label="Etiqueta stat 2 (Comunidades)" name="landing_stat_label_2" value={formData.landing_stat_label_2} onChange={handleChange} />
            <Campo label="Etiqueta stat 3 (Productos)" name="landing_stat_label_3" value={formData.landing_stat_label_3} onChange={handleChange} />
          </div>
          <p className="text-xs text-[#3D6B3F]/70 bg-[#3D6B3F]/5 rounded-lg p-3 border border-[#3D6B3F]/10">
            Los números se calculan automáticamente desde la base de datos.
          </p>
        </Seccion>

        {/* ── TRAZABILIDAD ── */}
        <Seccion titulo="Trazabilidad (Cada botella, una historia)" defaultOpen={false} icon={<QrCode size={15} className="text-[#3D6B3F] shrink-0" />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Campo label="Eyebrow" name="landing_traza_eyebrow" value={formData.landing_traza_eyebrow} onChange={handleChange} />
            <Campo label="Título principal" name="landing_traza_heading" value={formData.landing_traza_heading} onChange={handleChange} />
            <Campo label="Título en cursiva (acento)" name="landing_traza_heading_em" value={formData.landing_traza_heading_em} onChange={handleChange} />
          </div>
          <Campo label="Descripción" name="landing_traza_desc" value={formData.landing_traza_desc} onChange={handleChange} multiline />
          <Campo label="Botón CTA" name="landing_traza_cta" value={formData.landing_traza_cta} onChange={handleChange} />
          <p className="text-xs text-[#3D6B3F]/60 mt-1">Pasos del proceso (mostrados cuando no hay productos con trazabilidad real):</p>
          <div className="space-y-3">
            {[1,2,3,4,5].map((n) => (
              <div key={n} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl border border-[#C5CFB0]/50 bg-white">
                <Campo label={`Paso ${n} — título`} name={`landing_paso_${n}_titulo`} value={formData[`landing_paso_${n}_titulo` as LandingKey]} onChange={handleChange} />
                <div className="md:col-span-2">
                  <Campo label={`Paso ${n} — descripción`} name={`landing_paso_${n}_desc`} value={formData[`landing_paso_${n}_desc` as LandingKey]} onChange={handleChange} />
                </div>
              </div>
            ))}
          </div>
        </Seccion>

        {/* ── PRODUCTOS DESTACADOS ── */}
        <Seccion titulo="Productos Destacados" defaultOpen={false} icon={<Package size={15} className="text-[#3D6B3F] shrink-0" />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Campo label="Eyebrow" name="landing_productos_eyebrow" value={formData.landing_productos_eyebrow} onChange={handleChange} />
            <Campo label="Título" name="landing_productos_heading" value={formData.landing_productos_heading} onChange={handleChange} />
            <Campo label="Subtítulo" name="landing_productos_subtitulo" value={formData.landing_productos_subtitulo} onChange={handleChange} />
          </div>
        </Seccion>

        {/* ── IMÁGENES FALLBACK ── */}
        <Seccion titulo="Imágenes de fallback — Productos Destacados" defaultOpen={false} icon={<ImagePlus size={15} className="text-[#3D6B3F] shrink-0" />}>
          <p className="text-xs text-[#C97A3E] bg-[#C97A3E]/8 rounded-lg p-3 border border-[#C97A3E]/20">
            Se muestran cuando un producto no tiene foto propia.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ImageUpload label="Botella 1 — Tobalá" name="landing_botella_1_img" value={formData.landing_botella_1_img} onUploaded={handleChange} />
            <ImageUpload label="Botella 2 — Espadín" name="landing_botella_2_img" value={formData.landing_botella_2_img} onUploaded={handleChange} />
            <ImageUpload label="Botella 3 — Madrecuixe" name="landing_botella_3_img" value={formData.landing_botella_3_img} onUploaded={handleChange} />
            <ImageUpload label="Botella 4 — Tepeztate" name="landing_botella_4_img" value={formData.landing_botella_4_img} onUploaded={handleChange} />
          </div>
        </Seccion>

      </div>

      <div className="flex justify-end pt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#3D6B3F] text-white text-sm font-medium rounded-xl hover:bg-[#1F3A2E] disabled:opacity-50 transition-all duration-200">
          <Save size={16} />
          {saving ? "Guardando..." : "Guardar página de inicio"}
        </button>
      </div>
    </section>
  );
}
