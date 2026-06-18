import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const res = await fetch(`${API_URL}/categorias/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const cat = await res.json();
      const nombre = cat?.nombre ?? slug;
      const descripcion = cat?.descripcion ?? `Explora productos de ${nombre} en Mezcales`;
      return {
        title: `${nombre} | Mezcales`,
        description: descripcion,
        openGraph: {
          title: `${nombre} | Mezcales`,
          description: descripcion,
          url: `${SITE_URL}/categoria/${slug}`,
          type: "website",
        },
        alternates: {
          canonical: `${SITE_URL}/categoria/${slug}`,
        },
      };
    }
  } catch {
    // API no disponible → metadata genérica
  }

  return {
    title: `Categoría | Mezcales`,
    description: "Explora nuestra selección de productos artesanales.",
  };
}

export default function CategoriaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
