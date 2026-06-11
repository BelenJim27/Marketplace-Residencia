"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { api } from "@/lib/api";

const STORAGE_KEY = "app_config_cache";

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "0, 0, 0";
}

const defaultPrimary = "#2d7a3e";
const defaultSecondary = "#8b5cf6";
const defaultAccent = "#10b981";

// Tokens biocultural en modo CLARO
const BIO_LIGHT = {
  "--bio-color-fondo":   "#faf8f4",
  "--bio-color-tarjeta": "#f0ebe0",
  "--bio-color-titulo":  "#5c3d1e",
  "--bio-color-precio":  "#8b6914",
  "--bio-color-boton":   "#5c3d1e",
  "--bio-color-boton2":  "#8b6914",
};

// Tokens biocultural en modo OSCURO
const BIO_DARK = {
  "--bio-color-fondo":   "#0f172a",
  "--bio-color-tarjeta": "#1e293b",
  "--bio-color-titulo":  "#e2c98a",
  "--bio-color-precio":  "#f0b429",
  "--bio-color-boton":   "#92400e",
  "--bio-color-boton2":  "#b45309",
};

// Landing page colors — LIGHT mode
const LAND_LIGHT = {
  "--land-bg-primary":    "#F4F0E3",
  "--land-bg-accent":     "#2E4A33",
  "--land-color-heading": "#1F3A2E",
  "--land-color-body":    "rgba(31,58,46,0.8)",
  "--land-color-accent":  "#C97A3E",
  "--land-color-sage":    "#A8C26B",
  "--land-color-cta-bg":  "#1F3A2E",
};

// Landing page colors — DARK mode
const LAND_DARK = {
  "--land-bg-primary":    "#0D1A10",
  "--land-bg-accent":     "#162218",
  "--land-color-heading": "#F4F0E3",
  "--land-color-body":    "rgba(244,240,227,0.82)",
  "--land-color-accent":  "#C97A3E",
  "--land-color-sage":    "#A8C26B",
  "--land-color-cta-bg":  "#2E4A33",
};

interface ConfigContextType {
  config: Record<string, string>;
  loading: boolean;
  refresh: () => Promise<void>;
  get: (key: string, fallback?: string) => string;
  refreshAndUpdate: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

function applyColors(map: Record<string, string>) {
  if (typeof document === "undefined") return;

  const primary = map.color_primario || defaultPrimary;
  const secondary = map.color_secundario || defaultSecondary;
  const accent = map.color_acento || defaultAccent;
  const root = document.documentElement;

  // Colores base de la app
  root.style.setProperty("--color-primary", primary);
  root.style.setProperty("--color-secondary", secondary);
  root.style.setProperty("--color-accent", accent);
  root.style.setProperty("--color-primary-rgb", hexToRgb(primary));
  root.style.setProperty("--color-secondary-rgb", hexToRgb(secondary));
  root.style.setProperty("--color-accent-rgb", hexToRgb(accent));

  // Fuente (no cambia con el tema)
  root.style.setProperty(
    "--bio-fuente-titulo",
    map["bio_fuente_titulo"] ?? "Georgia, serif"
  );

  // Detectar modo oscuro activo
  const isDark = root.classList.contains("dark");
  const bioTokens = isDark ? BIO_DARK : BIO_LIGHT;
  const landTokens = isDark ? LAND_DARK : LAND_LIGHT;

  // Aplicar tokens biocultural según el tema, permitiendo override desde la config
  const bioKeyMap: Record<string, string> = {
    bio_color_fondo:   "--bio-color-fondo",
    bio_color_tarjeta: "--bio-color-tarjeta",
    bio_color_titulo:  "--bio-color-titulo",
    bio_color_precio:  "--bio-color-precio",
    bio_color_boton:   "--bio-color-boton",
    bio_color_boton2:  "--bio-color-boton2",
  };

  Object.entries(bioTokens).forEach(([cssVar, defaultVal]) => {
    const configKey = Object.keys(bioKeyMap).find((k) => bioKeyMap[k] === cssVar);
    const val = !isDark && configKey && map[configKey] ? map[configKey] : defaultVal;
    root.style.setProperty(cssVar, val);
  });

  // Aplicar tokens de landing page
  const landKeyMap: Record<string, string> = {
    land_color_bg:       "--land-bg-primary",
    land_color_bg_accent: "--land-bg-accent",
    land_color_heading:  "--land-color-heading",
    land_color_body:     "--land-color-body",
    land_color_accent:   "--land-color-accent",
    land_color_sage:     "--land-color-sage",
    land_color_cta:      "--land-color-cta-bg",
  };

  Object.entries(landTokens).forEach(([cssVar, defaultVal]) => {
    const configKey = Object.keys(landKeyMap).find((k) => landKeyMap[k] === cssVar);
    const val = !isDark && configKey && map[configKey] ? map[configKey] : defaultVal;
    root.style.setProperty(cssVar, val);
  });

  // Aplicar fuentes del sistema
  root.style.setProperty(
    "--font-family-ui",
    map.font_family_ui || "Satoshi, system-ui, -apple-system, sans-serif"
  );
  root.style.setProperty(
    "--font-family-store",
    map.font_family_store || "'Playfair Display', Georgia, serif"
  );

  // ── Tokens de catálogo ──────────────────────────────────────────────────
  root.style.setProperty("--catalog-accent",           map.catalog_accent           || "#C97A3E");
  root.style.setProperty("--catalog-bg",               map.catalog_bg               || "#F4F0E3");
  root.style.setProperty("--catalog-card-bg",          map.catalog_card_bg          || "#FFFFFF");
  root.style.setProperty("--catalog-card-featured-bg", map.catalog_card_featured_bg || "#C97A3E");
  root.style.setProperty("--catalog-text-primary",     map.catalog_text_primary     || "#1F3A2E");
  root.style.setProperty("--catalog-text-secondary",   map.catalog_text_secondary   || "#3D6B3F");
  root.style.setProperty("--catalog-price",            map.catalog_price            || "#C97A3E");
  root.style.setProperty("--catalog-hero-from",        map.catalog_hero_from        || "#3D6B3F");
  root.style.setProperty("--catalog-hero-to",          map.catalog_hero_to          || "#1F3A2E");
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const cachedMap = JSON.parse(cached);
        setConfig(cachedMap);
        applyColors(cachedMap);
      }
    } catch {
      // ignorar errores de localStorage
    }

    try {
      const data = (await api.configuracion.getSistema()) as { clave: string; valor: string }[];
      if (!Array.isArray(data)) throw new Error("Respuesta inválida");

      const map: Record<string, string> = {};
      data.forEach((item) => {
        if (item.clave && item.valor) map[item.clave] = item.valor;
      });

      setConfig(map);
      applyColors(map);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      } catch {
        // ignorar errores de cuota
      }
    } catch {
      applyColors({
        color_primario: defaultPrimary,
        color_secundario: defaultSecondary,
        color_acento: defaultAccent,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAndUpdate = useCallback(async () => {
    setLoading(true);
    await fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!loading && Object.keys(config).length === 0) {
      applyColors({
        color_primario: defaultPrimary,
        color_secundario: defaultSecondary,
        color_acento: defaultAccent,
      });
    }
  }, [loading]);

  useEffect(() => {
    // Lazy init: only load from localStorage on mount, fetch API later if needed
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const cachedMap = JSON.parse(cached);
        setConfig(cachedMap);
        applyColors(cachedMap);
        setLoading(false);
        return;
      } catch {
        // ignore parse errors
      }
    }

    // Apply defaults and mark as loaded — fetchConfig() will be called on-demand
    applyColors({
      color_primario: defaultPrimary,
      color_secundario: defaultSecondary,
      color_acento: defaultAccent,
    });
    setLoading(false);
  }, []);

  // Re-aplicar colores cada vez que cambia el tema (dark/light)
  useEffect(() => {
    if (typeof document === "undefined") return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          applyColors(config);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [config]);

  // Memoizamos el value para evitar re-renderizar a todos los consumidores en cada
  // render del provider. `get` se deriva de `config`, por lo que se recalcula solo
  // cuando cambia config/loading o las funciones memoizadas.
  const value = useMemo<ConfigContextType>(
    () => ({
      config,
      loading,
      refresh: fetchConfig,
      get: (key: string, fallback = "") => config[key] || fallback,
      refreshAndUpdate,
    }),
    [config, loading, fetchConfig, refreshAndUpdate],
  );

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within ConfigProvider");
  }
  return context;
}