"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PRODUCTOS = [
    {
        id: 1,
        nombre: "Tobalá",
        subtitulo: "La expresión más pura de la naturaleza, custodiada por manos expertas que entienden el tiempo del agave.",
        imagen: "/fotos/28.1.png",
        notas: {
            vista: "Cristalino y brillante",
            nariz: "Herbal, notas de tierra y frutas dulces.",
            boca: "Cuerpo sedoso, ahumado sutil y final cítrico.",
        },
        anotaciones: [
            { texto: "Su transparencia total simboliza la honestidad y pureza del destilado, presentándolo sin filtros ni artificios.", posicion: "top-4 left-4 w-44" },
            { texto: "Una mujer naciendo del maguey personifica la unión sagrada entre mujer y tierra, honrándolas como guardianas de la sabiduría ancestral.", posicion: "top-4 right-4 w-44" },
            { texto: "Los tonos verdes y agaves en las esquinas representan el respeto al ciclo biológico y el resguardo de la biodiversidad oaxaqueña.", posicion: "bottom-4 left-4 w-44" },
        ],
    },
    {
        id: 2,
        nombre: "Espadín",
        subtitulo: "El alma del mezcal oaxaqueño, destilado con dedicación generación tras generación.",
        imagen: "/fotos/29.1.png",
        notas: {
            vista: "Dorado tenue con reflejos plateados",
            nariz: "Ahumado intenso, cítrico y mineral.",
            boca: "Robusto, especiado y largo retrogusto.",
        },
        anotaciones: [
            { texto: "El agave espadín es el más cultivado en Oaxaca, base de la cultura mezcalera.", posicion: "top-4 left-4 w-44" },
            { texto: "Cada piña tarda entre 7 y 10 años en madurar antes de ser cosechada.", posicion: "top-4 right-4 w-44" },
            { texto: "El proceso de tostado en horno cónico de tierra le otorga su carácter ahumado único.", posicion: "bottom-4 left-4 w-44" },
        ],
    },
    {
        id: 3,
        nombre: "Madrecuixe",
        subtitulo: "Un mezcal silvestre de carácter indomable, con la fiereza del agave en su estado más puro.",
        imagen: "/fotos/30.1.png",
        notas: {
            vista: "Transparente con destellos verdes",
            nariz: "Vegetal, herbal y notas de maguey fresco.",
            boca: "Seco, mineral y persistente con final floral.",
        },
        anotaciones: [
            { texto: "El madrecuixe silvestre tarda hasta 15 años en madurar en las montañas oaxaqueñas.", posicion: "top-4 left-4 w-44" },
            { texto: "Su cosecha es manual y selectiva, respetando la regeneración natural del agave.", posicion: "top-4 right-4 w-44" },
            { texto: "Producción limitada que refleja el compromiso con la sustentabilidad y la tradición.", posicion: "bottom-4 left-4 w-44" },
        ],
    },
];

export default function CarruselProductos() {
    const [actual, setActual] = useState(0);

    const anterior = () => setActual((prev) => (prev === 0 ? PRODUCTOS.length - 1 : prev - 1));
    const siguiente = () => setActual((prev) => (prev === PRODUCTOS.length - 1 ? 0 : prev + 1));

    const producto = PRODUCTOS[actual];

    return (
        <section
            id="productos"
            className="w-full py-20 px-6"
            style={{ background: "#faf8f4" }}
        >
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

                <div className="relative h-[480px] flex items-center justify-center">
                    <div
                        className="absolute w-80 h-80 rounded-full"
                        style={{ background: "#f0ebe0" }}
                    />

                    {producto.anotaciones.map((a, i) => (
                        <div
                            key={i}
                            className={`absolute ${a.posicion} text-xs text-gray-600 leading-snug z-10`}
                            style={{ fontFamily: "Georgia, serif" }}
                        >
                            {a.texto}
                        </div>
                    ))}

                    <div className="relative z-20 w-64 h-64 rounded-full overflow-hidden">
                        <img
                            src={producto.imagen}
                            alt={producto.nombre}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="absolute inset-0 pointer-events-none z-10">
                        <svg className="w-full h-full" viewBox="0 0 400 480">
                            <line x1="200" y1="150" x2="80" y2="60" stroke="#c8a97a" strokeWidth="0.8" strokeDasharray="4,4" opacity="0.6" />
                            <line x1="200" y1="150" x2="320" y2="60" stroke="#c8a97a" strokeWidth="0.8" strokeDasharray="4,4" opacity="0.6" />
                            <line x1="200" y1="340" x2="80" y2="420" stroke="#c8a97a" strokeWidth="0.8" strokeDasharray="4,4" opacity="0.6" />
                        </svg>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2
                        className="text-6xl font-bold"
                        style={{ fontFamily: "Georgia, serif", color: "#5c3d1e" }}
                    >
                        {producto.nombre}
                    </h2>

                    <p
                        className="text-gray-600 text-lg leading-relaxed italic"
                        style={{ fontFamily: "Georgia, serif" }}
                    >
                        "{producto.subtitulo}"
                    </p>

                    <div className="space-y-3 pt-4">
                        <h3 className="font-bold text-gray-800 text-sm tracking-widest uppercase">
                            Notas de cata
                        </h3>
                        <div className="space-y-2">
                            <p className="text-gray-700">
                                <span className="font-semibold">Vista:</span> {producto.notas.vista}
                            </p>
                            <p className="text-gray-700">
                                <span className="font-semibold">Nariz:</span> {producto.notas.nariz}
                            </p>
                            <p className="text-gray-700">
                                <span className="font-semibold">Boca:</span> {producto.notas.boca}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-4">
                        <button
                            onClick={anterior}
                            className="w-11 h-11 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-[#8b6914] hover:text-[#8b6914] transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="flex gap-2">
                            {PRODUCTOS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActual(i)}
                                    className={`w-2 h-2 rounded-full transition-all ${i === actual ? "bg-[#8b6914] w-6" : "bg-gray-300"}`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={siguiente}
                            className="w-11 h-11 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-[#8b6914] hover:text-[#8b6914] transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}