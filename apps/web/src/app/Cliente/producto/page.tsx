import { Metadata } from "next";
import { HeroMezcal } from "@/components/catalog/HeroMezcal";
import ProductCatalogEnhanced from "@/components/catalog/Client";
import TrustCards from "@/components/catalog/TrustCards";

export const metadata: Metadata = {
  title: { absolute: "Catálogo de Mezcales" },
};

export default function ProductoPage() {
  return (
    <div className="w-full">
      {/* ── HERO IMPACTANTE CON PARALLAX ── */}
      <HeroMezcal />

     

      {/* ── CATÁLOGO DE PRODUCTOS ── */}
      <div id="catalogo">
        <ProductCatalogEnhanced />
      </div>
    </div>
  );
}