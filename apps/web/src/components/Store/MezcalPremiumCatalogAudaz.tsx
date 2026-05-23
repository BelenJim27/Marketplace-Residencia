"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Heart, Share2, Search, Zap } from "lucide-react";
import { MEZCAL_COLORS, FONTS, MEZCALES_PREMIUM } from "./mezcal-constants";
import MezcalProductCardAudaz from "./MezcalProductCardAudaz";
import MezcalProductDetail from "./MezcalProductDetail";
import SensoryProfile from "./SensoryProfile";

type SortType = "precio-asc" | "precio-desc" | "nombre";

// Paleta extendida DRAMÁTICA
const AUDAZ_COLORS = {
  ...MEZCAL_COLORS,
  // Nuevos acentos dramáticos
  copper_bright: "#E8975C", // Cobre brillante
  bronze_dark: "#704214", // Bronce oscuro
  amber_vibrant: "#FFA500", // Ámbar vibrante
  crimson_deep: "#8B1A1A", // Carmesí profundo
  sage_dark: "#556B2F", // Salvia oscura
  midnight: "#0D0D13", // Negro azulado profundo
  cream: "#FFF8F0", // Crema cálida

  // Overlays y efectos
  gradient_warm: "linear-gradient(135deg, #704214 0%, #8B7355 50%, #D4A574 100%)",
  gradient_dramatic: "linear-gradient(135deg, #0D0D13 0%, #2B2420 50%, #704214 100%)",
  gradient_copper: "linear-gradient(135deg, #E8975C 0%, #D4A574 100%)",
} as const;

export default function MezcalPremiumCatalogAudaz() {
  const [selectedProduct, setSelectedProduct] = useState(MEZCALES_PREMIUM[0]);
  const [showDetail, setShowDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortType>("nombre");
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "carousel">("grid");

  const filteredAndSorted = useMemo(() => {
    let filtered = MEZCALES_PREMIUM;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.nombre.toLowerCase().includes(term) ||
          m.agave.toLowerCase().includes(term) ||
          m.maestro.toLowerCase().includes(term) ||
          m.region.toLowerCase().includes(term)
      );
    }

    const sorted = [...filtered];
    if (sortBy === "precio-asc") sorted.sort((a, b) => a.precio - b.precio);
    if (sortBy === "precio-desc") sorted.sort((a, b) => b.precio - a.precio);
    if (sortBy === "nombre") sorted.sort((a, b) => a.nombre.localeCompare(b.nombre));

    return sorted;
  }, [searchTerm, sortBy]);

  const toggleWishlist = (id: number) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: AUDAZ_COLORS.gradient_dramatic,
        color: AUDAZ_COLORS.cream,
      }}
    >
      {/* EFECTO TEXTURA BACKGROUND */}
      <div
        className="fixed inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" /></filter><rect width="100" height="100" fill="%23FFF8F0" filter="url(%23noise)" opacity="0.1"/></svg>')`,
          backgroundSize: "100px 100px",
        }}
      />

      {/* GRADIENTE RADIAL SUTIL */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 20% 80%, ${AUDAZ_COLORS.copper_bright}20 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${AUDAZ_COLORS.crimson_deep}15 0%, transparent 50%)`,
        }}
      />

      <section className="relative z-10 py-16 px-6 md:px-12 lg:px-20">
        <motion.div
          className="max-w-7xl mx-auto space-y-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* HEADER DRAMÁTICO */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-2 h-8 rounded-full"
                  style={{
                    background: AUDAZ_COLORS.gradient_copper,
                    boxShadow: `0 0 20px ${AUDAZ_COLORS.copper_bright}60`,
                  }}
                />
                <span
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: AUDAZ_COLORS.copper_bright }}
                >
                  Colección Premium
                </span>
              </div>

              <h2
                className="text-6xl md:text-7xl font-bold tracking-tight"
                style={{
                  fontFamily: FONTS.serif,
                  background: AUDAZ_COLORS.gradient_copper,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Nuestras Expresiones
              </h2>

              <p
                className="text-lg max-w-2xl leading-relaxed"
                style={{ color: AUDAZ_COLORS.gray_light }}
              >
                {filteredAndSorted.length} mezcales seleccionados. Una colección
                de lujo que celebra la maestría y la tradición oaxaqueña.
              </p>
            </div>

            {/* CONTROLES CON ESTILO DRAMÁTICO */}
            <div className="space-y-4">
              {/* Search */}
              <motion.div
                className="relative group"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg blur-xl"
                  style={{
                    background: `radial-gradient(circle, ${AUDAZ_COLORS.copper_bright}40, transparent)`,
                  }}
                />
                <div className="relative">
                  <Search
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: AUDAZ_COLORS.copper_bright }}
                  />
                  <input
                    type="text"
                    placeholder="Buscar mezcal, agave, maestro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-lg border-2 bg-transparent backdrop-blur-sm focus:outline-none transition-all"
                    style={{
                      borderColor: AUDAZ_COLORS.copper_bright + "40",
                      color: AUDAZ_COLORS.cream,
                      fontFamily: FONTS.sans,
                    }}
                    onFocus={(e) => {
                      (e.target as any).style.borderColor = AUDAZ_COLORS.copper_bright;
                      (e.target as any).style.boxShadow = `0 0 20px ${AUDAZ_COLORS.copper_bright}40`;
                    }}
                    onBlur={(e) => {
                      (e.target as any).style.borderColor =
                        AUDAZ_COLORS.copper_bright + "40";
                      (e.target as any).style.boxShadow = "none";
                    }}
                  />
                </div>
              </motion.div>

              {/* Sort + View toggle */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <label
                    style={{
                      fontFamily: FONTS.mono,
                      color: AUDAZ_COLORS.gray_medium,
                      fontSize: "0.875rem",
                    }}
                  >
                    ORDENAR:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortType)}
                    className="px-4 py-2 rounded-lg bg-transparent border-2 focus:outline-none transition-all"
                    style={{
                      borderColor: AUDAZ_COLORS.copper_bright + "40",
                      color: AUDAZ_COLORS.cream,
                      fontFamily: FONTS.sans,
                    }}
                  >
                    <option value="nombre">Nombre A-Z</option>
                    <option value="precio-asc">Precio: Menor</option>
                    <option value="precio-desc">Precio: Mayor</option>
                  </select>
                </div>

                {/* View toggle */}
                <motion.div className="flex gap-2">
                  {["grid", "carousel"].map((mode) => (
                    <motion.button
                      key={mode}
                      onClick={() => setViewMode(mode as any)}
                      className="px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all"
                      style={{
                        backgroundColor:
                          viewMode === mode
                            ? AUDAZ_COLORS.copper_bright
                            : "transparent",
                        color: viewMode === mode ? AUDAZ_COLORS.midnight : AUDAZ_COLORS.copper_bright,
                        border: `2px solid ${viewMode === mode ? "transparent" : AUDAZ_COLORS.copper_bright + "40"}`,
                        boxShadow:
                          viewMode === mode
                            ? `0 0 20px ${AUDAZ_COLORS.copper_bright}60`
                            : "none",
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {mode === "grid" ? "Cuadrícula" : "Carrusel"}
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* GRID AUDAZ */}
          <motion.div
            className={`${
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                : "flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <AnimatePresence mode="popLayout">
              {filteredAndSorted.map((mezcal, idx) => (
                <motion.div
                  key={mezcal.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{
                    duration: 0.4,
                    delay: viewMode === "grid" ? idx * 0.05 : 0,
                  }}
                  className={viewMode === "carousel" ? "snap-center flex-shrink-0 w-80" : ""}
                >
                  <MezcalProductCardAudaz
                    mezcal={mezcal}
                    isInWishlist={wishlist.includes(mezcal.id)}
                    onSelectProduct={() => {
                      setSelectedProduct(mezcal);
                      setShowDetail(true);
                    }}
                    onToggleWishlist={() => toggleWishlist(mezcal.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {filteredAndSorted.length === 0 && (
            <motion.div
              className="text-center py-20 space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Zap
                size={48}
                style={{ color: AUDAZ_COLORS.copper_bright, margin: "0 auto" }}
              />
              <p style={{ color: AUDAZ_COLORS.gray_light }}>
                No encontramos mezcales con esos criterios.
              </p>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* PERFIL SENSORIAL - Featured */}
      {selectedProduct && (
        <section
          className="relative z-10 py-20 px-6 md:px-12 lg:px-20"
          style={{
            background: `linear-gradient(135deg, ${AUDAZ_COLORS.midnight}dd 0%, ${AUDAZ_COLORS.bronze_dark}dd 100%)`,
            borderTop: `2px solid ${AUDAZ_COLORS.copper_bright}40`,
          }}
        >
          <motion.div
            className="max-w-7xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2
              className="text-4xl font-bold mb-12"
              style={{
                color: AUDAZ_COLORS.copper_bright,
                fontFamily: FONTS.serif,
              }}
            >
              Perfil Sensorial: {selectedProduct.nombre}
            </h2>
            <SensoryProfile mezcal={selectedProduct} />
          </motion.div>
        </section>
      )}

      {/* MODAL */}
      <AnimatePresence>
        {showDetail && selectedProduct && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{
              backgroundColor: `${AUDAZ_COLORS.midnight}80`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-8"
              style={{
                background: AUDAZ_COLORS.gradient_dramatic,
                border: `2px solid ${AUDAZ_COLORS.copper_bright}40`,
                boxShadow: `0 25px 50px -12px ${AUDAZ_COLORS.copper_bright}40`,
              }}
              initial={{ scale: 0.85, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 40 }}
              onClick={(e) => e.stopPropagation()}
            >
              <MezcalProductDetail
                mezcal={selectedProduct}
                onClose={() => setShowDetail(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
