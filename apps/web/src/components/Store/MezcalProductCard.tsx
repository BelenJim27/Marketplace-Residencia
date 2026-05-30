"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Heart, Share2, Sparkles } from "lucide-react";
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
  isInWishlist: boolean;
  onSelectProduct: () => void;
  onToggleWishlist: () => void;
}

export default function MezcalProductCard({
  mezcal,
  isInWishlist,
  onSelectProduct,
  onToggleWishlist,
}: Props) {
  const { t } = useLocale();

  return (
    <motion.div
      className="group h-full flex flex-col"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* IMAGE CONTAINER */}
      <div
        className="relative aspect-[3/5] rounded-lg overflow-hidden cursor-pointer flex-shrink-0"
        style={{ backgroundColor: mezcal.color }}
      >
        {/* Hover overlay mineral effect */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${MEZCAL_COLORS.gold_mineral}40, transparent 60%)`,
          }}
        />

        {/* Imagen */}
        <Image
          src={mezcal.imagen}
          alt={mezcal.nombre}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, 33vw"
        />

        {/* Edición limitada badge */}
        {mezcal.botella_numero && (
          <motion.div
            className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-mono"
            style={{
              backgroundColor: MEZCAL_COLORS.gold_mineral,
              color: MEZCAL_COLORS.black_warm,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            #{mezcal.botella_numero}
          </motion.div>
        )}

        {/* Action buttons - appear on hover */}
        <motion.div
          className="absolute inset-0 flex items-end justify-between p-4 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <motion.button
            onClick={onSelectProduct}
            className="px-4 py-2 text-xs font-semibold rounded transition-all"
            style={{
              backgroundColor: MEZCAL_COLORS.gold_mineral,
              color: MEZCAL_COLORS.black_warm,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t("Ver detalle")}
          </motion.button>

          <div className="flex gap-2">
            <motion.button
              onClick={onToggleWishlist}
              className="p-2 rounded-full transition-all"
              style={{
                backgroundColor: isInWishlist ? MEZCAL_COLORS.gold_mineral : "rgba(255,255,255,0.2)",
                color: isInWishlist ? MEZCAL_COLORS.black_warm : MEZCAL_COLORS.white_broken,
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Heart size={18} fill={isInWishlist ? "currentColor" : "none"} />
            </motion.button>
            <motion.button
              className="p-2 rounded-full transition-all"
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                color: MEZCAL_COLORS.white_broken,
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Share2 size={18} />
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* INFO SECTION */}
      <motion.div
        className="flex-1 flex flex-col justify-between py-6 space-y-4"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Nombre y edición */}
        <div className="space-y-2">
          <h3
            className="text-lg font-semibold leading-tight"
            style={{
              color: MEZCAL_COLORS.black_warm,
              fontFamily: FONTS.serif,
            }}
          >
            {mezcal.nombre}
          </h3>
          <p
            className="text-xs tracking-wide"
            style={{
              color: MEZCAL_COLORS.gray_dark,
              fontFamily: FONTS.mono,
            }}
          >
            {mezcal.edicion}
          </p>
        </div>

        {/* Detalles técnicos */}
        <div
          className="grid grid-cols-2 gap-2 text-xs py-3 border-t border-b"
          style={{ borderColor: MEZCAL_COLORS.gray_light }}
        >
          <div>
            <p
              style={{
                color: MEZCAL_COLORS.gray_dark,
                fontFamily: FONTS.mono,
              }}
            >
              {t("Agave")}
            </p>
            <p
              className="font-semibold"
              style={{
                color: MEZCAL_COLORS.black_warm,
                fontFamily: FONTS.sans,
              }}
            >
              {mezcal.agave}
            </p>
          </div>
          <div>
            <p
              style={{
                color: MEZCAL_COLORS.gray_dark,
                fontFamily: FONTS.mono,
              }}
            >
              {t("Región")}
            </p>
            <p
              className="font-semibold"
              style={{
                color: MEZCAL_COLORS.black_warm,
                fontFamily: FONTS.sans,
              }}
            >
              {mezcal.region.split(" ")[0]}
            </p>
          </div>
        </div>

        {/* Maestro y aroma */}
        <div className="space-y-3">
          <div>
            <p
              className="text-xs"
              style={{
                color: MEZCAL_COLORS.gray_dark,
                fontFamily: FONTS.mono,
              }}
            >
              {t("Maestro Mezcalero")}
            </p>
            <p
              className="text-sm font-semibold"
              style={{
                color: MEZCAL_COLORS.earth_dark,
                fontFamily: FONTS.serif,
              }}
            >
              {mezcal.maestro}
            </p>
          </div>

          {/* Aroma preview */}
          <div
            className="p-3 rounded border-l-2"
            style={{
              backgroundColor: `${MEZCAL_COLORS.gold_mineral}10`,
              borderColor: MEZCAL_COLORS.gold_mineral,
            }}
          >
            <p
              className="text-xs font-semibold mb-1 flex items-center gap-1.5"
              style={{
                color: MEZCAL_COLORS.earth_dark,
                fontFamily: FONTS.mono,
              }}
            >
              <Sparkles size={14} />
              {t("Aroma")}
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{
                color: MEZCAL_COLORS.gray_dark,
                fontFamily: FONTS.sans,
              }}
            >
              {mezcal.notas.aroma}
            </p>
          </div>
        </div>

        {/* Precio y CTA */}
        <div className="flex items-center justify-between pt-3">
          <span
            className="text-2xl font-bold"
            style={{
              color: MEZCAL_COLORS.earth_dark,
              fontFamily: FONTS.mono,
            }}
          >
            ${mezcal.precio.toLocaleString("es-MX")}
          </span>
          <motion.button
            onClick={onSelectProduct}
            className="px-4 py-2 text-xs font-semibold rounded transition-all"
            style={{
              backgroundColor: MEZCAL_COLORS.earth_dark,
              color: MEZCAL_COLORS.white_broken,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t("Explorar")}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
