# PLAN DE PRUEBAS — Marketplace-Residencia
> Generado el 2026-06-06. Basado en análisis directo del código fuente.

---

## Convenciones

- **Estado**: ✅ Pasaría | ⚠ Warning (funciona con limitaciones) | ❌ Fallaría (bug conocido) | 🔲 No probado aún
- **Precondición**: Variables de entorno configuradas, servidor en localhost:3001 y localhost:3000, BD con seed de roles y comisión global activa.

---

## 1. USUARIOS

---

### TC-USR-001: Registro exitoso

**Objetivo**: Verificar que un usuario puede registrarse con email y contraseña.

**Precondiciones**: Email no registrado previamente. Rol `cliente` en BD.

**Pasos**:
1. `POST /auth/register` con `{ nombre, email, password, apellido_paterno }`
2. Verificar respuesta 201 con `accessToken` y `refreshToken`
3. Verificar que se crea usuario en BD con rol `cliente`
4. Verificar email de bienvenida recibido (si SendGrid configurado)

**Resultado esperado**: Usuario creado, tokens válidos, rol cliente asignado.

**Estado**: ✅

---

### TC-USR-002: Registro con email duplicado

**Objetivo**: Verificar que el sistema rechaza emails duplicados.

**Pasos**:
1. Registrar usuario con email@test.com
2. Intentar registrar nuevamente con el mismo email

**Resultado esperado**: 409 Conflict `"Ya existe un usuario con ese email"`.

**Estado**: ✅

---

### TC-USR-003: Login exitoso

**Objetivo**: Verificar login con credenciales correctas.

**Pasos**:
1. `POST /auth/login` con `{ email, password }`
2. Verificar tokens en respuesta
3. Verificar `GET /auth/me` con el access token

**Resultado esperado**: 200 con `{ accessToken, refreshToken, usuario }`.

**Estado**: ✅

---

### TC-USR-004: Login con contraseña incorrecta

**Objetivo**: Verificar rechazo de credenciales inválidas.

**Pasos**:
1. `POST /auth/login` con email correcto y password incorrecto

**Resultado esperado**: 401 Unauthorized.

**Estado**: ✅

---

### TC-USR-005: Recuperación de contraseña

**Objetivo**: Verificar flujo completo de reset.

**Pasos**:
1. `POST /auth/request-password-reset` con email válido
2. Recibir email con link (contiene token JWT temporal)
3. `POST /auth/reset-password` con token y nueva contraseña
4. Login con nueva contraseña

**Resultado esperado**: Contraseña cambiada, login exitoso.

**Estado**: ✅

---

### TC-USR-006: Token expirado

**Objetivo**: Verificar que tokens expirados son rechazados.

**Pasos**:
1. Generar access token
2. Esperar 15 minutos (o manipular exp en JWT de prueba)
3. Hacer llamada autenticada

**Resultado esperado**: 401 `"Token inválido o expirado"`.

**Estado**: ✅

---

### TC-USR-007: Refresh de token

**Objetivo**: Verificar rotación de tokens.

**Pasos**:
1. Login y obtener `refreshToken`
2. `POST /auth/refresh` con el refreshToken
3. Verificar nuevos tokens en respuesta
4. Verificar que el refresh token anterior ya no funciona

**Resultado esperado**: Nuevos tokens válidos, token anterior invalidado.

**Estado**: ✅

---

## 2. PRODUCTOS

---

### TC-PROD-001: Crear producto como productor

**Objetivo**: Verificar creación de producto con imágenes.

**Precondiciones**: Usuario con rol `productor` y estado `aprobado`. Tienda creada.

**Pasos**:
1. `POST /productos` con `{ nombre, descripcion, precio_base, id_tienda, peso_kg, alto_cm, ancho_cm, largo_cm }`
2. `POST /productos/:id/imagenes` — Subir imagen JPG
3. `GET /productos/:id` — Verificar producto creado con imagen

**Resultado esperado**: Producto activo con imagen. Visible en catálogo público.

**Estado**: ✅

---

### TC-PROD-002: Catálogo público con filtros

**Objetivo**: Verificar que el catálogo devuelve productos correctamente filtrados.

**Pasos**:
1. `GET /productos?busqueda=mezcal` — buscar por texto
2. `GET /productos?precioMin=100&precioMax=500` — filtrar por rango de precio
3. `GET /productos?maguey=espadín` — filtrar por tipo (requiere metadatos)

**Resultado esperado**: Lista paginada de productos activos que coincidan.

**Estado**: ⚠ (No hay paginación — C-A-03)

---

### TC-PROD-003: Editar producto

**Objetivo**: Verificar que el productor puede editar solo sus productos.

**Pasos**:
1. `PATCH /productos/:id` como productor dueño — debería funcionar
2. `PATCH /productos/:id` como otro productor — debería rechazar

**Resultado esperado**: 200 para dueño, 403 para otro productor.

**Estado**: ✅

---

### TC-PROD-004: Eliminar producto (soft delete)

**Objetivo**: Verificar soft delete.

**Pasos**:
1. `DELETE /productos/:id`
2. Verificar que `eliminado_en` se establece en BD
3. Verificar que no aparece en catálogo público
4. Verificar que los pedidos existentes con el producto aún son válidos

**Resultado esperado**: Producto no visible en catálogo. BD retiene registro.

**Estado**: ✅

---

### TC-PROD-005: Producto con restricción de edad

**Objetivo**: Verificar que producto de mezcal requiere verificación de edad en checkout.

**Precondiciones**: Producto en categoría con `requiere_edad_minima = 18`. Usuario sin `fecha_nacimiento` registrada.

**Pasos**:
1. Agregar producto al carrito
2. Crear pedido y detalle
3. `POST /pagos/stripe/intent`

**Resultado esperado**: 400 con `code: 'AGE_DOB_REQUIRED'`.

**Estado**: ✅

---

### TC-PROD-006: Intentar actualizar inventario a negativo

**Objetivo**: Verificar protección contra stock negativo.

**Pasos**:
1. Producto con stock=5
2. Intentar agregar 10 unidades al pedido

**Resultado esperado**: 400 `"Stock insuficiente"`.

**Estado**: ✅

---

## 3. CARRITO

---

### TC-CART-001: Agregar producto al carrito (autenticado)

**Objetivo**: Verificar que usuario autenticado puede agregar productos.

**Pasos**:
1. Login y obtener token
2. `POST /carrito` con `{ id_usuario, id_producto, cantidad, precio_unitario_snapshot }`
3. `GET /carrito/:id_usuario` — verificar ítem

**Resultado esperado**: Ítem en carrito con precio snapshot.

**Estado**: ✅

---

### TC-CART-002: Carrito para invitado (sin login)

**Objetivo**: Verificar comportamiento sin autenticación.

**Pasos**:
1. `POST /carrito` sin Bearer token

**Resultado esperado**: ⚠ 401 desde el API. El carrito de invitado existe solo en el frontend (localStorage/context). Al hacer login, el frontend debe sincronizar manualmente.

**Estado**: ⚠ (Sin fusión automática — el carrito del invitado se pierde si el usuario no estaba logueado en el frontend)

---

### TC-CART-003: Upsert — agregar producto ya existente

**Objetivo**: Verificar que agregar el mismo producto incrementa cantidad.

**Pasos**:
1. Agregar producto A con cantidad=1
2. Agregar producto A con cantidad=2
3. Verificar carrito

**Resultado esperado**: Ítem con cantidad=3 (upsert con incremento).

**Estado**: ✅

---

### TC-CART-004: Persistencia del carrito entre sesiones

**Objetivo**: Verificar que el carrito persiste después de cerrar sesión.

**Pasos**:
1. Agregar productos al carrito
2. Logout y login de nuevo
3. `GET /carrito/:id_usuario`

**Resultado esperado**: Ítems del carrito intactos (persisten en BD).

**Estado**: ✅

---

## 4. WISHLIST

---

### TC-WISH-001: Agregar a wishlist (autenticado)

**Pasos**:
1. `POST /wishlist` con `{ id_usuario, id_producto }`
2. `GET /wishlist/:id_usuario` — verificar ítem

**Resultado esperado**: Producto en wishlist.

**Estado**: ✅

---

### TC-WISH-002: Wishlist para invitado

**Pasos**:
1. `POST /wishlist` sin token

**Resultado esperado**: 401. La wishlist de invitados solo existe en frontend.

**Estado**: ⚠ (Sin fusión automática)

---

### TC-WISH-003: Intentar acceder a wishlist de otro usuario

**Pasos**:
1. Usuario A intenta `GET /wishlist/:id_usuario_B`

**Resultado esperado**: 403 Forbidden.

**Estado**: ✅

---

## 5. CHECKOUT

---

### TC-CHCK-001: Checkout exitoso — un vendedor, Stripe

**Precondiciones**: Usuario autenticado con fecha_nacimiento si hay productos +18. Dirección de envío registrada. Stripe en modo test.

**Pasos**:
1. Carrito con productos de 1 productor
2. `POST /pedidos` — Crear pedido
3. `POST /pedidos/:id/detalles` — Agregar ítems (verifica precio/stock)
4. `GET /pedidos/:id/cotizar` — Obtener cotizaciones de envío
5. `POST /pagos/stripe/intent` — Crear PaymentIntent con subtotal + shipping
6. Confirmar con Stripe.js en frontend usando tarjeta de prueba `4242 4242 4242 4242`
7. Esperar webhook `payment_intent.succeeded`
8. Verificar pedido en estado `pagado`

**Resultado esperado**: Pedido pagado, stock decrementado, email enviado, notificación al productor.

**Estado**: ✅ (si todas las variables de entorno están configuradas)

---

### TC-CHCK-002: Checkout con dos vendedores

**Precondiciones**: Carrito con productos de 2 productores distintos.

**Pasos**:
1. Crear pedido con ítems de productor A y productor B
2. Verificar que `pedido_productor` tiene 2 registros (uno por productor)
3. Completar pago
4. Verificar que el monto se distribuye entre los 2 productores con comisión aplicada
5. Verificar envíos separados por productor post-pago

**Resultado esperado**: Distribución proporcional correcta. 2 envíos independientes.

**Estado**: ✅ lógica / ❌ envíos (dirección remitente hardcodeada — C-04)

---

### TC-CHCK-003: Checkout con tres vendedores

**Pasos**:
1. Carrito con ítems de 3 productores
2. Flujo completo de checkout
3. Verificar tabla `pedido_productor` — 3 registros con suma correcta

**Resultado esperado**: Distribución correcta entre 3 productores.

**Estado**: ✅ lógica / ❌ envíos (C-04)

---

### TC-CHCK-004: Manipulación de precio desde frontend

**Objetivo**: Verificar que el backend rechaza precios manipulados.

**Pasos**:
1. Obtener producto con precio=100
2. `POST /pedidos/:id/detalles` con `precio_compra: 1` (precio manipulado)

**Resultado esperado**: 400 `"El precio del producto no es válido"`.

**Estado**: ✅

---

### TC-CHCK-005: Checkout con envío a estado USA restrictivo

**Precondiciones**: Tabla `restricciones_envio_categoria` con registro para un estado USA que bloquea mezcal.

**Pasos**:
1. Dirección de envío en estado USA bloqueado
2. `POST /pedidos/:id/validar-envio` con los items

**Resultado esperado**: `{ valido: false, items_bloqueados: [...] }`.

**Estado**: ✅

---

### TC-CHCK-006: Checkout con PayPal

**Pasos**:
1. `POST /pagos/paypal/order` — Crear order PayPal
2. Redirigir al usuario a la URL de aprobación
3. `POST /pagos/paypal/capture` — Capturar
4. Verificar pedido en estado `pagado`

**Resultado esperado**: Pago capturado, pedido confirmado.

**Estado**: ✅

---

## 6. PAGOS

---

### TC-PAY-001: Pago exitoso vía webhook Stripe

**Pasos**:
1. Simular webhook `payment_intent.succeeded` con `stripe trigger payment_intent.succeeded`
2. Verificar deduplicación (segunda entrega del mismo evento)

**Resultado esperado**: Primer evento procesa. Segundo evento retorna 200 sin re-procesar.

**Estado**: ✅

---

### TC-PAY-002: Pago fallido

**Pasos**:
1. Usar tarjeta de prueba `4000 0000 0000 0002` (siempre falla)
2. Verificar webhook `payment_intent.payment_failed`
3. Verificar pedido en estado `pendiente` (no `pagado`)

**Resultado esperado**: Pedido no avanza, stock restaurado.

**Estado**: ⚠ — El pedido vuelve a `pendiente` pero el stock YA fue decrementado al agregar el detalle. No se restaura en webhook fallido.

---

### TC-PAY-003: Reembolso (admin)

**Pasos**:
1. Admin llama `POST /pagos/:id/reembolso`
2. Verificar que Stripe procesa el reembolso
3. Verificar que `pagos.estado = 'reembolsado'`
4. Verificar que `pedidos.estado = 'cancelado'`

**Resultado esperado**: Reembolso procesado, estados actualizados.

**Estado**: ✅ (solo si caller es admin — actualmente cualquier usuario puede hacerlo: C-01)

---

### TC-PAY-004: Reembolso sin autorización

**Pasos**:
1. Usuario cliente llama `POST /pagos/:id/reembolso` de cualquier pago

**Resultado esperado**: 403 Forbidden.

**Estado**: ❌ (Bug C-01 — actualmente responde 200 si el pago existe)

---

### TC-PAY-005: Retry de transfer fallido

**Pasos**:
1. Productor sin onboarding Stripe completo
2. Completar pedido (pago + entrega)
3. Verificar que se crea payout en estado `fallido` (no `procesado`)
4. Completar onboarding del productor
5. Esperar 15 min para el cron de retry
6. Verificar que payout cambia a `procesado`

**Resultado esperado**: Transfer ejecutado en retry.

**Estado**: ✅

---

## 7. ENVÍOS

---

### TC-ENV-001: Cotización de envío nacional (México)

**Pasos**:
1. Pedido con dirección en Ciudad de México (CP 06600)
2. `GET /pedidos/:id/cotizar`
3. Verificar respuesta con opciones de carriers y precios

**Resultado esperado**: Al menos 1 opción de envío con precio y tiempo estimado.

**Estado**: ✅ (si SKYDROPX_CLIENT_ID configurado)

---

### TC-ENV-002: Cotización internacional (USA)

**Pasos**:
1. Pedido con dirección en Texas, USA
2. `GET /pedidos/:id/cotizar`

**Resultado esperado**: Opciones de envío internacional.

**Estado**: ⚠ (Funciona solo si SkydropX soporta el destino — verificar disponibilidad)

---

### TC-ENV-003: Generación de guía post-pago

**Pasos**:
1. Completar pago de pedido
2. Verificar que `crearGuiasPostPago` se ejecuta automáticamente
3. Verificar que `envio_guias` tiene registro con `numero_guia`

**Resultado esperado**: Guía generada automáticamente. Pedido en estado `label_purchased`.

**Estado**: ❌ (Bug C-04: dirección de remitente hardcodeada)

---

### TC-ENV-004: Envío con producto alcohólico — firma de adulto

**Pasos**:
1. Pedido con mezcal (requiere_firma_adulto=true)
2. Verificar campo `requires_adult_signature = true` en envio

**Resultado esperado**: Guía incluye requerimiento de firma adulto.

**Estado**: ✅ (detectado correctamente en `detectarFirmaAdulto`)

---

## 8. ADMINISTRACIÓN

---

### TC-ADM-001: Dashboard de estadísticas

**Pasos**:
1. Admin llama `GET /admin/stats`
2. Verificar totales de usuarios, productores, pedidos, ingresos

**Resultado esperado**: Números correctos.

**Estado**: ❌ (Bug A-01: ingresos solo suma estados `completado`/`enviado`, no `pagado`)

---

### TC-ADM-002: Aprobar solicitud de productor

**Pasos**:
1. Usuario solicita ser productor → estado `pendiente`
2. Admin llama `POST /productores/:id/revisar` con `{ estado: 'aprobado' }`
3. Verificar notificación al productor
4. Verificar que el usuario ahora tiene acceso al dashboard de productor

**Resultado esperado**: Productor aprobado, notificación enviada.

**Estado**: ✅

---

### TC-ADM-003: Rechazar solicitud de productor

**Pasos**:
1. `POST /productores/:id/revisar` con `{ estado: 'rechazado', motivo_rechazo: '...' }`

**Resultado esperado**: Productor rechazado, notificación con motivo.

**Estado**: ✅

---

### TC-ADM-004: Gestión de comisiones

**Pasos**:
1. Crear comisión global: `POST /comisiones` con `{ alcance: 'global', porcentaje: 0.10 }`
2. Crear comisión por productor: `{ alcance: 'productor', id_productor: X, porcentaje: 0.07 }`
3. Verificar que el productor X paga 7% y el resto paga 10%

**Resultado esperado**: Comisión correcta aplicada según prioridad.

**Estado**: ✅

---

### TC-ADM-005: Gestión de payouts

**Pasos**:
1. Pedido entregado → payout creado automáticamente
2. Admin ve lista de payouts
3. Admin marca payout como `aprobado`

**Resultado esperado**: Payout procesado.

**Estado**: ✅

---

### TC-ADM-006: Eliminar usuario

**Pasos**:
1. Admin llama `DELETE /usuarios/:id`
2. Verificar soft delete (`eliminado_en` establecido)
3. Verificar que el usuario no puede hacer login

**Resultado esperado**: Usuario deshabilitado.

**Estado**: ✅

---

## 9. SEGURIDAD

---

### TC-SEC-001: Acceso sin token

**Pasos**:
1. Llamar endpoint protegido sin token

**Resultado esperado**: 401 `"Token requerido"`.

**Estado**: ✅

---

### TC-SEC-002: Acceso con rol insuficiente

**Pasos**:
1. Cliente intenta acceder a endpoint de admin

**Resultado esperado**: 403 Forbidden.

**Estado**: ✅ (en endpoints con RbacGuard) / ❌ para endpoints solo con AuthGuard

---

### TC-SEC-003: SQL injection en búsqueda

**Pasos**:
1. `GET /productos?busqueda='; DROP TABLE productos; --`

**Resultado esperado**: Búsqueda tratada como texto literal (Prisma usa queries parametrizadas).

**Estado**: ✅

---

### TC-SEC-004: Ataque de fuerza bruta en login

**Pasos**:
1. 50 intentos de login fallidos consecutivos en 60 segundos

**Resultado esperado**: Rate limiting bloquea solicitudes después del límite.

**Estado**: ❌ (Bug C-05: Sin rate limiting)

---

### TC-SEC-005: Duplicar webhook de pago

**Pasos**:
1. Enviar el mismo evento de Stripe dos veces con el mismo `event_id`

**Resultado esperado**: Solo el primero se procesa. Segundo retorna 200 sin side effects.

**Estado**: ✅

---

## Resumen de Estados

| Área | Total | ✅ | ⚠ | ❌ |
|------|-------|---|---|---|
| Usuarios | 7 | 7 | 0 | 0 |
| Productos | 6 | 5 | 1 | 0 |
| Carrito | 4 | 3 | 1 | 0 |
| Wishlist | 3 | 2 | 1 | 0 |
| Checkout | 6 | 4 | 1 | 1 |
| Pagos | 5 | 3 | 1 | 1 |
| Envíos | 4 | 2 | 1 | 1 |
| Administración | 6 | 5 | 0 | 1 |
| Seguridad | 5 | 3 | 0 | 2 |
| **TOTAL** | **46** | **34** | **6** | **6** |
