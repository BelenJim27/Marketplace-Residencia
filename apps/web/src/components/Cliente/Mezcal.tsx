"use client";

export default function SobreElMezcal() {
    return (
        <section
            id="inicio"
            className="w-full py-24 px-6 bg-white"
        >
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

                {/* TEXTO */}
                <div className="flex flex-col justify-center space-y-4">
                    <p
                        className="text-gray-700 text-lg leading-relaxed text-center md:text-left"
                        style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
                    >
                        Descubre el auténtico sabor del mezcal, un destilado artesanal
                        nacido del corazón del agave.
                    </p>
                    <p
                        className="text-gray-700 text-lg leading-relaxed text-center md:text-left"
                        style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
                    >
                        Elaborado con procesos tradicionales que respetan la tierra y el
                        tiempo, cada botella guarda carácter y tradición.
                    </p>
                    <p
                        className="text-gray-700 text-lg leading-relaxed text-center md:text-left"
                        style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
                    >
                        Sus notas ahumadas y matices únicos lo convierten en una
                        experiencia inigualable.
                    </p>
                    <p
                        className="text-gray-700 text-lg leading-relaxed text-center md:text-left"
                        style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
                    >
                        Perfecto para celebrar, compartir y disfrutar momentos especiales.
                    </p>
                    <p
                        className="text-gray-700 text-lg leading-relaxed text-center md:text-left"
                        style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
                    >
                        Conoce nuestros mezcales y encuentra el que va contigo.
                    </p>
                </div>

                {/* IMAGEN */}
                <div className="relative rounded-2xl overflow-hidden shadow-xl h-80 md:h-96">
                    <img
                        src="/placeholder-proceso.jpg"
                        alt="Proceso artesanal del mezcal"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = "none";
                            el.parentElement!.style.background =
                                "linear-gradient(135deg, #c8a97a 0%, #8b6914 100%)";
                            el.parentElement!.innerHTML = `
                                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:white;font-size:14px;font-family:Georgia,serif;text-align:center;padding:20px;">
                                    Imagen: Proceso artesanal del mezcal
                                </div>`;
                        }}
                    />
                </div>
            </div>
        </section>
    );
}