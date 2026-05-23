# 🥃 Mezcal Premium Catalog - Mineral Luxury Storytelling

Un catálogo de lujo para mezcales premium de Oaxaca, diseñado con una estética de "Mineral Luxury Storytelling". Cada componente está optimizado para contar historias, transmitir autenticidad y exclusividad.

## 🎨 Aesthetic & Philosophy

**Concepto**: "Mineral Luxury Storytelling"
- Lujo refinado que honra la bioculturalidad sin lo folklórico
- Inspiración: Minerales naturales de Oaxaca, tonos tierra profundos, agaves ancestrales
- Tono: Sofisticado, contemplativo, exclusivo (como una galería de arte etnobotánico)
- Principio: "Menos es más, pero cada pixel cuenta"

## 🎯 Componentes Principales

### 1. **MezcalPremiumCatalog** (Componente Principal)
Página completa con:
- **Hero Section**: Animación de scroll con textos asimétricos
- **Catálogo dinámico**: Grid de mosaico con búsqueda y filtros invisibles
- **Perfil Sensorial**: Gráfico radial minimalista con atributos del mezcal
- **Modal de detalle**: Visualización elegante de producto seleccionado

**Uso:**
```tsx
import { MezcalPremiumCatalog } from "@/components/Store";

export default function Page() {
  return <MezcalPremiumCatalog />;
}
```

### 2. **MezcalProductCard**
Tarjeta individual de producto con:
- Imagen en perspectiva con efecto de luz mineral al hover
- Número de edición limitada (si aplica)
- Detalles técnicos: agave, región
- Preview de aroma con icono visual
- Botones de acción: wishlist, compartir, ver detalle

**Props:**
```typescript
interface MezcalProductCard {
  mezcal: Mezcal;
  isInWishlist: boolean;
  onSelectProduct: () => void;
  onToggleWishlist: () => void;
}
```

### 3. **MezcalProductDetail**
Modal elegante con información completa:
- Imagen grande con número de botella
- Precio y edición
- Detalles técnicos (agave, región)
- Historia del maestro mezcalero
- Notas de cata completas
- Botones de acción: agregar al carrito, wishlist, compartir

### 4. **SensoryProfile**
Gráfico radial + análisis textual:
- Polígono animado mostrando: Cuerpo, Final, Complejidad
- Barras de progreso para cada atributo
- Descripción de aroma y sabor
- Animaciones suaves con Framer Motion

### 5. **TerriorMap** (Componente Complementario)
Mapa interactivo de Oaxaca mostrando:
- 5 regiones principales productoras
- Cantidad de maestros mezcaleros por región
- Tarjetas interactivas con información

**Uso:**
```tsx
import { TerrorMap } from "@/components/Store/TerriorMap";

<TerrorMap />
```

### 6. **MastersStory** (Componente Complementario)
Página editorial con historia del maestro:
- Imagen grande
- Biografía y experiencia
- Especialidad artesanal
- CTA para descubrir sus mezcales

**Uso:**
```tsx
import MastersStory from "@/components/Store/MastersStory";

const master = {
  nombre: "Don Aurelio García",
  region: "Tlacolula de Matamoros",
  anios_experiencia: 45,
  historia: "...",
  especialidad: "Mezcal Tobalá",
  imagen: "https://...",
};

<MastersStory master={master} />
```

## 🎭 Paleta de Colores

Basada en minerales naturales de Oaxaca:

```typescript
export const MEZCAL_COLORS = {
  // Dominante: Tonos tierra profundos
  earth_dark: "#2B2420",
  earth_medium: "#8B7355",
  earth_light: "#A89080",

  // Acentos: Oro mineral
  gold_mineral: "#D4A574",
  terracotta_dark: "#6B4423",
  terracotta_light: "#9E7C5F",

  // Fondos & Texto
  white_broken: "#F5F1ED",
  black_warm: "#1A1410",

  // Neutrales
  gray_light: "#E8E4E0",
  gray_medium: "#C4B5AD",
  gray_dark: "#6B5F5A",
  stone_gray: "#74706A",
  charcoal: "#3A3632",
};
```

## 🔤 Tipografía

```typescript
export const FONTS = {
  serif: "Georgia, 'Georgia Pro', serif",        // Display/Hero
  sans: "Inter, Outfit, -apple-system, ...",     // Body
  mono: "IBM Plex Mono, monospace",              // Detalles, IBU, %
};
```

## 📊 Datos & Productos

6 mezcales premium ficticios pero realistas incluidos en `mezcal-constants.ts`:

1. **Raíces Ancestrales** (Tobalá, edición limitada)
2. **Expresión Madre** (Espadín añejo 3 años)
3. **Mineralidad Pura** (Madrecuixe silvestre)
4. **Legado de Humo** (Cuishe clásico)
5. **Artefacto Delicado** (Arroqueño puro)
6. **Horizonte Clandestino** (Pechuga experimental)

Puedes reemplazar estos con datos reales de la API:

```typescript
// En MezcalPremiumCatalog.tsx
const [productos, setProductos] = useState<Mezcal[]>([]);

useEffect(() => {
  api.productos.getAll({ tipo_mezcal: "Mezcal Premium" })
    .then(setProductos);
}, []);
```

## ⚡ Características Técnicas

### Dependencias
- **Next.js 16+** (App Router)
- **Framer Motion** (animaciones)
- **Tailwind CSS v3+** (estilos)
- **next/image** (optimización de imágenes)
- **lucide-react** (iconos)

### Performance
- Lazy loading de imágenes
- Optimización automática con Next.js Image
- Animaciones GPU-aceleradas (transform, opacity)
- Código splitting automático

### Accesibilidad
- Semántica HTML clara
- WCAG AA mínimo
- Contraste de colores verificado
- Navegación por teclado completa

## 🎬 Animaciones Principales

### Scroll Reveal
```typescript
initial={{ opacity: 0, y: 40 }}
whileInView={{ opacity: 1, y: 0 }}
transition={{ duration: 0.8 }}
```

### Hover Effects
- Tarjetas: `y: -4px` con transición suave
- Imagen: `scale: 1.05` en 500ms
- Luz mineral: overlay radial gradient

### Entrada de elementos
- Fade + desplazamiento (y/x)
- Retrasos escalonados (stagger)
- Escala (scale) para modales

## 🔄 Integración con API

El catálogo está **desacoplado** de la base de datos. Para conectarlo:

```typescript
// MezcalPremiumCatalog.tsx
const [productos, setProductos] = useState<Mezcal[]>(MEZCALES_PREMIUM);

// Reemplazar con:
useEffect(() => {
  const fetchMezcales = async () => {
    const data = await api.productos.getAll({
      tipo_mezcal: "Premium",
      categoria: "Mezcal",
    });
    setProductos(data);
  };
  fetchMezcales();
}, []);
```

## 🚀 Uso en Páginas Reales

### Opción 1: Catálogo completo
```tsx
// app/mezcal-premium/page.tsx
import { MezcalPremiumCatalog } from "@/components/Store";

export default function Page() {
  return <MezcalPremiumCatalog />;
}
```

### Opción 2: Integrar en Landing Page
```tsx
// app/(home)/page.tsx
import { MezcalPremiumCatalog } from "@/components/Store";

export default function HomePage() {
  return (
    <main>
      {/* ... hero, etc ... */}
      <MezcalPremiumCatalog />
      {/* ... footer, etc ... */}
    </main>
  );
}
```

### Opción 3: Secciones individuales
```tsx
import TerrorMap from "@/components/Store/TerriorMap";
import MastersStory from "@/components/Store/MastersStory";

export default function AboutPage() {
  return (
    <>
      <TerrorMap />
      <MastersStory master={masterData} />
    </>
  );
}
```

## 🎨 Personalización

### Cambiar colores
Edita `mezcal-constants.ts`:
```typescript
export const MEZCAL_COLORS = {
  // Tu paleta aquí
};
```

### Agregar más productos
En `mezcal-constants.ts`:
```typescript
export const MEZCALES_PREMIUM = [
  // Productos nuevos aquí
];
```

### Modificar tipografía
```typescript
export const FONTS = {
  serif: "Tu serif aquí",
  sans: "Tu sans aquí",
};
```

## 📱 Responsive

- **Mobile-first** diseño
- Breakpoints: `sm`, `md`, `lg`, `xl`
- Grid dinámico: 1 col (mobile) → 3 cols (desktop)
- Imágenes optimizadas para todos los tamaños

## ♿ Accesibilidad

- ✅ Contraste WCAG AA
- ✅ Semántica HTML
- ✅ Labels en inputs
- ✅ ARIA cuando es necesario
- ✅ Navegación por teclado
- ✅ Animaciones reducibles (prefers-reduced-motion)

## 🐛 Troubleshooting

### Las imágenes no cargan
Asegúrate de que `next/image` esté configurado para el dominio:
```typescript
// next.config.mjs
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'images.unsplash.com' },
  ],
}
```

### Framer Motion no anima
Verifica que el componente sea `"use client"` (✅ ya está)

### Colores no se aplican
Los colores usan CSS variables inline. Verifica que `MEZCAL_COLORS` esté exportado correctamente.

## 📝 Próximos pasos

- [ ] Integrar con API real de productos
- [ ] Conectar wishlist con backend
- [ ] Implementar sistema de carrito
- [ ] Agregar página de maestros completa
- [ ] Video de "Master's Story"
- [ ] Mapa interactivo de Oaxaca con Leaflet/Mapbox
- [ ] Sistema de reseñas y ratings
- [ ] Compartir en redes sociales

## 📄 Licencia

Parte de Marketplace-Residencia. Diseño original: Mineral Luxury Storytelling aesthetic.

---

**Nota Final**: Este catálogo está diseñado para transmitir lujo, autenticidad y respeto por la tradición mezcalera de Oaxaca. Cada elemento visual ha sido cuidadosamente elegido para crear una experiencia inmersiva y memorable.
