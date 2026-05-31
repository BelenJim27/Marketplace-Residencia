"use client";

import { useRef, useState, useEffect } from "react";
import { useLocale } from "@/context/LocaleContext";
import { LOCALE_CONFIG } from "@/lib/i18n";
import type { Currency } from "@/context/LocaleContext";

const LOCALES = Object.entries(LOCALE_CONFIG) as [string, (typeof LOCALE_CONFIG)[string]][];

export function LocaleSwitcher() {
  const { locale, setLocale, setCurrency, currency } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = LOCALE_CONFIG[locale] ?? LOCALE_CONFIG["es"];

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Cierra con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleSelect = (newLocale: string) => {
    const newCfg = LOCALE_CONFIG[newLocale];
    setLocale(newLocale);
    setCurrency(newCfg.currency as Currency);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ color: "#F4F0E3" }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium
                   tracking-wide hover:opacity-70 transition-opacity
                   focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-[#C97A3E]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Cambiar idioma y moneda"
      >
        <span aria-hidden="true">{cfg.flag}</span>
        <span>{locale.toUpperCase()}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Seleccionar idioma y moneda"
          className="absolute right-0 mt-1 w-48 rounded-xl shadow-xl overflow-hidden z-50 border"
          style={{ backgroundColor: "#1F3A2E", borderColor: "#2d5240" }}
        >
          {LOCALES.map(([key, c]) => {
            const isActive = key === locale;
            return (
              <button
                key={key}
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(key)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors duration-100"
                style={{
                  color: isActive ? "#C97A3E" : "#F4F0E3",
                  backgroundColor: isActive ? "#162d22" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2d5240";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                }}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">{c.flag}</span>
                  <span className="font-medium">{c.label}</span>
                </span>
                <span className="text-xs opacity-60 font-mono">{c.currency}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
