"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Heart, Share2, Search, Zap, Filter } from "lucide-react";
import { MEZCAL_COLORS, FONTS, MEZCALES_PREMIUM } from "./mezcal-constants";
import MezcalProductCardModerno from "./MezcalProductCardModerno";
import MezcalProductDetail from "./MezcalProductDetail";

type SortType = "precio-asc" | "precio-desc" | "nombre";

// Paleta terrosa auténtica
const MODERNO_COLORS = {
  // Primarios terrosos
  olive_green: "#556B2F", // Verde olivo profundo
  terracotta: "#C94430", // Terracota
  gold_ochre: "#DAA520", // Oro ocre (Goldenrod)
  cream_light: "#F5F1ED", // Crema muy claro
  earth_brown: "#8B6F47", // Marrón tierra

  // Secundarios por agave (terrosos)
  tobal_gold: "#D4A574", // Tobalá oro
  espadin_olive: "#6B8E23", // Espadín verde olivo
  madrecuixe_terra: "#CD7F32", // Madrecuixe bronce/terracota
  cuishe_ochre: "#B8860B", // Cuishe ocre oscuro
  arroqueno_rust: "#A0522D", // Arroqueño marrón rojizo
  pechuga_sienna: "#8B4513", // Pechuga siena oscura

  // Acentos
  copper_accent: "#D4A574",
  text_dark: "#3E3E3E",
  text_light: "#6B6B6B",
} as const;

export default function MezcalPremiumCatalogModerno() {
  const [selectedProduct, setSelectedProduct] = useState(MEZCALES_PREMIUM[0]);
  const [showDetail, setShowDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortType>("nombre");
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [filterRegion, setFilterRegion] = useState("");
  const [filterAgave, setFilterAgave] = useState("");

  const regions = useMemo(
    () => Array.from(new Set(MEZCALES_PREMIUM.map((m) => m.region))),
    []
  );
  const agaves = useMemo(
    () => Array.from(new Set(MEZCALES_PREMIUM.map((m) => m.agave))),
    []
  );

  const filteredAndSorted = useMemo(() => {
    let filtered = MEZCALES_PREMIUM;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.nombre.toLowerCase().includes(term) ||
          m.maestro.toLowerCase().includes(term)
      );
    }

    if (filterRegion) {
      filtered = filtered.filter((m) => m.region === filterRegion);
    }

    if (filterAgave) {
      filtered = filtered.filter((m) => m.agave === filterAgave);
    }

    const sorted = [...filtered];
    if (sortBy === "precio-asc") sorted.sort((a, b) => a.precio - b.precio);
    if (sortBy === "precio-desc") sorted.sort((a, b) => b.precio - a.precio);
    if (sortBy === "nombre") sorted.sort((a, b) => a.nombre.localeCompare(b.nombre));

    return sorted;
  }, [searchTerm, sortBy, filterRegion, filterAgave]);

  const toggleWishlist = (id: number) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Assign color to each product (Paleta terrosa)
  const getProductColor = (id: number): string => {
    const colors = [
      MODERNO_COLORS.tobal_gold,        // Oro
      MODERNO_COLORS.espadin_olive,     // Verde olivo
      MODERNO_COLORS.madrecuixe_terra,  // Terracota
      MODERNO_COLORS.cuishe_ochre,      // Ocre
      MODERNO_COLORS.arroqueno_rust,    // Marrón rojizo
      MODERNO_COLORS.pechuga_sienna,    // Siena oscura
    ];
    return colors[(id - 1) % colors.length];
  };

  // Map real bottle images
  const getCustomImage = (id: number): string | undefined => {
    const imageMap: Record<number, string> = {
      1: "/images/mezcal-24.png", // Raíces Ancestrales
      2: "/images/mezcal-25.png", // Expresión Madre
      3: "/images/mezcal-26.png", // Mineralidad Pura
      4: "/images/mezcal-27.png", // Legado de Humo
    };
    return imageMap[id];
  };

  return (
    <div style={{ backgroundColor: MODERNO_COLORS.cream_light, minHeight: "100vh" }}>
      {/* HEADER MODERNO */}
      <motion.header
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: MODERNO_COLORS.cream_light,
          borderColor: MODERNO_COLORS.olive_green + "20",
        }}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-4 flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.05 }}
            style={{
              color: MODERNO_COLORS.olive_green,
              fontFamily: FONTS.serif,
              fontSize: "1.5rem",
              fontWeight: "bold",
            }}
          >
            🥃 Mezcal Terruno
          </motion.div>

          <div className="flex items-center gap-4">
            <span style={{ color: MODERNO_COLORS.text_light, fontSize: "0.875rem" }}>
              {filteredAndSorted.length} productos
            </span>
          </div>
        </div>
      </motion.header>

      {/* HERO SECTION CON IMAGEN BOTELLA */}
      <motion.section
        className="py-12 px-6 md:px-12 lg:px-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* TEXTO */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div>
              <motion.p
                className="text-sm font-bold uppercase tracking-widest mb-3"
                style={{
                  color: MODERNO_COLORS.terracotta,
                  fontFamily: FONTS.mono,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                ✓ TERROIR OAXAQUEÑO
              </motion.p>

              <motion.h1
                className="text-5xl md:text-6xl font-bold mb-4"
                style={{
                  color: MODERNO_COLORS.olive_green,
                  fontFamily: FONTS.serif,
                }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                Mezcales Premium
              </motion.h1>
            </div>

            <motion.p
              className="text-lg leading-relaxed max-w-xl"
              style={{
                color: MODERNO_COLORS.text_light,
                fontFamily: FONTS.sans,
              }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Descubre nuestras expresiones más finas de Oaxaca, cada una con su propia historia y carácter. Elaboradas por maestros mezcaleros con tradición ancestral.
            </motion.p>

            {/* STATS */}
            <motion.div
              className="flex gap-8 pt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div>
                <p
                  className="text-2xl font-bold"
                  style={{ color: MODERNO_COLORS.olive_green }}
                >
                  6
                </p>
                <p
                  className="text-xs uppercase"
                  style={{
                    color: MODERNO_COLORS.text_light,
                    fontFamily: FONTS.mono,
                  }}
                >
                  Expresiones
                </p>
              </div>
              <div>
                <p
                  className="text-2xl font-bold"
                  style={{ color: MODERNO_COLORS.olive_green }}
                >
                  5
                </p>
                <p
                  className="text-xs uppercase"
                  style={{
                    color: MODERNO_COLORS.text_light,
                    fontFamily: FONTS.mono,
                  }}
                >
                  Regiones
                </p>
              </div>
              <div>
                <p
                  className="text-2xl font-bold"
                  style={{ color: MODERNO_COLORS.olive_green }}
                >
                  100%
                </p>
                <p
                  className="text-xs uppercase"
                  style={{
                    color: MODERNO_COLORS.text_light,
                    fontFamily: FONTS.mono,
                  }}
                >
                  Artesanal
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* IMAGEN BOTELLA */}
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, scale: 0.8, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              className="relative w-72 h-96"
              whileHover={{ y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full blur-3xl opacity-30"
                style={{
                  background: MODERNO_COLORS.olive_green,
                }}
              />

              <div className="relative z-10 w-full h-full flex items-center justify-center">
                <Image
                  src="/images/mezcal-botella.png"
                  alt="Guardianas del Mezcal - Botella de Mezcal Premium"
                  width={300}
                  height={400}
                  className="object-contain drop-shadow-2xl"
                  priority
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* BUSCADOR Y FILTROS */}
      <section className="py-8 px-6 md:px-12 lg:px-20 border-b" style={{ borderColor: MODERNO_COLORS.olive_green + "20" }}>
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Search */}
          <motion.div
            className="relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: MODERNO_COLORS.olive_green }}
            />
            <input
              type="text"
              placeholder="Buscar mezcal o maestro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg border-2 bg-white focus:outline-none transition-all"
              style={{
                borderColor: MODERNO_COLORS.olive_green + "40",
                color: MODERNO_COLORS.text_dark,
              }}
              onFocus={(e) => {
                (e.target as any).style.borderColor = MODERNO_COLORS.olive_green;
                (e.target as any).style.boxShadow = `0 0 0 3px ${MODERNO_COLORS.olive_green}15`;
              }}
              onBlur={(e) => {
                (e.target as any).style.borderColor =
                  MODERNO_COLORS.olive_green + "40";
                (e.target as any).style.boxShadow = "none";
              }}
            />
          </motion.div>

          {/* Filtros y Sort */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Region */}
            <motion.select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="px-4 py-2 rounded-lg border-2 bg-white focus:outline-none text-sm"
              style={{
                borderColor: MODERNO_COLORS.olive_green + "40",
                color: MODERNO_COLORS.text_dark,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <option value="">Todas las regiones</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </motion.select>

            {/* Agave */}
            <motion.select
              value={filterAgave}
              onChange={(e) => setFilterAgave(e.target.value)}
              className="px-4 py-2 rounded-lg border-2 bg-white focus:outline-none text-sm"
              style={{
                borderColor: MODERNO_COLORS.olive_green + "40",
                color: MODERNO_COLORS.text_dark,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <option value="">Todos los agaves</option>
              {agaves.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </motion.select>

            {/* Sort */}
            <motion.select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="px-4 py-2 rounded-lg border-2 bg-white focus:outline-none text-sm"
              style={{
                borderColor: MODERNO_COLORS.olive_green + "40",
                color: MODERNO_COLORS.text_dark,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              <option value="nombre">Ordenar A-Z</option>
              <option value="precio-asc">Precio: Menor</option>
              <option value="precio-desc">Precio: Mayor</option>
            </motion.select>

            {/* Limpiar filtros */}
            <motion.button
              onClick={() => {
                setSearchTerm("");
                setFilterRegion("");
                setFilterAgave("");
                setSortBy("nombre");
              }}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
              style={{
                backgroundColor: (filterRegion || filterAgave || searchTerm) ? MODERNO_COLORS.olive_green : MODERNO_COLORS.olive_green + "20",
                color: (filterRegion || filterAgave || searchTerm) ? "white" : MODERNO_COLORS.olive_green,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Limpiar
            </motion.button>
          </div>
        </div>
      </section>

      {/* GRID CON COLORES */}
      <section className="py-12 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <AnimatePresence mode="popLayout">
              {filteredAndSorted.map((mezcal, idx) => (
                <motion.div
                  key={mezcal.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                >
                  <MezcalProductCardModerno
                    mezcal={mezcal}
                    backgroundColor={getProductColor(mezcal.id)}
                    isInWishlist={wishlist.includes(mezcal.id)}
                    customImage={getCustomImage(mezcal.id)}
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
              <Zap size={48} style={{ color: MODERNO_COLORS.olive_green, margin: "0 auto" }} />
              <p style={{ color: MODERNO_COLORS.text_light }}>
                No encontramos mezcales con esos criterios.
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* MODAL */}
      <AnimatePresence>
        {showDetail && selectedProduct && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{
              backgroundColor: MODERNO_COLORS.text_dark + "80",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-8"
              style={{
                backgroundColor: MODERNO_COLORS.cream_light,
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
