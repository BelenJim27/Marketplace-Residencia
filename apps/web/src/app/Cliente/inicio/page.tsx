/* 'use client';

import MezcalCanvas from '@/components/Cliente/Mezcalcanvas';
import HeroSection from '@/components/Cliente/HeroSection';
import { ScrollReveal } from '@/components/Cliente/ScrollReveal';
import SobreElMezcal from '@/components/Cliente/Mezcal';
import CarruselProductos from '@/components/Cliente/carruselProductos';
import ConoceMas from '@/components/Cliente/Flechas/conoceMas';
import Footer from "@/components/Cliente/Footer";

export default function InicioPage() {
  return (
    <div style={{ position: 'relative' }}>
      <MezcalCanvas />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <HeroSection />
      </div>

      <ScrollReveal delay={0}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <SobreElMezcal />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <CarruselProductos />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <ConoceMas />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Footer />
        </div>
      </ScrollReveal>
    </div>
  );
}*/


// web/app/Cliente/inicio/page.tsx
import SegundaOpcion from "@/components/Cliente/SegundaOpcion";

export default function Page() {
  return (
    <main>
      <SegundaOpcion />
    </main>
  );
}