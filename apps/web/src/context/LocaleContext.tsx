"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { LOCALE_CONFIG, translateText, getExchangeRates, formatPrice } from "@/lib/i18n";

interface LocaleContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (text: string) => string;
  translateAsync: (text: string) => Promise<string>;
  convertPrice: (mxn: number) => string;
  currency: string;
  loadingRates: boolean;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState("es");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [rates, setRates] = useState<Record<string, number>>({ MXN: 1 });
  const [loadingRates, setLoadingRates] = useState(false);

  const config = LOCALE_CONFIG[locale] ?? LOCALE_CONFIG["es"];

  // Cargar tasas al cambiar idioma
  useEffect(() => {
    setLoadingRates(true);
    getExchangeRates()
      .then(setRates)
      .finally(() => setLoadingRates(false));
  }, [locale]);

  // Restaurar idioma guardado en localStorage
  useEffect(() => {
    const saved = localStorage.getItem("locale");
    if (saved && LOCALE_CONFIG[saved]) setLocaleState(saved);
  }, []);

  // t() — traduce y cachea en el estado local
  const t = useCallback((text: string): string => {
    if (locale === "es") return text;
    const key = `${locale}:${text}`;
    if (translations[key]) return translations[key];

    // Traducir en segundo plano y actualizar estado
    translateText(text, config.langCode).then(translated => {
      setTranslations(prev => ({ ...prev, [key]: translated }));
    });

    return text; // muestra original mientras traduce
  }, [locale, translations, config.langCode]);

  // translateAsync — para cuando necesitas esperar la traducción
  const translateAsync = useCallback(async (text: string): Promise<string> => {
    if (locale === "es") return text;
    return translateText(text, config.langCode);
  }, [locale, config.langCode]);

  // convertPrice — convierte desde MXN
  const convertPrice = useCallback((mxn: number): string => {
    const rate = rates[config.currency] ?? 1;
    return formatPrice(mxn * rate, config.currency, config.numberLocale);
  }, [rates, config]);

  const setLocale = (newLocale: string) => {
    setTranslations({}); // limpiar caché al cambiar idioma
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  return (
    <LocaleContext.Provider value={{
      locale,
      setLocale,
      t,
      translateAsync,
      convertPrice,
      currency: config.currency,
      loadingRates,
    }}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale debe usarse dentro de LocaleProvider");
  return ctx;
};