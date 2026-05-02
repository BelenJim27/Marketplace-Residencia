"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

  // Aplicar tokens según el tema, permitiendo override desde la config
  const bioKeyMap: Record<string, string> = {
    bio_color_fondo:   "--bio-color-fondo",
    bio_color_tarjeta: "--bio-color-tarjeta",
    bio_color_titulo:  "--bio-color-titulo",
    bio_color_precio:  "--bio-color-precio",
    bio_color_boton:   "--bio-color-boton",
    bio_color_boton2:  "--bio-color-boton2",
  };

  Object.entries(bioTokens).forEach(([cssVar, defaultVal]) => {
    // Solo usar el valor de la config si NO estamos en modo oscuro
    // (en oscuro siempre usamos los tokens oscuros para que se vea bien)
    const configKey = Object.keys(bioKeyMap).find((k) => bioKeyMap[k] === cssVar);
    const val = !isDark && configKey && map[configKey] ? map[configKey] : defaultVal;
    root.style.setProperty(cssVar, val);
  });
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
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
  };

  const refreshAndUpdate = async () => {
    setLoading(true);
    await fetchConfig();
  };

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
    fetchConfig();
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

  const get = (key: string, fallback = ""): string => config[key] || fallback;

  return (
    <ConfigContext.Provider value={{ config, loading, refresh: fetchConfig, get, refreshAndUpdate }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within ConfigProvider");
  }
  return context;
}