"use client";

import HeroSection from "@/components/Cliente/HeroSection";
import SobreElMezcal from "@/components/Cliente/Mezcal";
import CarruselProductos from "@/components/Cliente/carruselProductos";
import ConoceMas from "@/components/Cliente/Flechas/conoceMas";
import { ScrollReveal } from "@/components/Cliente/ScrollReveal";

export default function InicioCliente() {
  return (
    <main className="w-full">
      {/* Hero sin efecto — es lo primero que se ve */}
      <HeroSection />

      <ScrollReveal delay={0}>
        <SobreElMezcal />
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <CarruselProductos />
      </ScrollReveal>

      <ScrollReveal delay={200}>
        <ConoceMas />
      </ScrollReveal>
    </main>
  );
}