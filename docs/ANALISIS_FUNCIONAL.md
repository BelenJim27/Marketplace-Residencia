# ANÁLISIS FUNCIONAL — Marketplace-Residencia
> Generado el 2026-06-06. Basado en análisis directo del código fuente.

---

## Arquitectura General

### Tecnologías Utilizadas

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | NestJS | 11 |
| Frontend | Next.js | 16 (App Router) |
| ORM | Prisma | — |
| Base de datos | PostgreSQL | Neon (serverless) |
| Monorepo | Turborepo + npm workspaces | — |
| Auth | JWT manual (HMAC-SHA256) + NextAuth | — |
| Pagos | Stripe + PayPal | — |
| Envíos | SkydropX (único carrier activo) | — |
| Email | SendGrid | — |
| Almacenamiento | diskStorage local (uploads/) | — |
| i18n | next-intl (es + en) | — |
| Theming | next-themes | — |

### Estructura del Proyecto

```
apps/
  api/    # NestJS 11 — Puerto 3001
  web/    # Next.js 16 — Puerto 3000
packages/
  database/  # Prisma schema + client compartido
turbo.json
```

### Dependencias Críticas Externas

| Servicio | Variable de Entorno | Estado |
|---------|-------------------|--------|
| Neon PostgreSQL | `DATABASE_URL`, `DIRECT_URL` | Obligatorio |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Obligatorio para pagos |
| PayPal | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` | Obligatorio para pagos |
| SkydropX | `SKYDROPX_CLIENT_ID`, `SKYDROPX_CLIENT_SECRET` | Obligatorio para envíos |
| SendGrid | `SENDGRID_API_KEY`, `EMAIL_FROM` | Obligatorio para emails |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Opcional (login social) |
| ExchangeRate-API | `EXCHANGERATE_API_KEY` | Opcional (tasas de cambio) |

### Flujo de Datos Principal

```
Cliente → Next.js (3000)
           ├── Proxy /uploads, /productos, etc. → NestJS (3001)
           └── api.ts directo → NestJS (3001) con Bearer token
                                    ├── Guards (Auth + RBAC)
                                    ├── Services (lógica de negocio)
                                    └── Prisma → PostgreSQL (Neon)
```

---

## Módulos Encontrados

### 1. Auth (`/auth`)

**Qué hace**: Registro, login, logout, refresh de tokens, recuperación de contraseña, OAuth Google.

**Cómo funciona**:
- JWT manual con HMAC-SHA256 (sin librería `jsonwebtoken`)
- Access token: 15 min | Refresh token: 30 días
- Refresh tokens almacenados en tabla `refresh_tokens` (hash SHA-256)
- Password reset con JWT temporal de 30 min firmado con `PASSWORD_RESET_SECRET`
- OAuth Google: intercambia code en backend, genera JWT propio

**Endpoints**:
- `POST /auth/register` — Registro usuario
- `POST /auth/login` — Login email/password
- `POST /auth/logout` — Revoca refresh token
- `POST /auth/refresh` — Rota access + refresh token
- `POST /auth/request-password-reset` — Envía email con link
- `POST /auth/reset-password` — Cambia contraseña con token
- `GET /auth/me` — Perfil del usuario autenticado
- `GET /auth/callback/google` — Callback OAuth

**Tablas**: `usuarios`, `refresh_tokens`, `oauth_cuentas`, `usuario_rol`, `roles`

---

### 2. Usuarios (`/usuarios`)

**Qué hace**: CRUD de perfiles de usuario, búsqueda, actualización de datos personales.

**Endpoints**:
- `GET /usuarios` — Listar (admin)
- `GET /usuarios/:id` — Perfil por ID
- `PATCH /usuarios/:id` — Actualizar perfil
- `DELETE /usuarios/:id` — Soft delete

**Tablas**: `usuarios`, `usuario_rol`

---

### 3. Roles y Permisos (`/roles`, `/permisos`)

**Qué hace**: CRUD de roles (admin, productor, cliente, transportista) y asignación de permisos.

**Roles conocidos**: `admin`, `productor`, `cliente`, `transportista`

**Tablas**: `roles`, `permisos`, `rol_permiso`, `usuario_rol`

---

### 4. Productores (`/productores`)

**Qué hace**: Gestión del flujo de onboarding: registro como productor, aprobación por admin, perfil de marca, dirección de bodega, credenciales Stripe/PayPal.

**Estados del productor**: `pendiente` → `aprobado` / `rechazado`

**Campos clave**:
- `stripe_account_id` + `stripe_onboarding_completed`: para transferencias Stripe Connect
- `paypal_email`: para payouts PayPal
- `bodega_*`: dirección de origen para guías de envío
- `rfc`, `razon_social`: datos fiscales

**Endpoints**:
- `POST /productores/solicitar` — Solicitar ser productor
- `GET /productores/mis-categorias` — Categorías del productor
- `GET /productores/perfil` — Perfil del productor autenticado
- `PATCH /productores/perfil` — Actualizar perfil
- `POST /productores/:id/revisar` — Admin: aprobar/rechazar

**Tablas**: `productores`, `productor_categoria`, `archivos`

---

### 5. Tiendas (`/tiendas`)

**Qué hace**: Gestión de tiendas (1 por productor). Nombre, descripción, dirección de origen para envíos.

**Endpoints**: CRUD estándar + listado público

**Tablas**: `tiendas`

---

### 6. Productos (`/productos`)

**Qué hace**: Catálogo de productos con filtros, imágenes múltiples, categorías, restricciones de edad, dimensiones para envío.

**Endpoints**:
- `GET /productos` — Catálogo público con filtros (búsqueda, tipo mezcal, maguey, precio, etc.)
- `GET /productos/:id` — Detalle
- `POST /productos` — Crear (productor/admin)
- `PATCH /productos/:id` — Editar
- `DELETE /productos/:id` — Soft delete
- `POST /productos/:id/imagenes` — Subir imágenes (Multer diskStorage)
- `DELETE /productos/:id/imagenes/:imgId` — Eliminar imagen

**Filtros disponibles**: búsqueda texto, tipoMezcal, maguey, precio min/max, destilación, molienda, maestroMezcalero

**Tablas**: `productos`, `producto_imagenes`, `categorias_productos`, `inventario`

---

### 7. Categorías (`/categorias`)

**Qué hace**: Árbol jerárquico de categorías (padre-hijo). Soporta `requiere_edad_minima` para restricción de mayoría de edad por categoría.

**Tablas**: `categorias`, `categorias_productos`

---

### 8. Inventario (`/inventario`)

**Qué hace**: Control de stock. Registra movimientos (venta, ajuste, devolución). Notifica al productor cuando el stock cae a ≤10 unidades.

**Importante**:
- El decremento de stock se hace atómico con `updateMany WHERE stock >= N` (evita overselling)
- El incremento al cancelar pedido **no está automatizado** — es manual vía `POST /inventario/:id/movimiento`

**Endpoints**:
- `GET /inventario` — Listar inventario (admin)
- `GET /inventario/:id_producto` — Stock de producto
- `POST /inventario` — Crear registro de inventario
- `PATCH /inventario/:id` — Actualizar stock
- `POST /inventario/:id/movimiento` — Registrar movimiento manual

**Tablas**: `inventario`, `movimientos_inventario`

---

### 9. Lotes (`/lotes`)

**Qué hace**: Trazabilidad de lotes de mezcal: código único, fecha de producción, volumen, grado de alcohol, especie de agave, fotos.

**Tablas**: `lotes`, `lote_atributos`, `regiones`

---

### 10. Carrito (`/carrito`)

**Qué hace**: Carrito de compras persistido en BD. **Requiere autenticación en todos los endpoints.**

**Endpoints** (todos con `@UseGuards(AuthGuard)`):
- `GET /carrito/:id_usuario` — Ver carrito del usuario
- `POST /carrito` — Agregar/actualizar ítem (upsert)
- `PATCH /carrito/:id` — Actualizar cantidad
- `DELETE /carrito/:id` — Eliminar ítem
- `DELETE /carrito/usuario/:id_usuario` — Vaciar carrito

**Comportamiento**: Upsert por `(id_usuario, id_producto)`. Si el producto ya existe, incrementa cantidad y actualiza precio snapshot.

**⚠ Sin carrito para invitados**: No existe endpoint público. La lógica de guest cart está en el frontend (localStorage/context), pero el backend no soporta fusión automática.

**Tablas**: `carrito_item`

---

### 11. Wishlist (`/wishlist`)

**Qué hace**: Lista de deseos persistida en BD. **Requiere autenticación.**

**Seguridad**: Verifica que `req.user.id_usuario === param.id_usuario` antes de operar.

**Tablas**: `lista_deseos_item`

---

### 12. Pedidos (`/pedidos`)

**Qué hace**: Ciclo de vida completo de órdenes. Creación, detalle de items, validaciones de precio/stock/edad, estados, tracking, facturas.

**Estados del pedido**: `pendiente` → `pagado` → `label_purchased` → (por productor: `confirmado` → `preparando` → `enviado` → `entregado`) → `cancelado`

**Flujo de creación**:
1. `POST /pedidos` — Crea pedido con total=0 (placeholder)
2. `POST /pedidos/:id/detalles` — Agrega ítems (valida precio desde BD, descuenta stock atómicamente)
3. `POST /pagos/stripe/intent` o `POST /pagos/paypal/order` — Calcula total real + impuestos
4. Webhook de pago confirma → estado `pagado` → guías de envío auto-generadas

**Validaciones al crear detalle**:
- Precio del frontend debe coincidir con BD (tolerancia ±$0.01)
- Stock suficiente (atómico)
- Productor debe existir vinculado a tienda o lote

**Endpoints clave**:
- `POST /pedidos` — Crear pedido
- `POST /pedidos/:id/detalles` — Agregar ítem
- `GET /pedidos/mis-compras` — Compras del cliente
- `GET /pedidos/mis-pedidos-productor` — Pedidos del productor
- `PATCH /pedidos/:id_pedido/estado-productor` — Cambiar estado (máquina de estados)
- `POST /pedidos/:id/validar-envio` — Validar restricciones de envío por estado USA
- `GET /pedidos/:id/cotizar` — Cotizar envío con SkydropX

**Tablas**: `pedidos`, `detalle_pedido`, `pedido_productor`, `facturas`, `movimientos_inventario`

---

### 13. Pagos (`/pagos`)

**Qué hace**: Integración Stripe + PayPal. Validación de montos contra BD, cálculo de impuestos, deduplicación de webhooks, reembolsos, retry automático de transfers fallidos.

**Flujo Stripe**:
1. `POST /pagos/stripe/intent` → Valida subtotal/shipping/edad → Calcula impuestos → Crea PaymentIntent
2. Frontend confirma con Stripe.js
3. Webhook `payment_intent.succeeded` → marca pedido `pagado` → notifica productores → auto-genera guías

**Flujo PayPal**:
1. `POST /pagos/paypal/order` → Crea Order en PayPal
2. `POST /pagos/paypal/capture` → Captura y ejecuta side-effects
3. Webhook `PAYMENT.CAPTURE.COMPLETED` → fallback de idempotencia

**Deduplicación de webhooks**: tabla `webhook_events_log` con UNIQUE `(provider, event_id)`.

**Distribución de ingresos**:
- Dinero llega a cuenta plataforma
- Transfers a productores se crean cuando se marca `entregado` (escrow hasta entrega)
- Comisión calculada desde tabla `comisiones` (jerárquica: global/país/categoría/productor)
- Retry automático cada 15 min para transfers fallidos (máx. 5 intentos)

**Cron jobs**:
- `*/15 * * * *` — `retryFailedTransfers()`: reintenta transfers fallidos
- `*/30 * * * *` — `retryGuiasFallidas()`: reintenta guías sin generar post-pago

**Tablas**: `pagos`, `payment_fees`, `refunds`, `payouts`, `pedido_productor`, `webhook_events_log`

---

### 14. Envíos (`/envios`)

**Qué hace**: Gestión de envíos, cotización con SkydropX, generación de guías por productor, tracking.

**Carrier activo**: SkydropX únicamente. FedEx fue eliminado del código.

**Cotización**: Calcula peso real + volumétrico, toma el mayor. Soporta múltiples carriers via SkydropX (DHL, FedEx, Estafeta, etc.).

**Carriers con soporte alcohol** (filtrado en SkydropX): `dhl`, `fedex`, `estafeta`, `paquetexpress`, `redpack`.

**Flujo `crearEnviosPorProductor`**: 
- Llamado post-pago automáticamente
- Por cada productor en el pedido: lee dirección de bodega del productor, crea envío individual, genera guía

**⚠ Problema detectado**: La dirección del remitente en SkydropX usa variables de entorno globales (`SKYDROPX_SHIPPER_*`), NO los campos `bodega_*` de cada productor. Ver Auditoría.

**Endpoints**:
- `POST /envios/cotizar` — Cotizar con SkydropX
- `POST /envios/crear-guia/:id_envio` — Crear guía
- `GET /envios/tracking/:numero_guia` — Tracking
- `POST /envios/webhook` — Webhook de tracking events

**Tablas**: `envios`, `envio_guias`, `envio_eventos`, `envio_cotizaciones`, `transportistas`, `servicios_envio`

---

### 15. Payouts (`/payouts`)

**Qué hace**: Gestión de pagos a productores. Aprobación manual por admin o automática al confirmar entrega.

**Endpoints**: CRUD + `POST /payouts/generar`

**Tablas**: `payouts`, `pedido_productor`

---

### 16. Comisiones (`/comisiones`)

**Qué hace**: Sistema jerárquico de comisiones. El resolver busca la regla más específica (menor prioridad gana):
1. Por productor
2. Por país
3. Por categoría
4. Global

**⚠ Crítico**: Si no hay regla global activa, el sistema lanza error al crear detalle de pedido (no silencia).

**Tablas**: `comisiones`

---

### 17. Direcciones (`/direcciones`)

**Qué hace**: CRUD de direcciones de entrega. Soporta nacionales e internacionales. Campo `pais_iso2` para validar disponibilidad.

**Tablas**: `direcciones`, `paises`

---

### 18. Notificaciones (`/notificaciones`)

**Qué hace**: Notificaciones in-app (no push). Se crean por eventos (pedido pagado, stock bajo, pago pendiente, etc.). El frontend hace polling.

**Tablas**: `notificaciones`

---

### 19. Resenas (`/resenas`)

**Qué hace**: Reviews de productos (1-5 estrellas). Solo 1 reseña por usuario+producto. Soft delete. Campo `compra_verificada` (no se llena automáticamente).

**Tablas**: `resenas`

---

### 20. Admin (`/admin`)

**Qué hace**: Estadísticas del dashboard, gestión de solicitudes de productores, listados admin.

**Tablas**: múltiples (estadísticas agregadas)

---

### 21. Email (`/email`)

**Qué hace**: SendGrid. Emails de confirmación de pedido (con detalle de items, breakdown de impuestos, advertencia de alcohol), recuperación de contraseña, bienvenida, factura PDF.

---

### 22. Archivos (`/archivos`)

**Qué hace**: Upload de archivos (NOM-070 para mezcal). Guardado en `apps/api/uploads/archivos/`.

---

### 23. Configuración (`/configuracion`)

**Qué hace**: Key-value store para configuración del sistema.

**Tablas**: `configuracion_sistema`

---

### 24. Tasas de Cambio (`/tasas-cambio`)

**Qué hace**: Sincronización horaria de tasas de cambio desde ExchangeRate-API.

**Cron**: `0 * * * *` — cada hora

**Tablas**: `tasas_cambio`

---

### 25. Estadísticas Landing (`/estadisticas-landing`)

**Qué hace**: Datos públicos para la landing page (total productores, productos, etc.)

---

### 26. Restricciones Envío (`validar-envio`)

**Qué hace**: Valida si los productos de un carrito pueden enviarse a un estado específico de USA. Consulta tabla `restricciones_envio_categoria`.

---

## Flujo de Datos — Checkout Completo

```
1. Cliente agrega productos al carrito (POST /carrito)
2. Inicia checkout en /tienda/checkout
3. Selecciona dirección de entrega
4. Cotiza envío (GET /pedidos/:id/cotizar → SkydropX)
5. Selecciona opción de envío
6. POST /pedidos — Crea pedido shell (total=0)
7. POST /pedidos/:id/detalles × N — Agrega ítems (valida precio, descuenta stock)
8. POST /pagos/stripe/intent — Valida todo, calcula impuestos, crea PaymentIntent
9. Cliente confirma con Stripe.js (Elements)
10. Stripe dispara webhook → POST /pagos/stripe/webhook
11. updatePaymentStatus('completado'):
    - pedido → 'pagado'
    - pedido_productor → 'confirmado'
    - Notificación a productores
    - crearGuiasPostPago() (async, no bloquea)
12. Productor cambia estado: confirmado → preparando → enviado → entregado
13. Al marcar 'entregado': triggerPayoutForProductor() → Stripe Transfer / PayPal Payout
```

---

## Resumen de 40+ Tablas de BD

| Tabla | Propósito |
|-------|-----------|
| usuarios | Usuarios del sistema |
| usuario_rol | N:M usuarios-roles |
| roles | Roles (admin, productor, cliente) |
| permisos | Permisos granulares |
| rol_permiso | N:M roles-permisos |
| oauth_cuentas | Proveedores OAuth (Google) |
| refresh_tokens | Refresh tokens rotables |
| auditoria | Log de cambios |
| archivos | Documentos subidos |
| productos | Catálogo de productos |
| producto_imagenes | Galería de imágenes |
| categorias | Árbol de categorías |
| categorias_productos | N:M productos-categorías |
| productores | Perfiles de productores |
| tiendas | Tiendas de productores |
| lotes | Lotes de mezcal |
| lote_atributos | Atributos key-value de lotes |
| regiones | Regiones geográficas |
| inventario | Stock por producto |
| movimientos_inventario | Historial de movimientos |
| carrito_item | Ítems del carrito |
| lista_deseos_item | Wishlist |
| pedidos | Órdenes maestras |
| detalle_pedido | Líneas de pedido |
| pedido_productor | Distribución por productor |
| pagos | Registros de pago |
| payment_fees | Comisiones de pasarela |
| refunds | Reembolsos |
| payouts | Pagos a productores |
| envios | Envíos |
| envio_guias | Guías (AWB/labels) |
| envio_eventos | Eventos de tracking |
| envio_cotizaciones | Cotizaciones de envío |
| transportistas | Carriers registrados |
| servicios_envio | Servicios disponibles |
| integraciones_envio | Credenciales de carriers |
| facturas | Facturas CFDI |
| direcciones | Direcciones de entrega |
| paises | Catálogo de países |
| idiomas | Catálogo de idiomas |
| tasas_cambio | Tipos de cambio |
| tasas_impuesto | Tasas fiscales por país/categoría |
| comisiones | Reglas de comisión |
| configuracion_sistema | Configuración global |
| restricciones_envio_categoria | Restricciones por estado USA |
| webhook_events_log | Deduplicación de webhooks |
| notificaciones | Notificaciones in-app |
| resenas | Reseñas de productos |
| productor_categoria | N:M productores-categorías |
| traducciones | Traducciones de entidades |
