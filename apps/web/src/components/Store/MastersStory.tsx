"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { MEZCAL_COLORS, FONTS } from "./mezcal-constants";

interface Master {
  nombre: string;
  region: string;
  anios_experiencia: number;
  historia: string;
  especialidad: string;
  imagen: string;
}

interface Props {
  master: Master;
}

export default function MastersStory({ master }: Props) {
  return (
    <section
      className="py-20 px-6 md:px-12 lg:px-20"
      style={{
        backgroundColor: MEZCAL_COLORS.black_warm,
      }}
    >
      <motion.div
        className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        {/* Imagen */}
        <motion.div
          className="relative aspect-square rounded-lg overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          viewport={{ once: true }}
        >
          <Image
            src={master.imagen}
            alt={master.nombre}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
          />
        </motion.div>

        {/* Contenido */}
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div>
            <p
              className="text-xs font-mono mb-2"
              style={{
                color: MEZCAL_COLORS.gold_mineral,
              }}
            >
              MAESTRO MEZCALERO
            </p>
            <h2
              className="text-5xl font-bold"
              style={{
                color: MEZCAL_COLORS.white_broken,
                fontFamily: FONTS.serif,
              }}
            >
              {master.nombre}
            </h2>
          </div>

          {/* Datos clave */}
          <div
            className="grid grid-cols-2 gap-4 p-4 rounded border-l-4"
            style={{
              borderColor: MEZCAL_COLORS.gold_mineral,
              backgroundColor: `${MEZCAL_COLORS.gold_mineral}15`,
            }}
          >
            <div>
              <p
                className="text-xs font-mono"
                style={{
                  color: MEZCAL_COLORS.gold_mineral,
                }}
              >
                REGIÓN
              </p>
              <p
                className="text-lg font-bold mt-1"
                style={{
                  color: MEZCAL_COLORS.white_broken,
                  fontFamily: FONTS.serif,
                }}
              >
                {master.region}
              </p>
            </div>
            <div>
              <p
                className="text-xs font-mono"
                style={{
                  color: MEZCAL_COLORS.gold_mineral,
                }}
              >
                AÑOS DE EXPERIENCIA
              </p>
              <p
                className="text-lg font-bold mt-1"
                style={{
                  color: MEZCAL_COLORS.white_broken,
                  fontFamily: FONTS.serif,
                }}
              >
                +{master.anios_experiencia}
              </p>
            </div>
          </div>

          {/* Historia */}
          <div className="space-y-4">
            <h3
              className="text-2xl font-bold"
              style={{
                color: MEZCAL_COLORS.white_broken,
                fontFamily: FONTS.serif,
              }}
            >
              Su Historia
            </h3>
            <p
              className="text-base leading-relaxed"
              style={{
                color: MEZCAL_COLORS.gray_light,
                fontFamily: FONTS.sans,
              }}
            >
              {master.historia}
            </p>
          </div>

          {/* Especialidad */}
          <div
            className="p-4 rounded border-l-4"
            style={{
              borderColor: MEZCAL_COLORS.terracotta_dark,
              backgroundColor: `${MEZCAL_COLORS.terracotta_dark}20`,
            }}
          >
            <p
              className="text-xs font-mono mb-2"
              style={{
                color: MEZCAL_COLORS.terracotta_light,
              }}
            >
              ESPECIALIDAD
            </p>
            <p
              className="text-lg font-semibold"
              style={{
                color: MEZCAL_COLORS.white_broken,
                fontFamily: FONTS.sans,
              }}
            >
              {master.especialidad}
            </p>
          </div>

          {/* CTA */}
          <motion.button
            className="px-8 py-3 font-semibold rounded text-base"
            style={{
              backgroundColor: MEZCAL_COLORS.gold_mineral,
              color: MEZCAL_COLORS.black_warm,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Descubrir sus mezcales
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  );
}
