import HeroSection from "@/components/Cliente/HeroSection";
import SobreElMezcal from "@/components/Cliente/Mezcal";
import CarruselProductos from "@/components/Cliente/carruselProductos";
import ConoceMas from "@/components/Cliente/Flechas/conoceMas";

export default function InicioCliente() {
    return (
        <main className="w-full">
            {/* 1. Hero con navbar */}
            <HeroSection />

            {/* 2. Sobre el mezcal */}
            <SobreElMezcal />

            {/* 3. Carrusel de productos con notas de cata */}
            <CarruselProductos />

            {/* 4. Conoce más productos */}
            <ConoceMas />
        </main>
    );
}