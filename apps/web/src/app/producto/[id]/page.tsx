import type { Metadata } from "next";
import ProductoDetalleCliente from "@/app/cliente/producto/[id]/page";
import { buildProductJsonLd, toAbsoluteUrl, type ProductoSEO } from "@/lib/product-jsonld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Fetch server-side del producto para SEO/JSON-LD. Tolerante a fallos: si la API
// no responde, devolvemos null y caemos a metadata genérica (sin romper la página).
async function getProducto(id: string): Promise<ProductoSEO | null> {
  try {
    const res = await fetch(`${API_URL}/productos/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as ProductoSEO;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getProducto(id);
  const canonical = `/producto/${id}`;
  if (!p?.nombre) {
    return { title: "Producto", alternates: { canonical } };
  }
  const description = (p.descripcion || "Mezcal artesanal de Oaxaca.").slice(0, 160);
  const image = toAbsoluteUrl(p.imagen_principal_url || p.imagen_url);
  return {
    title: p.nombre,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: p.nombre,
      description,
      url: `${SITE_URL}${canonical}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: p.nombre,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

// Server component: emite JSON-LD Product + metadata y renderiza la UI cliente
// existente (sin redirect). `/producto/[id]` es ahora la URL canónica indexable;
// `/cliente/producto/[id]` queda como ruta interna (Disallow en robots.ts).
export default async function ProductoPublicoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getProducto(id);
  const jsonLd = p ? buildProductJsonLd(p, `${SITE_URL}/producto/${id}`) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProductoDetalleCliente />
    </>
  );
}
