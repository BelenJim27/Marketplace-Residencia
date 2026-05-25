# 🍂 Mezcal Marketplace Catalog - Guía de Implementación

Componentes premium para el catálogo de productos del marketplace de mezcal. Diseño único que transmite **biocultura oaxaqueña** con elegancia, minimalismo y profundidad visual.

---

## 📦 Componentes Incluidos

### 1. **CatalogPage** (Orquestador Principal)
Componente wrapper que integra todos los subcomponentes. Punto de entrada único.

```tsx
<CatalogPage
  products={products}
  onAddToCart={handleAddToCart}
  isLoading={false}
/>
```

**Props:**
- `products`: Product[] - Array de productos
- `onAddToCart`: (productId: string) => void - Callback al agregar al carrito
- `isLoading`: boolean - Estado de carga

---

### 2. **CatalogHero**
Sección hero impactante con narrativa de mezcal artesanal oaxaqueño.

**Características:**
- Gradient background con texturas earth-inspired
- Decorative shapes (formas tierra y naturaleza)
- Tipografía serif + sans (tradición + modernidad)
- CTA buttons con estados (hover, active, focus)
- Scroll indicator animado
- Fully accessible (ARIA labels, keyboard nav)

**Personalización:**
```tsx
// Editar en CatalogHero.tsx:
// - Colores gradient (línea 7)
// - Textos en i18n (useTranslations)
// - Imágenes de fondo
```

---

### 3. **CatalogFilters**
Filtros responsivos con sidebar móvil desplegable.

**Filtros incluidos:**
- Búsqueda por nombre/productor/maguey
- Tipo de Maguey (Espadín, Papalote, Cuishe, Tobalá, Barril, Tepeztate)
- Categoría (Artesanal, Ancestral)
- Rango de precio (slider dual)
- Productor (dropdown)

**Comportamiento:**
- Desktop: Sidebar fijo izquierdo
- Mobile: Drawer deslizable con overlay

**Props:**
```tsx
<CatalogFilters
  onFilterChange={(filters) => handleFilters(filters)}
  isOpen={isOpen}
  onToggle={() => setIsOpen(!isOpen)}
/>
```

**Personalización:**
```tsx
// Editar opciones de maguey (línea ~95):
{['Espadín', 'Papalote', 'Cuishe', ...].map(type => ...)}

// Editar rango de precio máximo (línea ~150):
max="5000"  // Cambiar a tu rango máximo
```

---

### 4. **ProductCard**
Tarjeta individual de producto con interactividad premium.

**Elementos:**
- Imagen centrada (botella como protagonista)
- Nombre (serif font)
- Tipo de Maguey
- Categoría badge (color-coded)
- Rating + reseñas (opcional)
- Precio prominente
- Botón "Agregar al Carrito"
- Indicadores: Stock bajo, Edición Limitada
- Hover effects: Escala, overlay, info adicional

**Props:**
```tsx
<ProductCard
  id="1"
  name="Amareja Locura"
  magueyType="Espadín"
  category="Artesanal"
  price={450}
  producer="Productora María López"
  image="/path/to/image.png"
  rating={4.8}
  reviewCount={24}
  isLimited={false}
  stock={12}
  onAddToCart={(id) => handleAdd(id)}
/>
```

**Estados:**
- Normal: Tarjeta base
- Hover: Escala + overlay + info adicional visible
- Adding: Spinner animado
- Out of stock: Deshabilitado, botón "Agotado"
- Low stock: Badge con contador

---

### 5. **CatalogGrid**
Grid responsivo con filtrado, búsqueda y ordenamiento.

**Características:**
- Responsivo: 1 col (mobile) → 2 cols (tablet) → 3 cols (lg) → 4 cols (xl)
- Toolbar sticky con conteo de resultados
- Dropdown de ordenamiento (relevancia, precio, recientes)
- Empty state personalizado
- Skeleton loaders durante carga
- "Load More" button (opcional)

**Props:**
```tsx
<CatalogGrid
  products={products}
  onAddToCart={handleAdd}
  isLoading={false}
/>
```

**Filtros aplicados:**
- Search (nombre, productor, maguey)
- Maguey type
- Categoría
- Precio
- Productor

**Ordenamiento:**
- Relevancia
- Precio: Menor a Mayor
- Precio: Mayor a Menor
- Más Recientes

---

## 🎨 Paleta de Colores

Toda la paleta ya está configurada en `tailwind.config.ts`. Los componentes usan estos alias:

### Colores Primarios
```
terracotta-50 → terracotta-900    (Arcilla - Warm earth)
nature-50 → nature-900            (Naturaleza - Greens)
earth-50 → earth-900              (Tierra - Neutral browns)
```

### Colores Semánticos (en componentes)
```tsx
bg-terracotta-600        // Primary CTA
bg-nature-600            // Secondary actions
text-earth-900           // Body text
bg-earth-50              // Surfaces
border-earth-100         // Borders
```

**Personalizar colores:**
Editar en `tailwind.config.ts` (línea ~77-110):
```ts
terracotta: { 50: "...", 100: "...", ... },
nature: { ... },
earth: { ... },
```

---

## 🔤 Tipografía

### Fonts Requeridos
```tsx
// Añadir a tu CSS global o import:
@import url('https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
```

### Uso en Componentes
```tsx
// Headings (serif - tradición)
<h1 className="font-serif text-4xl font-light">Historias en Botellas</h1>

// Body (sans - moderno)
<p className="font-sans text-base">Descripción...</p>

// Labels (sans - fuerte)
<label className="font-sans text-sm font-semibold uppercase">Filtro</label>
```

---

## 📱 Responsive Design

### Breakpoints (Tailwind default)
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
```

### Grid por Tamaño de Pantalla
```
Mobile (< 640px):     1 columna
Tablet (640-1024px):  2 columnas
Desktop (> 1024px):   3-4 columnas
```

### Versiones de Componentes
- **Hero**: Altura responsive (500px mobile → 600px desktop)
- **Filters**: Drawer móvil, sidebar desktop
- **Cards**: Padding adaptive
- **Toolbar**: Stack vertical móvil, horizontal desktop

---

## ♿ Accesibilidad

Todos los componentes cumplen con **WCAG 2.1 AA**:

- ✅ Contraste mínimo 4.5:1 en textos
- ✅ Touch targets mínimo 44×44px
- ✅ Navegación por teclado completa
- ✅ ARIA labels en elementos interactivos
- ✅ Focus rings visibles
- ✅ Screen reader compatible
- ✅ Reduced motion support
- ✅ Color no es el único indicador

**Testing:**
```bash
# Verificar con axe o similar:
npx axe-core [URL]
```

---

## 🔌 Integración API

### Estructura Esperada de Producto
```ts
interface Product {
  id: string;
  name: string;
  magueyType: string;
  category: 'Artesanal' | 'Ancestral';
  price: number;
  producer: string;
  image: string;
  rating?: number;
  reviewCount?: number;
  isLimited?: boolean;
  stock?: number;
}
```

### Ejemplo: Fetching de Datos
```tsx
'use client';

import { useEffect, useState } from 'react';
import { CatalogPage } from '@/components/Store/CatalogPage';

export default function CatalogPageComponent() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch productos de tu API
    fetch('/api/productos?limit=100')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setIsLoading(false);
      });
  }, []);

  const handleAddToCart = async (productId: string) => {
    try {
      const response = await fetch('/api/carrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      });

      if (response.ok) {
        // Mostrar toast de éxito
        console.log('Producto agregado al carrito');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  return (
    <CatalogPage
      products={products}
      onAddToCart={handleAddToCart}
      isLoading={isLoading}
    />
  );
}
```

---

## 🌍 Internacionalización (i18n)

Los componentes usan `next-intl`. Necesitas archivos de traducción:

**src/i18n/locales/es.json:**
```json
{
  "catalog": {
    "hero": {
      "subtitle": "Mezcal Artesanal de Oaxaca",
      "title": "Historias en Botellas",
      "description": "Mezcal Ancestral y Artesanal desde Productores Oaxaqueños",
      "intro": "Descubre la esencia de Oaxaca en cada copa...",
      "explore": "Explorar Catálogo",
      "learnMore": "Conocer más"
    },
    "filters": {
      "title": "Filtros",
      "search": "Buscar",
      "magueyType": "Tipo de Maguey",
      "category": "Categoría",
      "price": "Rango de Precio",
      "producer": "Productor"
    },
    "product": {
      "maguey": "Maguey",
      "addToCart": "Agregar al Carrito",
      "limited": "Edición Limitada",
      "lowStock": "Stock bajo"
    },
    "results": "resultados",
    "sortBy": "Ordenar por",
    "relevance": "Relevancia",
    "priceLow": "Precio: Menor a Mayor",
    "priceHigh": "Precio: Mayor a Menor",
    "newest": "Más Recientes"
  }
}
```

**src/i18n/locales/en.json:**
```json
{
  "catalog": {
    "hero": {
      "subtitle": "Artisanal Mezcal from Oaxaca",
      "title": "Stories in Bottles",
      "description": "Ancestral and Artisanal Mezcal from Oaxacan Producers",
      ...
    }
  }
}
```

---

## 🎯 Checklist de Implementación

- [ ] Copiar componentes a `apps/web/src/components/Store/`
- [ ] Actualizar `tailwind.config.ts` con colores (ya hecho)
- [ ] Agregar fuentes (Crimson Text, Inter) a CSS global
- [ ] Crear archivo de traducción i18n
- [ ] Implementar fetching de productos (API)
- [ ] Implementar handler `onAddToCart`
- [ ] Agregar toast notifications para feedback
- [ ] Testear en mobile, tablet, desktop
- [ ] Testear dark mode (si aplica)
- [ ] Verificar accesibilidad con axe
- [ ] Performance: lazy load images, optimize bundle
- [ ] Analytics: track filters, searches, cart events
- [ ] Deploy y verificar en producción

---

## 🚀 Performance Tips

1. **Image Optimization:**
   ```tsx
   <Image
     src={image}
     alt={name}
     fill
     loading="lazy"
     priority={false}
   />
   ```

2. **Bundle Splitting:**
   ```tsx
   const CatalogPage = dynamic(() => import('./CatalogPage'), {
     loading: () => <Skeleton />,
   });
   ```

3. **Memoization:**
   ```tsx
   const filteredProducts = useMemo(() => {
     // expensive filtering
   }, [products, filters]);
   ```

4. **Virtualization (para 100+ productos):**
   ```tsx
   import { FixedSizeGrid } from 'react-window';
   ```

---

## 🐛 Troubleshooting

### Colores no aplican
- ✓ Verificar que `tailwind.config.ts` tiene los colores
- ✓ Rebuild Tailwind: `npm run build`
- ✓ Clear cache: `rm -rf .next`

### Imágenes no cargan
- ✓ Verificar rutas de imagen
- ✓ Configurar `next.config.mjs` para imágenes estáticas
- ✓ Usar `Image` component, no `img` tag

### i18n no funciona
- ✓ Verificar archivos JSON en `src/i18n/locales/`
- ✓ Usar hook correcto: `const t = useTranslations('catalog')`
- ✓ Keys match con JSON structure

### Filtros no aplican
- ✓ Verificar `onFilterChange` está conectado
- ✓ Pasar `filters` a `CatalogGrid`
- ✓ Console.log para debug

---

## 📚 Archivos de Referencia

```
apps/web/src/components/Store/
├── CatalogPage.tsx          ← Main orchestrator
├── CatalogHero.tsx          ← Hero section
├── CatalogFilters.tsx       ← Sidebar filters
├── CatalogGrid.tsx          ← Product grid + sorting
├── ProductCard.tsx          ← Individual product card
├── CatalogExample.tsx       ← Usage example (reference)
├── tailwind-config.ts       ← Color definitions (reference)
└── CATALOG_GUIDE.md         ← This file
```

---

## 💡 Customization Ideas

1. **Quick View Modal** - Ver detalles sin navegar
2. **Product Comparison** - Comparar 2-3 productos
3. **Wishlist Integration** - Guardar favoritos
4. **Size/Volume Variants** - Múltiples opciones por producto
5. **Reviews Section** - Mostrar reseñas de clientes
6. **Related Products** - Sugerencias inteligentes
7. **Stock Indicator** - Barra visual de disponibilidad
8. **Social Proof** - "X personas compraron este mezcal"
9. **Producer Stories** - Expand cards con bio del productor
10. **Sustainability Badges** - Certificaciones

---

## 🎨 Design System Highlights

- **Biocultura**: Colores earth-inspired, tipografía que evoca tradición
- **Premium**: Espacios en blanco, sombras sutiles, hover effects
- **No Plano**: Texturas, gradients, profundidad visual
- **Minimalismo**: Sin ruido visual, focus en el producto
- **Responsivo**: Mobile-first, adaptativo a todos los tamaños
- **Accesible**: WCAG 2.1 AA compliant
- **Performante**: Lazy loading, optimizaciones CSS
- **i18n Ready**: Multiidioma soportado

---

## 📧 Soporte

Para preguntas o mejoras:
1. Check `CatalogExample.tsx` for integration patterns
2. Review component props TypeScript interfaces
3. Inspect Tailwind classes in DevTools
4. Test with different viewport sizes
5. Validate HTML/CSS with validators

---

**Last Updated**: 2026-05-24  
**Marketplace Residencia** 🍂
