"use client";
import { useLocale } from "@/context/LocaleContext";

export default function SobreElMezcal() {
  const { t } = useLocale(); // Extraemos la función de traducción

  return (
    <section
      id="inicio"
      className="w-full py-24 px-6"
      style={{ background: "transparent" }}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
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
              className="text-lg leading-relaxed text-center md:text-left italic text-[#3c1c08] dark:text-white transition-colors duration-300"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {t(texto)}
            </p>
          ))}
        </div>
        
        <div className="grid grid-cols-3 grid-rows-3 gap-2 h-80 md:h-96">
          <div className="col-span-1 row-span-2 rounded-xl overflow-hidden">
            <img src="/fotos/22.jpeg" alt={t("Mezcal 1")} className="w-full h-full object-cover" />
          </div>
          <div className="col-span-2 row-span-1 rounded-xl overflow-hidden">
            <img src="/fotos/24.jpeg" alt={t("Mezcal 2")} className="w-full h-full object-cover" />
          </div>
          <div className="col-span-1 row-span-1 rounded-xl overflow-hidden">
            <img src="/fotos/20.jpeg" alt={t("Mezcal 3")} className="w-full h-full object-cover" />
          </div>
          <div className="col-span-1 row-span-1 rounded-xl overflow-hidden">
            <img src="/fotos/16.jpg" alt={t("Mezcal 4")} className="w-full h-full object-cover" />
          </div>
          <div className="col-span-2 row-span-1 rounded-xl overflow-hidden">
            <img src="/fotos/15.jpg" alt={t("Mezcal 5")} className="w-full h-full object-cover" />
          </div>
          <div className="col-span-1 row-span-1 rounded-xl overflow-hidden">
            <img src="/fotos/5.jpg" alt={t("Mezcal 6")} className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}