"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/context/LocaleContext";

export default function HeroSection() {
    const [scrolled, setScrolled] = useState(false);
    const { t } = useLocale(); // Extraemos la función de traducción

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
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
                <div className="absolute inset-0 bg-black/40" />
            </div>

            <div className="relative z-10 flex items-end justify-start h-full pb-12 px-12">
                <div className="text-white">
                    <p className="text-lg font-light tracking-widest opacity-80 mb-2" style={{ fontFamily: "Georgia, serif" }}>
                        {/* Traducimos el nombre de la marca */}
                        {t("GUARDIANAS DEL MEZCAL")}
                    </p>
                    <h1 className="text-5xl font-bold leading-tight" style={{ fontFamily: "Georgia, serif" }}>
                        {/* Traducimos el eslogan */}
                        {t("Tradición destilada")}
                    </h1>
                </div>
            </div>
        </section>
    );
}

// Estos sub-componentes ahora están listos para recibir labels traducidos desde el padre
function NavItem({ icon, label, href }: { icon: string; label: string; href: string }) {
    const { t } = useLocale();
    return (
        <a
            href={href}
            className="flex flex-col items-center gap-1 text-[#5c3d1e] hover:text-[#8b6914] transition-colors group"
        >
            <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
            <span className="text-[10px] font-bold tracking-widest">{t(label)}</span>
        </a>
    );
}

function NavAction({ icon, label }: { icon: string; label: string }) {
    const { t } = useLocale();
    return (
        <button className="flex flex-col items-center gap-1 text-[#5c3d1e] hover:text-[#8b6914] transition-colors group">
            <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
            <span className="text-[10px] font-bold tracking-widest">{t(label)}</span>
        </button>
    );
}