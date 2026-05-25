# Design System - Catálogo de Mezcal "Esencias de Oaxaca"

## 🎨 Filosofía de Diseño

**Concepto**: Premium artesanal minimalista con raíces culturales oaxaqueñas.  
**Público**: Consumidores conscientes, 21-65 años, que valorizan autenticidad y tradición.  
**Diferenciador**: No es un marketplace genérico. Es una experiencia que cuenta la historia del mezcal.

---

## 🎭 Paleta de Colores

| Uso | Color | Hex | Propósito |
|-----|-------|-----|-----------|
| **Primario** | Marrón Terracota | `#2D1B1B` | Elegancia, tierra, tradición |
| **Secundario** | Dorado Cultural | `#B8860B` | Lujo, detalles, CTAs premium |
| **Accent** | Verde Oliva | `#6B8E23` | Agave, naturaleza, confianza |
| **Neutro Cálido** | Crema | `#F5F1ED` | Fondos, espacios respiro |
| **Neutro Frío** | Blanco Puro | `#FFFFFF` | Contenido, tarjetas |
| **Secundario Claro** | Beige | `#E8DDD6` | Bordes, separadores |
| **Texto Base** | Charcoal | `#2D1B1B` | Legibilidad principal |
| **Texto Secundario** | Gris Suave | `#666666` | Etiquetas, descripción |

### Significado Cultural
- **Terracota**: Cerámica artesanal oaxaqueña, barro cocido
- **Dorado**: Agave florido, riqueza mineral, tesoro
- **Verde Oliva**: Agave espadin, paisaje montañoso de Oaxaca
- **Crema**: Papel artesanal mexicano, tradición

---

## 🔤 Tipografía

### Títulos (Elegancia Premium)
- **Fuente**: Serif (Georgia, Garamond, o similar)
- **Pesos**: 600-700 (Bold)
- **Uso**: Nombres de productos, encabezados, CTA principal
- **Espíritu**: Elegancia clásica, editorial, premium

### Cuerpo (Claridad Moderna)
- **Fuente**: Sans-serif limpia (Inter, Nunito, o similar)
- **Pesos**: 400-500 (Regular, Medium)
- **Tamaño**: 14-16px (móvil/desktop)
- **Línea**: 1.6 (lecturabilidad)
- **Espíritu**: Moderno, limpio, accesible

### Jerarquía Tipográfica
```
Encabezado H1:  32-48px | Serif Bold    | Títulos sección
Encabezado H2:  24-32px | Serif Bold    | Subtítulos
Encabezado H3:  18-20px | Serif Bold    | Nombres producto
Body Large:     16px    | Sans Regular  | Descripciones
Body Base:      14px    | Sans Regular  | Labels, specs
Caption:        12px    | Sans Medium   | Badges, metadata
```

---

## 🏗️ Layout & Espaciado

### Sistema de Espaciamiento (8pt)
```
xs: 4px    → Micro spacing
sm: 8px    → Padding pequeño
md: 16px   → Padding estándar
lg: 24px   → Espacios generosos
xl: 32px   → Separación secciones
2xl: 48px  → Espacios amplios
```

### Estructura
- **Max-width**: 1280px (7xl) → Contenido legible en desktop
- **Grid Mobile**: 1 columna
- **Grid Tablet**: 2 columnas  
- **Grid Desktop**: 3 columnas
- **Gutter**: 32px (lg) → Espacios amplios para elegancia
- **Safe Area**: 24px padding horizontal en móvil

---

## 🎯 Componentes Clave

### 1. Product Card (Galería)
**Objetivo**: Mostrar botella premium con contexto cultural y detalles técnicos.

```
┌─────────────────────────────────┐
│  BADGES (Artesanal, D.O.) ♡     │ ← Favorite button (top-right)
│                                 │
│          [BOTELLA 3D]           │ ← Imagen perspectiva realista
│     (animación hover scale)     │
│                                 │
├─────────────────────────────────┤
│ PRODUCTOR (verde oliva)         │
│ Nombre Mezcal (serif)           │ ← Hover: color dorado
│ Descripción técnica             │
│                                 │
│ TIPO | REGIÓN                   │
│ AGAVE | GRADOS                  │
│                                 │
│ ★★★★★ 4.8 (24)                │
│                                 │
│ $450          [🛒]             │ ← Green button, CTA
│ Ver detalle completo →          │
└─────────────────────────────────┘
```

**Interacciones**:
- **Hover card**: Sombra aumenta, borde dorado
- **Hover imagen**: Scale 1.05 suave
- **Click favorito**: Corazón se rellena rojo
- **Click carrito**: Abre modal de detalle

---

### 2. Modal de Detalle Completo
**Objetivo**: Experiencia inmersiva que invite a la compra.

**Estructura**:
- Header gradient (terracota-to-brown) + Nombre + Close
- Grid 2 columnas:
  - **Izq**: Imagen botella grande + Botón favoritar
  - **Der**: Specs en cajas crema, precio grande, selector cantidad, CTA verde
- Descripción técnica completa
- Notas de cata
- Certificaciones (badges con checkmark)

**Atributos Premium**:
- Sombra drop: `0 20px 25px rgba(0,0,0,0.15)`
- Border radio: 16px
- Modal max-width: 896px (2xl)
- Transiciones suaves 300ms

---

### 3. Search & Filter Bar (Sticky)
**Objetivo**: Flujo de búsqueda intuitivo sin abrumar.

**Componentes**:
```
┌──────────────────────────────────────────┐
│ 🔍 Busca mezcal, productor, región...    │ ← Buscador con icono dorado
├──────────────────────────────────────────┤
│ [Tipo ▼] [Región ▼] [$0-$1500] [Sort ▼] │ ← Controles compactos
│ Mostrando 6 de 18 mezcales               │ ← Feedback de resultados
└──────────────────────────────────────────┘
```

**UX Decisiones**:
- Sin filtro de precio con slider (demasiado complejo para premium)
- Opciones predefinidas por dropdown
- Sticky en scroll para acceso constante
- Feedback de cantidad de resultados

---

### 4. Header Branding
**Objetivo**: Inmersión cultural desde el primer segundo.

```
┌────────────────────────────────────────────┐
│ GRADIENTE: Terracota → Marrón oscuro       │
│                                            │
│ "Esencias de Oaxaca" (serif 48px)          │
│ Tagline: Descubre la artesanía...          │
│ (SVG waves pattern subtle en fondo)        │
│                                            │
│ Altura: 320px (móvil) / 400px (desktop)   │
└────────────────────────────────────────────┘
```

---

## ✨ Efectos & Animaciones

| Elemento | Animación | Duración | Easing | Propósito |
|----------|-----------|----------|--------|-----------|
| Product Card hover | Shadow increase | 300ms | ease-out | Profundidad |
| Botella imagen | Scale 1.05 | 300ms | ease-out | Énfasis |
| Botón CTA hover | Color shift + shadow | 250ms | ease-out | Feedback |
| Favorite toggle | Heart fill animation | 200ms | ease-out | Satisfacción |
| Modal entrada | Fade + scale from center | 300ms | ease-out | Elegancia |
| Badge pulse | Subtle glow (opcional) | 2s | ease-in-out | Atracción |

**Restricciones**:
- ✓ Todas las animaciones < 400ms (no aburridas)
- ✓ Uso de `transform` y `opacity` (sin reflow)
- ✓ Respeto a `prefers-reduced-motion`
- ✓ Animations tienen propósito (no decorativas)

---

## 🎬 Estados Visuales

### Button CTA (Verde Oliva)
```
Normal:    bg-[#6B8E23] text-white
Hover:     bg-[#556B1F] shadow-lg
Active:    scale-95 (feedback inmediato)
Disabled:  opacity-50 cursor-not-allowed
```

### Input & Select
```
Normal:    border-[#E8DDD6] bg-white
Focus:     border-[#B8860B] outline-none
Error:     border-red-500
Disabled:  bg-gray-100 opacity-50
```

### Card
```
Normal:    shadow-sm border-[#E8DDD6]
Hover:     shadow-xl border-[#B8860B]
Active:    (carrito) shadow-lg scale-98
```

---

## 📐 Componentes Reutilizables

### Badge Sistema
```tsx
// Artesanal, D.O., Edición Limitada
<span className="px-2.5 py-1 bg-[#B8860B] text-white text-xs font-semibold rounded-full">
  Artesanal
</span>
```

### Rating Stars
```tsx
// ★★★★☆ 4.8 / 5
<div className="flex gap-0.5">
  {[...Array(5)].map((_, i) => (
    <span className={i < Math.floor(rating) ? 'text-[#B8860B]' : 'text-gray-300'}>★</span>
  ))}
</div>
```

### Spec Box (Técnicas)
```tsx
<div className="p-4 bg-[#F5F1ED] rounded-lg">
  <span className="text-xs text-gray-500 uppercase">Tipo</span>
  <p className="text-lg font-bold text-[#2D1B1B] mt-1">Reposado</p>
</div>
```

---

## 🎯 UX Decisiones Clave

### 1. **No Sidebar en Catálogo**
- Mantiene enfoque en productos
- Simplifica mobile experience
- Header hero branding ocupa espacio premium

### 2. **Modal, no página separada de detalle**
- Contextual fluid navigation
- No pierde el catálogo de vista
- Sensación de "exploración"

### 3. **Specs técnicas prominentes**
- Consumidor premium valúa detalles (agave, región, grados)
- Diferencia de otros ecommerces genéricos
- Transmite autenticidad

### 4. **Favoritos integrados**
- Button en card + modal
- Fomenta engagement
- Crea lista de deseos orgánica

### 5. **Precios sin "desde"**
- Evita confusión
- Premium perception: precio único = exclusividad
- Simplifica comparación

### 6. **Calidad de imagen importante**
- Botella 3D perspectiva realista (27.png)
- Drop shadow para "flotación" elegante
- Scale on hover para interactividad

---

## 📱 Responsive Breakpoints

```
Mobile:  < 640px   │ 1 col, padding 24px
Tablet:  640-1024  │ 2 cols, padding 32px
Desktop: > 1024    │ 3 cols, max-width 1280px
```

### Ajustes por tamaño
- **Móvil**: Filtros apilados verticalmente (2 per row)
- **Tablet**: Filtros en 1 fila (si caben)
- **Desktop**: Sticky header completo, filtros inline

---

## ♿ Accesibilidad (WCAG AA)

- ✓ **Contrast**: Todos los textos ≥ 4.5:1
- ✓ **Touch targets**: Botones ≥ 44×44px
- ✓ **Labels**: Todos inputs con label explícito (no placeholder-only)
- ✓ **Focus states**: Anillo focus visible en navegación
- ✓ **Alt text**: Todas las imágenes con descripción
- ✓ **Aria labels**: Botones icon-only tienen aria-label
- ✓ **Keyboard nav**: Completamente navegable con Tab

---

## 🚀 Performance Metrics (Target)

- **LCP**: < 2.5s (imagen botella lazy-loaded)
- **CLS**: < 0.1 (todos los elementos have space reserved)
- **INP**: < 200ms (interacciones de filtro debounced)
- **Images**: WebP con fallback PNG, responsive srcset

---

## 📚 Archivos Componentes

| Archivo | Propósito |
|---------|-----------|
| `MezcalCatalog.tsx` | Componente principal (grid, filtros, modal) |
| `page.tsx` | Página de prueba `/catalogo-prueba` |
| `DESIGN_SYSTEM_MEZCAL.md` | Este documento |

---

## 🔄 Iteraciones Futuras

1. **Animaciones avanzadas**: Parallax en header (sutil)
2. **Integración 3D**: Three.js para rotación botella
3. **Reviews real**: Testimonio clientes
4. **Comparativa**: Seleccionar 2-3 mezcales para comparar side-by-side
5. **Carrito visual**: Contador flotante en esquina
6. **Persistencia**: LocalStorage para favoritos/filtros

---

## 🎓 Design Tokens (Tailwind)

```ts
// tailwind.config.ts (extensiones)
colors: {
  'mezcal-dark': '#2D1B1B',
  'mezcal-gold': '#B8860B',
  'mezcal-green': '#6B8E23',
  'mezcal-cream': '#F5F1ED',
  'mezcal-border': '#E8DDD6',
}
```

---

**Versión**: 1.0  
**Última actualización**: 2026-05-23  
**Audiencia**: Equipo de desarrollo + stakeholders  
