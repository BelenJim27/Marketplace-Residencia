# Redesign Biocultural Premium — Checkout

**Marketplace-Residencia | Mezcal Artesanal Oaxaqueño**

---

## 🌱 Filosofía de Diseño

Este redesign incorpora la **identidad biocultural oaxaqueña** con un enfoque **premium y refinado**:

- **Colores tierra** — Ocre, terracota, ámbar (referencias a la agave y artesanía)
- **Minimalismo elegante** — Menos es más; detalles intencionales
- **Referencias geométricas** — Líneas verticales sutiles (inspiradas en patrones prehispánicos)
- **Tipografía refinada** — Gradientes de texto, jerarquía clara
- **Paleta verde + tierra** — Verde artesanal (mezcal) + tonos cálidos (Oaxaca)

---

## 🎨 Paleta de Colores Biocultural

| Rol | Color | Tailwind | Uso |
|-----|-------|----------|-----|
| **Primario** | Verde bosque | `green-600/700` | Acciones principales, completados |
| **Tierra** | Ámbar/Ocre | `amber-600/700` | Acentos, PayPal, detalles |
| **Neutro light** | Crema | `amber-50` | Fondos secundarios |
| **Neutro dark** | Gris cálido | `gray-900` | Texto principal |
| **Focus** | Verde claro | `green-500` | Estados interactivos |

**Degradados biocultural:**
```css
/* Título principal */
bg-gradient-to-r from-green-700 to-amber-700

/* Barra de progreso */
bg-gradient-to-r from-green-600 via-amber-600 to-amber-700

/* Tarjeta de pago Stripe */
from-green-50 to-green-100/50

/* Tarjeta de pago PayPal */
from-amber-50 to-orange-100/50
```

---

## 🏗️ Cambios Estructurales

### 1. **Header del Checkout — Aspiracional**

**Antes:**
```
Volver al carrito
Tu pedido
```

**Después:**
```
← Volver al carrito

▌ Tu Pedido  (con línea vertical + gradiente)
  Completa tu compra de mezcal auténtico
```

**Código:**
```tsx
<div className="flex items-center gap-3 mb-2">
  <div className="w-1.5 h-8 bg-gradient-to-b from-amber-600 to-amber-700 rounded-full"></div>
  <h1 className="text-4xl font-bold bg-gradient-to-r from-green-700 to-amber-700 bg-clip-text text-transparent">
    Tu Pedido
  </h1>
</div>
```

---

### 2. **Barra de Progreso — Gradiente Tierra**

**Antes:**
```
Barra sólida verde, 1px height
```

**Después:**
```
┌─────────────────────────────────┐
│ ▌ 1  ▌ 2  ▌ 3  ▌ 4              │
│                                 │
│ ═════════════════════════════    │ ← Degradado verde→ámbar
│ Paso 1 de 4          100%        │
└─────────────────────────────────┘
```

- Altura: `1.5px` (más prominente)
- Degradado: `from-green-600 via-amber-600 to-amber-700`
- Información: "Paso X de 4" + porcentaje en amber

---

### 3. **Paneles — Fondos Biocultural**

**Panel Principal:**
```tsx
bg-gradient-to-br from-white to-amber-50/20
border border-amber-100
dark:from-gray-dark dark:to-amber-950/10
dark:border-amber-900/30
```

**Panel de Resumen:**
```tsx
bg-gradient-to-br from-amber-50 to-orange-50/30
border-2 border-amber-200
backdrop-blur-sm
dark:from-amber-950/20 dark:to-orange-950/10
dark:border-amber-800/50
```

---

### 4. **Método de Pago — Biocultural Prominente**

**Stripe (Verde):**
```
┌────────────────────────────────┐
│ ◯ 💳 Tarjeta de Crédito        │🔒
│    Visa, Mastercard, Amex      │
│                                │
│ Fondo: gradient verde          │
│ Border: 2px green-600          │
│ Cuando activo: shadow-lg       │
└────────────────────────────────┘
```

**PayPal (Tierra):**
```
┌────────────────────────────────┐
│ ◯ 🔒 PayPal                     │🔒
│    Pago flexible y seguro      │
│                                │
│ Fondo: gradient ámbar          │
│ Border: 2px amber-600          │
│ Cuando activo: shadow-lg       │
└────────────────────────────────┘
```

**Detalles de estilo:**
- Border radius: `rounded-xl`
- Padding: `p-5` (más espacioso)
- Blur effect: Pequeño blur en top-right para elegancia
- Transición: `duration-200`

---

### 5. **Títulos de Sección — Línea Biocultural**

Todos los títulos de paso ahora tienen:

```tsx
<div className="flex items-center gap-2.5 mb-6">
  <div className="w-1 h-6 bg-gradient-to-b from-[COLOR]-600 to-[COLOR]-700 rounded-full"></div>
  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-amber-800 bg-clip-text text-transparent">
    Título del Paso
  </h2>
</div>
```

**Colores de línea por paso:**
- Dirección: `amber-600 → orange-600`
- Envío: `green-600 → amber-600`
- Pago: `green-600 → amber-600`
- Confirmación: `green-600 → emerald-600`

---

### 6. **Tarjetas de Información — Minimalista Premium**

**Dirección de entrega:**
```
┌──────────────────────────────┐
│ 📍 Dirección de entrega      │
│ Juan Pérez                   │
│ Calle 5 #123, Centro         │
│ Oaxaca de Juárez, Oaxaca     │
│                              │
│ Fondo: gradient amber 50/80  │
│ Border: amber-200/50         │
└──────────────────────────────┘
```

**Método de envío:**
```
┌──────────────────────────────┐
│ 🚚 Método de envío           │
│ FedEx Express — 2-3 días     │
│ $150 MXN                     │
│                              │
│ Fondo: gradient green 50/80  │
│ Border: green-200/50         │
└──────────────────────────────┘
```

---

### 7. **Botón "Confirmar y Pagar" — Shine Effect**

**Efecto visual premium:**
- Gradiente: `from-green-600 to-green-700`
- Hover: `from-green-700 to-green-800`
- Shine effect: Línea blanca translúcida que pasa al pasar mouse
- Padding: `py-4` (más grande)
- Shadow: `shadow-lg hover:shadow-xl`

```tsx
className="bg-gradient-to-r from-green-600 to-green-700 relative overflow-hidden group"
{/* Efecto shine */}
<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
```

---

### 8. **Confirmación de Pago — Celebración Visual**

```
┌──────────────────────────────────┐
│ ✓ ¡Pago Confirmado!              │
│ Tu pedido ha sido procesado       │
│ correctamente. Te enviaremos      │
│ el detalle a tu correo.           │
│                                  │
│ Fondo: gradient green prominente  │
│ Border: 2px green-500/50          │
│ Texto: más grande, más espaciado  │
└──────────────────────────────────┘
```

---

## 📱 Responsive & Dark Mode

### Mobile:
- Full width (`w-full`)
- Bordes más pronunciados
- Espaciado mayor para tap targets
- Resumen fluye debajo

### Dark Mode:
- Fondos: tonos más oscuros con transparencia
- Bordes: más sutiles (`:border-opacity-50`)
- Texto: ámbar claro para contraste
- Degradados: ajustados para oscuridad

---

## ✨ Detalles Premium

1. **Blur backdrop** en resumen lateral (`backdrop-blur-sm`)
2. **Líneas decorativas verticales** como separadores
3. **Degradados sutiles** en fondos (no saturados)
4. **Tipografía refinada** — Font weight estratégico
5. **Transiciones suaves** — `duration-300` a `duration-500`
6. **Emoji contextuales** — 📍 dirección, 🚚 envío (sutilmente)
7. **Sombras elevadas** — `shadow-sm` a `shadow-lg` por importancia
8. **Espaciado orgánico** — Respeta breathing room

---

## 🎭 Paleta Mezcal & Oaxaca

| Elemento | Inspiración |
|----------|-------------|
| **Verde** | Agave, naturaleza, tradición |
| **Ámbar/Ocre** | Barro cocido, tejidos oaxaqueños |
| **Crema** | Mezcal añejo en botella |
| **Líneas verticales** | Iconografía prehispánica |
| **Degradados** | Puesta de sol en Oaxaca |

---

## 🧪 Testing Checklist

- [ ] Stepper progresa visualmente
- [ ] Colores en dark mode legibles
- [ ] Tarjetas de pago se destacan
- [ ] Botón shine effect funciona
- [ ] Resumen sticky en desktop
- [ ] Mobile responsive (stack correcto)
- [ ] Focus rings visibles
- [ ] Transiciones suaves (no jarring)
- [ ] Contraste WCAG AA cumplido

---

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| Líneas decorativas añadidas | 15+ |
| Gradientes nuevos | 12 |
| Colores tierra integrados | 5 |
| Emojis contextuales | 3 |
| Efectos shine/blur | 2 |

---

## 🚀 Próximos Pasos

1. **Visual testing** — Comparar antes/después en navegador
2. **User feedback** — ¿Se siente más auténtico y premium?
3. **Accesibilidad** — Verificar contraste final
4. **Performance** — Blur effects no impacten velocidad

---

## 🎨 Referencia Visual

```
ESTRUCTURA VISUAL:

┌─────────────────────────────────────────────────────────┐
│ ← Volver al carrito                                     │
│                                                         │
│ ▌ Tu Pedido (gradient green→amber)                     │
│   Completa tu compra de mezcal auténtico               │
│                                                         │
│ ═══════════════════════════════════════════════════    │ Barra progreso
│ Paso 1 de 4                                    100%     │
│                                                         │
├─────────────────────────┬───────────────────────────────┤
│                         │                               │
│  ▌ Dirección/Envío...  │  ▌ Resumen del Pedido        │ Líneas decorat.
│  [Contenido]            │  [Items]                      │ Fondos biocult.
│                         │  [Totales]                    │
│  ▌ Forma de Pago        │                               │ Tarjetas
│  [Stripe] [PayPal]      │                               │ gradientes
│                         │                               │
│  [Confirmar y Pagar]    │                               │ Botón shine
│                         │                               │
└─────────────────────────┴───────────────────────────────┘
```

---

## 💡 Filosofía Final

**"Premium pero accesible, auténtico pero refinado"**

- No es minimalismo frío → Es elegancia cálida
- No es decorativo excesivo → Es detalle intencional  
- No es corporativo genérico → Es culturalmente enraizado
- No es vintage kitsch → Es contemporáneo con raíces

El checkout debería sentirse como desempacar una botella de mezcal premium: anticipación, cuidado, tradición, y lujo.

