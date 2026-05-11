# API (NestJS 11) - Marketplace-Residencia

**Ubicación**: `apps/api/`  
**Estado**: Estructura verificada contra schema Prisma actual

---

## Estructura de Módulos (24 módulos)

### Auth & Usuarios
- **auth** - JWT manual + OAuth Google
- **usuarios** - Perfiles, CRUD
- **roles** - RBAC, definiciones
- **productores** - Perfiles con aprobación flow

### Marketplace Core
- **productos** - Catálogo con traducciones
- **categorias** - Jerárquicas, multi-idioma
- **tiendas** - Tienda por productor
- **lotes** - Trazabilidad con atributos
- **inventario** - Stock levels + movimientos

### Pedidos & Carrito
- **carrito** - Items con price snapshot
- **pedidos** - Ciclo completo de órdenes
- **pagos** - Stripe integration
- **envios** - Transportista integration + webhooks
- **transportistas** - Carrier management

### User Experience
- **wishlist** - Items guardados
- **resenas** - Reviews 1-5 stars
- **direcciones** - Delivery addresses
- **notificaciones** - In-app notifications

### Admin & Config
- **admin** - Admin-only operations
- **configuracion** - System settings
- **auditoria** - Audit logs con payloads JSON
- **comisiones** - Commission rules (resolvidas por prioridad)
- **payouts** - Producer settlements

### Utilidades
- **email** - SendGrid integration
- **archivos** - File upload/storage
- **estadisticas-landing** - Public stats

---

## Patrones Clave (Verificar que están implementados)

### ✅ Auth Flow
- [ ] JWT manual (HMAC-SHA256, no jsonwebtoken lib)
- [ ] Access token: 15m
- [ ] Refresh token: 30d con BD record + rotation
- [ ] OAuth Google con upsert oauth_cuentas
- [ ] Guards: AuthGuard (bearer validation) + RbacGuard (role checking)

### ✅ Database
- [ ] Singleton PrismaService en src/prisma/
- [ ] Inyectado en módulos
- [ ] Después de schema changes: `npm run db:generate`

### ✅ BigInt Serialization
- [ ] main.ts: `BigInt.prototype.toJSON` → Number
- [ ] IDs de productos, pedidos, etc. son BigInt en Prisma

### ✅ File Uploads
- [ ] Multer para subir archivos
- [ ] Ubicación: `apps/api/uploads/{tipo}/{filename}`
- [ ] Servidos en `/uploads/` por Express static
- [ ] Tipos: productos/, usuarios/, archivos/

### ✅ Validation
- [ ] Global ValidationPipe en main.ts
- [ ] whitelist: true, transform: true
- [ ] Class-validator en DTOs

### ✅ Email
- [ ] SendGrid via email.service.ts
- [ ] SENDGRID_API_KEY en .env
- [ ] EMAIL_FROM en .env

### ✅ Transacciones
- [ ] Usar `prisma.$transaction()` para múltiples tablas
- [ ] ROLLBACK automático si error

### ✅ Auditoría
- [ ] valor_anterior, valor_nuevo como JSON
- [ ] ip_origen registrada
- [ ] Interceptor o middleware para logging

---

## Flujos Complejos (Implementar en orden)

### 1. Login Email/Password
**Módulo**: auth.service.ts  
**Tablas**: usuarios, refresh_tokens, usuario_rol  
**Validar**:
- [ ] Hash password con bcrypt
- [ ] Generar JWT access + refresh
- [ ] Almacenar refresh_token hash en BD
- [ ] Return usuario con roles

### 2. Login Google OAuth
**Módulo**: oauth.controller.ts  
**Tablas**: usuarios, oauth_cuentas, usuario_rol  
**Validar**:
- [ ] Exchange code por Google tokens
- [ ] Upsert oauth_cuentas (provider + provider_uid unique)
- [ ] Crear usuario si no existe
- [ ] Generar JWT propios

### 3. Crear Producto (Multi-idioma)
**Módulo**: productos.service.ts  
**Tablas**: productos, productos_traducciones, inventario, producto_imagenes  
**Validar**:
- [ ] Crear producto base
- [ ] Crear traducciones en tabla separada
- [ ] Crear inventario con stock=0
- [ ] Guardar imágenes con orden
- [ ] Transacción: si error, ROLLBACK TODO

### 4. Crear Pedido (B2B con Comisiones) ⭐⭐⭐
**Módulo**: pedidos.service.ts  
**Tablas**: pedidos, detalle_pedido, pedido_productor, inventario, movimientos_inventario, comisiones, auditoria  
**Validar**:
- [ ] Validar usuario + dirección
- [ ] Crear pedido master
- [ ] POR CADA ITEM en carrito:
  - [ ] Fetch producto + productor + tienda
  - [ ] Calcular precio_compra
  - [ ] Buscar tasas_impuesto (pais_iso2, id_categoria)
  - [ ] INSERT detalle_pedido
  - [ ] Descontar inventario
  - [ ] Registrar movimiento_inventario
- [ ] CREAR pedido_productor CON COMISIÓN:
  - [ ] Resolver comisión (por alcance: global/pais/categoria/productor)
  - [ ] Calcular comision_marketplace
  - [ ] Calcular monto_neto_productor
- [ ] Solicitar cotización envío
- [ ] Actualizar total pedido
- [ ] AUDIT: valor_nuevo
- [ ] Limpiar carrito
- [ ] Transacción con ROLLBACK

### 5. Procesar Pago (Stripe)
**Módulo**: pagos.service.ts  
**Tablas**: pagos, pedidos  
**Validar**:
- [ ] Crear Stripe PaymentIntent
- [ ] Manejar 3D Secure (requires_action)
- [ ] Actualizar pagos.estado (pendiente → completado/fallido)
- [ ] Si completado: UPDATE pedidos.estado = "procesando"
- [ ] AUDIT cambios
- [ ] Webhook para cuando Stripe notifica

### 6. Crear Envío (Integraciones Transportista)
**Módulo**: envios.service.ts  
**Tablas**: envios, envio_guias, envio_cotizaciones, integraciones_envio  
**Validar**:
- [ ] Fetch transportista + integración
- [ ] Desencriptar credenciales API (api_key, api_secret)
- [ ] Llamar API transportista para crear guía
- [ ] Crear envio_guias con payload_response
- [ ] Activar webhook para tracking
- [ ] UPDATE pedidos.estado = "enviado"
- [ ] Notificar usuario con numero_guia

### 7. Webhook: Evento Tracking
**Módulo**: envios.service.ts (async)  
**Tablas**: envio_eventos, envios, pedidos, pedido_productor, payouts  
**Validar**:
- [ ] Validar webhook signature
- [ ] Crear envio_evento con payload
- [ ] Normalizar estado (según transportista)
- [ ] ASYNC: Si entregado:
  - [ ] UPDATE envios.estado = "entregado"
  - [ ] UPDATE pedidos.estado = "entregado"
  - [ ] Si payouts automático: crear/actualizar payout
  - [ ] Notificar cliente

---

## Validaciones del Dominio (Mezcal)

### ✅ Edad Mínima
- [ ] validacion.service.ts
- [ ] Validar edad antes de agregar carrito
- [ ] Validar en checkout

### ✅ Restricciones de Envío
- [ ] restricciones_envio_categoria table
- [ ] Validar por (pais_iso2, estado_codigo, id_categoria)
- [ ] Bloquear envíos a países/estados restringidos

### ✅ Trazabilidad de Lotes
- [ ] lotes.service.ts
- [ ] lote_atributos para key-value pairs
- [ ] Importar datos de laboratorio
- [ ] Generar URL trazabilidad (QR/blockchain)
- [ ] Audit trail de cambios en lotes

---

## Multi-Idioma & Multi-Moneda

### ✅ Traducciones
- [ ] productos_traducciones table
- [ ] categorias_traducciones table
- [ ] tiendas_traducciones table
- [ ] Fallback a español si idioma no existe
- [ ] i18n.service.ts para queries

### ✅ Exchange Rates
- [ ] tasas_cambio table (Decimal 18,8)
- [ ] vigente_desde/hasta para validez
- [ ] i18n.service.ts convertirPrecio()
- [ ] Usar en responses

---

## Integraciones

### ✅ Stripe
- [ ] stripe library en package.json
- [ ] STRIPE_API_KEY en .env
- [ ] STRIPE_WEBHOOK_SECRET en .env
- [ ] productores.stripe_account_id (Stripe Connect)
- [ ] productores.stripe_onboarding_completed
- [ ] Webhook handler POST /webhooks/stripe

### ✅ Transportistas
- [ ] integraciones_envio table (api_key/secret encrypted)
- [ ] Múltiples transportistas soportados
- [ ] servicios_envio por transportista
- [ ] envio_cotizaciones.payload_request/response
- [ ] envio_guias.payload_response
- [ ] Webhook handler POST /webhooks/tracking/:id_transportista

### ✅ SendGrid
- [ ] email.service.ts
- [ ] SENDGRID_API_KEY en .env
- [ ] Templates para confirmación, tracking, etc.

---

## Environment Variables (Validar)

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://... (Neon serverless)
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001

JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

SENDGRID_API_KEY=...
EMAIL_FROM=...

STRIPE_API_KEY=...
STRIPE_WEBHOOK_SECRET=...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/callback/google

PORT=3001
NODE_ENV=development
```

---

## Desarrollo Rápido

### Crear nuevo módulo
```bash
nest g module modules/nuevo-modulo
nest g controller modules/nuevo-modulo
nest g service modules/nuevo-modulo
```

### Testing
```bash
npm run test -- src/modules/auth/auth.service.spec.ts --no-coverage
npm run test:watch
npm run test:cov
```

### Database
```bash
npm run db:migrate    # Crear migration
npm run db:push       # Push sin migration (dev)
npm run db:generate   # SIEMPRE después de cambios
npx prisma studio   # UI visual
```

---

## Troubleshooting Checklist

- [ ] Prisma client out of sync → `npm run db:generate`
- [ ] JWT verification failed → Check JWT secrets en .env
- [ ] CORS error → Check FRONTEND_URL en .env
- [ ] Transaction deadlock → Reducir scope, usar RepeatableRead
- [ ] Comisión incorrecta → Check `prioridad` en table comisiones
- [ ] Inventario negativo → Agregar CHECK constraint
- [ ] Webhook events no procesados → Check async handler + error logging
- [ ] Exchange rate viejo → Check `vigente_desde/hasta`
- [ ] Traducción faltante → Usar fallback a español
- [ ] Stripe permission denied → Check stripe_onboarding_completed

---

## Archivos Clave

- `src/main.ts` - Bootstrap, pipes, BigInt serialization
- `src/app.module.ts` - Module imports
- `src/prisma/prisma.service.ts` - Database singleton
- `src/auth/auth.service.ts` - JWT generation
- `src/auth/auth.guard.ts` - Bearer validation
- `src/auth/rbac.guard.ts` - Role checking
- `src/modules/productos/productos.service.ts` - Multi-idioma
- `src/modules/pedidos/pedidos.service.ts` - B2B comisiones
- `src/modules/envios/envios.service.ts` - Transportistas + webhooks
- `src/modules/validacion/validacion.service.ts` - Edad, restricciones
- `src/modules/i18n/i18n.service.ts` - Multi-idioma, multi-moneda
- `src/modules/email/email.service.ts` - SendGrid

---

## Estado: ✅ ESTRUCTURA VERIFICADA

Esta checklist verifica que tu API tiene toda la estructura necesaria para el marketplace mezcal multinacional.

**Próximo paso**: Ir por cada sección y checkear que está implementada.  
**Tokens**: Solo lees estructura, sin ejemplos de código largos.
