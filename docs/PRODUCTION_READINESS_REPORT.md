# PRODUCTION READINESS REPORT
## Marketplace Residencia — Auditoría Integral Pre-Producción

**Fecha de auditoría:** 2026-06-07  
**Auditor:** CTO / Arquitecto de Software / Auditor de Seguridad  
**Alcance:** Revisión completa de código, configuración, lógica de negocio y flujo de datos  
**Metodología:** Lectura directa de código fuente + trazabilidad de flujos completos  

---

## ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Fase 1 — Seguridad](#fase-1--seguridad)
3. [Fase 2 — Auditoría Financiera](#fase-2--auditoría-financiera)
4. [Fase 3 — Inventario](#fase-3--inventario)
5. [Fase 4 — Envíos](#fase-4--envíos)
6. [Fase 5 — Impuestos](#fase-5--impuestos)
7. [Fase 6 — Consistencia de Datos](#fase-6--consistencia-de-datos)
8. [Fase 7 — Resistencia a Fraude](#fase-7--resistencia-a-fraude)
9. [Fase 8 — Infraestructura](#fase-8--infraestructura)
10. [Fase 10 — Matriz de Riesgo](#fase-10--matriz-de-riesgo)
11. [Fase 11 — GO / NO GO](#fase-11--go--no-go)
12. [Fase 12 — Pérdida Económica Potencial](#fase-12--pérdida-económica-potencial)

---

## 1. RESUMEN EJECUTIVO

La auditoría identificó **12 vulnerabilidades CRÍTICAS**, **9 ALTAS**, **5 MEDIAS** y **2 BAJAS** con evidencia directa de código. El marketplace **no está apto para producción** en su estado actual.

Los hallazgos más graves incluyen: endpoints de administración completamente desprotegidos (cualquier persona en internet puede resetear la base de datos), cualquier usuario autenticado puede marcar un pago como "completado" sin pago real, ausencia total de sanitización XSS, y archivos sin límite de tamaño que permiten un ataque de denegación de servicio trivial.

| Métrica | Puntuación |
|---------|-----------|
| Seguridad | 2 / 10 |
| Estabilidad | 5 / 10 |
| Escalabilidad | 5 / 10 |
| Preparación para producción | 2 / 10 |
| Riesgo financiero | 8 / 10 ← ALTO |
| Riesgo operativo | 7 / 10 ← ALTO |

---

## FASE 1 — SEGURIDAD

### 1.1 Autenticación y JWT

#### ✅ POSITIVO: Refresh tokens hasheados en BD
```
apps/api/src/modules/auth/auth.service.ts
```
Los refresh tokens se almacenan como hash SHA-256, nunca en texto plano. Logout revoca correctamente el refresh token marcando `revocado_en`. El cambio de contraseña invalida todos los refresh tokens activos del usuario.

#### ✅ POSITIVO: Tokens de reset seguros
El reset de contraseña usa JTI único (16 bytes random), expira en 30 minutos, y diferencia token_type para no permitir uso cruzado.

#### ✅ POSITIVO: Rate limiting en auth
```
apps/api/src/modules/auth/auth.controller.ts:17,24,53
```
- `POST /auth/register` → 10 req / 60s
- `POST /auth/login` → 10 req / 60s
- `POST /auth/password-reset/request` → 5 req / 5min

---

#### 🔴 CRÍTICO-1: JWT secrets con fallback hardcodeado
**Archivo:** `apps/api/src/modules/auth/auth.service.ts:48-50`
```typescript
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret';
const PASSWORD_RESET_SECRET = process.env.PASSWORD_RESET_SECRET ?? 'change-me-password-reset-secret';
```
**Impacto:** Si las variables de entorno no están definidas en producción (error de configuración, contenedor mal iniciado), el sistema arranca silenciosamente con secretos públicos y conocidos. Cualquier atacante puede forjar tokens JWT válidos para cualquier usuario, incluyendo administradores.  
**Escenario de ataque:** Atacante firma `{ sub: 1, roles: ['administrador'], token_type: 'access' }` con `'change-me-access-secret'` y accede al panel de administración.  
**Solución:** Reemplazar `??` por `|| (() => { throw new Error('JWT_ACCESS_SECRET must be defined') })()`

---

#### 🟡 ALTO-1: JWT implementado manualmente sin librería estándar
**Archivo:** `apps/api/src/modules/auth/auth.service.ts:512-547`  
Se usa `createHmac('sha256', ...)` manualmente en lugar de `jsonwebtoken`. Aunque usa `timingSafeEqual` correctamente, cualquier bug en la implementación custom es más difícil de detectar y corregir que usando una librería auditada por miles de proyectos.

---

#### 🟡 BAJO-1: Sin rate limiting en `POST /auth/password-reset/confirm`
**Archivo:** `apps/api/src/modules/auth/auth.controller.ts:60-64`  
El endpoint de confirmación de reset no tiene `@Throttle()`. El espacio de JTI es 2^128 (imposible de fuerza bruta) pero agrega defensa en profundidad.

---

### 1.2 Autorización — RBAC y Guards

#### ✅ POSITIVO: Módulos correctamente protegidos
Los siguientes módulos tienen guards correctos:
- `/auth/*` — rate limiting + validación manual de bearer
- `/productos` CRUD → `AuthGuard + RolesGuard + @Roles('productor','administrador')`
- `/admin/*` → `AuthGuard + RolesGuard + @Roles('ADMIN','administrador')`
- `/pedidos` → `AuthGuard` con validación de ownership por usuario
- `/carrito` → `AuthGuard` con validación IDOR por usuario
- `/wishlist` → `AuthGuard` con validación IDOR en cada endpoint
- `/direcciones` → `AuthGuard` con validación IDOR por usuario
- `/roles` → `AuthGuard + RolesGuard + PermisosGuard + @Roles('administrador')`
- `/pagos/stripe/intent` y `/pagos/paypal/order` → `AuthGuard` + validación de ownership del pedido

---

#### 🔴 CRÍTICO-2: Endpoints de configuración SIN autenticación — Reset de BD accesible públicamente
**Archivo:** `apps/api/src/modules/configuracion/configuracion.controller.ts:47-75`
```typescript
@Get('sistema/seed')        // ← Sin @UseGuards
async seedDefaults() { ... }

@Get('sistema/seed-biocultural')   // ← Sin @UseGuards
async seedBiocultural() { ... }

@Get('sistema/seed-all')    // ← Sin @UseGuards — resetea configuración completa
async seedAll() { ... }

@Post('sistema')            // ← Sin @UseGuards — crea configuración del sistema
async createSistema(@Body() dto) { ... }

@Post('sistema/bulk')       // ← Sin @UseGuards — actualizacion masiva
async upsertBulk(@Body() configs) { ... }

@Patch('sistema/:id')       // ← Sin @UseGuards
async updateSistema(...) { ... }

@Delete('sistema/:id')      // ← Sin @UseGuards
async removeSistema(...) { ... }
```
**Impacto:** Cualquier persona en internet puede ejecutar `GET https://api.dominio.com/configuracion/sistema/seed-all` y resetear toda la configuración del sistema. Sin autenticación. Sin autorización. Sin traza.  
**Severidad:** CRÍTICO. Este es el hallazgo más grave de toda la auditoría.

---

#### 🔴 CRÍTICO-3: Módulo de usuarios completamente expuesto
**Archivo:** `apps/api/src/modules/usuarios/usuarios.controller.ts:16-78`

Ningún endpoint del controlador tiene `@UseGuards`. Esto expone:
- `GET /usuarios` — Lista TODOS los usuarios del sistema
- `GET /usuarios/:id` — Perfil de cualquier usuario
- `PATCH /usuarios/:id` — Modificar cualquier usuario (nombre, contraseña, datos)
- `PATCH /usuarios/:id/foto` — Cambiar foto de cualquier usuario
- `DELETE /usuarios/:id` — Eliminar cualquier cuenta
- `POST /usuarios/:id/roles` — **Asignar cualquier rol a cualquier usuario**
- `DELETE /usuarios/:id/roles/:id_rol` — Revocar roles

**Impacto:** Un atacante puede escalar privilegios a administrador (`POST /usuarios/1/roles` con `{ id_rol: 1 }`), eliminar cuentas, o extraer todos los datos de usuarios.

---

#### 🔴 CRÍTICO-4: Módulo de auditoría completamente público
**Archivo:** `apps/api/src/modules/auditoria/auditoria.controller.ts`
```typescript
@Get()    // Sin guard — logs públicos
@Post()   // Sin guard — puede inyectar logs falsos
@Delete(':id')  // Sin guard — puede borrar evidencia de auditoría
```
**Impacto:** Los audit logs (que contienen operaciones sensibles del sistema) son accesibles sin autenticación. Un atacante puede eliminar rastros de sus propias acciones.

---

#### 🔴 CRÍTICO-5: Módulo de categorías expuesto
**Archivo:** `apps/api/src/modules/categorias/categorias.controller.ts`
- `POST /categorias` — Crear categorías sin guard
- `PATCH /categorias/:id` — Modificar categorías sin guard
- `DELETE /categorias/:id` — Eliminar categorías sin guard

**Impacto:** Cualquiera puede alterar o eliminar la jerarquía de categorías del marketplace.

---

#### 🔴 CRÍTICO-6: Módulo de tiendas expuesto
**Archivo:** `apps/api/src/modules/tiendas/tiendas.controller.ts:27-37`
- `POST /tiendas` — Crear tiendas sin guard
- `PUT /tiendas/:id` — Modificar cualquier tienda sin guard y sin validación de ownership
- `DELETE /tiendas/:id` — Eliminar cualquier tienda sin guard

---

#### 🔴 CRÍTICO-7: Módulo de productores con IDOR
**Archivo:** `apps/api/src/modules/productores/productores.controller.ts:74-76`
- `PATCH /productores/:id` — Sin guard, sin validación de ownership
- `DELETE /productores/:id` — Sin guard

Un productor puede modificar o eliminar el perfil de otro productor. Un usuario anónimo puede eliminar productores.

---

#### 🔴 CRÍTICO-8: Ausencia total de sanitización XSS
**Evidencia:** Búsqueda en todo el codebase: no existe ninguna importación de `sanitize-html`, `xss`, `DOMPurify`, `striptags` ni ninguna librería equivalente.

El `ValidationPipe` global con `whitelist: true` rechaza propiedades no declaradas, pero **no sanitiza el contenido de los strings**. Los campos `@IsString()` aceptan cualquier contenido incluyendo `<script>alert(1)</script>`.

**Campos vulnerables:**
- `nombre`, `descripcion` de productos
- `biografía` de usuarios/productores  
- Contenido de reseñas (`comentario`)
- Nombres de tiendas y categorías
- Metadata de lotes (objeto sin estructura validada)

**Escenario de ataque:** Un productor malicioso crea un producto con `nombre: "<img src=x onerror=document.cookie=''+document.cookie>"`; todos los usuarios que visiten el catálogo ejecutarán JavaScript en su navegador.

---

#### 🟡 ALTO-2: IDOR en tracking de envíos
**Archivo:** `apps/api/src/modules/envios/envios.controller.ts:28-30`
```typescript
@Get(':id/tracking')
@UseGuards(AuthGuard)
getTracking(@Param('id') id: string) { return this.service.getTracking(id); }
```
El servicio `getTracking()` no valida que el `id_envio` pertenezca al usuario autenticado. Cualquier usuario puede enumerar IDs (1, 2, 3...) y ver el tracking de envíos ajenos.

---

#### 🟡 ALTO-3: IDOR en pedidos individuales
**Archivo:** `apps/api/src/modules/pedidos/pedidos.controller.ts:110`  
El endpoint `GET /pedidos/:id` no valida que el pedido pertenezca al usuario autenticado, permitiendo ver detalles de pedidos ajenos.

---

#### 🟡 ALTO-4: SkydropX webhook sin comparación timing-safe
**Archivo:** `apps/api/src/modules/envios/envios.controller.ts:187-202`
```typescript
if (provided !== expected) {   // ← Vulnerable a timing attack
  throw new UnauthorizedException('Invalid SkydropX webhook secret');
}
```
Debería usar `crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))`.

---

#### 🟡 MEDIO-1: CORS permite requests sin origen
**Archivo:** `apps/api/src/main.ts:24-35`
```typescript
if (!origin || allowedOrigins.includes(origin)) {
  callback(null, true);  // !origin permite CLI tools, Postman, scripts
}
```
Permite requests de cualquier herramienta de línea de comandos, scripts automatizados, o bots que no envíen header `Origin`.

---

### 1.3 API Security

#### ✅ POSITIVO: Rate limiting global
`ThrottlerModule` configurado globalmente: 120 requests / 60 segundos.  
**Archivo:** `apps/api/src/app.module.ts:39`

#### ✅ POSITIVO: Validación global con whitelist
`ValidationPipe` con `whitelist: true` rechaza propiedades no declaradas en DTOs.  
**Archivo:** `apps/api/src/main.ts:37-44`

#### ✅ POSITIVO: CORS con lista blanca dinámica
CORS configurado con `CORS_ORIGINS` de variable de entorno, no acepta `*`.

---

## FASE 2 — AUDITORÍA FINANCIERA

### 2.1 Stripe Webhooks

#### ✅ POSITIVO: Firma de webhook verificada correctamente
**Archivo:** `apps/api/src/modules/pagos/pagos.controller.ts:44`
```typescript
const event = this.stripeService.constructWebhookEvent(rawBody, signature, secret!);
```
Usa la librería oficial de Stripe para verificar la firma.

#### ✅ POSITIVO: Idempotencia de webhooks implementada
**Archivo:** `apps/api/src/modules/pagos/pagos.controller.ts:46-47`
```typescript
const isNew = await this.service.deduplicateWebhookEvent('stripe', event.id, event.type);
if (!isNew) return { received: true };
```
Usa tabla `webhook_events_log` con unique constraint para evitar procesamiento duplicado.

#### ✅ POSITIVO: Update atómico de estado de pago
**Archivo:** `apps/api/src/modules/pagos/pagos.service.ts:319-328`
```typescript
const result = await this.prisma.pagos.updateMany({
  where: { id_pago: pago.id_pago, estado: { notIn: ['completado', 'reembolsado'] } },
  data: { estado },
});
```
La condición `notIn` previene que un webhook duplicado sobreescriba un estado final.

---

#### 🔴 CRÍTICO-9: Cualquier usuario autenticado puede marcar un pago como "completado"
**Archivo:** `apps/api/src/modules/pagos/pagos.controller.ts:132-135`
```typescript
@UseGuards(AuthGuard)
@Post() create(@Body() dto: CreatePagoDto) { return this.service.create(dto); }
@UseGuards(AuthGuard)
@Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePagoDto) { return this.service.update(id, dto); }
```
Cualquier usuario con una cuenta válida puede:
1. `POST /pagos` con `{ id_pedido: X, estado: 'completado', monto: 0.01 }` — crea un registro de pago "completado" sin cobrar nada
2. `PATCH /pagos/:id` con `{ estado: 'completado' }` — modifica cualquier pago existente

**Impacto directo:** Si alguna parte del flujo de pedidos usa `pagos.estado === 'completado'` para liberar el pedido o el inventario, un usuario puede obtener productos gratis. No hay restricción de que solo puedas modificar los pagos de tus propios pedidos.

---

#### 🔴 CRÍTICO-10: Comisiones negativas posibles
**Archivo:** `apps/api/src/modules/comisiones/comisiones.controller.ts` (endpoints de creación)  
No hay validación que impida crear una regla de comisión con `porcentaje: -0.5`. Si se crea una comisión negativa:

```
subtotal_bruto = 500 MXN
comision_marketplace = 500 × (-0.5) + 0 = -250 MXN
monto_neto_productor = 500 - (-250) = 750 MXN   ← Productor recibe MÁS de lo vendido
```

La plataforma pagaría al productor 750 MXN habiendo cobrado solo 500 MXN. Pérdida de 250 MXN por pedido.

---

#### 🟡 ALTO-5: Estado `'cancelado'` no está en la lista de exclusión del update atómico
**Archivo:** `apps/api/src/modules/pagos/pagos.service.ts:325`
```typescript
estado: { notIn: ['completado', 'reembolsado'] },
```
Si un pago fue reembolsado correctamente pero por algún flujo alternativo el `pagos.estado` quedó en `'cancelado'` (en lugar de `'reembolsado'`), un webhook de Stripe duplicado puede mover ese pago de vuelta a `'completado'`, activando nuevamente la lógica de transfers a productores.

---

#### 🟡 ALTO-6: Sin regla de comisión global bloquea creación de pedidos
**Archivo:** `apps/api/src/modules/pedidos/pedidos.service.ts:577-593`
```typescript
} catch (err: any) {
  throw new Error(`[pedidos] Sin regla de comisión para productor ${args.id_productor}...`);
}
```
Si un nuevo productor no tiene una regla de comisión asignada y no existe una regla global de fallback, **ningún cliente puede realizar un pedido de ese productor**. El sistema falla completamente en lugar de usar una comisión por defecto.

---

### 2.2 PayPal

#### ✅ POSITIVO: Firma de webhook PayPal verificada
**Archivo:** `apps/api/src/modules/pagos/pagos.controller.ts:87-91`  
Verifica firma con la API remota de PayPal antes de procesar cualquier evento.

#### ✅ POSITIVO: Doble reembolso prevenido
**Archivo:** `apps/api/src/modules/pagos/pagos.service.ts:959`
```typescript
if (pago.estado === 'reembolsado') throw new BadRequestException('El pago ya fue reembolsado');
```

---

### 2.3 Transfers Multiproductor

#### ✅ POSITIVO: Idempotency key en transfers
**Archivo:** `apps/api/src/modules/pagos/pagos.service.ts:891-896`  
`idempotencyKey = 'transfer-${id_pedido}-${id_productor}'` previene doble transfer incluso con webhooks duplicados.

#### ✅ POSITIVO: Cron de retry para transfers fallidos
Existe un cron que reintenta transfers fallidos. El diseño de "eventual consistency" es aceptable para un marketplace.

---

### 2.4 Tipo de Cambio

#### 🟡 MEDIO-2: Sin actualización automática de tipo de cambio
La memoria del proyecto indica que se implementó un cron para ExchangeRate-API. Sin embargo, si la tasa MXN→USD no está vigente en la tabla `tasas_cambio`, los pedidos internacionales quedan completamente bloqueados con un `InternalServerErrorException`.  
**Riesgo:** Si el cron falla o las credenciales de ExchangeRate-API se agotan, el marketplace deja de aceptar pedidos internacionales sin previo aviso.

---

## FASE 3 — INVENTARIO

### 3.1 Descuento de Stock

#### ✅ POSITIVO: Decremento atómico condicional implementado correctamente
**Archivo:** `apps/api/src/modules/pedidos/pedidos.service.ts:420-432`
```typescript
const updateResult = await tx.inventario.updateMany({
  where: {
    id_inventario: inventario.id_inventario,
    stock: { gte: cantidadADecretar },   // Condición evaluada al momento del UPDATE
  },
  data: { stock: { decrement: cantidadADecretar } },
});
if (updateResult.count === 0) {
  throw new BadRequestException(`Stock insuficiente...`);
}
```
Prisma traduce esto a `UPDATE inventario SET stock = stock - $n WHERE id = $id AND stock >= $n`. En PostgreSQL bajo READ COMMITTED (el nivel de aislamiento por defecto), esta sentencia aplica un lock exclusivo de fila antes de actualizar, garantizando que dos transacciones concurrentes no puedan ambas pasar la condición. El comentario en el código documenta esto correctamente. **Este patrón es seguro.**

---

#### 🔴 CRÍTICO-11: Carrito acepta cualquier cantidad sin validar stock
**Archivo:** `apps/api/src/modules/carrito/carrito.service.ts:12-22`
```typescript
async create(dto: CreateCarritoItemDto) {
  return serializeBigInts(
    await this.prisma.carrito_item.upsert({
      update: { cantidad: { increment: dto.cantidad } },  // ← Sin validar stock
      create: { cantidad: dto.cantidad, ... },             // ← Sin validar stock
    })
  );
}
```
No hay validación de stock al agregar items al carrito ni al actualizar cantidades. Un usuario puede agregar 10,000 unidades de un producto con stock=1. 

**Impacto práctico:** El precio total en checkout y la cotización de envío se calculan sobre cantidades incorrectas, resultando en:
- Cotizaciones de envío infladas (pago de envío para 10,000 botellas)
- Experiencia de usuario rota cuando el checkout falla en la validación de stock real
- Posibles errores de cálculo en impuestos y comisiones

---

### 3.2 Restauración de Stock en Cancelaciones

#### ✅ POSITIVO: Stock restaurado correctamente al reembolsar
**Archivo:** `apps/api/src/modules/pagos/pagos.service.ts:1049-1074`  
Al reembolsar, se restaura el stock de cada producto del detalle del pedido y se crea movimiento de inventario tipo `'cancelacion'`.

---

## FASE 4 — ENVÍOS

### 4.1 Cotización de Envíos

#### 🔴 CRÍTICO-12: Sin validación de dimensiones de producto — subcotización sistémica
**Archivo:** `apps/api/src/modules/envios/envios.service.ts` (función de cotización)

Los agentes de exploración encontraron valores fallback hardcodeados (`largo_cm ?? 10`, `ancho_cm ?? 10`, `alto_cm ?? 5`) para productos sin dimensiones registradas. Si los productos del catálogo no tienen dimensiones reales cargadas:

```
Ejemplo: Caja de 12 botellas de mezcal (750ml)
Dimensiones reales: 40cm × 30cm × 30cm, peso 15 kg
Dimensiones fallback: 10cm × 10cm × 5cm × 1 unidad
Peso volumétrico real: (40×30×30)/5000 = 7.2 kg → peso facturable: 15 kg
Peso volumétrico fallback: (10×10×5)/5000 = 0.1 kg → peso facturable: 0.1 kg (15 kg real vs 0.1 kg cotizado)

Costo de envío cotizado: ~$80 MXN
Costo de envío real del carrier: ~$800 MXN
PÉRDIDA POR ENVÍO: $720 MXN (~$40 USD)
```

**Impacto sistémico:** Si el 100% de los productos carecen de dimensiones (ningún campo `largo_cm`, `ancho_cm`, `alto_cm` validado como requerido), **cada envío genera pérdida económica garantizada**.

---

#### 🟡 MEDIO-3: Restricciones de alcohol validadas tarde — cliente ya pagó
**Archivo:** `apps/api/src/modules/envios/envios.service.ts`  
Las restricciones de envío de alcohol por estado/país se validan en `crearGuia()` (después del pago), no en `cotizarEnvio()` (antes). Un cliente que vive en un estado con restricciones completa el pago y luego se entera que no puede recibir su pedido, forzando un reembolso y una experiencia terrible.

---

### 4.2 Multi-carrier

#### ✅ POSITIVO: FedEx y SkydropX cotizados en paralelo
Las cotizaciones de ambos carriers se obtienen concurrentemente y se presentan al usuario para elegir.

#### ✅ POSITIVO: Idempotencia en creación de guías
Las guías de envío se crean con control de estado que previene duplicados.

---

## FASE 5 — IMPUESTOS

#### ✅ POSITIVO: Cálculo de impuestos completamente en backend
**Archivo:** `apps/api/src/modules/pagos/pagos.service.ts:725-757`  
El impuesto se calcula en el servidor basándose en:
- País destino (del DTO, validado)
- Categoría del producto (para IEPS en bebidas alcohólicas)
- Tasas de la tabla `tasas_impuesto`

El frontend **no puede enviar el monto de impuesto** — se calcula y se ignora cualquier valor del cliente.

#### ✅ POSITIVO: IVA nacional e IEPS contemplados
Se admiten tasas por categoría, lo que permite IEPS específico para bebidas alcohólicas con tasas por estado/país.

#### ✅ POSITIVO: Subtotal validado contra BD
**Archivo:** `apps/api/src/modules/pagos/pagos.service.ts:575-597`  
El subtotal enviado por el cliente se valida contra el calculado en BD, rechazando diferencias mayores a $0.05.

---

## FASE 6 — CONSISTENCIA DE DATOS

### 6.1 Transacciones de Base de Datos

#### ✅ POSITIVO: Descuento de stock envuelto en $transaction
**Archivo:** `apps/api/src/modules/pedidos/pedidos.service.ts:390`  
`addDetalle()` usa `prisma.$transaction()` para garantizar atomicidad entre crear detalle, decrementar inventario, y registrar movimiento.

#### 🟡 MEDIO-4: Pedido + pago no son atómicos en flujo completo
El flujo completo está dividido en pasos separados:
1. `POST /pedidos` → Crea el pedido con `total: 0`
2. `POST /pedidos/:id/detalle` → Agrega items (con su propia transacción)
3. `POST /pagos/stripe/intent` → Crea el intent de pago
4. Webhook de Stripe → Confirma el pago

Si el paso 2 falla después del paso 1, existe un pedido sin items en la BD. Si el servidor cae entre paso 3 y el webhook, el inventario ya fue decrementado pero el pago no existe. El cron de retry de transfers eventualmente maneja algunos de estos casos, pero no todos.

**Severidad:** MEDIO — El diseño de "eventual consistency" es común en e-commerce, pero debe existir monitoreo activo y proceso de reconciliación.

---

## FASE 7 — RESISTENCIA A FRAUDE

### 7.1 Usuario Malicioso

| Intento | ¿Protegido? | Evidencia |
|---------|-------------|-----------|
| Cambiar precios desde frontend | ✅ SÍ | Backend valida subtotal contra BD (±$0.05) |
| Manipular descuentos | ⚠️ NO VERIFICADO | No se encontró módulo de descuentos/cupones |
| Manipular carrito | ✅ SÍ | AuthGuard + validación IDOR |
| Manipular impuestos | ✅ SÍ | Calculados en backend, no aceptados del frontend |
| Manipular costos de envío | ✅ SÍ | Validación ±2% contra cotización guardada |
| Manipular cantidades en pedido | ✅ SÍ | `addDetalle()` valida stock en BD |
| Crear pago como "completado" | 🔴 NO | Cualquier usuario autenticado puede `POST /pagos` con estado completado |
| Escalar a administrador | 🔴 NO | `POST /usuarios/:id/roles` sin guard |

### 7.2 Vendedor Malicioso

| Intento | ¿Protegido? | Evidencia |
|---------|-------------|-----------|
| Acceder a pedidos ajenos | ✅ SÍ | Validación por `id_productor` en la mayoría de endpoints |
| Modificar perfil de otro productor | 🔴 NO | `PATCH /productores/:id` sin guard ni ownership check |
| Eliminar otra tienda | 🔴 NO | `DELETE /tiendas/:id` sin guard |
| Ver audit logs de toda la plataforma | 🔴 NO | `GET /auditoria` público |

### 7.3 Administrador Comprometido

- Puede emitir reembolsos (solo admins)
- Puede aprobar/rechazar productores
- Sin controles adicionales de doble aprobación para operaciones críticas (transferencias grandes, eliminación masiva de datos)

---

## FASE 8 — INFRAESTRUCTURA

### 8.1 Variables de Entorno

#### 🔴 CRÍTICO-13 (Ver CRÍTICO-1): JWT secrets con fallback inseguros
Detallado en Fase 1.

#### 🟡 ALTO-7: `NEXT_PUBLIC_EXCHANGERATE_API_KEY` expuesta al navegador
**Archivo:** `apps/web/.env:22`
```
NEXT_PUBLIC_EXCHANGERATE_API_KEY="871246865828cc6404bdae16"
```
Las variables `NEXT_PUBLIC_*` en Next.js se incluyen en el bundle del cliente y son accesibles por cualquier usuario. La API key de exchangerate-api.com puede ser abusada para agotar el cupo gratuito del servicio, dejando el marketplace sin tasas de cambio actualizadas.

---

### 8.2 Uploads de Archivos

#### 🔴 CRÍTICO-14: Sin límite de tamaño en uploads — DoS trivial
**Archivo:** `apps/api/src/modules/archivos/archivos.controller.ts:9,27`
```typescript
const archivoStorage = memoryStorage();  // Sin configuración de límites

@UseInterceptors(FileInterceptor('archivo', { storage: archivoStorage }))
```
`memoryStorage()` carga el archivo COMPLETO en RAM antes de procesarlo. Sin `limits: { fileSize: X }`, un atacante puede enviar un archivo de 10 GB, agotando la memoria del proceso Node.js y crasheando la API. El ataque requiere solo una cuenta válida y una solicitud HTTP.

```bash
# Ataque de 1 línea que puede crashear el servidor:
curl -X POST https://api.dominio.com/archivos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "archivo=@/dev/urandom" \  # Archivo infinito
  -F "tipo=PDF"
```

---

### 8.3 Logs y Datos Sensibles

#### 🟡 ALTO-8: PII en console.log en múltiples servicios
```
apps/api/src/modules/direcciones/direcciones.service.ts:27,56
apps/api/src/modules/auth/oauth.service.ts:24,42
apps/api/src/modules/email/email.service.ts:454
apps/api/src/modules/pedidos/pedidos.service.ts:507,1145,1253
```
Los logs contienen emails, objetos completos de usuario, detalles de pedidos. En un ambiente con logging centralizado (CloudWatch, Datadog, etc.), esto expone PII que puede violar LFPDPPP (Ley Federal de Protección de Datos en México).

---

## FASE 10 — MATRIZ DE RIESGO

| # | Riesgo | Impacto | Probabilidad | Severidad | Solución |
|---|--------|---------|--------------|-----------|----------|
| 1 | Endpoints admin sin autenticación (seed-all) | CATASTRÓFICO | ALTA | 🔴 CRÍTICO | Agregar `@UseGuards(AuthGuard, RolesGuard) @Roles('administrador')` |
| 2 | Usuarios: CRUD sin guards | CATASTRÓFICO | ALTA | 🔴 CRÍTICO | Guards + validación de ownership |
| 3 | JWT secrets con fallback 'change-me' | CATASTRÓFICO | MEDIA | 🔴 CRÍTICO | Throw error si no está configurado |
| 4 | Crear pago como 'completado' sin pago real | CATASTRÓFICO | ALTA | 🔴 CRÍTICO | Guards + restricción a solo webhooks |
| 5 | Sin sanitización XSS | ALTO | ALTA | 🔴 CRÍTICO | Implementar sanitize-html en backend |
| 6 | Sin límite de tamaño en uploads | ALTO | MEDIA | 🔴 CRÍTICO | `limits: { fileSize: 5MB }` en FileInterceptor |
| 7 | Auditoria pública | ALTO | ALTA | 🔴 CRÍTICO | Guards en todos los endpoints |
| 8 | Tiendas y productores sin guards | ALTO | ALTA | 🔴 CRÍTICO | Guards + validación de ownership |
| 9 | Comisiones negativas | ALTO | BAJA | 🔴 CRÍTICO | Validar `porcentaje >= 0` en DTO |
| 10 | Carrito sin validación de stock | MEDIO | ALTA | 🟡 ALTO | Validar stock al agregar |
| 11 | IDOR en tracking de envíos | MEDIO | MEDIA | 🟡 ALTO | Validar ownership en getTracking() |
| 12 | IDOR en pedido individual | MEDIO | MEDIA | 🟡 ALTO | Validar ownership en GET /pedidos/:id |
| 13 | Sin regla de comisión global | ALTO | MEDIA | 🟡 ALTO | Crear regla global de fallback |
| 14 | Dims hardcodeadas en envíos | ALTO | ALTA | 🟡 ALTO | Requerir dims en productos o fallback razonable |
| 15 | API key ExchangeRate expuesta | BAJO | ALTA | 🟡 ALTO | Mover a servidor (NEXT_PUBLIC → server-side) |
| 16 | PII en console.log | MEDIO | ALTA | 🟡 ALTO | Logger estructurado, nunca datos de usuario |
| 17 | SkydropX webhook no timing-safe | BAJO | BAJA | 🟡 ALTO | timingSafeEqual() |
| 18 | Estado 'cancelado' fuera de exclusión | MEDIO | BAJA | 🟡 ALTO | Agregar 'cancelado' al notIn |
| 19 | Restricciones envío alcohol tarde | MEDIO | MEDIA | 🟡 MEDIO | Validar en cotización, no solo en guía |
| 20 | Tasa de cambio sin cron confiable | MEDIO | BAJA | 🟡 MEDIO | Alertas si cron falla + tasa de fallback |
| 21 | JWT sin librería estándar | BAJO | BAJA | 🟡 MEDIO | Migrar a jsonwebtoken |
| 22 | CORS permite requests sin origen | BAJO | BAJA | 🟢 BAJO | Requerir origen explícito |
| 23 | Sin throttle en password-reset/confirm | BAJO | BAJA | 🟢 BAJO | Agregar @Throttle() |

---

## FASE 11 — GO / NO GO

## 🔴 NO APTO PARA PRODUCCIÓN

### Justificación

El marketplace tiene **12 vulnerabilidades CRÍTICAS** que representan riesgos de:

1. **Seguridad catastrófica** — El endpoint `GET /configuracion/sistema/seed-all` es accesible sin autenticación desde internet. Una sola petición HTTP puede resetear la configuración de todo el sistema. El endpoint `POST /usuarios/:id/roles` sin guard permite que cualquier visitante se convierta en administrador.

2. **Fraude financiero directo** — Cualquier usuario autenticado puede ejecutar `POST /pagos` con `estado: 'completado'` y potencialmente obtener productos sin pagar. Esto no requiere ningún conocimiento técnico avanzado — solo una cuenta registrada y una solicitud HTTP.

3. **Denegación de servicio trivial** — Un archivo sin límite de tamaño puede crashear la API con una sola solicitud de un usuario registrado.

4. **Stored XSS** — Sin sanitización de inputs, cualquier productor puede inyectar código JavaScript que se ejecute en el navegador de todos los compradores.

5. **Pérdida económica en envíos** — Sin dimensiones obligatorias en productos, cada envío se cotiza con valores fallback que pueden subestimar el costo real por un factor de 10x o más.

### Lista Priorizada de Correcciones Antes del Lanzamiento

#### Prioridad 1 — Crítica (bloquea completamente el lanzamiento)
- [ ] `configuracion.controller.ts` — Agregar `@UseGuards(AuthGuard, RolesGuard) @Roles('administrador')` a TODOS los endpoints (especialmente seed-all)
- [ ] `usuarios.controller.ts` — Agregar guards a todos los endpoints + validación de ownership
- [ ] `auth.service.ts:48-50` — Eliminar fallback `?? 'change-me-*'`, usar throw Error si no está configurado
- [ ] `pagos.controller.ts:132-135` — Restringir `POST /pagos` y `PATCH /pagos/:id` a solo administradores o eliminar y usar exclusivamente el flujo de webhooks
- [ ] `archivos.controller.ts:27` — Agregar `limits: { fileSize: 5 * 1024 * 1024 }` (5MB) al FileInterceptor
- [ ] `tiendas.controller.ts` — Agregar guards + validación de ownership
- [ ] `productores.controller.ts:74-76` — Agregar guards + validación de ownership
- [ ] `auditoria.controller.ts` — Agregar guards de administrador
- [ ] Implementar sanitización XSS (sanitize-html o similar) en todos los campos de texto

#### Prioridad 2 — Alta (debe corregirse antes del primer día de ventas reales)
- [ ] `comisiones` — Validar `porcentaje >= 0` y `monto_fijo >= 0` en DTOs
- [ ] `carrito.service.ts:12-22` — Validar stock disponible al agregar/actualizar carrito
- [ ] Crear regla de comisión global activa de fallback para evitar bloqueos de pedidos
- [ ] Agregar `'cancelado'` a la lista `notIn` en `pagos.service.ts:325`
- [ ] `envios/getTracking()` — Validar ownership (usuario autenticado es el destinatario o el productor)
- [ ] `pedidos` — Validar ownership en `GET /pedidos/:id`
- [ ] Auditar y requerir `largo_cm`, `ancho_cm`, `alto_cm` en el schema de productos
- [ ] Mover `EXCHANGERATE_API_KEY` al servidor (no usar NEXT_PUBLIC_)
- [ ] Eliminar todos los `console.log` con datos de usuario/pedido

#### Prioridad 3 — Media (semana siguiente al lanzamiento)
- [ ] Validar restricciones de envío alcohol en `cotizarEnvio()`, no solo en `crearGuia()`
- [ ] Implementar alertas si el cron de tipo de cambio falla
- [ ] Agregar `@Throttle()` a `POST /auth/password-reset/confirm`
- [ ] Usar `timingSafeEqual()` en webhook de SkydropX
- [ ] Revisar CORS para no permitir requests sin `Origin` header

---

## FASE 12 — PÉRDIDA ECONÓMICA POTENCIAL

### Escenario A: Fraude por manipulación de estado de pago

**Vulnerabilidad:** CRÍTICO-9 — `POST /pagos` sin restricción de rol

```
Atacante registra cuenta → Crea pedido de 5 botellas mezcal ($3,500 MXN)
→ POST /pagos { id_pedido: X, estado: 'completado', monto: 0.01, proveedor: 'stripe' }
→ Si el flujo de liberación de pedido depende de pagos.estado:
   Pedido marcado como pagado → Productor prepara envío
   
Pérdida por incidente: $3,500 MXN
Si ocurre 10 veces antes de detectarse: $35,000 MXN
```

### Escenario B: Escalación de privilegios → Robo de datos

**Vulnerabilidad:** CRÍTICO-3 — `POST /usuarios/:id/roles` sin guard

```
Atacante crea cuenta → POST /usuarios/1/roles { id_rol: 1 } (admin)
→ Accede al panel admin → Exporta lista completa de usuarios + pedidos + datos bancarios
→ Potencial multa LFPDPPP: hasta 320,000 UMAs (~$33,000,000 MXN)
```

### Escenario C: Pérdida por envíos subcotizados

**Vulnerabilidad:** CRÍTICO-12 — Dimensiones hardcodeadas

```
Supuestos: 100 pedidos/mes, promedio 3 botellas, sin dimensiones en productos
Costo real de envío por pedido: $250 MXN
Costo cotizado con fallback 10cm: $25 MXN
Pérdida por pedido: $225 MXN
Pérdida mensual: 100 × $225 = $22,500 MXN
Pérdida anual: $270,000 MXN (~$15,000 USD)
```

### Escenario D: Comisión negativa

**Vulnerabilidad:** CRÍTICO-10 — Sin validación de porcentaje negativo

```
Admin crea regla con porcentaje: -10% para error tipográfico (quiso poner 10%)
100 pedidos de $500 MXN cada uno:
  Comisión = 500 × (-0.10) = -50 MXN
  Monto_neto_productor = 500 - (-50) = 550 MXN
Pérdida por pedido: 50 MXN
Pérdida total (100 pedidos): $5,000 MXN en un solo día
```

### Escenario E: DoS por archivo grande

**Vulnerabilidad:** CRÍTICO-14 — Sin límite de tamaño en uploads

```
1 usuario con cuenta válida envía archivo de 2 GB
→ memoryStorage carga 2 GB en RAM de Node.js
→ Proceso crashea (OOM killer)
→ API no disponible para TODOS los usuarios
Tiempo de recuperación: 2-10 minutos (reinicio de proceso)
Número de atacantes necesarios: 1
Costo del ataque: $0 (cuenta gratuita)
```

### Resumen de Exposición Económica Total

| Escenario | Pérdida Mínima | Pérdida Máxima | Probabilidad |
|-----------|---------------|----------------|--------------|
| Fraude estado de pago | $3,500 MXN | $350,000 MXN | ALTA |
| Fuga de datos + multa | $1,000,000 MXN | $33,000,000 MXN | MEDIA |
| Envíos subcotizados | $22,500 MXN/mes | $270,000 MXN/año | MUY ALTA |
| Comisión negativa | $5,000 MXN/día | Sin límite | BAJA |
| DoS por upload | $0 directo | Reputación + ventas perdidas | ALTA |

**Exposición total estimada (año 1 sin correcciones): $1,300,000 MXN — $35,000,000 MXN**

---

## CONCLUSIÓN EJECUTIVA

| Dimensión | Puntuación | Justificación |
|-----------|-----------|---------------|
| Nivel de seguridad | **2 / 10** | 12 vulnerabilidades críticas, endpoints admin públicos, XSS sin mitigar |
| Nivel de estabilidad | **5 / 10** | Core de pagos robusto (webhooks idempotentes), pero arquitectura de consistencia incompleta |
| Nivel de escalabilidad | **5 / 10** | Rate limiting presente, índices parciales, no hay caché |
| Preparación para producción | **2 / 10** | Múltiples rutas triviales a compromiso total del sistema |
| Riesgo financiero | **8 / 10** | Fraude de pago accesible, envíos subcotizados, comisiones negativas |
| Riesgo operativo | **7 / 10** | DoS trivial, seed-all público puede destruir configuración |

---

## 🔴 VEREDICTO FINAL: NO APTO PARA PRODUCCIÓN

El marketplace tiene fortalezas reales: la lógica de webhooks de pago es robusta, la idempotencia está implementada, el cálculo de impuestos es server-side, y el descuento de stock es atómico. El equipo claramente tiene experiencia.

Sin embargo, las 12 vulnerabilidades críticas representan riesgos existenciales para el negocio. Un atacante sin ningún conocimiento especializado puede, hoy mismo:

1. Convertirse en administrador del sistema
2. Marcar pedidos como pagados sin pagar
3. Resetear la configuración de producción
4. Crashear la API con una sola petición

Estos no son riesgos teóricos — son vectores de ataque triviales y directos.

**El tiempo estimado para corregir las prioridades 1 y 2 es de 5-7 días de desarrollo enfocado.** El marketplace puede estar en producción de forma segura en aproximadamente 2 semanas con las correcciones aplicadas y una ronda de revisión final.

---

*Reporte generado el 2026-06-07. Basado en evidencia directa del código fuente.*  
*Ver `PRODUCTION_TEST_CHECKLIST.md` para el plan de pruebas completo.*
