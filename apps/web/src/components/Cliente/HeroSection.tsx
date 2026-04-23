"use client";

import { useEffect, useState } from "react";

export default function HeroSection() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <section className="relative w-full h-screen min-h-[600px] overflow-hidden">
            {/* IMAGEN DE FONDO — reemplaza src con tu imagen real */}
            <div className="absolute inset-0">
                <img
                    src="/placeholder-hero.jpg"
                    alt="Campo de agave"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.background =
                            "linear-gradient(135deg, #2d4a2d 0%, #5c3d1e 50%, #8b6914 100%)";
                    }}
                />
                {/* Overlay oscuro para legibilidad */}
                <div className="absolute inset-0 bg-black/30" />
            </div>

            {/* NAVBAR */}
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    scrolled ? "bg-white shadow-md" : "bg-white"
                }`}
            >
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <img
                            src="/logo.png"
                            alt="Guardianas del Mezcal"
                            className="h-12 w-auto object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                    </div>

                    {/* Links centrales */}
                    <div className="flex items-center gap-10">
                        <NavItem icon="🏠" label="INICIO" href="#inicio" />
                        <NavItem icon="🍾" label="PRODUCTOS" href="#productos" />
                    </div>

                    {/* Acciones derecha */}
                    <div className="flex items-center gap-6">
                        <NavAction icon="🌐" label="ES / EN" />
                        <NavAction icon="🛒" label="CARRITO" />
                        <NavAction icon="👤" label="PERFIL" />
                        <NavAction icon="🔍" label="BUSCAR" />
                    </div>
                </div>
            </nav>

            {/* Contenido Hero */}
            <div className="relative z-10 flex items-end justify-start h-full pb-16 px-12">
                <div className="text-white">
                    <p className="text-lg font-light tracking-widest opacity-80 mb-2" style={{ fontFamily: "Georgia, serif" }}>
                        GUARDIANAS DEL MEZCAL
                    </p>
                    <h1 className="text-5xl font-bold leading-tight" style={{ fontFamily: "Georgia, serif" }}>
                        Tradición destilada
                    </h1>
                </div>
            </div>
        </section>
    );
}

function NavItem({ icon, label, href }: { icon: string; label: string; href: string }) {
    return (
        <a
            href={href}
            className="flex flex-col items-center gap-1 text-[#5c3d1e] hover:text-[#8b6914] transition-colors group"
        >
            <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
            <span className="text-[10px] font-bold tracking-widest">{label}</span>
        </a>
    );
}

function NavAction({ icon, label }: { icon: string; label: string }) {
    return (
        <button className="flex flex-col items-center gap-1 text-[#5c3d1e] hover:text-[#8b6914] transition-colors group">
            <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
            <span className="text-[10px] font-bold tracking-widest">{label}</span>
        </button>
    );
}