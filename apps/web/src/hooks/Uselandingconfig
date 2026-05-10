import { useEffect, useState } from "react";

declare const process: { env: { NEXT_PUBLIC_API_URL?: string } };
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const LANDING_DEFAULTS = {
  landing_hero_titulo_1: "Oaxaca auténtico,",
  landing_hero_titulo_2: "trazable y justo",
  landing_hero_subtitulo: "Conectamos el origen, la tradición y el talento de nuestras comunidades con el mundo.",
  landing_hero_boton: "Explorar productos",
  landing_hero_badge_1: "Trazabilidad completa",
  landing_hero_badge_2: "Comercio justo",
  landing_hero_badge_3: "Protección cultural",
  landing_sobre_texto_1: "Descubre el auténtico sabor del mezcal, un destilado artesanal nacido del corazón del agave.",
  landing_sobre_texto_2: "Elaborado con procesos tradicionales que respetan la tierra y el tiempo, cada botella guarda carácter y tradición.",
  landing_sobre_texto_3: "Sus notas ahumadas y matices únicos lo convierten en una experiencia inigualable.",
  landing_sobre_texto_4: "Perfecto para celebrar, compartir y disfrutar momentos especiales.",
  landing_sobre_cita: "El alma de Oaxaca en cada gota",
  landing_prod_1_nombre: "Tobalá",
  landing_prod_1_subtitulo: "La expresión más pura de la naturaleza, custodiada por manos expertas que entienden el tiempo del agave.",
  landing_prod_2_nombre: "Espadín",
  landing_prod_2_subtitulo: "El alma del mezcal oaxaqueño, destilado con dedicación generación tras generación.",
  landing_prod_3_nombre: "Madrecuixe",
  landing_prod_3_subtitulo: "Un mezcal silvestre de carácter indomable, con la fiereza del agave en su estado más puro.",
  landing_stats_titulo: "Impacto que construimos juntos",
  landing_stats_subtitulo: "Cada compra transforma vidas y preserva nuestra herencia cultural.",
};

export type LandingConfig = typeof LANDING_DEFAULTS;

export function useLandingConfig(): { config: LandingConfig; loading: boolean } {
  const [config, setConfig] = useState<LandingConfig>(LANDING_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/configuracion/sistema/mapa`);
        if (!res.ok) throw new Error("Error al cargar config");
        const data: Record<string, string> = await res.json();
        setConfig((prev) => {
          const updated = { ...prev };
          for (const key of Object.keys(LANDING_DEFAULTS) as Array<keyof LandingConfig>) {
            if (data[key]) updated[key] = data[key];
          }
          return updated;
        });
      } catch (err) {
        console.error("useLandingConfig error:", err);
        // Si falla, usa defaults — la landing sigue funcionando
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  return { config, loading };
}