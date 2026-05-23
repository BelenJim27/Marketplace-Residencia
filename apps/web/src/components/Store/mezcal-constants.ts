// Paleta de colores - Mineral Luxury
export const MEZCAL_COLORS = {
  // Dominante: Tonos tierra profundos
  earth_dark: "#2B2420",     // Negro cálido profundo
  earth_medium: "#8B7355",   // Tierra ocre
  earth_light: "#A89080",    // Tierra clara

  // Acentos
  gold_mineral: "#D4A574",   // Oro mineral
  terracotta_dark: "#6B4423", // Terracotta oscura
  terracotta_light: "#9E7C5F", // Terracotta clara

  // Fondos & Texto
  white_broken: "#F5F1ED",   // Blanco roto
  black_warm: "#1A1410",     // Negro cálido

  // Neutrales
  gray_light: "#E8E4E0",
  gray_medium: "#C4B5AD",
  gray_dark: "#6B5F5A",

  // Secundarios
  stone_gray: "#74706A",
  charcoal: "#3A3632",
} as const;

// Tipografía
export const FONTS = {
  serif: "Georgia, 'Georgia Pro', serif", // Display/Hero
  sans: "Inter, Outfit, -apple-system, BlinkMacSystemFont, sans-serif", // Body
  mono: "IBM Plex Mono, monospace", // Detalles, IBU, %, etc
} as const;

// Productos ficticios pero realistas
export const MEZCALES_PREMIUM = [
  {
    id: 1,
    nombre: "Mezcal Raíces Ancestrales - Tobalá 2021",
    precio: 450.00,
    agave: "Tobalá",
    region: "Tlacolula de Matamoros",
    maestro: "Don Aurelio García",
    edicion: "Edición limitada 045/300",
    botella_numero: 45,
    notas: {
      aroma: "Floral oscuro, tabaco, minerales",
      sabor: "Complejidad fuerte, finales especiados",
      cuerpo: 8,
      final: 9,
      complejidad: 9,
    },
    descripcion:
      "Destilación en alambique de cobre. Maguey silvestre cosechado en 2019. Proceso tradicional tahona.",
    imagen: "https://images.unsplash.com/photo-1571115676097-24ec42ed204d?w=400&h=600&fit=crop",
    color: "#4A3F2D",
  },
  {
    id: 2,
    nombre: "Expresión Madre - Espadín Añejo 3 años",
    precio: 520.00,
    agave: "Espadín",
    region: "Tlacolula",
    maestro: "Margarita Díaz Olivera",
    edicion: "Lote especial 2023",
    botella_numero: null,
    notas: {
      aroma: "Roble, cacao, almendra tostada",
      sabor: "Calidez profunda, toques de vainilla",
      cuerpo: 9,
      final: 8,
      complejidad: 8,
    },
    descripcion:
      "Reposado en barriles de roble francés. Suavidad mineral con notas de madera. Edición limitada.",
    imagen: "https://images.unsplash.com/photo-1625772707470-1d8f9b67c5ad?w=400&h=600&fit=crop",
    color: "#5D4E3F",
  },
  {
    id: 3,
    nombre: "Mineralidad Pura - Madrecuixe Silvestre",
    precio: 385.00,
    agave: "Madrecuixe",
    region: "Yautepec",
    maestro: "Javier Carbajal",
    edicion: "Cosecha 2022",
    botella_numero: null,
    notas: {
      aroma: "Piedra mojada, miel, flores silvestres",
      sabor: "Elegancia mineral, final prolongado",
      cuerpo: 7,
      final: 9,
      complejidad: 9,
    },
    descripcion:
      "Perfil mineral pronunciado. Destilado en alambique pequeño. Expresión terroir pura.",
    imagen: "https://images.unsplash.com/photo-1623516885451-4d04a8e8ae38?w=400&h=600&fit=crop",
    color: "#3A2F23",
  },
  {
    id: 4,
    nombre: "Legado de Humo - Cuishe Mezcal Clásico",
    precio: 320.00,
    agave: "Cuishe",
    region: "San Antonino Monte Verde",
    maestro: "Don Felipe López",
    edicion: "Tradicional",
    botella_numero: null,
    notas: {
      aroma: "Humo artesanal, frutas secas, especias",
      sabor: "Profundidad ahumada, notas de cuero",
      cuerpo: 8,
      final: 8,
      complejidad: 7,
    },
    descripcion:
      "Proceso ancestral: horno subterráneo + tahona. Carácter ahumado distintivo del Cuishe.",
    imagen: "https://images.unsplash.com/photo-1585518419759-7f88e9e82d42?w=400&h=600&fit=crop",
    color: "#2F261A",
  },
  {
    id: 5,
    nombre: "Artefacto Delicado - Arroqueño Puro",
    precio: 410.00,
    agave: "Arroqueño",
    region: "San Antonino Matamoros",
    maestro: "Carmen & Roberto Fuentes",
    edicion: "Cosecha seleccionada 2023",
    botella_numero: null,
    notas: {
      aroma: "Dulce herbáceo, notas frutales blancas",
      sabor: "Suave, elegante, mineral al final",
      cuerpo: 6,
      final: 8,
      complejidad: 8,
    },
    descripcion:
      "Destilación en artefacto artesanal. Maguey raro. Perfil delicado y sofisticado.",
    imagen: "https://images.unsplash.com/photo-1608199577766-b52c94b67c2d?w=400&h=600&fit=crop",
    color: "#5A4936",
  },
  {
    id: 6,
    nombre: "Horizonte Clandestino - Pechuga Experimental",
    precio: 680.00,
    agave: "Mezcla artesanal",
    region: "Oaxaca (Multi-región)",
    maestro: "Colectivo de maestros",
    edicion: "Solo 12 botellas producidas",
    botella_numero: 7,
    notas: {
      aroma: "Frutas tropicales, flores, miel natural",
      sabor: "Unicidad absoluta, notas frutales únicas",
      cuerpo: 7,
      final: 9,
      complejidad: 10,
    },
    descripcion:
      "Pechuga con frutas y hierbas seleccionadas. Cada botella varía ligeramente. Obra de arte líquida.",
    imagen: "https://images.unsplash.com/photo-1571144611997-d283e6b39056?w=400&h=600&fit=crop",
    color: "#4B3E2F",
  },
];

export const OAXACA_REGIONS = [
  { name: "Tlacolula", coords: [97.32, 16.78], maestros: 34 },
  { name: "Yautepec", coords: [97.15, 16.58], maestros: 28 },
  { name: "Miahuatlán", coords: [96.75, 16.4], maestros: 12 },
  { name: "Santiago Matatlán", coords: [97.25, 16.8], maestros: 156 },
  {
    name: "San Antonino Monte Verde",
    coords: [97.1, 16.95],
    maestros: 8,
  },
];
