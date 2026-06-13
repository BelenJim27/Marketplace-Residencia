import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Revalida el sitemap cada hora (las URLs de producto cambian con el catálogo).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/producto`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/categoria`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/returns-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/shipping-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/alcohol-disclaimer`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // URLs dinámicas de producto. Si la API no responde, devolvemos solo las estáticas.
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/productos?limit=1000`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json: unknown = await res.json();
      const list: any[] = Array.isArray(json)
        ? json
        : Array.isArray((json as any)?.data)
          ? (json as any).data
          : Array.isArray((json as any)?.items)
            ? (json as any).items
            : [];
      productRoutes = list
        .map((p) => p?.id_producto ?? p?.id)
        .filter((id) => id != null)
        .map((id) => ({
          url: `${SITE_URL}/producto/${id}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.6,
        }));
    }
  } catch {
    // Sin conexión a la API → sitemap solo con rutas estáticas.
  }

  return [...staticRoutes, ...productRoutes];
}
