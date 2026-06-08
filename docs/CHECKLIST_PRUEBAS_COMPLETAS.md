# CHECKLIST DE PRUEBAS COMPLETAS — Marketplace-Residencia
> Generado el 2026-06-06. Ejecutar en orden. Cada paso tiene precondiciones del anterior.

---

## Preparación

```bash
□ Instalar dependencias: npm install (raíz)
□ Configurar .env y apps/api/.env con variables reales
□ Generar Prisma client: npm run db:generate
□ Ejecutar migraciones: cd packages/database && npx prisma migrate deploy
□ Ejecutar seeds:
    node apps/api/scripts/seed-base.js
    node apps/api/scripts/seed-internacionalizacion.js
    node apps/api/scripts/seed-restricciones-usa.js
□ Insertar comisión global en BD (OBLIGATORIO):
    SQL: INSERT INTO comisiones (alcance, porcentaje, prioridad, vigente_desde, activo)
         VALUES ('global', 0.10, 100, NOW(), true);
□ Iniciar servidores: npm run dev
□ Verificar API en: http://localhost:3001/api/docs
□ Verificar Web en: http://localhost:3000
□ Iniciar Stripe CLI: stripe listen --forward-to localhost:3001/pagos/stripe/webhook
```

---

## MÓDULO 1: Autenticación

```bash
□ Registro de nuevo usuario (POST /auth/register)
    - Verificar tokens en respuesta
    - Verificar email de bienvenida (si SendGrid configurado)

□ Login con email y contraseña (POST /auth/login)
    - Verificar accessToken y refreshToken

□ Verificar perfil autenticado (GET /auth/me con Bearer token)

□ Login con Google OAuth
    - Ir a /auth/sign-in → "Continuar con Google"
    - Completar flujo OAuth
    - Verificar usuario creado en BD

□ Refresh de token (POST /auth/refresh)
    - Verificar nuevos tokens
    - Verificar que el refresh anterior no funciona

□ Logout (POST /auth/logout)
    - Verificar que el refresh token es revocado

□ Recuperación de contraseña
    - POST /auth/request-password-reset → email recibido
    - POST /auth/reset-password con token del email
    - Login con nueva contraseña
```

---

## MÓDULO 2: Onboarding de Productor

```bash
□ Registrar usuario como futuro productor (POST /auth/register)

□ Solicitar rol productor (POST /productores/solicitar)
    - Llenar datos de marca, RFC, bodega

□ Login como admin y aprobar solicitud
    - POST /productores/:id/revisar con {"estado":"aprobado"}
    - Verificar notificación al productor

□ Login como productor aprobado
    - Verificar que tiene acceso a /dashboard/productor

□ Crear tienda (POST /tiendas)
    - Nombre, descripción, dirección de origen

□ Crear producto con imágenes
    - POST /productos
    - POST /productos/:id/imagenes (subir JPG real)
    - GET /productos/:id — verificar imagen visible

□ Crear lote de trazabilidad (POST /lotes)
    - Código único, fecha producción, grado alcohol

□ Asignar lote al producto (PATCH /productos/:id con id_lote)

□ Registrar inventario (POST /inventario)
    - Stock inicial mínimo 10 unidades
```

---

## MÓDULO 3: Catálogo y Búsqueda

```bash
□ Ver catálogo público (GET /productos)
    - Sin token (acceso público)
    - Verificar que aparece el producto creado

□ Buscar por texto (GET /productos?busqueda=mezcal)

□ Filtrar por precio (GET /productos?precioMin=100&precioMax=1000)

□ Ver detalle de producto (GET /productos/:id)
    - Verificar imágenes, stock, categorías, datos del productor

□ Ver tienda del productor (GET /tiendas/:id)

□ Navegar categorías (/categoria/:slug)
```

---

## MÓDULO 4: Carrito

```bash
□ Agregar producto al carrito (login como cliente primero)
    - POST /carrito con { id_usuario, id_producto, cantidad:1, precio_unitario_snapshot }

□ Verificar carrito (GET /carrito/:id_usuario)

□ Modificar cantidad (PATCH /carrito/:id_item)

□ Agregar segundo producto (de otro productor)

□ Verificar que el carrito persiste después de cerrar y volver a abrir el navegador

□ Eliminar un ítem (DELETE /carrito/:id_item)

□ Probar sin sesión: intentar POST /carrito sin token → esperar 401
```

---

## MÓDULO 5: Wishlist

```bash
□ Agregar producto a wishlist
    - POST /wishlist con { id_usuario, id_producto }

□ Verificar wishlist (GET /wishlist/:id_usuario)

□ Intentar acceder a wishlist de otro usuario → esperar 403

□ Eliminar de wishlist (DELETE /wishlist/:id_usuario/:id_producto)
```

---

## MÓDULO 6: Checkout — Un Vendedor

```bash
□ Login como cliente con fecha_nacimiento registrada

□ Carrito con 1 producto de 1 productor

□ Ir a /tienda/checkout en el navegador

□ Paso 1 — Dirección:
    - Ingresar dirección de envío en México
    - Código postal válido (ej. 06600 CDMX)

□ Paso 2 — Envío:
    - Verificar que aparecen opciones de SkydropX
    - Seleccionar opción más económica

□ Paso 3 — Pago Stripe:
    - Ingresar tarjeta de prueba: 4242 4242 4242 4242
    - CVC: 123, Vencimiento: 12/28
    - Click "Pagar"

□ Verificar webhook recibido en Stripe CLI (payment_intent.succeeded)

□ Verificar en BD:
    - pedidos.estado = 'pagado' (luego 'label_purchased' si guías funcionan)
    - pagos.estado = 'completado'
    - inventario decrementado
    - pedido_productor.estado = 'confirmado'

□ Verificar email de confirmación recibido (con detalle de items)

□ Verificar notificación al productor en /dashboard/productor
```

---

## MÓDULO 7: Checkout — Dos Vendedores

```bash
□ Carrito con productos de 2 productores distintos

□ Mismo flujo de checkout

□ Verificar en BD post-pago:
    - 2 filas en pedido_productor (una por productor)
    - La suma de monto_neto_productor + comision_marketplace ≈ subtotal total

□ Verificar proporcionalidad:
    SELECT id_productor, subtotal_bruto, comision_marketplace, monto_neto_productor 
    FROM pedido_productor WHERE id_pedido = <ID>;
```

---

## MÓDULO 8: Checkout — PayPal

```bash
□ Mismo carrito que el anterior

□ En paso de pago, seleccionar "Pagar con PayPal"

□ Completar flujo de aprobación en sandbox PayPal

□ POST /pagos/paypal/capture automático desde frontend

□ Verificar pedido en estado 'pagado'
```

---

## MÓDULO 9: Gestión de Pedidos (Productor)

```bash
□ Login como productor con pedidos en estado 'confirmado'

□ Ver pedidos en /dashboard/productor/pedidos

□ Abrir pedido individual — ver detalle del cliente y productos

□ Cambiar estado a 'preparando'
    - PATCH /pedidos/:id/estado-productor con { estado: 'preparando' }

□ Cambiar estado a 'enviado'
    - Registrar número de rastreo

□ Cambiar estado a 'entregado'

□ Verificar en BD:
    - payouts creado para el productor
    - payouts.estado = 'procesado' (si Stripe onboarding completo)
    - o payouts.estado = 'fallido' (si sin onboarding → retry pendiente)

□ Intentar saltarse un estado (ej. pendiente → entregado) → esperar 400
```

---

## MÓDULO 10: Pago Fallido y Reintento

```bash
□ Carrito con producto

□ En checkout, usar tarjeta que falla: 4000 0000 0000 0002

□ Verificar:
    - pagos.estado = 'pendiente' (no cambia a fallido hasta webhook)
    - pedidos.estado permanece en 'pendiente' al recibir webhook fallido

□ Volver al checkout e intentar con tarjeta válida

□ Verificar pago completado
```

---

## MÓDULO 11: Reembolso

```bash
□ Tener un pedido en estado 'pagado'

□ Login como ADMIN

□ POST /pagos/:id/reembolso
    - Verificar respuesta 200 con estado 'reembolsado'
    - Verificar pedido en estado 'cancelado'
    - Verificar reembolso en Stripe Dashboard

⚠ NOTA: Este endpoint actualmente NO requiere rol admin (Bug C-01)
         Cualquier usuario autenticado puede ejecutarlo.
         Probar también como cliente para confirmar el bug.
```

---

## MÓDULO 12: Envío Nacional

```bash
□ Pedido pagado con dirección en México

□ Verificar que se intentó crear guía automáticamente post-pago
    - GET /envios → buscar envio con id_pedido
    - Verificar envio_guias.numero_guia

⚠ NOTA: La guía podría fallar si SKYDROPX_SHIPPER_* es una dirección ficticia (Bug C-04)
         En sandbox esto puede no ser bloqueante.

□ Simular webhook de tracking de SkydropX:
    POST /envios/webhook con payload del carrier

□ Verificar envio_eventos creado en BD
```

---

## MÓDULO 13: Envío Internacional (USA)

```bash
□ Crear pedido con dirección en USA (estado no restringido, ej. California)

□ Cotizar envío (GET /pedidos/:id/cotizar)
    - Verificar que devuelve opciones internacionales

□ Verificar restricciones:
    - POST /pedidos/validar-envio con pais_iso2=US, estado_codigo=UT (Utah — restringido)
    - Esperar items_bloqueados no vacío

□ Completar checkout con dirección en California (no restringida)

□ Verificar que la guía incluye:
    - codigo_hs para la aduana
    - valor_declarado_aduana
    - requires_adult_signature = true (para mezcal)
```

---

## MÓDULO 14: Administración

```bash
□ Login como admin

□ Ver dashboard (GET /admin/stats)
    - ⚠ Verificar que totalIngresos no es 0 si hay pedidos pagados (Bug A-01)

□ Ver todos los pedidos (GET /pedidos)

□ Ver todos los pagos (GET /pagos)

□ Gestionar comisiones:
    - GET /comisiones → listar reglas
    - POST /comisiones → crear regla por productor

□ Gestionar inventario (GET /inventario)
    - Verificar que el stock decrementó correctamente

□ Ver log de auditoría (GET /auditoria)
    - Verificar que los cambios de estado están registrados

□ Ver payouts pendientes de retry
    - GET /payouts → filtrar estado='fallido'

□ Gestionar usuarios (GET /usuarios)

□ Ver estadísticas de la landing page (GET /estadisticas-landing)
```

---

## MÓDULO 15: Seguridad Básica

```bash
□ Sin token → 401 en cualquier endpoint protegido

□ Token de un usuario intentando acceder a carrito de otro → 403

□ Manipular precio en detalle del pedido:
    POST /pedidos/:id/detalles con precio_compra diferente al real
    → esperar 400

□ Manipular subtotal en createStripeIntent:
    POST /pagos/stripe/intent con subtotal incorrecto
    → esperar 400

□ Duplicar evento webhook de Stripe:
    Enviar mismo evento dos veces → segundo debe ignorarse

□ Intentar reembolso como cliente normal:
    POST /pagos/:id/reembolso sin rol admin
    → ACTUALMENTE: pasa (Bug C-01, debe ser 403)
```

---

## MÓDULO 16: Cancelación

```bash
□ Pedido en estado 'pagado'

□ Admin ejecuta reembolso (POST /pagos/:id/reembolso)

□ Verificar:
    - pagos.estado = 'reembolsado'
    - pedidos.estado = 'cancelado'
    - Reembolso en Stripe Dashboard

□ ⚠ Verificar stock: El stock NO se restaura automáticamente (Bug C-02)
   Se debe restaurar manualmente:
   POST /inventario/:id/movimiento con { tipo: 'devolucion', cantidad: N }
```

---

## Resumen de Verificaciones Finales

```bash
□ Todos los flujos de autenticación funcionan
□ El catálogo es visible sin login
□ El carrito persiste entre sesiones
□ El checkout completo funciona (al menos con Stripe tarjeta de prueba)
□ Los webhooks se procesan y deduplicacionan
□ Los pedidos de múltiples productores se distribuyen correctamente
□ Los emails de confirmación llegan
□ Las notificaciones aparecen en el panel del productor
□ El admin puede aprobar productores
□ El admin puede ver y gestionar pedidos
□ Las restricciones de envío a USA funcionan
□ La cotización de envío devuelve opciones reales
```

---

## ⚠ Bugs Conocidos que Afectarán las Pruebas

| Bug | Síntoma | Workaround temporal |
|-----|---------|-------------------|
| C-01 | Reembolso accesible sin rol admin | Probar manualmente para confirmar — agregar guard |
| C-02 | Stock no restaurado en cancelación | Restaurar manualmente via /inventario/:id/movimiento |
| C-04 | Guías con dirección incorrecta | En sandbox SkydropX puede no ser bloqueante |
| A-01 | Dashboard admin muestra $0 ingresos | Verificar SQL en admin.service.ts |
| A-03 | Sin paginación — endpoints lentos con muchos registros | OK para pruebas con pocos datos |
| C-05 | Sin rate limiting | No afecta funcionalidad básica en pruebas |
