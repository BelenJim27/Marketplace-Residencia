"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/context/LocaleContext";
import { LOCALE_CONFIG } from "@/lib/i18n";

export function LocaleSwitcher() {
  const { locale } = useLocale();
  const router = useRouter();
  const cfg = LOCALE_CONFIG[locale] ?? LOCALE_CONFIG["es"];

  const SHORT: Record<string, string> = {
    es: "ES",
    en: "EN",
    fr: "FR",
    pt: "PT",
    zh: "ZH",
    ja: "JA",
  };

  return (
    <button
      onClick={() => router.push("/preferencias")}
      style={{ color: "#F4F0E3" }}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium
                 tracking-wide hover:opacity-70 transition-opacity
                 focus-visible:outline-2 focus-visible:outline-offset-2
                 focus-visible:outline-[#C97A3E]"
      aria-label="Cambiar idioma y moneda"
    >
      <span>{cfg.flag}</span>
      <span>{SHORT[locale] ?? "ES"}</span>
    </button>
  );
}
