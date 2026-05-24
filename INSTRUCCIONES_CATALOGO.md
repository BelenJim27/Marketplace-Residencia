# 🎨 Catálogo de Mezcal Premium - Instrucciones de Acceso

## ⚡ Acceso Rápido

```bash
npm run dev          # Inicia el servidor en http://localhost:3000
# Luego abre: http://localhost:3000/catalogo-prueba
```

---

## 🎯 Lo que Verás

### 1️⃣ **Header Premium**
- Gradiente terracota → marrón oscuro
- Título: "Esencias de Oaxaca" (serif bold)
- Tagline: "Descubre la artesanía y tradición del mezcal..."
- Pattern SVG sutil de montañas/agave

### 2️⃣ **Buscador + Filtros**
```
┌──────────────────────────────────────────┐
│ 🔍 Busca mezcal, productor, región...   │  ← Input dorado
├──────────────────────────────────────────┤
│ [Todos] [Tlacolula] [$0-$1500] [Relevancia] │
│ Mostrando 6 de 18 mezcales              │
└──────────────────────────────────────────┘
```
Prueba escribir: "Amaraya" o "Sierra"

### 3️⃣ **Grid de Productos** (3 columnas en desktop)
Cada tarjeta contiene:
- 🖼️ Imagen botella mezcal 3D (animada on hover)
- 🏷️ Badges (Artesanal, D.O., Edición Limitada)
- ❤️ Botón favorito (top-right, se rellena rojo)
- 👤 Nombre productor (texto pequeño verde oliva)
- 📝 Nombre producto (serif bold, hovers dorado)
- 📖 Descripción técnica
- 📊 Specs: Tipo | Región | Agave | Grados
- ⭐ Rating (ej: ★★★★★ 4.8 / 24 reseñas)
- 💰 Precio grande (serif bold)
- 🛒 Botón carrito (verde oliva, esquina inferior)
- → "Ver detalle completo" (link dorado)

### 4️⃣ **Modal Detalle** (Click "Ver detalle")
```
┌─────────────────────────────────────────┐
│ GRADIENT HEADER "Amaraya Locura"    ✕  │
├─────────────────────────────────────────┤
│ BOTELLA      │  ESPECIFICACIONES       │
│              │  ┌─────────────────┐    │
│              │  │ Tipo: Joven     │    │
│              │  │ Región: Tlacolula│   │
│              │  │ Agave: Espadín  │    │
│              │  │ Grados: 46°     │    │
│              │  └─────────────────┘    │
│ [❤ Guardar]  │                        │
│              │  $450                   │
│              │  Cantidad: [1 ▼]        │
│              │  [AGREGAR AL CARRITO]   │
├─────────────────────────────────────────┤
│ DESCRIPCIÓN TÉCNICA COMPLETA            │
│ • Destilería: Palenque Tradicional      │
│ • Método: Alambique de cobre            │
│ • Lote: TLA-2024-001                    │
│ • Producción: Limitada                  │
│                                         │
│ NOTAS DE CATA:                          │
│ Nariz compleja con notas de anís...     │
│                                         │
│ CERTIFICACIONES:                        │
│ ✓ Artesanal  ✓ D.O.  ✓ Edición Lim.  │
└─────────────────────────────────────────┘
```

---

## 🎮 Interacciones Disponibles

### Búsqueda
1. Escribe en el input "Busca mezcal..."
2. Results filtran en tiempo real
3. Contador actualiza abajo

### Filtros
```
Tipo:        [Todos ▼] → Joven, Reposado, Añejo, Extra Añejo
Región:      [Todas ▼] → Tlacolula, Central, Miahuatlán, Ocotlán
Ordenar por: [Relevancia ▼] → Precio (menor/mayor), Rating
```
Todos los filtros son combinables.

### Favoritos
```
Acción:  Click en ❤ de una card
Efecto:  Corazón se rellena de rojo
Estado:  Persiste mientras navegas
```

### Carrito
```
Acción:  Click en 🛒 botón verde O "Agregar al Carrito" en modal
Efecto:  Carrito se actualiza (estado internal)
Modal:   Abre detalle con selector de cantidad
```

### Modal Detalle
```
Abrir:   Click en "Ver detalle completo" o botón carrito
Cerrar:  Click en ✕ o fuera del modal
Contenido: Especificaciones, descripción, notas de cata
```

---

## 🎨 Colores del Diseño

| Color | Hex | Elemento |
|-------|-----|----------|
| 🟫 Terracota | `#2D1B1B` | Headers, textos principales |
| 🟨 Dorado | `#B8860B` | Detalles, CTAs premium, iconos |
| 🟢 Verde Oliva | `#6B8E23` | Botones primarios (Carrito) |
| 🟡 Crema | `#F5F1ED` | Fondos, espacios |
| ⚪ Blanco | `#FFFFFF` | Cards, contenido |
| 🟧 Beige | `#E8DDD6` | Bordes, separadores |

---

## 📱 Responsive

**En Móvil (< 640px)**
- 1 columna de productos
- Filtros apilados (2 por fila)
- Padding reducido (24px)
- Header más compacto

**En Tablet (640-1024px)**
- 2 columnas de productos
- Filtros en 1 fila (si caben)
- Padding medio (32px)

**En Desktop (> 1024px)**
- 3 columnas de productos
- Filtros sticky en header
- Max-width 1280px
- Padding generoso (32px)

---

## 🧪 Casos de Prueba Recomendados

1. **Búsqueda**: Escribe "Amaraya" → Filtra automáticamente
2. **Filtro Tipo**: Selecciona "Reposado" → Muestra solo reposados
3. **Ordenamiento**: Selecciona "Precio: Menor a Mayor" → Ordena
4. **Combinado**: Tipo "Joven" + Región "Tlacolula" → Intersección
5. **Favoritos**: Click ❤ → Se rellena rojo → Prueba en otra card
6. **Modal**: Click "Ver detalle" → Se abre modal → Lee specs → Click ✕
7. **Carrito**: Modal → Selector cantidad → Click "Agregar" → Se cierra
8. **Responsive**: Redimensiona navegador → Verifica grid responsive

---

## 🏗️ Estructura del Código

```
apps/web/src/components/Products/MezcalCatalog.tsx
│
├── Interface: MezcalProduct (tipo datos)
├── Mock Data: 6 mezcales con detalles
├── State Management:
│   ├── searchTerm (búsqueda)
│   ├── selectedType, selectedRegion (filtros)
│   ├── priceRange, sortBy (opciones)
│   ├── favorites (Set<string>)
│   ├── selectedProduct (modal)
│   └── cartItems (Map<id, qty>)
│
├── Header Section
│   └── Gradient + SVG pattern
│
├── Search & Filters Sticky
│   ├── Input buscador
│   └── Dropdowns filtros
│
├── Product Grid
│   ├── useMemo (filtrado + ordenamiento)
│   └── Cards (map de productos)
│
└── Product Detail Modal
    ├── Imagen grande
    ├── Specs en boxes
    ├── Cantidad selector
    └── CTA destacado
```

---

## 💡 Tips de Diseño

- **No es Genérico**: Tiene colores, fuentes y estructura única
- **Cultural**: Menciona región, agave, lote (historia del mezcal)
- **Premium**: Espacios generosos, tipografía elegante, transiciones suaves
- **Minimalista**: Sin exceso, cada elemento tiene propósito
- **Interactivo**: Feedback visual en cada acción (hover, click)
- **Responsivo**: Funciona perfectamente en móvil, tablet, desktop

---

## ⚙️ Configuración Técnica

**Requerimientos**:
- Node.js 18+
- npm o yarn
- Next.js 16 (ya configurado)
- Tailwind CSS (ya configurado)
- lucide-react (para iconos)

**Archivos Creados**:
- ✅ `apps/web/src/components/Products/MezcalCatalog.tsx` (600 líneas)
- ✅ `apps/web/src/app/catalogo-prueba/page.tsx`
- ✅ `DESIGN_SYSTEM_MEZCAL.md` (referencia completa)
- ✅ `VERIFICATION_REPORT.md` (evidencia de verificación)
- ✅ Este archivo (instrucciones)

---

## 🚀 Próximos Pasos

Si quieres extender el catálogo:

1. **Conectar API Real**
   ```tsx
   const { data: productos } = await fetch('/api/productos');
   ```

2. **Persistencia de Favoritos**
   ```tsx
   localStorage.setItem('favorites', JSON.stringify([...favorites]));
   ```

3. **Integración Carrito**
   ```tsx
   dispatch(cartActions.addItem({ id, cantidad }));
   ```

4. **Animaciones Avanzadas**
   - Parallax en header
   - Stagger animations en grid
   - Page transitions

5. **3D Interactivo**
   - Three.js para rotación botella
   - Visualización 360°

---

## 📞 Soporte

Si encuentras algún problema:
1. Verifica que `npm run dev` está corriendo
2. Abre http://localhost:3000/catalogo-prueba en navegador
3. Abre DevTools (F12) para ver consola
4. Verifica que no hay errores TypeScript

---

## ✨ Disfruta el Diseño

Este catálogo está diseñado para:
- 🎯 Vender mezcal premium
- 🏺 Contar la historia de Oaxaca
- 👁️ Transmitir elegancia y artesanía
- 💰 Inspirar la compra sin ser agresivo

**¡Explóralo ahora en** `http://localhost:3000/catalogo-prueba`! 🍶

---

*Última actualización: 2026-05-23*
