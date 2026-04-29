import { Metadata } from "next";
import ProductCatalogClient from "@/components/catalog/Client";
import ProductCarousel from "@/components/catalog/ProductCarousel";
import TrustCards from "@/components/catalog/TrustCards";

export const metadata: Metadata = {
  title: { absolute: "Productos" },
};

export default function ProductoPage() {
  return (
    <div className="space-y-8">
      {/* ── CARRUSEL DE PRODUCTOS DESTACADOS ── */}
      <div id="carousel">
        <ProductCarousel />
      </div>

      {/* ── CARDS DE CONFIANZA Y VALORES ── */}
      <div id="trust-cards">
        <TrustCards />
      </div>

      {/* ── CATÁLOGO DE PRODUCTOS ── */}
      <div id="catalogo">
        <ProductCatalogClient />
      </div>
    </div>
  );
}