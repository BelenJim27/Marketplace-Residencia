"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Heart, Share2, Search } from "lucide-react";
import { MEZCAL_COLORS, FONTS, MEZCALES_PREMIUM } from "./mezcal-constants";
import MezcalProductCard from "./MezcalProductCard";
import MezcalProductDetail from "./MezcalProductDetail";
import SensoryProfile from "./SensoryProfile";

type SortType = "precio-asc" | "precio-desc" | "nombre";

export default function MezcalPremiumCatalog() {
  const [selectedProduct, setSelectedProduct] = useState(MEZCALES_PREMIUM[0]);
  const [showDetail, setShowDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortType>("nombre");
  const [wishlist, setWishlist] = useState<number[]>([]);

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
    <div className="min-h-screen" style={{ backgroundColor: MEZCAL_COLORS.white_broken }}>
      {/* HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%231a1410" width="2" height="100"/><rect fill="%231a1410" x="100" y="0" width="2" height="100"/></svg>')`}}/>

        {/* Gradient mineral subtle */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(135deg, ${MEZCAL_COLORS.white_broken} 0%, ${MEZCAL_COLORS.gray_light} 50%, ${MEZCAL_COLORS.earth_light}20 100%)`,
          }}
        />

        <motion.div
          className="relative z-10 px-6 text-center space-y-8 max-w-4xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <motion.h1
            className="text-6xl md:text-7xl font-bold tracking-tight"
            style={{
              color: MEZCAL_COLORS.black_warm,
              fontFamily: FONTS.serif,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 1 }}
          >
            Colección Mineral
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl tracking-wide"
            style={{
              color: MEZCAL_COLORS.gray_dark,
              fontFamily: FONTS.sans,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            Mezcales Premium de Oaxaca. Cada botella cuenta la historia de generaciones
            de maestros mezcaleros y tierras ancestrales.
          </motion.p>

          <motion.div
            className="flex justify-center gap-4 pt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 1 }}
          >
            <button
              onClick={() => {
                const element = document.getElementById("catalog");
                element?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-8 py-3 text-sm font-semibold transition-all"
              style={{
                backgroundColor: MEZCAL_COLORS.earth_dark,
                color: MEZCAL_COLORS.white_broken,
              }}
            >
              Ver catálogo
            </button>
            <button
              className="px-8 py-3 text-sm font-semibold transition-all border-2"
              style={{
                borderColor: MEZCAL_COLORS.earth_dark,
                color: MEZCAL_COLORS.earth_dark,
              }}
            >
              Descubrir historias
            </button>
          </motion.div>
        </motion.div>

        {/* Chevron animado */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <ChevronDown
            size={32}
            style={{ color: MEZCAL_COLORS.earth_dark }}
            className="opacity-50"
          />
        </motion.div>
      </section>

      {/* CATÁLOGO SECTION */}
      <section
        id="catalog"
        className="relative py-20 px-6 md:px-12 lg:px-20"
        style={{ backgroundColor: MEZCAL_COLORS.white_broken }}
      >
        <motion.div
          className="max-w-7xl mx-auto space-y-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {/* Header */}
          <div className="space-y-8">
            <div>
              <h2
                className="text-5xl md:text-6xl font-bold tracking-tight mb-4"
                style={{
                  color: MEZCAL_COLORS.black_warm,
                  fontFamily: FONTS.serif,
                }}
              >
                Nuestras Expresiones
              </h2>
              <p
                className="text-lg"
                style={{
                  color: MEZCAL_COLORS.gray_dark,
                  fontFamily: FONTS.sans,
                }}
              >
                {filteredAndSorted.length} mezcales seleccionados. Cada uno, un universo mineral.
              </p>
            </div>

            {/* Controles invisibles */}
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: MEZCAL_COLORS.gray_medium }}
                />
                <input
                  type="text"
                  placeholder="Buscar por nombre, agave, maestro, región..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-transparent border-b-2 focus:outline-none transition-colors"
                  style={{
                    borderColor: MEZCAL_COLORS.gray_light,
                    color: MEZCAL_COLORS.black_warm,
                    fontFamily: FONTS.sans,
                  }}
                  onFocus={(e) => {
                    (e.target as any).style.borderColor = MEZCAL_COLORS.earth_dark;
                  }}
                  onBlur={(e) => {
                    (e.target as any).style.borderColor = MEZCAL_COLORS.gray_light;
                  }}
                />
              </div>

              {/* Sort dropdown */}
              <div className="flex items-center gap-4">
                <label style={{ fontFamily: FONTS.sans, color: MEZCAL_COLORS.gray_dark }}>
                  Ordenar por:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="px-4 py-2 bg-transparent border-b-2 focus:outline-none transition-colors text-sm"
                  style={{
                    borderColor: MEZCAL_COLORS.gray_light,
                    color: MEZCAL_COLORS.black_warm,
                    fontFamily: FONTS.sans,
                  }}
                >
                  <option value="nombre">Nombre</option>
                  <option value="precio-asc">Precio: Menor a Mayor</option>
                  <option value="precio-desc">Precio: Mayor a Menor</option>
                </select>
              </div>
            </div>
          </div>

          {/* GRID DINÁMICO (MASONRY-LIKE) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-max">
            <AnimatePresence mode="popLayout">
              {filteredAndSorted.map((mezcal, idx) => (
                <motion.div
                  key={mezcal.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                >
                  <MezcalProductCard
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
          </div>

          {filteredAndSorted.length === 0 && (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p style={{ color: MEZCAL_COLORS.gray_dark, fontFamily: FONTS.sans }}>
                No encontramos mezcales que coincidan con tu búsqueda.
              </p>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* PERFIL SENSORIAL - Featured Product */}
      {selectedProduct && (
        <section className="py-20 px-6 md:px-12 lg:px-20" style={{ backgroundColor: MEZCAL_COLORS.earth_dark }}>
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
                color: MEZCAL_COLORS.white_broken,
                fontFamily: FONTS.serif,
              }}
            >
              Perfil Sensorial: {selectedProduct.nombre}
            </h2>
            <SensoryProfile mezcal={selectedProduct} />
          </motion.div>
        </section>
      )}

      {/* MODAL DE DETALLE */}
      <AnimatePresence>
        {showDetail && selectedProduct && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg p-8"
              style={{
                backgroundColor: MEZCAL_COLORS.white_broken,
              }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
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
