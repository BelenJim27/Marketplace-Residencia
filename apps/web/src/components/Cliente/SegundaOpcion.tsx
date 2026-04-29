"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/context/LocaleContext";

// --- CONFIGURACIÓN Y TIPOS ---
interface Producto {
  id: number;
  nombre: string;
  subtitulo: string;
  imagen: string;
  notas: { vista: string; nariz: string; boca: string };
  anotaciones: { texto: string; posicion: string }[];
}

interface Slide {
  id: number;
  imagen: string;
  circulos: { imagen: string; etiqueta?: string }[];
}

const SLIDES: Slide[] = [
  { id: 1, imagen: "/fotos/28.1.png", circulos: [{ imagen: "/fotos/5.jpg" }, { imagen: "/fotos/20.jpeg", etiqueta: "Maestro mezcalero" }, { imagen: "/fotos/22.jpeg" }] },
  { id: 2, imagen: "/fotos/29.1.png", circulos: [{ imagen: "/fotos/15.jpg" }, { imagen: "/fotos/24.jpeg" }, { imagen: "/fotos/22.jpeg" }] },
];

const PRODUCTOS: Producto[] = [
  {
    id: 1,
    nombre: "Tobalá",
    subtitulo: "La expresión más pura de la naturaleza.",
    imagen: "/fotos/28.1.png",
    notas: { vista: "Cristalino", nariz: "Herbal", boca: "Cuerpo sedoso" },
    anotaciones: [{ texto: "Honestidad y pureza", posicion: "top-10 left-10" }],
  },
];

// --- COMPONENTE PRINCIPAL ---
export default function LandingPageOaxaca() {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <main className="bg-[#F9F8F4] text-[#2D3A30] min-h-screen font-sans selection:bg-[#2D3A30] selection:text-white">
      
      {/* 1. HERO SECTION (Rediseñado como la imagen) */}
      <section className="relative w-full h-[85vh] flex items-center px-12 overflow-hidden bg-white">
        <div className="absolute inset-0 z-0">
          <video src="/fotos/25.mp4" autoPlay muted loop className="w-full h-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <span className="text-[#4A5D4E] tracking-[0.2em] text-xs font-bold uppercase mb-4 block">
            {t("Trazabilidad • Origen • Identidad")}
          </span>
          <h1 className="text-7xl font-serif leading-[1.1] mb-6 text-[#1A241E]">
            {t("Oaxaca auténtico, trazable y justo")}
          </h1>
          <p className="text-lg text-[#4A5D4E] mb-8 font-light max-w-md">
            {t("Conectamos el origen, la tradición y el talento de nuestras comunidades con el mundo.")}
          </p>
          <button 
            onClick={() => router.push("/Cliente/producto")}
            className="bg-[#1A5D3B] text-white px-8 py-4 rounded-md font-medium hover:bg-[#14462C] transition-all flex items-center gap-3 shadow-lg shadow-green-900/10"
          >
            {t("Explorar productos")} <ArrowRight />
          </button>
        </div>
      </section>

      {/* 2. SOBRE EL MEZCAL (Estilo Minimalista) */}
      <section className="py-24 px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="h-px w-20 bg-[#C8A97A]" />
            <div className="space-y-6">
              <p className="text-2xl font-serif italic text-[#3c1c08] leading-relaxed">
                {t("Descubre el auténtico sabor del mezcal, un destilado artesanal nacido del corazón del agave.")}
              </p>
              <p className="text-[#5C6B5E] text-lg leading-relaxed">
                {t("Elaborado con procesos tradicionales que respetan la tierra y el tiempo.")}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 h-[500px]">
             <div className="rounded-2xl overflow-hidden shadow-xl"><img src="/fotos/22.jpeg" className="w-full h-full object-cover" /></div>
             <div className="space-y-4">
                <div className="h-1/2 rounded-2xl overflow-hidden shadow-xl"><img src="/fotos/24.jpeg" className="w-full h-full object-cover" /></div>
                <div className="h-1/2 rounded-2xl overflow-hidden shadow-xl bg-[#2D3A30] flex items-center justify-center p-6 text-white text-center italic font-serif">
                  "El alma de Oaxaca en cada gota"
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* 3. CARRUSEL DE PRODUCTOS (Detallado y Limpio) */}
      <ProductoDetallado t={t} producto={PRODUCTOS[0]} />

      {/* 4. CONOCE MÁS (Slider de exploración) */}
      <ConoceMasSlider t={t} slide={SLIDES[0]} />

      {/* 5. FOOTER (Elegante y oscuro) */}
      <footer className="bg-[#1A241E] text-[#D1D5D2] py-20 px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <h3 className="text-white font-serif text-2xl mb-6 italic">{t("Guardianas del Mezcal")}</h3>
            <p className="max-w-sm text-sm leading-relaxed opacity-70">
              {t("Honrando la tierra, el fuego y las manos que transforman el agave en espíritu puro.")}
            </p>
          </div>
          <div>
            <h4 className="text-[#C8A97A] uppercase tracking-widest text-xs font-bold mb-6">{t("Explorar")}</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">{t("Maestras mezcaleras")}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t("Nuestro proceso")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#C8A97A] uppercase tracking-widest text-xs font-bold mb-6">{t("Contacto")}</h4>
            <p className="text-sm opacity-70">guardianasmezcal@gmail.com</p>
            <p className="text-sm opacity-70 mt-2">Oaxaca, México</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/10 text-[10px] uppercase tracking-[0.3em] text-center opacity-50">
          2026 © {t("Guardianas de mezcal")}
        </div>
      </footer>
    </main>
  );
}

// --- SUB-COMPONENTES AUXILIARES ---

function ProductoDetallado({ t, producto }: { t: any, producto: Producto }) {
  return (
    <section className="bg-white py-24 px-12 border-y border-[#E5E5E1]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div className="relative group">
          <div className="absolute inset-0 bg-[#F9F8F4] rounded-full scale-90 transition-transform group-hover:scale-100 duration-1000" />
          <img src={producto.imagen} className="relative z-10 w-full max-w-sm mx-auto drop-shadow-2xl" />
        </div>
        <div className="space-y-8">
          <h2 className="text-6xl font-serif text-[#1A241E]">{t(producto.nombre)}</h2>
          <p className="text-xl italic text-[#4A5D4E] font-serif border-l-4 border-[#C8A97A] pl-6">
            "{t(producto.subtitulo)}"
          </p>
          <div className="grid grid-cols-1 gap-4 pt-4">
             {Object.entries(producto.notas).map(([key, val]) => (
               <div key={key} className="flex justify-between border-b border-[#E5E5E1] py-3">
                 <span className="font-bold text-xs uppercase tracking-widest text-[#C8A97A]">{t(key)}</span>
                 <span className="text-sm italic">{t(val)}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ConoceMasSlider({ t, slide }: { t: any, slide: Slide }) {
  return (
    <section className="py-24 px-12">
      <h2 className="text-center font-serif text-4xl mb-16">{t("Conoce más de nuestros productos")}</h2>
      <div className="max-w-5xl mx-auto flex justify-center gap-12">
        {slide.circulos.map((c, i) => (
          <div key={i} className="text-center group">
            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-xl transition-transform group-hover:rotate-3 duration-500">
              <img src={c.imagen} className="w-full h-full object-cover" />
            </div>
            {c.etiqueta && <p className="mt-4 font-serif italic text-[#4A5D4E]">{t(c.etiqueta)}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function ArrowRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  );
}