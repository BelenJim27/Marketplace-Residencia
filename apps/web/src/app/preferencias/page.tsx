"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, type Currency } from "@/context/LocaleContext";
import { LOCALE_CONFIG } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";

const LOCALES = ["es", "en", "fr", "pt", "zh", "ja"] as const;
const CURRENCIES: { code: Currency; symbol: string; name: string }[] = [
  { code: "MXN", symbol: "$", name: "Peso mexicano" },
  { code: "USD", symbol: "$", name: "Dólar estadounidense" },
];

export default function PreferenciasPage() {
  const router = useRouter();
  const { locale, setLocale, currency, setCurrency, t } = useLocale();
  const [pendingLocale, setPendingLocale] = useState(locale);
  const [pendingCurrency, setPendingCurrency] = useState(currency);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleSelectLocale = (newLocale: string) => {
    setPendingLocale(newLocale);
    const defaultCurrency = LOCALE_CONFIG[newLocale]?.currency as Currency | undefined;
    if (defaultCurrency && CURRENCIES.some(c => c.code === defaultCurrency)) {
      setPendingCurrency(defaultCurrency);
    }
  };

  const handleSave = () => {
    setLocale(pendingLocale);
    setCurrency(pendingCurrency);
    router.back();
  };

  if (!mounted) return null;

  return (
    <div
      style={{ backgroundColor: "var(--color-primary, #2E4A33)" }}
      className="min-h-screen flex flex-col"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 py-4 border-b"
        style={{ borderColor: "rgba(244,240,227,0.15)", backgroundColor: "var(--color-primary, #2E4A33)" }}
      >
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            style={{ color: "#F4F0E3" }}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity text-sm font-medium"
          >
            <ArrowLeft size={18} />
            <span>{t("Volver")}</span>
          </button>
          <h1 style={{ color: "#F4F0E3" }} className="text-base font-bold">
            {t("Idioma y moneda")}
          </h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-0">

          {/* Sección Idioma */}
          <section className="pb-6">
            <h2 style={{ color: "#F4F0E3" }} className="text-base font-bold mb-1">
              {t("Selecciona tu idioma")}
            </h2>
            <p style={{ color: "rgba(244,240,227,0.6)" }} className="text-sm mb-5">
              {t("Selecciona el idioma que prefieres utilizar para navegar, comprar y comunicarte.")}
            </p>

            <div className="space-y-1">
              {LOCALES.map(loc => {
                const cfg = LOCALE_CONFIG[loc];
                const isActive = pendingLocale === loc;
                return (
                  <button
                    key={loc}
                    onClick={() => handleSelectLocale(loc)}
                    className="w-full flex items-center gap-4 py-3 px-3 rounded-lg transition-colors text-left"
                    style={{
                      backgroundColor: isActive ? "rgba(201,122,62,0.12)" : "transparent",
                    }}
                    onMouseEnter={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(244,240,227,0.05)";
                    }}
                    onMouseLeave={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    }}
                  >
                    {/* Radio circle */}
                    <div
                      className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: isActive ? "#C97A3E" : "rgba(244,240,227,0.4)" }}
                    >
                      {isActive && (
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: "#C97A3E" }}
                        />
                      )}
                    </div>

                    {/* Flag + name */}
                    <span className="text-xl">{cfg.flag}</span>
                    <span style={{ color: "#F4F0E3" }} className="text-sm font-medium">
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Separador */}
          <div style={{ borderColor: "rgba(244,240,227,0.15)" }} className="border-t" />

          {/* Sección Moneda */}
          <section className="pt-6 pb-6">
            <h2 style={{ color: "#F4F0E3" }} className="text-base font-bold mb-1">
              {t("Configuración de divisa")}
            </h2>
            <p style={{ color: "rgba(244,240,227,0.6)" }} className="text-sm mb-5">
              {t("Selecciona la moneda con la que deseas comprar.")}
            </p>

            <div className="space-y-1">
              {CURRENCIES.map(({ code, symbol, name }) => {
                const isActive = pendingCurrency === code;
                return (
                  <button
                    key={code}
                    onClick={() => setPendingCurrency(code)}
                    className="w-full flex items-center gap-4 py-3 px-3 rounded-lg transition-colors text-left"
                    style={{
                      backgroundColor: isActive ? "rgba(201,122,62,0.12)" : "transparent",
                    }}
                    onMouseEnter={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(244,240,227,0.05)";
                    }}
                    onMouseLeave={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    }}
                  >
                    {/* Radio circle */}
                    <div
                      className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: isActive ? "#C97A3E" : "rgba(244,240,227,0.4)" }}
                    >
                      {isActive && (
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: "#C97A3E" }}
                        />
                      )}
                    </div>

                    {/* Symbol + code + name */}
                    <div className="flex items-baseline gap-2">
                      <span style={{ color: "#F4F0E3" }} className="text-sm font-bold">
                        {symbol} {code}
                      </span>
                      <span style={{ color: "rgba(244,240,227,0.55)" }} className="text-sm">
                        — {name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Aviso de traducción — solo cuando idioma ≠ español */}
          {pendingLocale !== "es" && (
            <>
              <div style={{ borderColor: "rgba(244,240,227,0.15)" }} className="border-t" />
              <div
                className="mt-5 p-3 rounded-lg flex gap-2 text-xs"
                style={{
                  backgroundColor: "rgba(201,122,62,0.08)",
                  borderColor: "rgba(201,122,62,0.25)",
                  borderStyle: "solid",
                  borderWidth: "1px",
                }}
              >
                <span style={{ color: "#C97A3E" }} className="flex-shrink-0 font-bold text-sm leading-none mt-0.5">
                  ℹ
                </span>
                <p style={{ color: "rgba(244,240,227,0.65)" }}>
                  {t("Las traducciones se generan automáticamente y pueden no ser exactas en todos los casos. Las estamos mejorando continuamente.")}
                </p>
              </div>
            </>
          )}

          {/* Botón guardar */}
          <div className="pt-6">
            <button
              onClick={handleSave}
              style={{ backgroundColor: "#C97A3E", color: "#0D1A10" }}
              className="w-full py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
            >
              {t("Guardar preferencias")}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
