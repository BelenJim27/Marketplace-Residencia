import HeroSection from "@/components/Cliente/HeroSection";
import SobreElMezcal from "@/components/Cliente/Mezcal";
import CarruselProductos from "@/components/Cliente/carruselProductos";
import ConoceMas from "@/components/Cliente/Flechas/conoceMas";

export default function InicioCliente() {
  return (
    <main className="w-full">
      <HeroSection />
      <SobreElMezcal />
      <CarruselProductos />
      <ConoceMas />
    </main>
  );
}