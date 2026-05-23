# 🔌 Guía de Integración - Mezcal Premium Catalog

Cómo conectar el catálogo de mezcales premium con tu API real en Marketplace-Residencia.

## 1. Sincronizar tipos de datos con tu API

Tu API en `apps/api` probablemente devuelve productos con esta estructura:

```typescript
// Backend (NestJS) - Estructura actual
interface Producto {
  id: number;
  id_producto: bigint;
  nombre: string;
  descripcion: string;
  precio_base: string;
  imagen_principal_url?: string;
  producto_imagenes?: { url: string }[];
  lotes?: {
    datos_api?: Record<string, string>;
    productores?: { biografia?: string };
  };
}
```

Para integrar con el catálogo de lujo, necesitas enriquecer esto:

```typescript
// Frontend (Next.js) - Tipo extendido para Mezcal Premium
interface MezcalPremium {
  id: number;
  id_producto: bigint;
  nombre: string;
  precio_base: number;
  agave: string; // Extraer del campo "datos_api" del lote
  region: string; // Ubicación del productor
  maestro: string; // Nombre del maestro mezcalero
  edicion: string; // Ej: "Edición limitada 045/300"
  botella_numero?: number; // Número de botella en edición limitada
  imagen: string; // imagen_principal_url
  color: string; // Color dominante para la tarjeta (generar con Dominant Color detection)
  
  // Notas de cata - campos nuevos en el backend o calculados
  notas: {
    aroma: string;
    sabor: string;
    cuerpo: number; // 1-10
    final: number; // 1-10
    complejidad: number; // 1-10
  };
  
  descripcion: string;
}
```

## 2. Actualizar tu schema de Prisma

Agrega campos para mezcales premium:

```prisma
// packages/database/prisma/schema.prisma

model Producto {
  id                    Int      @id @default(autoincrement())
  id_producto           BigInt   @unique
  nombre                String
  descripcion           String   @db.Text
  precio_base           Decimal
  
  // Nuevos campos para Mezcal Premium
  agave                 String?  // Ej: "Tobalá", "Espadín"
  region_produccion     String?  // Ej: "Tlacolula"
  maestro_mezcalero     String?  // Nombre del maestro
  edicion_limitada      String?  // Ej: "045/300"
  botella_numero        Int?     // Solo si es edición limitada
  color_dominante       String?  // Hex color para UI
  
  // Notas de cata
  aroma_notas          String?
  sabor_notas          String?
  cuerpo_puntuacion    Int?     // 1-10
  final_puntuacion     Int?     // 1-10
  complejidad_puntaje  Int?     // 1-10
  
  // Relaciones existentes
  imagen_principal_url  String?
  producto_imagenes     ProductoImagen[]
  lotes                 Lote[]
  productores           Productor[]
  
  @@index([nombre])
}
```

Luego: `npm run db:migrate --name add_mezcal_premium_fields`

## 3. Actualizar el endpoint GET /productos

En tu backend (NestJS):

```typescript
// apps/api/src/modules/productos/productos.service.ts

async getAll(params: GetAllProductosDto): Promise<Producto[]> {
  const where: Prisma.ProductoWhereInput = {};
  
  // Filtros existentes...
  if (params.busqueda) {
    where.OR = [
      { nombre: { contains: params.busqueda, mode: 'insensitive' } },
      { agave: { contains: params.busqueda, mode: 'insensitive' } },
      { maestro_mezcalero: { contains: params.busqueda, mode: 'insensitive' } },
      { region_produccion: { contains: params.busqueda, mode: 'insensitive' } },
    ];
  }
  
  // Nuevo: Filtro de mezcal premium
  if (params.es_premium === true) {
    where.maestro_mezcalero = { not: null };
    where.agave = { not: null };
  }
  
  return this.prisma.producto.findMany({ where });
}
```

DTO:
```typescript
export class GetAllProductosDto {
  // ... campos existentes
  es_premium?: boolean;
}
```

## 4. Adaptar MezcalPremiumCatalog para usar API real

```typescript
// apps/web/src/components/Store/MezcalPremiumCatalog.tsx

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { MEZCAL_COLORS, FONTS } from "./mezcal-constants";
import MezcalProductCard from "./MezcalProductCard";
import MezcalProductDetail from "./MezcalProductDetail";
import SensoryProfile from "./SensoryProfile";

export default function MezcalPremiumCatalog() {
  const [productos, setProductos] = useState<MezcalPremium[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<MezcalPremium | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"precio-asc" | "precio-desc" | "nombre">("nombre");
  const [wishlist, setWishlist] = useState<number[]>([]);

  // Fetch productos premium del API
  useEffect(() => {
    const fetchMezcales = async () => {
      setLoading(true);
      setError(null);
      try {
        // Llamar con parámetro es_premium=true
        const data = await api.productos.getAll({
          es_premium: true,
          busqueda: searchTerm || undefined,
        });
        
        // Mapear datos del API al tipo local
        const mezcales = data.map((prod: any) => ({
          id: prod.id,
          nombre: prod.nombre,
          precio: Number(prod.precio_base),
          agave: prod.agave || "Mezcal",
          region: prod.region_produccion || "Oaxaca",
          maestro: prod.maestro_mezcalero || "Maestro desconocido",
          edicion: prod.edicion_limitada || "Edición regular",
          botella_numero: prod.botella_numero || null,
          notas: {
            aroma: prod.aroma_notas || "Aroma complejo",
            sabor: prod.sabor_notas || "Sabor profundo",
            cuerpo: prod.cuerpo_puntuacion || 7,
            final: prod.final_puntuacion || 8,
            complejidad: prod.complejidad_puntaje || 8,
          },
          descripcion: prod.descripcion,
          imagen: prod.imagen_principal_url || "/placeholder.jpg",
          color: prod.color_dominante || "#5A4936",
        }));
        
        setProductos(mezcales);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar mezcales");
      } finally {
        setLoading(false);
      }
    };

    fetchMezcales();
  }, [searchTerm]);

  // ... resto del componente igual
}
```

## 5. Agregar maestros mezcaleros en el backend

```typescript
// packages/database/prisma/schema.prisma

model MaestroMezcalero {
  id          Int      @id @default(autoincrement())
  nombre      String
  region      String
  experiencia Int      // Años
  biografia   String   @db.Text
  especialidad String
  imagen_url  String?
  
  productos   Producto[]
  
  @@index([region])
}

// Y actualizar Producto:
model Producto {
  // ... campos anteriores
  maestro_mezcalero_id  Int?
  maestro_mezcalero     MaestroMezcalero? @relation(fields: [maestro_mezcalero_id], references: [id])
}
```

## 6. Seed inicial de maestros (opcional)

```typescript
// apps/api/scripts/seed-maestros-mezcaleros.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const maestros = [
  {
    nombre: "Don Aurelio García",
    region: "Tlacolula de Matamoros",
    experiencia: 45,
    biografia: "Maestro mezcalero de cuarta generación...",
    especialidad: "Mezcal Tobalá",
    imagen_url: "https://...",
  },
  // ... más maestros
];

async function main() {
  for (const maestro of maestros) {
    await prisma.maestroMezcalero.create({ data: maestro });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Ejecutar: `node apps/api/scripts/seed-maestros-mezcaleros.ts`

## 7. Agregar fotos reales de productos

En lugar de Unsplash, usa tus propias imágenes:

```typescript
// apps/web/src/components/Store/MezcalPremiumCatalog.tsx

// Reemplazar:
imagen: "https://images.unsplash.com/photo/..."

// Con:
imagen: `/uploads/mezcales/${prod.id_producto}.jpg`
// O si están en un CDN:
imagen: `https://cdn.tudominio.com/mezcales/${prod.id_producto}.jpg`
```

## 8. Integrar Wishlist con Backend

```typescript
// Guardar wishlist en backend en lugar de estado local
const toggleWishlist = async (id: number) => {
  try {
    await api.favoritos.toggle(id);
    // Refetch wishlist
    const favorites = await api.favoritos.getAll();
    setWishlist(favorites.map(f => f.producto_id));
  } catch (err) {
    console.error("Error toggling wishlist:", err);
  }
};
```

## 9. Conectar "Agregar al carrito"

```typescript
// En MezcalProductDetail.tsx
const handleAddToCart = async (mezcal: Mezcal) => {
  try {
    await agregarProducto({
      id_producto: mezcal.id,
      nombre: mezcal.nombre,
      precio_base: mezcal.precio.toString(),
      imagen_principal_url: mezcal.imagen,
      cantidad: 1,
    });
    // Mostrar toast/notificación
  } catch (err) {
    console.error("Error adding to cart:", err);
  }
};
```

## 10. Testear la integración

```bash
# 1. Asegúrate que el API está ejecutándose
cd apps/api && npm run start:dev

# 2. El frontend debe hacer llamadas correctas
cd apps/web && npm run dev

# 3. Verifica en DevTools:
# - Network tab: GET /productos?es_premium=true
# - Console: sin errores
# - UI: productos cargados y categorizados
```

## Checklist de integración

- [ ] Schema Prisma actualizado con campos de mezcal premium
- [ ] Migración ejecutada (`npm run db:migrate`)
- [ ] Endpoint `/productos?es_premium=true` funciona
- [ ] Datos de maestros mezcaleros en la BD
- [ ] MezcalPremiumCatalog fetches desde API real
- [ ] Imágenes están en `/uploads` o CDN
- [ ] Wishlist conectada con backend
- [ ] Carrito agrega productos correctamente
- [ ] Búsqueda filtra por nombre, agave, maestro, región
- [ ] Sort por precio funciona

## Troubleshooting

### Error: 404 en GET /productos?es_premium=true
→ Verifica que agregaste el parámetro `es_premium` en `GetAllProductosDto`

### Las imágenes muestran placeholder
→ Verifica que `NEXT_PUBLIC_API_URL` en `.env` es correcto
→ Asegúrate que `/uploads/*` está mapeado en `next.config.mjs`

### Wishlist no persiste
→ Implementa endpoint en backend para guardar favoritos
→ Carga wishlist en `useEffect` al montar componente

### Datos incompletos (agave, maestro)
→ Verifica que tus registros en la BD tienen estos campos
→ Corre seed scripts para llenar datos de ejemplo

---

**Próximo paso**: Una vez integrado, considera agregar:
- [ ] Sistema de reviews/ratings
- [ ] Galería de fotos del producto (swiper)
- [ ] Matching con otros mezcales
- [ ] Historial de vista
- [ ] Recomendaciones personalizadas
