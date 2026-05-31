"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Heart, Share2, Sparkles, Crown } from "lucide-react";
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

const AUDAZ_COLORS = {
  copper_bright: "#E8975C",
  bronze_dark: "#704214",
  amber_vibrant: "#FFA500",
  crimson_deep: "#8B1A1A",
  sage_dark: "#556B2F",
  midnight: "#0D0D13",
  cream: "#FFF8F0",
  gradient_copper: "linear-gradient(135deg, #E8975C 0%, #D4A574 100%)",
} as const;

export default function MezcalProductCardAudaz({
  mezcal,
  isInWishlist,
  onSelectProduct,
  onToggleWishlist,
}: Props) {
  const { t } = useLocale();
  const isEditionLimited = mezcal.botella_numero !== null;

  return (
    <motion.div
      className="group h-full flex flex-col relative"
      whileHover={{ y: -8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* GLOW EFFECT BEHIND */}
      <motion.div
        className="absolute -inset-4 rounded-2xl opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 -z-10"
        style={{
          background: AUDAZ_COLORS.gradient_copper,
        }}
      />

      {/* CARD CONTAINER CON BORDER DRAMÁTICO */}
      <motion.div
        className="relative flex flex-col h-full rounded-2xl border-2 overflow-hidden backdrop-blur-md"
        style={{
          borderColor: AUDAZ_COLORS.copper_bright + "60",
          background: `linear-gradient(135deg, ${MEZCAL_COLORS.earth_dark}dd 0%, ${mezcal.color}aa 100%)`,
          boxShadow: `0 8px 32px ${AUDAZ_COLORS.bronze_dark}40, inset 0 1px 0 ${AUDAZ_COLORS.copper_bright}20`,
        }}
      >
        {/* TOP ACCENT BAR */}
        <div
          className="h-1 w-full"
          style={{
            background: AUDAZ_COLORS.gradient_copper,
            boxShadow: `0 4px 12px ${AUDAZ_COLORS.copper_bright}60`,
          }}
        />

        {/* IMAGE CONTAINER */}
        <div className="relative aspect-[3/5] overflow-hidden bg-gradient-to-b from-transparent to-black/30">
          {/* BACKGROUND GRADIENT OVERLAY */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${AUDAZ_COLORS.copper_bright}50, transparent 70%)`,
            }}
          />

          {/* IMAGEN */}
          <Image
            src={mezcal.imagen}
            alt={mezcal.nombre}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, 33vw"
          />

          {/* EDITION BADGE - PREMIUM */}
          {isEditionLimited && (
            <motion.div
              className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border-2"
              style={{
                background: AUDAZ_COLORS.gradient_copper,
                borderColor: AUDAZ_COLORS.cream,
                color: MEZCAL_COLORS.black_warm,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Crown size={14} />
              <span
                className="text-xs font-bold"
                style={{ fontFamily: FONTS.mono }}
              >
                #{mezcal.botella_numero}
              </span>
            </motion.div>
          )}

          {/* BOTTOM GRADIENT OVERLAY */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
            style={{ pointerEvents: "none" }}
          />

          {/* ACTION BUTTONS - OVERLAY */}
          <motion.div
            className="absolute inset-0 flex items-end justify-between p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ pointerEvents: "none" }}
          >
            <motion.button
              onClick={onSelectProduct}
              className="px-6 py-3 text-sm font-bold rounded-lg uppercase tracking-wider transition-all"
              style={{
                background: AUDAZ_COLORS.gradient_copper,
                color: MEZCAL_COLORS.black_warm,
                boxShadow: `0 8px 20px ${AUDAZ_COLORS.copper_bright}60`,
                pointerEvents: "auto",
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
            >
              Ver Detalle
            </motion.button>

            <div className="flex gap-3" style={{ pointerEvents: "auto" }}>
              <motion.button
                onClick={onToggleWishlist}
                className="p-3 rounded-full backdrop-blur-md border-2 transition-all"
                style={{
                  borderColor: isInWishlist
                    ? AUDAZ_COLORS.copper_bright
                    : AUDAZ_COLORS.cream + "40",
                  background: isInWishlist
                    ? AUDAZ_COLORS.copper_bright
                    : "rgba(255,255,255,0.1)",
                  color: isInWishlist
                    ? MEZCAL_COLORS.black_warm
                    : AUDAZ_COLORS.cream,
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
              >
                <Heart
                  size={18}
                  fill={isInWishlist ? "currentColor" : "none"}
                />
              </motion.button>
              <motion.button
                className="p-3 rounded-full backdrop-blur-md border-2 transition-all"
                style={{
                  borderColor: AUDAZ_COLORS.cream + "40",
                  background: "rgba(255,255,255,0.1)",
                  color: AUDAZ_COLORS.cream,
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
              >
                <Share2 size={18} />
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* INFO SECTION */}
        <motion.div
          className="flex-1 flex flex-col justify-between p-6 space-y-4"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* NOMBRE */}
          <div className="space-y-2">
            <h3
              className="text-lg font-bold leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r transition-all duration-300"
              style={{
                fontFamily: FONTS.serif,
                color: AUDAZ_COLORS.cream,
                "--tw-gradient-from": AUDAZ_COLORS.copper_bright,
                "--tw-gradient-to": AUDAZ_COLORS.amber_vibrant,
              } as any}
            >
              {mezcal.nombre}
            </h3>
            <motion.p
              className="text-xs uppercase tracking-widest font-bold"
              style={{
                color: AUDAZ_COLORS.copper_bright,
                fontFamily: FONTS.mono,
              }}
              whileHover={{ letterSpacing: "0.1em" }}
            >
              {mezcal.edicion}
            </motion.p>
          </div>

          {/* SPECS GRID CON SEPARADORES */}
          <div
            className="grid grid-cols-2 gap-4 py-4 px-4 rounded-lg border-l-2"
            style={{
              borderColor: AUDAZ_COLORS.copper_bright,
              background: `linear-gradient(135deg, ${AUDAZ_COLORS.bronze_dark}20 0%, ${AUDAZ_COLORS.amber_vibrant}10 100%)`,
            }}
          >
            <div>
              <p
                className="text-xs mb-1"
                style={{
                  color: AUDAZ_COLORS.copper_bright,
                  fontFamily: FONTS.mono,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: "bold",
                }}
              >
                {t("Agave")}
              </p>
              <p
                className="font-semibold"
                style={{
                  color: AUDAZ_COLORS.cream,
                  fontFamily: FONTS.serif,
                  fontSize: "0.95rem",
                }}
              >
                {mezcal.agave}
              </p>
            </div>
            <div>
              <p
                className="text-xs mb-1"
                style={{
                  color: AUDAZ_COLORS.copper_bright,
                  fontFamily: FONTS.mono,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: "bold",
                }}
              >
                {t("Región")}
              </p>
              <p
                className="font-semibold text-sm"
                style={{
                  color: AUDAZ_COLORS.cream,
                  fontFamily: FONTS.serif,
                }}
              >
                {mezcal.region.split(" ")[0]}
              </p>
            </div>
          </div>

          {/* MAESTRO HIGHLIGHT */}
          <motion.div
            className="p-4 rounded-lg border-2 backdrop-blur-sm"
            style={{
              borderColor: AUDAZ_COLORS.sage_dark + "60",
              background: `linear-gradient(135deg, ${AUDAZ_COLORS.sage_dark}15 0%, ${AUDAZ_COLORS.bronze_dark}15 100%)`,
            }}
            whileHover={{
              borderColor: AUDAZ_COLORS.copper_bright,
              boxShadow: `0 0 20px ${AUDAZ_COLORS.copper_bright}40`,
            }}
          >
            <p
              className="text-xs mb-2 uppercase tracking-wider"
              style={{
                color: AUDAZ_COLORS.copper_bright,
                fontFamily: FONTS.mono,
                fontWeight: "bold",
              }}
            >
              {t("Maestro")}
            </p>
            <p
              className="font-bold text-sm"
              style={{
                color: AUDAZ_COLORS.cream,
                fontFamily: FONTS.serif,
              }}
            >
              {mezcal.maestro}
            </p>
          </motion.div>

          {/* AROMA PREVIEW */}
          <motion.div
            className="p-4 rounded-lg border-2 space-y-2"
            style={{
              borderColor: AUDAZ_COLORS.copper_bright + "40",
              background: `radial-gradient(circle at top right, ${AUDAZ_COLORS.amber_vibrant}15, ${AUDAZ_COLORS.bronze_dark}10)`,
            }}
            whileHover={{
              borderColor: AUDAZ_COLORS.copper_bright,
              boxShadow: `inset 0 0 20px ${AUDAZ_COLORS.copper_bright}20`,
            }}
          >
            <p
              className="text-xs font-bold mb-2 flex items-center gap-1.5 uppercase tracking-wider"
              style={{
                color: AUDAZ_COLORS.copper_bright,
                fontFamily: FONTS.mono,
              }}
            >
              <Sparkles size={14} />
              {t("Aroma")}
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{
                color: AUDAZ_COLORS.cream,
                fontFamily: FONTS.sans,
              }}
            >
              {mezcal.notas.aroma}
            </p>
          </motion.div>

          {/* FOOTER: PRECIO + CTA */}
          <motion.div className="flex items-center justify-between pt-4 border-t-2" style={{ borderColor: AUDAZ_COLORS.copper_bright + "40" }}>
            <motion.span
              className="text-3xl font-bold"
              style={{
                background: AUDAZ_COLORS.gradient_copper,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontFamily: FONTS.mono,
              }}
            >
              ${mezcal.precio.toLocaleString("es-MX")}
            </motion.span>

            <motion.button
              onClick={onSelectProduct}
              className="px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
              style={{
                background: AUDAZ_COLORS.gradient_copper,
                color: MEZCAL_COLORS.black_warm,
                boxShadow: `0 4px 12px ${AUDAZ_COLORS.copper_bright}40`,
              }}
              whileHover={{
                scale: 1.05,
                boxShadow: `0 8px 24px ${AUDAZ_COLORS.copper_bright}60`,
              }}
              whileTap={{ scale: 0.92 }}
            >
              {t("Explorar")}
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
