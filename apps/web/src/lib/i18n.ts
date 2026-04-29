// Configuración de idiomas → moneda
export const LOCALE_CONFIG: Record<string, {
  label: string;
  flag: string;
  currency: string;
  numberLocale: string;
  langCode: string;
}> = {
  es: { label: "Español",  flag: "🇲🇽", currency: "MXN", numberLocale: "es-MX", langCode: "es" },
  en: { label: "English",  flag: "🇺🇸", currency: "USD", numberLocale: "en-US", langCode: "en" },
  fr: { label: "Français", flag: "🇫🇷", currency: "EUR", numberLocale: "fr-FR", langCode: "fr" },
  pt: { label: "Português",flag: "🇧🇷", currency: "BRL", numberLocale: "pt-BR", langCode: "pt" },
  zh: { label: "中文",      flag: "🇨🇳", currency: "CNY", numberLocale: "zh-CN", langCode: "zh" },
  ja: { label: "日本語",    flag: "🇯🇵", currency: "JPY", numberLocale: "ja-JP", langCode: "ja" },
};

// ─── Traducción con MyMemory ───────────────────────────────────────────────
const translationCache: Record<string, string> = {};

export async function translateText(text: string, targetLang: string): Promise<string> {
  if (targetLang === "es") return text;

  const cacheKey = `${targetLang}:${text}`;
  if (translationCache[cacheKey]) return translationCache[cacheKey];

  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=es|${targetLang}`
    );
    const data = await res.json();
    const translated = data.responseData.translatedText;
    translationCache[cacheKey] = translated;
    return translated;
  } catch {
    return text; // si falla, devuelve el original
  }
}

export async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  if (targetLang === "es") return texts;
  return Promise.all(texts.map(t => translateText(t, targetLang)));
}

// ─── Moneda con ExchangeRate-API ───────────────────────────────────────────
let ratesCache: { data: Record<string, number>; ts: number } | null = null;

export async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  // caché de 10 minutos
  if (ratesCache && now - ratesCache.ts < 600_000) return ratesCache.data;

  try {
    const KEY = process.env.NEXT_PUBLIC_EXCHANGERATE_API_KEY;
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${KEY}/latest/MXN`);
    const data = await res.json();
    ratesCache = { data: data.conversion_rates, ts: now };
    return ratesCache.data;
  } catch {
    return { MXN: 1 }; // si falla, sin conversión
  }
}

export function formatPrice(amount: number, currency: string, numberLocale: string): string {
  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}