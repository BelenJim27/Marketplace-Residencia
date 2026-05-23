"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { X, Heart, Share2, ShoppingCart } from "lucide-react";
import { MEZCAL_COLORS, FONTS } from "./mezcal-constants";

interface Mezcal {
  id: number;
  nombre: string;
  precio: number;
  agave: string;
  region: string;
  maestro: string;
  edicion: string;
  botella_numero: number | null;
  notas: {
    aroma: string;
    sabor: string;
    cuerpo: number;
    final: number;
    complejidad: number;
  };
  descripcion: string;
  imagen: string;
  color: string;
}

interface Props {
  mezcal: Mezcal;
  onClose: () => void;
}

export default function MezcalProductDetail({ mezcal, onClose }: Props) {
  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <X size={24} style={{ color: MEZCAL_COLORS.black_warm }} />
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Imagen grande */}
        <motion.div
          className="relative aspect-[3/5] rounded-lg overflow-hidden flex-shrink-0"
          style={{ backgroundColor: mezcal.color }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Image
            src={mezcal.imagen}
            alt={mezcal.nombre}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          {mezcal.botella_numero && (
            <div
              className="absolute top-6 right-6 px-4 py-2 rounded-full text-sm font-mono font-semibold"
              style={{
                backgroundColor: MEZCAL_COLORS.gold_mineral,
                color: MEZCAL_COLORS.black_warm,
              }}
            >
              Botella #{mezcal.botella_numero}
            </div>
          )}
        </motion.div>

        {/* Información */}
        <motion.div
          className="flex flex-col justify-between space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Header */}
          <div className="space-y-4">
            <h1
              className="text-4xl font-bold leading-tight"
              style={{
                color: MEZCAL_COLORS.black_warm,
                fontFamily: FONTS.serif,
              }}
            >
              {mezcal.nombre}
            </h1>
            <p
              className="text-lg font-semibold"
              style={{
                color: MEZCAL_COLORS.earth_dark,
                fontFamily: FONTS.sans,
              }}
            >
              ${mezcal.precio.toLocaleString("es-MX")} MXN
            </p>
            <p
              className="text-sm tracking-wide"
              style={{
                color: MEZCAL_COLORS.gray_dark,
                fontFamily: FONTS.mono,
              }}
            >
              {mezcal.edicion}
            </p>
          </div>

          {/* Detalles clave */}
          <div
            className="grid grid-cols-2 gap-4 p-4 rounded border"
            style={{
              borderColor: MEZCAL_COLORS.gray_light,
              backgroundColor: `${MEZCAL_COLORS.gold_mineral}08`,
            }}
          >
            <div>
              <p
                className="text-xs font-mono"
                style={{ color: MEZCAL_COLORS.gray_dark }}
              >
                AGAVE
              </p>
              <p
                className="text-lg font-semibold"
                style={{
                  color: MEZCAL_COLORS.black_warm,
                  fontFamily: FONTS.serif,
                }}
              >
                {mezcal.agave}
              </p>
            </div>
            <div>
              <p
                className="text-xs font-mono"
                style={{ color: MEZCAL_COLORS.gray_dark }}
              >
                REGIÓN
              </p>
              <p
                className="text-lg font-semibold"
                style={{
                  color: MEZCAL_COLORS.black_warm,
                  fontFamily: FONTS.serif,
                }}
              >
                {mezcal.region}
              </p>
            </div>
          </div>

          {/* Maestro */}
          <div
            className="p-4 rounded border-l-4"
            style={{
              borderColor: MEZCAL_COLORS.earth_dark,
              backgroundColor: `${MEZCAL_COLORS.earth_dark}08`,
            }}
          >
            <p
              className="text-xs font-mono mb-2"
              style={{ color: MEZCAL_COLORS.gray_dark }}
            >
              MAESTRO MEZCALERO
            </p>
            <p
              className="text-xl font-semibold"
              style={{
                color: MEZCAL_COLORS.earth_dark,
                fontFamily: FONTS.serif,
              }}
            >
              {mezcal.maestro}
            </p>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <h3
              className="text-sm font-semibold"
              style={{
                color: MEZCAL_COLORS.black_warm,
                fontFamily: FONTS.mono,
              }}
            >
              SOBRE ESTA EXPRESIÓN
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{
                color: MEZCAL_COLORS.gray_dark,
                fontFamily: FONTS.sans,
              }}
            >
              {mezcal.descripcion}
            </p>
          </div>

          {/* Notas de cata */}
          <div className="space-y-3">
            <h3
              className="text-sm font-semibold"
              style={{
                color: MEZCAL_COLORS.black_warm,
                fontFamily: FONTS.mono,
              }}
            >
              NOTAS DE CATA
            </h3>
            <div className="space-y-2">
              <div>
                <p
                  className="text-xs font-mono"
                  style={{ color: MEZCAL_COLORS.gray_dark }}
                >
                  AROMA
                </p>
                <p
                  className="text-sm"
                  style={{
                    color: MEZCAL_COLORS.black_warm,
                    fontFamily: FONTS.sans,
                  }}
                >
                  {mezcal.notas.aroma}
                </p>
              </div>
              <div>
                <p
                  className="text-xs font-mono"
                  style={{ color: MEZCAL_COLORS.gray_dark }}
                >
                  SABOR
                </p>
                <p
                  className="text-sm"
                  style={{
                    color: MEZCAL_COLORS.black_warm,
                    fontFamily: FONTS.sans,
                  }}
                >
                  {mezcal.notas.sabor}
                </p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4 pt-6">
            <motion.button
              className="flex-1 px-6 py-3 font-semibold rounded flex items-center justify-center gap-2 transition-all"
              style={{
                backgroundColor: MEZCAL_COLORS.earth_dark,
                color: MEZCAL_COLORS.white_broken,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ShoppingCart size={18} />
              Agregar al carrito
            </motion.button>
            <motion.button
              className="px-4 py-3 rounded border-2 transition-all"
              style={{
                borderColor: MEZCAL_COLORS.earth_dark,
                color: MEZCAL_COLORS.earth_dark,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Heart size={18} />
            </motion.button>
            <motion.button
              className="px-4 py-3 rounded border-2 transition-all"
              style={{
                borderColor: MEZCAL_COLORS.earth_dark,
                color: MEZCAL_COLORS.earth_dark,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Share2 size={18} />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
