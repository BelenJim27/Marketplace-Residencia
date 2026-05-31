"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Heart, Share2, ChevronRight } from "lucide-react";
import { useLocale } from "@/context/LocaleContext";
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
  backgroundColor: string;
  isInWishlist: boolean;
  onSelectProduct: () => void;
  onToggleWishlist: () => void;
  customImage?: string; // Imagen local personalizada
}

export default function MezcalProductCardModerno({
  mezcal,
  backgroundColor,
  isInWishlist,
  onSelectProduct,
  onToggleWishlist,
  customImage,
}: Props) {
  const { t } = useLocale();

  return (
    <motion.div
      className="flex flex-col h-full group"
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
    >
      {/* CARD CON FONDO DE COLOR */}
      <motion.div
        className="relative flex flex-col h-full rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow"
        style={{ backgroundColor }}
      >
        {/* TOP BAR CON EDICIÓN */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div className="space-y-1">
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{
                color: MEZCAL_COLORS.gray_dark,
                fontFamily: FONTS.mono,
              }}
            >
              {mezcal.agave}
            </p>
            <h3
              className="text-xl font-bold leading-tight"
              style={{
                color: MEZCAL_COLORS.black_warm,
                fontFamily: FONTS.serif,
              }}
            >
              {mezcal.nombre}
            </h3>
          </div>

          {/* EDICIÓN BADGE */}
          {mezcal.botella_numero && (
            <motion.span
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{
                backgroundColor: "#556B2F",
                color: backgroundColor,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              #{mezcal.botella_numero}
            </motion.span>
          )}
        </div>

        {/* IMAGEN CENTRADA - MÁS GRANDE */}
        <motion.div
          className="relative flex-1 flex items-center justify-center py-6"
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 0.4 }}
        >
          <div className="relative w-48 h-80">
            <Image
              src={customImage || mezcal.imagen}
              alt={mezcal.nombre}
              fill
              className="object-contain drop-shadow-xl"
              sizes="400px"
              priority={!!customImage}
            />
          </div>
        </motion.div>

        {/* FOOTER CON INFO Y ACCIONES */}
        <div
          className="px-6 pb-6 space-y-4 border-t-2"
          style={{ borderColor: MEZCAL_COLORS.black_warm + "20" }}
        >
          {/* Maestro */}
          <div>
            <p
              className="text-xs uppercase tracking-widest font-bold mb-1"
              style={{
                color: MEZCAL_COLORS.gray_dark,
                fontFamily: FONTS.mono,
              }}
            >
              {t("Maestro")}
            </p>
            <p
              className="font-semibold"
              style={{
                color: MEZCAL_COLORS.black_warm,
                fontFamily: FONTS.serif,
              }}
            >
              {mezcal.maestro}
            </p>
          </div>

          {/* Región */}
          <div className="flex items-center justify-between text-sm">
            <span
              style={{
                color: MEZCAL_COLORS.gray_dark,
                fontFamily: FONTS.sans,
              }}
            >
              {mezcal.region}
            </span>
            <span
              className="font-bold"
              style={{
                color: MEZCAL_COLORS.black_warm,
                fontFamily: FONTS.mono,
              }}
            >
              {mezcal.notas.complejidad}/10
            </span>
          </div>

          {/* Precio y Acciones */}
          <motion.div className="flex items-end justify-between pt-2">
            <div>
              <p
                className="text-xs uppercase tracking-widest font-bold mb-1"
                style={{
                  color: MEZCAL_COLORS.gray_dark,
                  fontFamily: FONTS.mono,
                }}
              >
                Precio
              </p>
              <p
                className="text-2xl font-bold"
                style={{
                  color: MEZCAL_COLORS.black_warm,
                  fontFamily: FONTS.mono,
                }}
              >
                ${mezcal.precio.toLocaleString("es-MX")}
              </p>
            </div>

            <div className="flex gap-2">
              <motion.button
                onClick={onToggleWishlist}
                className="p-2.5 rounded-full transition-all"
                style={{
                  backgroundColor: isInWishlist
                    ? MEZCAL_COLORS.black_warm
                    : MEZCAL_COLORS.white_broken,
                  color: isInWishlist ? backgroundColor : MEZCAL_COLORS.black_warm,
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.85 }}
              >
                <Heart
                  size={18}
                  fill={isInWishlist ? "currentColor" : "none"}
                />
              </motion.button>

              <motion.button
                className="p-2.5 rounded-full transition-all"
                style={{
                  backgroundColor: MEZCAL_COLORS.black_warm,
                  color: backgroundColor,
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.85 }}
              >
                <Share2 size={18} />
              </motion.button>
            </div>
          </motion.div>

          {/* CTA Principal */}
          <motion.button
            onClick={onSelectProduct}
            className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all uppercase tracking-wide"
            style={{
              backgroundColor: MEZCAL_COLORS.black_warm,
              color: backgroundColor,
            }}
            whileHover={{
              backgroundColor: MEZCAL_COLORS.earth_dark,
            }}
            whileTap={{ scale: 0.95 }}
          >
            {t("Ver detalle")}
            <ChevronRight size={16} />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
