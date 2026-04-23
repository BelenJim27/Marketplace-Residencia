"use client";

import { useState } from "react";

const SLIDES = [
    {
        id: 1,
        tipo: "productor",
        tarjeta: {
            imagen: "/placeholder-botella-grande.jpg",
            fondo: "#b07850",
        },
        circulos: [
            { imagen: "/placeholder-productor.jpg", etiqueta: "Maestro mezcalero" },
            { imagen: "/placeholder-botella-1.jpg", etiqueta: null },
            { imagen: "/placeholder-botella-2.jpg", etiqueta: null },
        ],
    },
    {
        id: 2,
        tipo: "frase",
        tarjeta: {
            frase: "Tradición que se destila, carácter que se disfruta: descubre el mezcal que transforma cada momento en algo extraordinario.",
            fondo: "#b07850",
        },
        circulos: [
            { imagen: "/placeholder-botella-3.jpg", etiqueta: null },
            { imagen: "/placeholder-botella-4.jpg", etiqueta: null },
            { imagen: "/placeholder-botella-5.jpg", etiqueta: null },
        ],
    },
];

export default function ConoceMas() {
    const [actual, setActual] = useState(0);
    const slide = SLIDES[actual];

    return (
        <section className="w-full py-20 px-6 bg-white">
            <div className="max-w-6xl mx-auto">

                {/* Título */}
                <h2
                    className="text-center text-4xl mb-12"
                    style={{ fontFamily: "Georgia, serif", color: "#8b6914", fontStyle: "italic" }}
                >
                    Conoce más de nuestros productos
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

                    {/* TARJETA IZQUIERDA */}
                    <div
                        className="rounded-3xl overflow-hidden h-80 md:h-96 relative flex items-center justify-center"
                        style={{ background: slide.tarjeta.fondo }}
                    >
                        {slide.tipo === "productor" ? (
                            <img
                                src={slide.tarjeta.imagen}
                                alt="Botella destacada"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                    const el = e.target as HTMLImageElement;
                                    el.style.display = "none";
                                    el.parentElement!.innerHTML = `
                                        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:white;font-family:Georgia,serif;text-align:center;padding:32px;">
                                            <div style="width:80px;height:200px;background:rgba(255,255,255,0.2);border-radius:8px;margin-bottom:12px;"></div>
                                            <span style="font-size:13px;opacity:0.8;">Imagen de botella</span>
                                        </div>`;
                                }}
                            />
                        ) : (
                            <div className="p-10 text-center">
                                <p
                                    className="text-white text-xl leading-relaxed italic mb-8"
                                    style={{ fontFamily: "Georgia, serif" }}
                                >
                                    {slide.tarjeta.frase}
                                </p>
                                {/* Decoración agaves */}
                                <div className="absolute bottom-4 left-4 opacity-40 text-4xl">🌿</div>
                                <div className="absolute bottom-4 right-4 opacity-40 text-4xl">🌿</div>
                                <div className="absolute top-6 right-8 opacity-30 text-2xl">🦇</div>
                            </div>
                        )}
                    </div>

                    {/* CÍRCULOS DERECHA */}
                    <div className="space-y-6">
                        <div className="flex items-start gap-6 flex-wrap">
                            {slide.circulos.map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-gray-100 shadow-md flex-shrink-0">
                                        <img
                                            src={item.imagen}
                                            alt={item.etiqueta || `Producto ${i + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const el = e.target as HTMLImageElement;
                                                el.style.display = "none";
                                                el.parentElement!.style.background =
                                                    i === 0 && slide.tipo === "productor"
                                                        ? "linear-gradient(135deg,#a8c5a0,#6b9e6b)"
                                                        : "linear-gradient(135deg,#c8a97a,#8b6914)";
                                                el.parentElement!.innerHTML = `
                                                    <div style="display:flex;align-items:center;justify-content:center;height:100%;color:white;font-size:11px;font-family:Georgia,serif;text-align:center;padding:8px;">
                                                        ${item.etiqueta || "Producto"}
                                                    </div>`;
                                            }}
                                        />
                                    </div>
                                    {item.etiqueta && (
                                        <p
                                            className="text-sm text-gray-600 italic text-center"
                                            style={{ fontFamily: "Georgia, serif" }}
                                        >
                                            {item.etiqueta}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Controles + botón */}
                        <div className="flex items-center justify-between pt-4">
                            <div className="flex gap-2">
                                {SLIDES.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActual(i)}
                                        className={`h-2 rounded-full transition-all ${
                                            i === actual ? "w-6 bg-[#8b6914]" : "w-2 bg-gray-300"
                                        }`}
                                    />
                                ))}
                            </div>

                            <button
                                className="px-8 py-3 rounded-full text-white font-semibold transition-all hover:opacity-90 shadow-md"
                                style={{ background: "#8b6914", fontFamily: "Georgia, serif" }}
                                onClick={() => setActual((p) => (p + 1) % SLIDES.length)}
                            >
                                Ver más
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}