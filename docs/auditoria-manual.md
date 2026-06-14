# Auditoría Técnica — Manual de Sistema
## Marketplace Residencia (Mezcal Oaxaca)
### Marco de Referencia: NOM-070-SCFI-2016

> **Alcance:** Solo lectura. Ningún archivo fue modificado durante esta auditoría.  
> **Fecha de auditoría:** 2026-06-13  
> **Revisor:** Claude Code (Anthropic) — modo auditor de solo lectura  
> **Versión del código analizado:** rama `main`, commit `d7c26d3`

---

## Índice

- [4.3 Tipos especiales y convenciones](#43-tipos-especiales-y-convenciones)
- [4.4 Estrategia de migraciones](#44-estrategia-de-migraciones)
- [5.2 Concerns transversales](#52-concerns-transversales)
- [7.2 Guards y flujo de autorización](#72-guards-y-flujo-de-autorización)
- [7.3 Throttling, CORS y headers](#73-throttling-cors-y-headers)
- [7.4 Manejo de secretos y cifrado](#74-manejo-de-secretos-y-cifrado)
- [12.1 Seeds y datos iniciales](#121-seeds-y-datos-iniciales)
- [Anexo B — Índice de endpoints](#anexo-b--índice-de-endpoints)

---

## 4.3 Tipos especiales y convenciones

**Archivo fuente:** `packages/database/prisma/schema.prisma`

### 4.3.1 Campos BigInt (identificadores)

Los identificadores de alto volumen utilizan `BigInt` con autoincremento de PostgreSQL (`@default(autoincrement())`). El modelo `usuarios` es la única excepción, donde la llave primaria es `UUID` generado con `gen_random_uuid()`.

| Modelo | Campo | Tipo Prisma | Observación |
|---|---|---|---|
| `archivos` | `id_archivo` | `BigInt @id @default(autoincrement())` | PK de archivos adjuntos |
| `auditoria` | `id_auditoria` | `BigInt @id @default(autoincrement())` | PK del log de auditoría |
| `carrito_item` | `id_item` | `BigInt @id @default(autoincrement())` | PK de ítems de carrito |
| `detalle_pedido` | `id_detalle` | `BigInt @id @default(autoincrement())` | PK de líneas de pedido |
| `direcciones` | `id_direccion` | `BigInt @id @default(autoincrement())` | PK de direcciones |
| `envio_cotizaciones` | `id_cotizacion` | `BigInt @id @default(autoincrement())` | PK de cotizaciones |
| `envio_eventos` | `id_evento` | `BigInt @id @default(autoincrement())` | PK de eventos de tracking |
| `envio_guias` | `id_guia` | `BigInt @id @default(autoincrement())` | PK de guías de envío |
| `envios` | `id_envio` | `BigInt @id @default(autoincrement())` | PK de envíos |
| `facturas` | `id_factura` | `BigInt @id @default(autoincrement())` | PK de facturas CFDI |
| `inventario` | `id_inventario` | `BigInt @id @default(autoincrement())` | PK de registros de inventario |
| `ListaDeseosItem` | `id_item` | `BigInt @id @default(autoincrement())` | PK de wishlist |
| `lote_atributos` | `id_atributo` | `BigInt @id @default(autoincrement())` | PK de atributos de lote |
| `movimientos_inventario` | `id_movimiento` | `BigInt @id @default(autoincrement())` | PK de movimientos |
| `notificaciones` | `id_notificacion` | `BigInt @id @default(autoincrement())` | PK de notificaciones |
| `oauth_cuentas` | `id_cuenta` | `BigInt @id @default(autoincrement())` | PK de cuentas OAuth |
| `pagos` | `id_pago` | `BigInt @id @default(autoincrement())` | PK de pagos |
| `payouts` | `id_payout` | `BigInt @id @default(autoincrement())` | PK de liquidaciones |
| `payment_fees` | `id_fee` | `BigInt @id @default(autoincrement())` | PK de comisiones de pago |
| `pedidos` | `id_pedido` | `BigInt @id @default(autoincrement())` | PK de pedidos |
| `producto_imagenes` | `id_imagen` | `BigInt @id @default(autoincrement())` | PK de galería |
| `productos` | `id_producto` | `BigInt @id @default(autoincrement())` | PK del catálogo |
| `refresh_tokens` | `id_token` | `BigInt @id @default(autoincrement())` | PK de tokens de refresco |
| `refunds` | `id_refund` | `BigInt @id @default(autoincrement())` | PK de reembolsos |
| `webhook_events_log` | `id` | `BigInt @id @default(autoincrement())` | PK de log de webhooks |

> **Serialización:** `main.ts` (línea 14–16) parchea el prototipo global:
> ```typescript
> (BigInt.prototype as any).toJSON = function () { return Number(this); };
> ```
> Esto garantiza que todos los `BigInt` se serialicen como `Number` en las respuestas JSON, evitando errores de serialización nativa.

### 4.3.2 Campos Decimal con precisión explícita

Todos los importes monetarios utilizan `Decimal` (nunca `Float`) con precisión declarada en `@db.Decimal(p,s)` para preservar exactitud aritmética.

| Modelo | Campo | Precisión | Uso |
|---|---|---|---|
| `carrito_item` | `precio_unitario_snapshot` | `@db.Decimal(12,2)` | Snapshot de precio al agregar al carrito |
| `comisiones` | `porcentaje` | `@db.Decimal(6,4)` | Porcentaje de comisión (ej. 0.1500 = 15%) |
| `comisiones` | `monto_fijo` | `@db.Decimal(12,2)` | Comisión fija en moneda |
| `detalle_pedido` | `precio_compra` | `@db.Decimal(12,2)` | Precio al momento de compra |
| `detalle_pedido` | `impuesto` | `@db.Decimal(12,2)` | Impuesto aplicado por línea |
| `envios` | `valor_declarado_aduana` | `@db.Decimal(14,2)` | Valor declarado para aduana |
| `envios` | `peso_kg`, `alto_cm`, `ancho_cm`, `largo_cm` | `@db.Decimal(8,3)` / `@db.Decimal(8,2)` | Dimensiones físicas |
| `envios` | `costo_envio`, `costo_proteccion` | `@db.Decimal(14,2)` | Costos de envío |
| `envio_cotizaciones` | `precio_total` | `@db.Decimal(14,2)` | Precio cotizado |
| `facturas` | `subtotal`, `impuestos_total`, `total` | `@db.Decimal(14,2)` | Montos de factura CFDI |
| `ListaDeseosItem` | `precio_snapshot` | `@db.Decimal(12,2)` | Snapshot de precio en wishlist |
| `lotes` | `grado_alcohol` | `@db.Decimal(5,2)` | Porcentaje de alcohol (dominio NOM-070) |
| `pagos` | `monto`, `monto_reembolsado` | `@db.Decimal(14,2)` | Montos de transacción |
| `payment_fees` | `monto_fee` | `@db.Decimal(14,6)` | Comisión del proveedor de pago |
| `payment_fees` | `porcentaje` | `@db.Decimal(6,4)` | Porcentaje de fee |
| `payment_fees` | `monto_fijo` | `@db.Decimal(14,2)` | Fee fijo |
| `payouts` | `monto_bruto`, `monto_comision`, `monto_neto` | `@db.Decimal(14,2)` | Liquidaciones a productores |
| `pedido_productor` | `subtotal_bruto`, `comision_marketplace`, `monto_neto_productor` | `@db.Decimal(14,2)` | Reparto por productor |
| `pedidos` | `total`, `tax_amount`, `shipping_amount`, `discount_amount` | `@db.Decimal(14,2)` | Totales del pedido |
| `pedidos` | `tipo_cambio` | `@db.Decimal(10,4)` | Tipo de cambio aplicado |
| `productos` | `precio_base` | `@db.Decimal(12,2)` | Precio base del producto |
| `refunds` | `monto` | `@db.Decimal(14,2)` | Monto a reembolsar |
| `tasas_cambio` | `tasa` | `@db.Decimal(18,8)` | Tasa de cambio (alta precisión) |
| `tasas_impuesto` | `tasa_porcentaje` | `@db.Decimal(6,4)` | Porcentaje de impuesto |
| `tasas_impuesto` | `monto_fijo` | `@db.Decimal(12,4)` | Impuesto fijo en moneda |

### 4.3.3 Campos Json e índices GIN

| Modelo | Campo | Índice GIN | Uso |
|---|---|---|---|
| `auditoria` | `valor_anterior`, `valor_nuevo` | No | Log de cambios (antes/después) |
| `direcciones` | `ubicacion` | `idx_direcciones_ubicacion (type: Gin)` | Datos geográficos; soporta búsqueda por operadores JSONB de PostgreSQL |
| `envio_cotizaciones` | `payload_request`, `payload_response` | No | Payload crudo de la API de transportista |
| `envio_eventos` | `payload` | No | Evento de tracking crudo |
| `envio_guias` | `payload_request`, `payload_response` | No | Payload de creación de guía |
| `integraciones_envio` | `credenciales_extra` | No | Parámetros adicionales de API |
| `lotes` | `datos_api` | No | Datos crudos de API externa (NOM-070) |
| `pedidos` | `direccion_envio_snapshot`, `direccion_facturacion_snapshot` | No | Snapshot inmutable de dirección al pedido |
| `productos` | `metadata` | `idx_productos_metadata (type: Gin)` | Atributos extendidos; filtrado JSONB |
| `productos` | `traducciones` | `idx_productos_traducciones (type: Gin)` | Traducciones incrustadas (ES/EN) con fallback |

**Índices GIN para búsqueda de texto libre (trigram):**
```
idx_productos_nombre_trgm     → nombre(ops: raw("gin_trgm_ops"))
idx_productos_descripcion_trgm → descripcion(ops: raw("gin_trgm_ops"))
```
> Requieren la extensión PostgreSQL `pg_trgm`. Permiten búsquedas `ILIKE '%term%'` sin full table scan.

### 4.3.4 Campos Bytes (datos cifrados)

| Modelo | Campo | Uso |
|---|---|---|
| `integraciones_envio` | `api_key` | Clave de API del transportista cifrada en base de datos |
| `integraciones_envio` | `api_secret` | Secreto de API del transportista cifrado en base de datos |
| `envio_guias` | `label_pdf` | PDF de etiqueta de envío almacenado en binario |

> El esquema declara estos campos como `Bytes?`. El cifrado/descifrado de `api_key` y `api_secret` se realiza mediante AES-256-CBC en la capa de servicio (véase sección 7.4).

### 4.3.5 Patrón de Soft Delete

El sistema implementa eliminación lógica mediante el campo `eliminado_en DateTime? @db.Timestamptz(6)`. Los registros no se eliminan físicamente; se marca la fecha de borrado y las consultas filtran por `eliminado_en IS NULL`.

| Modelo | Campo de soft delete | Índices que lo consideran |
|---|---|---|
| `direcciones` | `eliminado_en` | `idx_direcciones_predeterminada` |
| `envio_guias` | `eliminado_en` | (sin índice compuesto) |
| `lotes` | `eliminado_en` | `idx_lotes_productor_estado` (implícito) |
| `pedidos` | `eliminado_en` | `idx_pedidos_soft_fecha`, `idx_pedidos_soft_estado_fecha`, `idx_pedidos_usuario_soft_fecha` |
| `permisos` | `eliminado_en` | (sin índice compuesto) |
| `productores` | `eliminado_en` | (sin índice compuesto) |
| `resenas` | `eliminado_en` | `idx_resenas_prod_eliminado` |
| `roles` | `eliminado_en` | (sin índice compuesto) |
| `tiendas` | `eliminado_en` | (sin índice compuesto) |
| `usuarios` | `eliminado_en` | (sin índice compuesto) |

**Resumen de convenciones globales:**
1. **Identidad:** BigInt para entidades de alto volumen; UUID para `usuarios`.
2. **Dinero:** siempre `Decimal` con precisión explícita; nunca `Float`.
3. **Timestamps:** `DateTime @db.Timestamptz(6)` (con zona horaria) en todos los campos de auditoría y negocio.
4. **Fechas de negocio:** `DateTime @db.Date` (sin hora) para fechas de producción y vencimiento.
5. **Moneda:** enum `Moneda { MXN USD }` en lugar de cadena libre; garantiza integridad referencial.
6. **Arrays nativos:** `String[]` para `productos.alergenos` y `transportistas.paises_operacion`.
7. **Soft delete:** campo `eliminado_en DateTime?` en todos los modelos que requieren historial.

---

## 4.4 Estrategia de migraciones

### 4.4.1 Ubicación de la carpeta de migraciones

```
packages/database/prisma/migrations/
```

### 4.4.2 Migraciones existentes

Se encontraron **15 migraciones** en la carpeta, más el archivo `migration_lock.toml`.

| Nombre de migración | Fecha (UTC) | Descripción inferida del nombre |
|---|---|---|
| `20260414030603_init` | 2026-04-14 | Esquema inicial completo |
| `20260417010000_add_biografia` | 2026-04-17 | Campo `biografia` en `productores` |
| `20260420000001_add_estado_productor` | 2026-04-20 | Estado de aprobación del productor |
| `20260421042621_eliminar_orden_categorias` | 2026-04-21 | Eliminación de campo de orden en categorías |
| `20260501000000_add_internacionalizacion_basica` | 2026-05-01 | Tablas de idiomas, países, tasas de cambio |
| `20260503000000_add_marketplace_usa_mvp` | 2026-05-03 | Soporte para mercado USA (envíos internacionales) |
| `20260512000000_add_payout_retry_fields` | 2026-05-12 | Campos de reintento en `payouts` |
| `20260512000001_add_productor_categoria` | 2026-05-12 | Tabla `productor_categoria` (N:M) |
| `20260601000000_reduce_tables_add_indexes` | 2026-06-01 | Optimización: eliminación de tablas e índices |
| `20260601120000_add_payment_fees_refunds_fix_pagos` | 2026-06-01 | Tablas `payment_fees` y `refunds` |
| `20260601200000_remove_monedas_add_enum` | 2026-06-01 | Migración de tabla `monedas` a enum `Moneda` |
| `20260606000000_migrar_bodega_a_direcciones` | 2026-06-06 | Campos `bodega_*` del productor → `id_direccion_bodega` |
| `20260610000000_add_unique_detalle_pago` | 2026-06-10 | Restricción `UNIQUE` en detalle de pedido/pago |
| `20260610100000_perf_fase1_indices` | 2026-06-10 | Índices de rendimiento (fase 1) |
| `20260610200000_add_idx_productos_status_creado` | 2026-06-10 | Índice compuesto en `productos` por `status` y `creado_en` |

### 4.4.3 Herramienta utilizada

El proyecto utiliza **`prisma migrate`** (modo `dev` para desarrollo, `deploy` para producción), no `prisma db push`. La existencia del archivo `migration_lock.toml` y la carpeta `migrations/` con archivos `migration.sql` individuales confirma el uso de migraciones versionadas.

### 4.4.4 Scripts de base de datos relevantes

**Raíz del monorepo (`package.json`):**
```json
"db:generate": "turbo run generate"
```
> Regenera el cliente Prisma en todos los paquetes mediante Turborepo.

**`packages/database/package.json`:**
No encontrado en el código. El paquete `database` no cuenta con un `package.json` propio con scripts. La gestión de migraciones se realiza desde la raíz invocando `prisma` con el flag `--schema`.

**`apps/api/package.json`:**
```json
"prisma:generate": "prisma generate --schema=../../packages/database/prisma/schema.prisma"
```
> Regenera el cliente usando la ruta explícita al esquema compartido.

**Flujo de trabajo real:**
1. El desarrollador modifica `packages/database/prisma/schema.prisma`.
2. Ejecuta `npm run db:generate` desde la raíz (regenera el cliente).
3. Para crear una migración: `npx prisma migrate dev --schema=packages/database/prisma/schema.prisma --name <nombre>` (comando directo, sin alias en `package.json` de raíz).
4. Para desplegar en producción: `npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma`.

---

## 5.2 Concerns transversales

**Archivo fuente principal:** `apps/api/src/main.ts`

### 5.2.1 ValidationPipe global

```typescript
// apps/api/src/main.ts, líneas 47–55
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

| Opción | Valor | Efecto |
|---|---|---|
| `whitelist` | `true` | Elimina automáticamente propiedades no declaradas en los DTOs; previene la inyección de campos no esperados |
| `transform` | `true` | Transforma los datos entrantes al tipo TypeScript declarado en el DTO |
| `enableImplicitConversion` | `true` | Convierte tipos de manera implícita (ej. cadena `"123"` → número `123` en parámetros de query) |

**Clase:** `ValidationPipe` de `@nestjs/common`.

### 5.2.2 AllExceptionsFilter (filtro global de excepciones)

**Archivo:** `apps/api/src/common/filters/all-exceptions.filter.ts`

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter { ... }
```

Registrado en `main.ts` (línea 45):
```typescript
app.useGlobalFilters(new AllExceptionsFilter());
```

**Comportamiento:**
- Captura **todas** las excepciones (decorador `@Catch()` sin argumentos).
- Para `HttpException`: extrae el `statusCode`, `message` (concatena arrays de validación con `·`) y el campo opcional `code`.
- Para errores no controlados: responde siempre con HTTP 500 y un mensaje genérico; el detalle real del error se registra en el logger del servidor y **nunca se filtra al cliente**.
- Normaliza toda respuesta de error al formato: `{ success: false, statusCode, message, code? }`.

### 5.2.3 SanitizeBodyInterceptor

**Archivo:** `apps/api/src/common/interceptors/sanitize.interceptor.ts`

```typescript
@Injectable()
export class SanitizeBodyInterceptor implements NestInterceptor { ... }
```

Registrado en `main.ts` (línea 44):
```typescript
app.useGlobalInterceptors(new SanitizeBodyInterceptor());
```

**Comportamiento:** Antes de que la solicitud llegue al controlador, recorre recursivamente el `request.body` y aplica la función `stripHtml`, que:
1. Elimina etiquetas `<script>` completas (con su contenido).
2. Elimina cualquier otra etiqueta HTML (`<[^>]+>`).
3. Remueve esquemas `javascript:`.
4. Elimina manejadores de eventos inline (`onXxx=`).

Actúa sobre cadenas de texto, arrays y objetos anidados de forma recursiva. Proporciona una capa de defensa contra XSS en la capa de entrada.

### 5.2.4 Patch de serialización de BigInt

```typescript
// apps/api/src/main.ts, líneas 14–16
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};
```

Se ejecuta **antes** del arranque del módulo NestJS (`bootstrap()`). Garantiza que todos los valores `BigInt` provenientes de PostgreSQL (utilizados como PKs) sean serializados como `Number` en las respuestas JSON, evitando el error `TypeError: Do not know how to serialize a BigInt`.

> **Nota de diseño:** La conversión a `Number` es segura para los valores actuales de los IDs, pero podría perder precisión para IDs mayores a `Number.MAX_SAFE_INTEGER` (2⁵³ − 1 ≈ 9 × 10¹⁵).

### 5.2.5 ThrottlerGuard (global)

Registrado en `app.module.ts` (líneas 39, 74):
```typescript
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])
// ...
providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
```

El `ThrottlerGuard` se aplica **globalmente** a todos los controladores (ver sección 7.3 para detalles).

---

## 7.2 Guards y flujo de autorización

### 7.2.1 Guards disponibles

| Guard | Archivo | Propósito |
|---|---|---|
| `AuthGuard` | `apps/api/src/modules/auth/guards/auth.guard.ts` | Valida el token JWT Bearer en el header `Authorization` |
| `RolesGuard` | `apps/api/src/modules/auth/guards/rbac.guard.ts` | Verifica que el usuario tenga al menos uno de los roles requeridos |
| `PermisosGuard` | `apps/api/src/modules/auth/guards/rbac.guard.ts` | Verifica que el usuario tenga **todos** los permisos requeridos |
| `ThrottlerGuard` | `@nestjs/throttler` (externo) | Limita la tasa de solicitudes (aplicado globalmente desde `app.module.ts`) |

### 7.2.2 Decoradores de metadatos

**Archivo:** `apps/api/src/modules/auth/guards/roles.decorator.ts`

Los decoradores `@Roles(...)` y `@Permisos(...)` almacenan metadatos que leen `RolesGuard` y `PermisosGuard` respectivamente mediante el `Reflector` de NestJS.

```typescript
// rbac.guard.ts — claves de metadatos
export const ROLES_KEY = 'roles';
export const PERMISOS_KEY = 'permisos';
```

### 7.2.3 Orden de filtrado de una petición autenticada

Para un endpoint con `@UseGuards(AuthGuard, RolesGuard)` y `@Roles('administrador')`, el flujo es:

```
Request HTTP
    ↓
[1] ThrottlerGuard (global — APP_GUARD)
    ↓  Rechaza con HTTP 429 si se supera el límite de solicitudes
[2] AuthGuard (@UseGuards en endpoint/controlador)
    ↓  Lee header Authorization: Bearer <token>
    ↓  Verifica firma JWT con JWT_ACCESS_SECRET
    ↓  Valida que token_type === 'access'
    ↓  Adjunta el payload al request.user
    ↓  Rechaza con HTTP 401 si el token es inválido/ausente
[3] RolesGuard (@UseGuards en endpoint/controlador)
    ↓  Lee metadatos @Roles mediante Reflector
    ↓  Si no hay @Roles declarados → permite pasar (open to all authenticated)
    ↓  Compara user.roles[] contra los roles requeridos (case-insensitive)
    ↓  Rechaza con HTTP 403 si el usuario no tiene el rol
[4] PermisosGuard (@UseGuards en endpoint/controlador, solo en módulo roles)
    ↓  Lee metadatos @Permisos mediante Reflector
    ↓  Si no hay @Permisos declarados → permite pasar
    ↓  Verifica que user.permisos[] contenga TODOS los permisos requeridos
    ↓  Rechaza con HTTP 403 si falta algún permiso
[5] ValidationPipe (global)
    ↓  Valida y transforma el body/params/query según DTOs
[6] SanitizeBodyInterceptor (global)
    ↓  Limpia HTML/XSS del body
[7] Controlador → Servicio → Prisma
```

> **Diferencia `RolesGuard` vs `PermisosGuard`:** `RolesGuard` usa `some` (al menos un rol coincide); `PermisosGuard` usa `every` (todos los permisos deben estar presentes). En la práctica, `PermisosGuard` solo se usa en el módulo `roles` (`RolesController`), que aplica los tres guards en nivel de controlador.

### 7.2.4 Ámbito de aplicación de los guards

| Ámbito | Guards aplicados | Ejemplo |
|---|---|---|
| Global (APP_GUARD) | `ThrottlerGuard` | Todos los endpoints |
| Nivel controlador | `AuthGuard + RolesGuard + PermisosGuard` | `RolesController`, `AuditoriaController`, `AdminController`, `PayoutsController`, `ComisionesController` |
| Nivel endpoint | `AuthGuard` o `AuthGuard + RolesGuard` | La mayoría de endpoints de negocio |
| Sin guard (público) | Ninguno | `GET /productos`, `GET /categorias`, `GET /estadisticas/*`, `POST /auth/login`, `POST /auth/register` |

---

## 7.3 Throttling, CORS y headers

### 7.3.1 ThrottlerModule

**Archivo:** `apps/api/src/app.module.ts` (línea 39)

```typescript
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])
```

| Parámetro | Valor | Interpretación |
|---|---|---|
| `ttl` | `60_000` ms (60 segundos) | Ventana de tiempo para contar solicitudes |
| `limit` | `120` | Máximo de solicitudes por IP por ventana |

El guard se registra como `APP_GUARD` global, por lo que aplica a todos los endpoints salvo los excluidos con `@SkipThrottle()`.

**Límites específicos por endpoint (sobreescriben el global):**

| Endpoint | `limit` | `ttl` | Motivo |
|---|---|---|---|
| `POST /auth/register` | 10 | 60 000 ms | Prevención de registro masivo |
| `POST /auth/login` | 10 | 60 000 ms | Prevención de fuerza bruta |
| `POST /auth/password-reset/request` | 5 | 300 000 ms (5 min) | Prevención de abuso de reset |
| `POST /auth/password-reset/confirm` | 10 | 300 000 ms (5 min) | Prevención de abuso de reset |

### 7.3.2 CORS

**Archivo:** `apps/api/src/main.ts` (líneas 26–42)

```typescript
const rawOrigins = process.env.CORS_ORIGINS ?? 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);
const isProd = process.env.NODE_ENV === 'production';

app.enableCors({
  origin: (origin, callback) => {
    if (isProd && !origin) {
      callback(new Error('Origin header required'));
      return;
    }
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
});
```

| Parámetro | Valor / Comportamiento |
|---|---|
| Orígenes permitidos | Variable de entorno `CORS_ORIGINS` (lista separada por comas); por defecto `http://localhost:3000` |
| `credentials` | `true` (permite envío de cookies y headers de autorización) |
| Producción sin `Origin` | Rechazado con error (no se permiten solicitudes sin cabecera `Origin`) |
| Sin origen (herramientas como cURL en desarrollo) | Permitido en entorno no-producción |

### 7.3.3 Headers de seguridad (Helmet)

**No encontrado en el código.** La librería `helmet` o equivalente de configuración de cabeceras de seguridad HTTP (`Strict-Transport-Security`, `X-Frame-Options`, `Content-Security-Policy`, etc.) **no está presente** en `main.ts` ni en ningún módulo identificado. Se recomienda su incorporación para entornos de producción.

---

## 7.4 Manejo de secretos y cifrado

### 7.4.1 Servicio de cifrado

**Archivo:** `apps/api/src/modules/productores/productores.service.ts` (líneas 24–66)

El sistema implementa cifrado simétrico utilizando la biblioteca nativa `crypto` de Node.js.

```typescript
import { createCipheriv, randomBytes, createDecipheriv } from "crypto";

const IV_LENGTH = 16; // 128 bits

function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-cbc", getEncryptionKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}
```

| Propiedad | Valor |
|---|---|
| **Algoritmo** | AES-256-CBC |
| **Longitud de clave** | 256 bits (32 bytes, leída de variable de entorno como hex de 64 caracteres) |
| **IV (Vector de Inicialización)** | 128 bits (16 bytes), generado aleatoriamente por `crypto.randomBytes()` para cada operación de cifrado |
| **Formato de almacenamiento** | `<iv_hex>:<ciphertext_hex>` concatenados con `:` |

> **Observación:** AES-256-CBC es un cifrado de bloque seguro. Sin embargo, no proporciona autenticación del ciphertext (no autentica el mensaje). Para nuevas implementaciones se recomienda AES-256-GCM, que combina cifrado y autenticación (AEAD). Esto no invalida la implementación actual para el dominio de uso, pero debe considerarse en actualizaciones futuras.

### 7.4.2 Campos cifrados

| Modelo | Campo | Dónde se cifra | Dónde se descifra |
|---|---|---|---|
| `productores` | `datos_bancarios` | `productores.service.ts` → `solicitarProductor()` (línea 268) y `actualizarMiPerfil()` (línea 691) | `productores.service.ts` → `getMiSolicitud()` (línea 492) |

El campo `integraciones_envio.api_key` e `integraciones_envio.api_secret` están definidos como `Bytes?` en el esquema, lo que indica capacidad de almacenamiento cifrado, pero el servicio de cifrado/descifrado para esos campos **no fue localizado** en los archivos analizados.

### 7.4.3 Variables de entorno de secretos

Las siguientes variables de entorno contienen valores sensibles. **Los valores reales no se exponen en este documento.**

| Variable | Propósito |
|---|---|
| `ENCRYPTION_KEY` | Clave AES-256 (32 bytes en hex) para cifrar `datos_bancarios`; validada como cadena hexadecimal de 64 caracteres |
| `JWT_ACCESS_SECRET` | Secreto HMAC para firma de tokens de acceso (duración 15 min) |
| `JWT_REFRESH_SECRET` | Secreto HMAC para firma de tokens de refresco (duración 30 días) |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL (Neon serverless) |
| `DIRECT_URL` | URL directa de PostgreSQL para Prisma (Neon) |
| `NEXTAUTH_SECRET` | Secreto de NextAuth para sesiones OAuth (frontend) |
| `GOOGLE_CLIENT_ID` | ID de cliente OAuth de Google |
| `GOOGLE_CLIENT_SECRET` | Secreto de cliente OAuth de Google |
| `SENDGRID_API_KEY` | Clave de API de SendGrid para envío de correos |
| `STRIPE_WEBHOOK_SECRET` | Secreto para verificar firmas de webhooks de Stripe |
| `SKYDROPX_WEBHOOK_SECRET` | Secreto para verificar firmas HMAC-SHA512 de webhooks de SkydropX |

### 7.4.4 Orden de carga de variables de entorno

```typescript
// apps/api/src/main.ts, líneas 10–12
dotenv.config({ path: resolve(process.cwd(), 'apps/api/.env'), override: true });
dotenv.config({ path: resolve(__dirname, '../.env'), override: false });
dotenv.config({ path: resolve(process.cwd(), '.env'), override: false });
```

**Prioridad (de mayor a menor):** `apps/api/.env` → `apps/api/dist/../.env` → `.env` (raíz).

---

## 12.1 Seeds y datos iniciales

### 12.1.1 Archivos de seed disponibles

| Script (en `apps/api/`) | Alias en `package.json` | Descripción |
|---|---|---|
| `scripts/seed-internacionalizacion.js` | `npm run seed:internacionalizacion` | Idiomas, países, comisiones por país, tasas de cambio iniciales, tasas de impuesto (IVA MX, IEPS mezcal, FET USA) |
| `scripts/seed-base.js` | `npm run seed:base` | Regiones de Oaxaca, categorías con códigos HS arancelarios, transportista Estafeta, configuración del sistema (IVA, IEPS, moneda, pedido mínimo), comisiones globales |
| `scripts/seed-roles.js` | `npm run seed:roles` | Roles (`administrador`, `productor`, `cliente`), permisos (`gestionar_usuarios`, `gestionar_productos`, etc.), asignación de permisos a roles, usuarios demo de prueba |
| `scripts/seed-admin.js` | `npm run seed:admin` | Usuario administrador de producción (credenciales desde variables de entorno) |
| `scripts/seed-usuarios.js` | `npm run seed:usuarios` | Usuarios adicionales de demostración |
| `scripts/seed-skydropx.js` | `npm run seed:skydropx` | Datos de integración del transportista SkydropX |
| `scripts/seed-restricciones-usa.js` | `npm run seed:restricciones-usa` | Restricciones de envío por categoría para estados de EE.UU. |

### 12.1.2 Orden recomendado de ejecución

```
1. npm run seed:internacionalizacion   ← Primero: idiomas y países (dependencia de casi todos los demás)
2. npm run seed:base                   ← Regiones, categorías, transportista base, configuración del sistema
3. npm run seed:roles                  ← Roles, permisos y usuarios demo
4. npm run seed:admin                  ← Usuario administrador de producción
5. npm run seed:usuarios               ← (opcional) Usuarios adicionales de demostración
6. npm run seed:skydropx               ← (opcional) Integración de SkydropX
7. npm run seed:restricciones-usa      ← (opcional) Restricciones de envío USA
```

> **Todos los scripts son idempotentes:** verifican la existencia del registro antes de insertarlo (`findUnique`/`findFirst`), por lo que pueden ejecutarse múltiples veces sin duplicar datos.

### 12.1.3 Datos creados por cada seed

**`seed-internacionalizacion.js`:**
- 11 idiomas (ES, EN, FR, PT, DE, IT, ES-MX, ES-ES, EN-US, EN-GB, PT-BR)
- 13 países (MX, US, CA, ES, FR, DE, IT, GB, CO, CL, AR, BR, JP)
- Comisiones por país: Global 15%, USA 18%, MX 15%
- Tasas de cambio iniciales: MXN↔USD (tasa manual, requiere cron en producción)
- Tasas de impuesto: IVA MX 16%, IEPS mezcal 26.5% (incluido), Sales Tax USA (inactivo), FET USA 5%

**`seed-base.js`:**
- 8 regiones geográficas de Oaxaca (Valles Centrales, Sierra Norte, Sierra Sur, Mixteca, Cañada, Papaloapan, Istmo, Costa)
- 4 categorías con códigos HS: Mezcal (`2208.907200`), Artesanía (`6304.99`), Alimentación (`2106.90`), Cosméticos (`3304.99`)
- Transportista Estafeta con servicios ESTANDARD y EXPRESS (nacional MX)
- 10 entradas en `configuracion_sistema`: `IMPUESTO_IVA`, `IMPUESTO_IEPS`, `MONEDA_DEFAULT`, `MONEDA_REFERENCIA`, `PEDIDO_MINIMO`, `ENVIO_GRATIS_DESDE`, `PAGOS_HABILITADOS`, `INVENTARIO_HABILITADO`, `COMISION_PLATAFORMA`, `IVA_INCLUIDO`

**`seed-roles.js`:**
- Roles: `administrador`, `productor`, `cliente`
- Permisos admin: `gestionar_usuarios`, `gestionar_productos`, `gestionar_pedidos`, `gestionar_categorias`, `ver_reportes`, `gestionar_productores`
- Permisos productor: `panel_productor`, `ver_productos`, `crear_producto`, `editar_producto`, `eliminar_producto`, `ver_inventario`, `crear_inventario`, `editar_inventario`, `ver_pedidos`, `editar_pedido`, `ver_tienda`, `crear_tienda`, `editar_tienda`
- Usuarios demo: `admin@marketplace.local`, `productor@marketplace.local`, `cliente@marketplace.local` (contraseñas hasheadas con bcrypt, factor 10)

---

## Anexo B — Índice de endpoints

### B.1 Documentación Swagger

**Swagger está configurado y disponible.** El módulo `@nestjs/swagger` se inicializa en `main.ts` (líneas 57–64):

```typescript
const swaggerConfig = new DocumentBuilder()
  .setTitle('Marketplace Residencia API')
  .setDescription('API del marketplace de mezcal')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup('api/docs', app, document);
```

| Propiedad | Valor |
|---|---|
| **URL de acceso** | `http://localhost:3001/api/docs` |
| **Título** | Marketplace Residencia API |
| **Versión** | 1.0 |
| **Autenticación** | Bearer JWT (botón `Authorize` en la UI) |
| **Generación** | En tiempo de ejecución a partir de decoradores `@nestjs/swagger` en controladores y DTOs |

### B.2 Tabla consolidada de endpoints

A continuación se presenta el inventario completo de endpoints derivado del análisis de los 30 archivos controladores ubicados en `apps/api/src/modules/**/*.controller.ts`.

#### Módulo: auth

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/auth/register` | Público (throttle: 10/60s) | Registro de nuevo usuario |
| POST | `/auth/login` | Público (throttle: 10/60s) | Inicio de sesión con email/contraseña |
| GET | `/auth/me` | Bearer token (sin AuthGuard formal) | Obtiene datos del usuario autenticado |
| POST | `/auth/refresh` | Público | Refresca el token de acceso usando refresh token |
| POST | `/auth/logout` | Público | Revoca el refresh token |
| POST | `/auth/password-reset/request` | Público (throttle: 5/300s) | Solicita correo de restablecimiento de contraseña |
| POST | `/auth/password-reset/confirm` | Público (throttle: 10/300s) | Confirma el restablecimiento de contraseña |
| POST | `/auth/oauth/google` | Público | Login/registro con token OAuth de Google |
| GET | `/auth/oauth/google` | Público | Inicia flujo OAuth de Google (redirect) |
| GET | `/auth/oauth/google/callback` | Público | Callback de Google OAuth; redirige al frontend con tokens |

#### Módulo: usuarios

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/usuarios` | AuthGuard + RolesGuard (`administrador`) | Lista todos los usuarios con paginación |
| GET | `/usuarios/:id` | AuthGuard (propio o admin) | Obtiene perfil de usuario |
| POST | `/usuarios` | AuthGuard + RolesGuard (`administrador`) | Crea usuario (admin) |
| PATCH | `/usuarios/:id` | AuthGuard (propio o admin) | Actualiza perfil de usuario |
| PATCH | `/usuarios/:id/foto` | AuthGuard (propio o admin) | Sube foto de perfil (multipart) |
| DELETE | `/usuarios/:id` | AuthGuard + RolesGuard (`administrador`) | Elimina usuario (soft delete) |
| POST | `/usuarios/:id/roles` | AuthGuard + RolesGuard (`administrador`) | Asigna rol a usuario |
| DELETE | `/usuarios/:id/roles/:id_rol` | AuthGuard + RolesGuard (`administrador`) | Quita rol de usuario |

#### Módulo: productos

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/productos` | Público (token opcional para filtros) | Lista catálogo de productos con filtros |
| GET | `/productos/sin-lote/check` | Público | Productos sin lote asignado |
| POST | `/productos/sin-lote/assign-matching` | AuthGuard + RolesGuard (`administrador`) | Asigna lotes automáticamente |
| GET | `/productos/alertas-stock` | AuthGuard | Alertas de stock del productor autenticado |
| GET | `/productos/:id` | Público | Detalle de producto |
| POST | `/productos` | AuthGuard + RolesGuard (`productor`, `administrador`) | Crea producto (con imagen opcional) |
| PATCH | `/productos/:id` | AuthGuard + RolesGuard (`productor`, `administrador`) | Actualiza producto |
| DELETE | `/productos/:id` | AuthGuard + RolesGuard (`productor`, `administrador`) | Elimina producto (soft delete) |

#### Módulo: categorias

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/categorias` | Público | Lista todas las categorías |
| GET | `/categorias/:id` | Público | Detalle de categoría |
| POST | `/categorias` | AuthGuard + RolesGuard (`administrador`) | Crea categoría |
| PATCH | `/categorias/:id` | AuthGuard + RolesGuard (`administrador`) | Actualiza categoría |
| DELETE | `/categorias/:id` | AuthGuard + RolesGuard (`administrador`) | Elimina categoría |

#### Módulo: productores

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/productores/regiones` | Público | Lista regiones de Oaxaca |
| GET | `/productores/by-usuario/:id_usuario` | Público | Productor por UUID de usuario |
| GET | `/productores/mi-solicitud` | AuthGuard | Solicitud de onboarding del productor autenticado |
| POST | `/productores/regiones` | Público (sin guard) | Crea región |
| PATCH | `/productores/regiones/:id` | Público (sin guard) | Actualiza región |
| DELETE | `/productores/regiones/:id` | Público (sin guard) | Elimina región |
| POST | `/productores/solicitar` | AuthGuard | Solicita alta como productor |
| GET | `/productores` | Público | Lista productores con paginación |
| GET | `/productores/:id` | Público | Detalle de productor |
| PATCH | `/productores/mi-perfil` | AuthGuard | Actualiza perfil del productor autenticado |
| POST | `/productores` | AuthGuard (admin inline) | Crea productor (solo admin) |
| PATCH | `/productores/:id` | AuthGuard (propio o admin) | Actualiza productor |
| PATCH | `/productores/:id/admin` | AuthGuard (admin inline, multipart) | Actualización admin de productor con foto |
| DELETE | `/productores/:id` | AuthGuard (admin inline) | Elimina productor |

#### Módulo: tiendas

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/tiendas` | Público | Lista tiendas (con filtro por `id_productor`) |
| GET | `/tiendas/:id` | Público | Detalle de tienda |
| POST | `/tiendas` | AuthGuard | Crea tienda |
| PUT | `/tiendas/:id` | AuthGuard (propio o admin) | Actualiza tienda |
| DELETE | `/tiendas/:id` | AuthGuard + RolesGuard (`administrador`) | Elimina tienda |

#### Módulo: lotes

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/lotes` | Público | Lista lotes (con filtro por productor) |
| POST | `/lotes/sincronizar` | Público | Sincroniza lote desde API externa |
| POST | `/lotes/sincronizar-todos` | Público | Sincroniza todos los lotes |
| GET | `/lotes/:id` | Público | Detalle de lote |
| POST | `/lotes` | Público | Crea lote |
| PATCH | `/lotes/:id` | Público | Actualiza lote |
| DELETE | `/lotes/:id` | Público | Elimina lote |
| POST | `/lotes/:id/stock` | Público | Ajusta stock del lote |
| POST | `/lotes/:id/sincronizar-producto` | Público | Re-sincroniza producto del lote |
| POST | `/lotes/:id/atributos` | Público | Agrega atributo al lote |
| PATCH | `/lotes/atributos/:id_atributo` | Público | Actualiza atributo de lote |
| DELETE | `/lotes/atributos/:id_atributo` | Público | Elimina atributo de lote |

#### Módulo: inventario

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/inventario/movimientos` | Público | Lista movimientos de inventario |
| POST | `/inventario/movimientos` | Público | Crea movimiento de inventario |
| GET | `/inventario/dashboard` | Público | Dashboard de inventario (con paginación) |
| GET | `/inventario` | Público | Lista inventario |
| GET | `/inventario/producto/:id_producto` | Público | Inventario de un producto |
| GET | `/inventario/:id` | Público | Detalle de registro de inventario |
| POST | `/inventario` | Público | Crea registro de inventario |
| PATCH | `/inventario/:id` | Público | Actualiza inventario |
| DELETE | `/inventario/:id` | Público | Elimina registro de inventario |

#### Módulo: pedidos

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/pedidos` | AuthGuard | Lista pedidos con paginación |
| GET | `/pedidos/mis-ventas` | AuthGuard | Ventas del productor autenticado |
| GET | `/pedidos/mis-compras` | AuthGuard | Compras del usuario autenticado |
| GET | `/pedidos/mis-pedidos` | AuthGuard | Pedidos del productor autenticado |
| GET | `/pedidos/estadisticas` | AuthGuard | Estadísticas de pedidos (por período) |
| GET | `/pedidos/productor/:id_productor` | AuthGuard | Pedidos de un productor específico |
| GET | `/pedidos/productor/:id_pedido/:id_productor` | AuthGuard | Detalle de pedido para productor |
| PATCH | `/pedidos/productor/:id_pedido/:id_productor/estado` | AuthGuard (propio o admin) | Actualiza estado del pedido para productor |
| PATCH | `/pedidos/productor/:id_pedido/:id_productor/tracking` | AuthGuard (propio o admin) | Actualiza número de rastreo |
| POST | `/pedidos/validar-envio` | Público | Valida dirección de envío |
| POST | `/pedidos/:id/cotizar-envio` | AuthGuard | Cotiza envío para un pedido |
| GET | `/pedidos/test-email` | AuthGuard (admin inline) | Envía correo de prueba (solo admin) |
| GET | `/pedidos/:id` | AuthGuard (propietario, productor o admin) | Detalle de pedido |
| POST | `/pedidos` | AuthGuard | Crea pedido |
| PATCH | `/pedidos/:id` | AuthGuard | Actualiza pedido |
| DELETE | `/pedidos/:id` | AuthGuard | Elimina pedido (soft delete) |
| POST | `/pedidos/:id/detalles` | AuthGuard | Agrega ítem a pedido |
| PATCH | `/pedidos/detalles/:id_detalle` | AuthGuard | Actualiza ítem de pedido |
| DELETE | `/pedidos/detalles/:id_detalle` | AuthGuard | Elimina ítem de pedido |
| POST | `/pedidos/:id/facturas` | AuthGuard | Agrega factura CFDI a pedido |
| PATCH | `/pedidos/facturas/:id_factura` | AuthGuard | Actualiza factura |
| DELETE | `/pedidos/facturas/:id_factura` | AuthGuard | Elimina factura |

#### Módulo: carrito

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/carrito` | AuthGuard (solo admin) | Lista todos los carritos |
| GET | `/carrito/:id_usuario` | AuthGuard (propio o admin) | Carrito de un usuario |
| POST | `/carrito` | AuthGuard | Agrega ítem al carrito |
| PATCH | `/carrito/:id` | AuthGuard | Actualiza ítem del carrito |
| DELETE | `/carrito/mi-carrito` | AuthGuard | Vacía el carrito del usuario autenticado |
| DELETE | `/carrito/:id` | AuthGuard | Elimina ítem del carrito |
| DELETE | `/carrito/usuario/:id_usuario` | AuthGuard (propio o admin) | Vacía carrito de un usuario |

#### Módulo: wishlist

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/wishlist/:id_usuario` | AuthGuard (propio o admin) | Lista wishlist de un usuario |
| POST | `/wishlist` | AuthGuard (propio o admin) | Agrega producto a wishlist |
| DELETE | `/wishlist/:id_usuario/:id_producto` | AuthGuard (propio o admin) | Quita producto de wishlist |
| DELETE | `/wishlist/item/:id` | AuthGuard | Quita ítem por ID |
| GET | `/wishlist/check/:id_usuario/:id_producto` | AuthGuard (propio o admin) | Verifica si producto está en wishlist |

#### Módulo: resenas

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/resenas` | Público | Lista reseñas con paginación |
| GET | `/resenas/producto/:id` | Público | Reseñas de un producto con filtros |
| GET | `/resenas/producto/:id/agregado` | Público | Calificación agregada de producto |
| GET | `/resenas/producto/:id/similares` | Público | Productos similares |
| GET | `/resenas/producto/:id/tambien-compraron` | Público | Clientes también compraron |
| GET | `/resenas/:id` | Público | Detalle de reseña |
| POST | `/resenas` | Público | Crea reseña |
| PATCH | `/resenas/:id/moderar` | Público | Modera reseña |
| PATCH | `/resenas/:id/responder` | Público | Agrega respuesta del vendedor |
| PATCH | `/resenas/:id` | Público | Actualiza reseña |
| DELETE | `/resenas/:id` | Público | Elimina reseña |

#### Módulo: direcciones

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/direcciones` | AuthGuard (solo admin) | Lista todas las direcciones |
| GET | `/direcciones/:id_usuario` | AuthGuard (propio o admin) | Direcciones de un usuario |
| POST | `/direcciones` | AuthGuard | Crea dirección para el usuario autenticado |
| PATCH | `/direcciones/:id` | AuthGuard | Actualiza dirección propia |
| DELETE | `/direcciones/:id` | AuthGuard | Elimina dirección propia (soft delete) |

#### Módulo: notificaciones

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/notificaciones` | Público | Lista notificaciones con paginación |
| GET | `/notificaciones/:id_usuario` | Público | Notificaciones de un usuario |
| POST | `/notificaciones` | Público | Crea notificación |
| PATCH | `/notificaciones/:id` | Público | Actualiza notificación (ej. marcar leída) |
| DELETE | `/notificaciones/:id` | Público | Elimina notificación |

#### Módulo: pagos

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/pagos/ingresos/:id_productor` | AuthGuard (propio o admin) | Resumen de ingresos del productor |
| POST | `/pagos/stripe/intent` | AuthGuard | Crea intento de pago Stripe |
| POST | `/pagos/stripe/webhook` | Público (verificado por firma Stripe) | Webhook de eventos Stripe |
| POST | `/pagos/paypal/order` | AuthGuard | Crea orden PayPal |
| POST | `/pagos/paypal/capture` | AuthGuard | Captura orden PayPal |
| POST | `/pagos/paypal/webhook` | Público (verificado por firma PayPal) | Webhook de eventos PayPal |
| POST | `/pagos/:id/reembolso` | AuthGuard + RolesGuard (`administrador`) | Procesa reembolso de pago |
| GET | `/pagos` | AuthGuard + RolesGuard (`administrador`) | Lista pagos |
| GET | `/pagos/:id` | AuthGuard + RolesGuard (`administrador`) | Detalle de pago |
| POST | `/pagos` | AuthGuard + RolesGuard (`administrador`) | Crea registro de pago |
| PATCH | `/pagos/:id` | AuthGuard + RolesGuard (`administrador`) | Actualiza pago |
| DELETE | `/pagos/:id` | AuthGuard + RolesGuard (`administrador`) | Elimina pago |
| POST | `/pagos/:id/resolver-manual` | AuthGuard | Resuelve pago manualmente |
| POST | `/pagos/connect/onboard` | AuthGuard (solo productor) | Inicia onboarding Stripe Connect |
| POST | `/pagos/connect/refresh` | AuthGuard (solo productor) | Refresca enlace de onboarding |
| GET | `/pagos/connect/status` | AuthGuard (solo productor) | Estado de cuenta Stripe Connect |

#### Módulo: envios

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/envios/:id/tracking` | AuthGuard (comprador, productor o admin) | Tracking de envío |
| GET | `/envios` | AuthGuard | Lista envíos |
| GET | `/envios/:id` | AuthGuard | Detalle de envío |
| POST | `/envios` | AuthGuard | Crea envío |
| PATCH | `/envios/:id` | AuthGuard | Actualiza envío |
| DELETE | `/envios/:id` | AuthGuard | Elimina envío |
| POST | `/envios/cotizar` | AuthGuard | Cotiza envío (requiere envío existente) |
| POST | `/envios/cotizar-carrito` | AuthGuard | Cotiza envío desde carrito (sin pedido) |
| POST | `/envios/cotizar-por-productor` | AuthGuard | Cotiza por grupos de productor |
| POST | `/envios/pedido/:id_pedido/iniciar` | AuthGuard (solo productor) | Crea registro de envío para productor |
| POST | `/envios/pedido/:id_pedido/crear-guias` | AuthGuard | Crea guías de envío por pedido |
| POST | `/envios/cotizaciones` | AuthGuard | Guarda cotización |
| POST | `/envios/:id/crear-guia` | AuthGuard | Crea guía para un envío |
| POST | `/envios/:id/refrescar-guia` | AuthGuard | Refresca guía pendiente |
| GET | `/envios/:id/guia/download` | AuthGuard | Descarga PDF de guía |
| POST | `/envios/webhook/skydropx` | Público (verificado HMAC-SHA512) | Webhook de tracking SkydropX |

#### Módulo: transportistas

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/transportistas` | Público | Lista transportistas |
| GET | `/transportistas/:id` | Público | Detalle de transportista |
| POST | `/transportistas` | Público | Crea transportista |
| PATCH | `/transportistas/:id` | Público | Actualiza transportista |
| DELETE | `/transportistas/:id` | Público | Elimina transportista |
| POST | `/transportistas/servicios` | Público | Crea servicio de envío |
| PATCH | `/transportistas/servicios/:id` | Público | Actualiza servicio de envío |
| DELETE | `/transportistas/servicios/:id` | Público | Elimina servicio de envío |
| POST | `/transportistas/integraciones` | Público | Crea integración de transportista |
| PATCH | `/transportistas/integraciones/:id` | Público | Actualiza integración |
| DELETE | `/transportistas/integraciones/:id` | Público | Elimina integración |

#### Módulo: admin

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/admin/stats` | AuthGuard + RolesGuard (`ADMIN`, `administrador`) | Estadísticas del dashboard admin |
| GET | `/admin/pedidos/recientes` | AuthGuard + RolesGuard (`ADMIN`, `administrador`) | Pedidos recientes |
| GET | `/admin/productores/top` | AuthGuard + RolesGuard (`ADMIN`, `administrador`) | Top productores |
| GET | `/admin/productores/solicitudes` | AuthGuard + RolesGuard (`ADMIN`, `administrador`) | Solicitudes pendientes de aprobación |
| GET | `/admin/productores` | AuthGuard + RolesGuard (`ADMIN`, `administrador`) | Lista productores (con filtros) |
| GET | `/admin/productos` | AuthGuard + RolesGuard (`ADMIN`, `administrador`) | Lista productos (con filtro por productor) |
| PATCH | `/admin/productores/:id/revisar` | AuthGuard + RolesGuard (`ADMIN`, `administrador`) | Aprueba o rechaza solicitud de productor |

#### Módulo: auditoria

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/auditoria` | AuthGuard + RolesGuard (`administrador`) | Lista registros de auditoría |
| GET | `/auditoria/:id` | AuthGuard + RolesGuard (`administrador`) | Detalle de registro de auditoría |
| POST | `/auditoria` | AuthGuard + RolesGuard (`administrador`) | Crea registro de auditoría |
| PATCH | `/auditoria/:id` | AuthGuard + RolesGuard (`administrador`) | Actualiza registro de auditoría |
| DELETE | `/auditoria/:id` | AuthGuard + RolesGuard (`administrador`) | Elimina registro de auditoría |

#### Módulo: roles

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/roles` | AuthGuard + RolesGuard + PermisosGuard (`administrador`) | Lista roles |
| GET | `/roles/permisos` | AuthGuard + RolesGuard (`administrador`) | Lista permisos |
| GET | `/roles/permisos/:id` | AuthGuard + RolesGuard (`administrador`) | Detalle de permiso |
| GET | `/roles/:id` | AuthGuard + RolesGuard (`administrador`, `productor`) | Detalle de rol |
| POST | `/roles` | AuthGuard + RolesGuard (`administrador`) | Crea rol |
| PATCH | `/roles/:id` | AuthGuard + RolesGuard (`administrador`) | Actualiza rol |
| DELETE | `/roles/:id` | AuthGuard + RolesGuard (`administrador`) | Elimina rol |
| POST | `/roles/:id/permisos` | AuthGuard + RolesGuard (`administrador`) | Asigna permiso a rol |
| DELETE | `/roles/:id/permisos/:id_permiso` | AuthGuard + RolesGuard (`administrador`) | Quita permiso de rol |
| POST | `/roles/permisos` | AuthGuard + RolesGuard (`administrador`) | Crea permiso |
| PATCH | `/roles/permisos/:id` | AuthGuard + RolesGuard (`administrador`) | Actualiza permiso |
| DELETE | `/roles/permisos/:id` | AuthGuard + RolesGuard (`administrador`) | Elimina permiso |
| GET | `/roles/:id/permisos` | AuthGuard + RolesGuard (`administrador`, `productor`) | Permisos de un rol |

#### Módulo: configuracion

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/configuracion/asociaciones` | Público | Lista asociaciones de productores |
| POST | `/configuracion/asociaciones` | AuthGuard + RolesGuard (`administrador`) | Actualiza lista de asociaciones |
| GET | `/configuracion/sistema` | AuthGuard + RolesGuard (`administrador`) | Lista configuración del sistema |
| GET | `/configuracion/sistema/mapa` | AuthGuard + RolesGuard (`administrador`) | Configuración como mapa clave-valor |
| GET | `/configuracion/sistema/seed` | AuthGuard + RolesGuard (`administrador`) | Carga configuración por defecto |
| GET | `/configuracion/sistema/seed-biocultural` | AuthGuard + RolesGuard (`administrador`) | Carga configuración biocultural |
| GET | `/configuracion/sistema/seed-all` | AuthGuard + RolesGuard (`administrador`) | Carga toda la configuración |
| GET | `/configuracion/sistema/:id` | AuthGuard + RolesGuard (`administrador`) | Detalle de configuración |
| POST | `/configuracion/sistema` | AuthGuard + RolesGuard (`administrador`) | Crea entrada de configuración |
| POST | `/configuracion/sistema/bulk` | AuthGuard + RolesGuard (`administrador`) | Upsert masivo de configuración |
| PATCH | `/configuracion/sistema/:id` | AuthGuard + RolesGuard (`administrador`) | Actualiza configuración |
| DELETE | `/configuracion/sistema/:id` | AuthGuard + RolesGuard (`administrador`) | Elimina configuración |
| GET | `/configuracion/tasas` | Público | Lista tasas de impuesto |
| GET | `/configuracion/tasas/:id` | Público | Detalle de tasa de impuesto |
| POST | `/configuracion/tasas` | AuthGuard + RolesGuard (`administrador`) | Crea tasa de impuesto |
| PATCH | `/configuracion/tasas/:id` | AuthGuard + RolesGuard (`administrador`) | Actualiza tasa de impuesto |
| DELETE | `/configuracion/tasas/:id` | AuthGuard + RolesGuard (`administrador`) | Elimina tasa de impuesto |

#### Módulo: archivos

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/archivos` | Público | Lista archivos (con filtros de entidad) |
| GET | `/archivos/:id` | Público | Detalle de archivo |
| POST | `/archivos/upload` | AuthGuard | Sube archivo (multipart, max 5 MB; PDF, PNG, JPG, WebP) |
| POST | `/archivos` | AuthGuard | Crea registro de archivo (sin upload) |
| PATCH | `/archivos/:id/upload` | AuthGuard | Reemplaza archivo (multipart) |
| PATCH | `/archivos/:id` | AuthGuard | Actualiza metadatos de archivo |
| DELETE | `/archivos/:id` | AuthGuard | Elimina registro de archivo |

#### Módulo: comisiones

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/comisiones` | AuthGuard + RolesGuard (`administrador`) | Lista comisiones |
| GET | `/comisiones/resolver` | AuthGuard + RolesGuard (`administrador`, `productor`) | Resuelve comisión aplicable por contexto |
| GET | `/comisiones/:id` | AuthGuard + RolesGuard (`administrador`) | Detalle de comisión |
| POST | `/comisiones` | AuthGuard + RolesGuard (`administrador`) | Crea comisión |
| PATCH | `/comisiones/:id` | AuthGuard + RolesGuard (`administrador`) | Actualiza comisión |
| DELETE | `/comisiones/:id` | AuthGuard + RolesGuard (`administrador`) | Elimina comisión |

#### Módulo: payouts

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/payouts` | AuthGuard + RolesGuard (`administrador`) | Lista liquidaciones |
| GET | `/payouts/mis-payouts/:id_productor` | AuthGuard + RolesGuard (`productor`, `administrador`) | Liquidaciones del productor |
| GET | `/payouts/resumen-pendientes` | AuthGuard + RolesGuard (`administrador`) | Resumen de payouts pendientes |
| GET | `/payouts/:id` | AuthGuard + RolesGuard (`administrador`) | Detalle de payout |
| POST | `/payouts/generar` | AuthGuard + RolesGuard (`administrador`) | Genera payouts para período |
| PATCH | `/payouts/:id/estado` | AuthGuard + RolesGuard (`administrador`) | Actualiza estado de payout |

#### Módulo: estadisticas-landing

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/estadisticas/landing` | Público | Estadísticas públicas para landing page |
| GET | `/estadisticas/top-productos` | Público | Top productos del marketplace |
| GET | `/estadisticas/top-productos-lote` | Público | Top productos con información de lote |

---

## Resumen de Apartados Auditados

| Sección | Estado | Observaciones |
|---|---|---|
| **4.3** Tipos especiales y convenciones | ✅ Completo | 25 modelos con BigInt, 23+ campos Decimal, 10 campos Json, 3 índices GIN, 2 campos Bytes cifrados, 10 modelos con soft delete |
| **4.4** Estrategia de migraciones | ✅ Completo | 15 migraciones versionadas; uso de `prisma migrate dev/deploy`; sin `db:migrate` en raíz |
| **5.2** Concerns transversales | ✅ Completo | ValidationPipe (whitelist+transform), AllExceptionsFilter, SanitizeBodyInterceptor, patch BigInt, ThrottlerGuard global |
| **7.2** Guards y flujo de autorización | ✅ Completo | 3 guards (AuthGuard, RolesGuard, PermisosGuard), decoradores @Roles/@Permisos, orden de filtrado documentado |
| **7.3** Throttling, CORS y headers | ✅ Completo (con hallazgo) | ThrottlerModule configurado; CORS con orígenes dinámicos; **Helmet no encontrado en el código** |
| **7.4** Manejo de secretos y cifrado | ✅ Completo | AES-256-CBC con IV aleatorio; campo `datos_bancarios` cifrado; listado completo de variables de entorno sensibles |
| **12.1** Seeds y datos iniciales | ✅ Completo | 7 scripts de seed, idempotentes, orden recomendado documentado |
| **Anexo B** Índice de endpoints | ✅ Completo | 30 controladores analizados; Swagger en `/api/docs`; ~180 endpoints consolidados |

### Hallazgos destacados para atención

1. **Helmet ausente:** No se encontró configuración de cabeceras de seguridad HTTP (`helmet` u equivalente). Se recomienda incorporarlo antes de producción para habilitar `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options` y `Content-Security-Policy`.

2. **Endpoints de inventario, lotes, transportistas y resenas sin autenticación:** Varios módulos carecen de `AuthGuard` en operaciones de escritura (POST/PATCH/DELETE). Revisar si esto es intencional por diseño de API interna o si requiere protección adicional.

3. **AES-256-CBC vs AES-256-GCM:** La implementación actual de cifrado no autentica el ciphertext. Se recomienda migrar a AES-256-GCM en futuras actualizaciones para incorporar autenticación integrada (AEAD).

4. **`integraciones_envio.api_key/api_secret` como `Bytes`:** El esquema declara estos campos como tipo `Bytes`, lo que sugiere intención de almacenar datos cifrados, pero el servicio de cifrado/descifrado para estos campos no fue localizado durante la auditoría.
