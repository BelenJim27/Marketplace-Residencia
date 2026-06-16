// Construye el objeto schema.org/Product para el JSON-LD de la página de producto.
// Mantiene el page server limpio y reutilizable.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export interface ProductoSEO {
  id_producto?: number | string | bigint;
  nombre?: string;
  descripcion?: string | null;
  precio_base?: string | number | null;
  moneda_base?: string | null;
  imagen_principal_url?: string | null;
  imagen_url?: string | null;
  producto_imagenes?: { url: string }[];
  nombre_productor?: string | null;
  tiendas?: { nombre?: string | null } | null;
  stock?: number | null;
}

/** Convierte rutas relativas (/uploads/…) en URLs absolutas para JSON-LD/OG. */
export function toAbsoluteUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function buildProductJsonLd(p: ProductoSEO, pageUrl: string) {
  const images = [
    p.imagen_principal_url,
    p.imagen_url,
    ...(p.producto_imagenes?.map((i) => i.url) ?? []),
  ]
    .map(toAbsoluteUrl)
    .filter((v, i, arr): v is string => !!v && arr.indexOf(v) === i);

  const brandName = p.nombre_productor || p.tiendas?.nombre || undefined;
  const price = p.precio_base != null ? Number(p.precio_base) : undefined;
  const currency = (p.moneda_base || "MXN").toUpperCase();
  const inStock = p.stock == null ? true : Number(p.stock) > 0;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nombre,
    description: p.descripcion || undefined,
    ...(images.length ? { image: images } : {}),
    sku: p.id_producto != null ? String(p.id_producto) : undefined,
    productID: p.id_producto != null ? String(p.id_producto) : undefined,
    ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
    ...(price != null
      ? {
          offers: {
            "@type": "Offer",
            price: price.toFixed(2),
            priceCurrency: currency,
            availability: inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            url: pageUrl,
          },
        }
      : {}),
  };
}
