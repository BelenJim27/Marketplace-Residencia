"use client";

import { motion } from "framer-motion";
import { MEZCAL_COLORS, FONTS, OAXACA_REGIONS } from "./mezcal-constants";

export default function TerrorMap() {
  return (
    <section
      className="py-20 px-6 md:px-12 lg:px-20"
      style={{ backgroundColor: MEZCAL_COLORS.white_broken }}
    >
      <motion.div
        className="max-w-7xl mx-auto space-y-12"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div>
          <h2
            className="text-5xl md:text-6xl font-bold mb-4"
            style={{
              color: MEZCAL_COLORS.black_warm,
              fontFamily: FONTS.serif,
            }}
          >
            Terroir de Oaxaca
          </h2>
          <p
            className="text-lg max-w-2xl"
            style={{
              color: MEZCAL_COLORS.gray_dark,
              fontFamily: FONTS.sans,
            }}
          >
            Cinco regiones legendarias de Oaxaca, cada una con su propia identidad mineral
            y maestros mezcaleros ancestrales.
          </p>
        </div>

        {/* Mapa interactivo simplificado */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {OAXACA_REGIONS.map((region, idx) => (
            <motion.div
              key={region.name}
              className="p-6 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg"
              style={{
                borderColor: MEZCAL_COLORS.gold_mineral,
                backgroundColor: `${MEZCAL_COLORS.gold_mineral}08`,
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              viewport={{ once: true }}
            >
              <h3
                className="text-xl font-bold mb-2"
                style={{
                  color: MEZCAL_COLORS.earth_dark,
                  fontFamily: FONTS.serif,
                }}
              >
                {region.name}
              </h3>
              <p
                className="text-sm"
                style={{
                  color: MEZCAL_COLORS.gray_dark,
                  fontFamily: FONTS.sans,
                }}
              >
                <span
                  className="font-semibold"
                  style={{ color: MEZCAL_COLORS.gold_mineral }}
                >
                  {region.maestros}
                </span>{" "}
                maestros mezcaleros
              </p>
              <div
                className="mt-3 h-1 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${MEZCAL_COLORS.gold_mineral}, ${MEZCAL_COLORS.terracotta_dark})`,
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Story text */}
        <motion.div
          className="max-w-3xl space-y-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          viewport={{ once: true }}
        >
          <p
            className="text-lg leading-relaxed"
            style={{
              color: MEZCAL_COLORS.gray_dark,
              fontFamily: FONTS.sans,
            }}
          >
            Cada región presenta microclimas únicos, composiciones de suelo mineral
            distintas y tradiciones de destilación transmitidas de generación en
            generación. Los maestros mezcaleros locales han perfeccionado sus técnicas
            durante décadas, respetando métodos ancestrales mientras experimentan con
            nuevas expresiones.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
