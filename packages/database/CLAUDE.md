# Database (Prisma + PostgreSQL) - Marketplace-Residencia

**Schema**: `packages/database/prisma/schema.prisma` (40+ modelos)  
**Provider**: PostgreSQL (Neon serverless)  
**Datasource**: `DIRECT_URL` env var

---

## Después de Cambios en Schema

```bash
npm run db:generate    # SIEMPRE (regenera Prisma client)
npm run db:migrate     # Crear migration
npm run db:push        # Push sin migration (dev)
npx prisma studio    # UI visual
```

---

## Modelos (40+) - Checklist de Implementación

### Auth & Usuarios (8 modelos)
- [ ] usuarios (UUID PK, email unique)
- [ ] usuario_rol (N:M users-roles)
- [ ] roles (ADMIN, PRODUCTOR, CLIENTE, TRANSPORTISTA)
- [ ] oauth_cuentas (Google, etc.)
- [ ] password_reset_tokens (30min expiry)
- [ ] refresh_tokens (30d expiry, rotation)
- [ ] auditoria (valor_anterior/nuevo JSON)
- [ ] archivos (entidad_tipo, estado)

### Productos & Catálogo (8 modelos)
- [ ] productos (BigInt PK, traducciones JSON)
- [ ] producto_imagenes (galería con orden)
- [ ] productos_traducciones (multi-idioma)
- [ ] categorias (parent-child)
- [ ] categorias_traducciones (multi-idioma)
- [ ] categorias_productos (N:M)
- [ ] inventario (stock + stock_minimo)
- [ ] movimientos_inventario (audit trail)

### Tiendas & Productores (5 modelos)
- [ ] tiendas (1:1 con productor)
- [ ] tiendas_traducciones (multi-idioma)
- [ ] productores (estado: pendiente/aprobado/rechazado)
- [ ] regiones (por país)
- [ ] lotes (trazabilidad mezcal)

### Lotes (1 modelo)
- [ ] lote_atributos (key-value, fuente: manual/lab)

### Carrito & Wishlist (2 modelos)
- [ ] carrito_item (con price_snapshot)
- [ ] lista_deseos_item (con nota)

### Pedidos (6 modelos)
- [ ] pedidos (master order)
- [ ] detalle_pedido (items con id_productor/tienda)
- [ ] pedido_productor (earnings por productor)
- [ ] pagos (Stripe integration)
- [ ] facturas (CFDI mexicano)
- [ ] envio_cotizaciones (shipping quotes)

### Envíos (5 modelos)
- [ ] envios (shipment master)
- [ ] envio_guias (AWB/labels)
- [ ] envio_eventos (tracking events)
- [ ] servicios_envio (service types)
- [ ] integraciones_envio (API credentials encrypted)

### Transportistas (1 modelo)
- [ ] transportistas (Fedex, DHL, etc.)

### Dinero (4 modelos)
- [ ] monedas (codigo, nombre, simbolo)
- [ ] tasas_cambio (Decimal 18,8, vigente_desde/hasta)
- [ ] tasas_impuesto (por país/categoría)
- [ ] comisiones (alcance: global/pais/categoria/productor)

### Payouts (1 modelo)
- [ ] payouts (monto_bruto, monto_neto)

### Direcciones (1 modelo)
- [ ] direcciones (ubicacion JSON con GIN index)

### Notificaciones (1 modelo)
- [ ] notificaciones (tipo, leido)

### Globales (3 modelos)
- [ ] paises (iso2 PK, moneda_default, idioma_default)
- [ ] idiomas (codigo PK)
- [ ] restricciones_envio_categoria (por pais/estado/categoria)

### Config (1 modelo)
- [ ] configuracion_sistema (key-value settings)

---

## Relaciones Críticas (Verificar)

### Users
- [ ] usuarios → usuario_rol → roles (N:M)
- [ ] usuarios → oauth_cuentas (1:N)
- [ ] usuarios → refresh_tokens (1:N)
- [ ] usuarios → password_reset_tokens (1:N)
- [ ] usuarios → productores (1:1 para PRODUCTOR)
- [ ] usuarios → pedidos (1:N)
- [ ] usuarios → carrito_item (1:N)
- [ ] usuarios → lista_deseos_item (1:N)
- [ ] usuarios → direcciones (1:N)
- [ ] usuarios → notificaciones (1:N)

### Productos
- [ ] productos → categorias_productos (N:M)
- [ ] productos → inventario (1:1)
- [ ] productos → movimientos_inventario (1:N)
- [ ] productos → producto_imagenes (1:N)
- [ ] productos → productos_traducciones (1:N)
- [ ] productos → carrito_item (1:N)
- [ ] productos → detalle_pedido (1:N)
- [ ] productos → lista_deseos_item (1:N)

### Pedidos
- [ ] pedidos → detalle_pedido (1:N)
- [ ] pedidos → pedido_productor (1:N)
- [ ] pedidos → pagos (1:1)
- [ ] pedidos → envios (1:1)
- [ ] pedidos → facturas (1:1)
- [ ] pedidos → movimientos_inventario (1:N)
- [ ] pedidos → envio_cotizaciones (1:N)

### Envíos
- [ ] envios → envio_guias (1:N)
- [ ] envio_guias → envio_eventos (1:N)
- [ ] envio_eventos → transportistas (FK)

### Productores
- [ ] productores → tiendas (1:1)
- [ ] productores → productos (1:N)
- [ ] productores → lotes (1:N)
- [ ] productores → comisiones (1:N)
- [ ] productores → payouts (1:N)

### Lotes
- [ ] lotes → lote_atributos (1:N)
- [ ] lotes → productos (1:N)

---

## Campos Especiales (Verificar)

### JSON/JSONB Fields (con GIN indexes)
- [ ] productos.traducciones (fallback JSON)
- [ ] productos.metadata
- [ ] direcciones.ubicacion (geo-search)
- [ ] auditoria.valor_anterior
- [ ] auditoria.valor_nuevo
- [ ] envio_cotizaciones.payload_request
- [ ] envio_cotizaciones.payload_response
- [ ] envio_guias.payload_response
- [ ] envio_eventos.payload

### Encrypted Fields (Bytes)
- [ ] integraciones_envio.api_key
- [ ] integraciones_envio.api_secret

### Array Fields
- [ ] productos.alergenos (String[])
- [ ] transportistas.paises_operacion (Char(2)[])

### Decimal Fields (NO Float)
- [ ] productos.precio_base Decimal(12,2)
- [ ] detalle_pedido.precio_compra Decimal(12,2)
- [ ] tasas_cambio.tasa Decimal(18,8) ← Precisión alta
- [ ] pagos.monto Decimal(10,2)
- [ ] comisiones.monto_fijo Decimal(12,2)
- [ ] payouts.monto_neto Decimal(14,2)

### UUID Fields
- [ ] usuarios.id_usuario (gen_random_uuid)

### BigInt Fields
- [ ] productos.id_producto
- [ ] pedidos.id_pedido
- [ ] carrito_item.id_item
- [ ] inventario.id_inventario
- [ ] Todos los detalles de pedido/envío

---

## Características Específicas del Dominio

### Multi-Idioma
- [ ] productos_traducciones (idioma, nombre, descripcion)
- [ ] categorias_traducciones
- [ ] tiendas_traducciones
- [ ] idiomas table (codigo, nombre, rtl)
- [ ] Fallback a ES si idioma no existe

### Multi-Moneda
- [ ] monedas table
- [ ] tasas_cambio table (Decimal 18,8)
- [ ] vigente_desde/hasta para validez
- [ ] productos.moneda_base
- [ ] pedidos.moneda + tipo_cambio
- [ ] pedidos.moneda_referencia (USD)

### Comisiones (Priority-based)
- [ ] comisiones.alcance (global/pais/categoria/productor)
- [ ] comisiones.prioridad (menor = aplica primero)
- [ ] comisiones.vigente_desde/hasta
- [ ] pedido_productor.id_comision_aplicada
- [ ] pedido_productor.comision_marketplace
- [ ] pedido_productor.monto_neto_productor

### Trazabilidad (Mezcal)
- [ ] lotes.codigo_lote (unique)
- [ ] lotes.estado_lote (disponible/agotado)
- [ ] lotes.grado_alcohol
- [ ] lotes.botellas_350ml, botellas_750ml
- [ ] lotes.url_trazabilidad (QR/blockchain)
- [ ] lote_atributos (key-value, fuente: manual/lab)

### Restricciones de Envío
- [ ] restricciones_envio_categoria
- [ ] (pais_iso2, estado_codigo, id_categoria) unique
- [ ] permitido boolean
- [ ] vigente_desde/hasta

### Auditoría
- [ ] auditoria.accion (INSERT/UPDATE/DELETE)
- [ ] auditoria.tabla_afectada
- [ ] auditoria.valor_anterior (JSON)
- [ ] auditoria.valor_nuevo (JSON)
- [ ] auditoria.ip_origen
- [ ] auditoria.fecha

### Soft Deletes
- [ ] usuarios.eliminado_en
- [ ] productos.eliminado_en
- [ ] tiendas.eliminado_en
- [ ] direcciones.eliminado_en
- [ ] direcciones.eliminado_en
- [ ] lotes.eliminado_en
- [ ] resenas.eliminado_en
- [ ] envio_guias.eliminado_en

---

## Índices Críticos (Verificar en schema)

### Performance Queries
- [ ] idx_productos_status
- [ ] idx_productos_tienda
- [ ] idx_inventario_producto
- [ ] idx_pedidos_usuario
- [ ] idx_pedidos_estado
- [ ] idx_pagos_estado
- [ ] idx_envios_estado
- [ ] idx_notificaciones_usuario_leido
- [ ] idx_carrito_usuario
- [ ] idx_resenas_producto
- [ ] idx_direcciones_predeterminada
- [ ] idx_prt_usuario
- [ ] idx_comisiones_resolucion
- [ ] idx_payouts_productor_estado
- [ ] idx_tasas_cambio_lookup
- [ ] idx_restr_envio_pais_estado

### JSON/GIN Indexes
- [ ] idx_productos_metadata (type: Gin)
- [ ] idx_productos_traducciones (type: Gin)
- [ ] idx_direcciones_ubicacion (type: Gin)

### Composite Indexes
- [ ] idx_cat_prod_producto (id_producto)
- [ ] idx_pedido_prod_pedido (id_pedido)
- [ ] idx_pedido_prod_productor (id_productor)

---

## Migraciones (Verificar)

### Archivos
```
packages/database/prisma/migrations/
├── 20260414030603_init/
├── 20260417010000_add_biografia/
├── 20260420000001_add_estado_productor/
└── 20260421042621_eliminar_orden_categorias/
```

- [ ] Cada migration tiene migration.sql
- [ ] Metadata timestamps correctos
- [ ] Sin migrations pendientes: `npx prisma migrate status`

---

## Seeding (Verificar)

### Scripts
- [ ] apps/api/scripts/seed-roles.js
- [ ] apps/api/scripts/seed-usuarios.js

### Data Base
- [ ] roles creados: ADMIN, PRODUCTOR, CLIENTE
- [ ] Usuarios demo por rol

---

## Cómo Usar Prisma en Backend

### Queries Típicas
- [ ] find + include (múltiples relaciones)
- [ ] findUnique (por ID)
- [ ] findMany (con where + orderBy)
- [ ] create (new record)
- [ ] update (modificar)
- [ ] delete (soft delete via eliminado_en)

### Transacciones
- [ ] prisma.$transaction() para múltiples tablas
- [ ] ROLLBACK automático si error

### Raw Queries (último recurso)
- [ ] prisma.$queryRaw (SELECT statements)
- [ ] prisma.$executeRaw (INSERT/UPDATE/DELETE)

---

## Environment Variables (Validar)

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://... (Neon serverless)
```

---

## Troubleshooting Checklist

- [ ] Prisma out of sync → `npm run db:generate`
- [ ] Migration pending → `npx prisma migrate deploy`
- [ ] Foreign key fail → Verificar que relacionado existe
- [ ] Unique constraint → Verificar duplicados
- [ ] Tipo field mismatch → Check schema.prisma
- [ ] Relación circular → Verificar N:M tables
- [ ] BigInt JSON error → Check main.ts serialización
- [ ] Decimal precision → Verificar (12,2) vs (18,8)

---

## Archivos Clave

- `packages/database/prisma/schema.prisma` - Fuente única de verdad
- `packages/database/prisma/migrations/` - Migration history
- `apps/api/src/prisma/prisma.service.ts` - Singleton en NestJS

---

## Estado: ✅ ESTRUCTURA VERIFICADA

Esta checklist verifica que tu BD tiene todos los 40+ modelos y relaciones necesarias.

**Próximo paso**: Ir por cada sección y checkear que está implementada en schema.prisma.  
**Tokens**: Solo lees estructura, sin queries/ejemplos largos.
