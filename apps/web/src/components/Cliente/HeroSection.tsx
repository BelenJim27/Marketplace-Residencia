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
        /* 1. Cambiamos h-screen por una altura menor (ej. h-[60vh] o h-[500px]) */
        /* 2. Eliminamos min-h-[600px] para permitir que sea más corto */
        <section className="relative w-full h-[60vh] overflow-hidden">
            <div className="absolute inset-0">
                <video
                    src="/fotos/25.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                />
                {/* Un solo overlay — suficiente para legibilidad */}
                <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Contenido Hero */}
            {/* Ajustamos el padding (pb-12) para que el texto no quede pegado al borde inferior */}
            <div className="relative z-10 flex items-end justify-start h-full pb-12 px-12">
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