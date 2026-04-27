"use client";

export default function SobreElMezcal() {
    return (
        <section
            id="inicio"
            className="w-full py-24 px-6"
            style={{ background: "rgba(92, 48, 24, 0.55)" }}  // ✅ café terracota translúcido
        >
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

                {/* TEXTO */}
                <div className="flex flex-col justify-center space-y-4">
                    {[
                        "Descubre el auténtico sabor del mezcal, un destilado artesanal nacido del corazón del agave.",
                        "Elaborado con procesos tradicionales que respetan la tierra y el tiempo, cada botella guarda carácter y tradición.",
                        "Sus notas ahumadas y matices únicos lo convierten en una experiencia inigualable.",
                        "Perfecto para celebrar, compartir y disfrutar momentos especiales.",
                        "Conoce nuestros mezcales y encuentra el que va contigo.",
                    ].map((texto, i) => (
                        <p
                            key={i}
                            className="text-lg leading-relaxed text-center md:text-left"
                            style={{
                                fontFamily: "Georgia, serif",
                                fontStyle: "italic",
                                color: "#f0ddb8",
                            }}
                        >
                            {texto}
                        </p>
                    ))}
                </div>

                {/* GRID DE IMÁGENES */}
                <div className="grid grid-cols-3 grid-rows-3 gap-2 h-80 md:h-96">
                    <div className="col-span-1 row-span-2 rounded-xl overflow-hidden">
                        <img src="/fotos/22.jpeg" alt="Mezcal 1" className="w-full h-full object-cover" />
                    </div>
                    <div className="col-span-2 row-span-1 rounded-xl overflow-hidden">
                        <img src="/fotos/24.jpeg" alt="Mezcal 2" className="w-full h-full object-cover" />
                    </div>
                    <div className="col-span-1 row-span-1 rounded-xl overflow-hidden">
                        <img src="/fotos/20.jpeg" alt="Mezcal 3" className="w-full h-full object-cover" />
                    </div>
                    <div className="col-span-1 row-span-1 rounded-xl overflow-hidden">
                        <img src="/fotos/16.jpg" alt="Mezcal 4" className="w-full h-full object-cover" />
                    </div>
                    <div className="col-span-2 row-span-1 rounded-xl overflow-hidden">
                        <img src="/fotos/15.jpg" alt="Mezcal 5" className="w-full h-full object-cover" />
                    </div>
                    <div className="col-span-1 row-span-1 rounded-xl overflow-hidden">
                        <img src="/fotos/5.jpg" alt="Mezcal 6" className="w-full h-full object-cover" />
                    </div>
                </div>
            </div>
        </section>
    );
}