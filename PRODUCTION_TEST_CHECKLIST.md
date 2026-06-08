# PRODUCTION TEST CHECKLIST
## Marketplace Residencia — Pruebas Pre-Producción

**Fecha:** 2026-06-07  
**Estado:** ⚠️ COMPLETAR ANTES DE CUALQUIER LANZAMIENTO  
**Referencia:** Ver `PRODUCTION_READINESS_REPORT.md` para contexto completo  

> **Instrucciones:** Cada prueba debe ser ejecutada en un ambiente de staging con datos reales de prueba. Marcar cada prueba como ✅ PASA / ❌ FALLA / ⚠️ PARCIAL. No lanzar a producción hasta que todas las pruebas de Prioridad 1 estén en ✅.

---

## MÓDULO 1: AUTENTICACIÓN Y JWT

### TEST-AUTH-01: Registro de usuario
**Objetivo:** Verificar que el registro funciona y produce tokens válidos  
**Pasos:**
1. `POST /auth/register` con email, password, nombre
2. Verificar que retorna `accessToken` y `refreshToken`
3. Decodificar el JWT (sin verificar firma) y confirmar que `exp - iat = 900` (15 min)
4. Confirmar que el hash del refresh token se almacenó en BD (no el token en texto plano)

**Resultado esperado:** Usuario creado, tokens válidos, refresh token hasheado en BD  
**Resultado encontrado:** [ ]

---

### TEST-AUTH-02: Rate limiting en login
**Objetivo:** Verificar que después de 10 intentos se bloquea el acceso  
**Pasos:**
1. Ejecutar 11 peticiones `POST /auth/login` con credenciales incorrectas en 60 segundos
2. Verificar que la petición 11 retorna HTTP 429

**Resultado esperado:** HTTP 429 en la petición 11  
**Resultado encontrado:** [ ]

---

### TEST-AUTH-03: JWT con variables de entorno vacías — CRÍTICO
**Objetivo:** Verificar que el servidor NO arranca si `JWT_ACCESS_SECRET` no está configurado  
**Pasos:**
1. Quitar `JWT_ACCESS_SECRET` del archivo `.env`
2. Intentar iniciar el servidor (`npm run start:dev`)
3. Verificar que el proceso falla con error claro

**Resultado esperado:** Error explícito al arrancar, no fallback silencioso a 'change-me-access-secret'  
**Resultado encontrado:** [ ]  
**NOTA:** Con el código actual este test FALLARÁ. La corrección debe aplicarse primero.

---

### TEST-AUTH-04: Refresh token después de logout
**Objetivo:** Verificar que el refresh token queda inválido después de logout  
**Pasos:**
1. Login → obtener `refreshToken`
2. `POST /auth/logout` con el refresh token
3. Intentar `POST /auth/refresh` con el mismo refresh token
4. Verificar respuesta de error

**Resultado esperado:** HTTP 401 o 403 al usar refresh token después de logout  
**Resultado encontrado:** [ ]

---

### TEST-AUTH-05: Token expirado rechazado
**Objetivo:** Verificar que tokens expirados no son aceptados  
**Pasos:**
1. Generar un token con expiración manipulada en el pasado (o esperar 16+ minutos)
2. Usar ese token en `GET /auth/me`
3. Verificar respuesta de error

**Resultado esperado:** HTTP 401 con mensaje de token expirado  
**Resultado encontrado:** [ ]

---

### TEST-AUTH-06: Reset de contraseña
**Objetivo:** Verificar flujo completo de recuperación de contraseña  
**Pasos:**
1. `POST /auth/password-reset/request` con email válido
2. Verificar que llega email con link de reset
3. Usar token del email en `POST /auth/password-reset/confirm`
4. Verificar que el refresh token anterior queda invalidado
5. Intentar usar el mismo token de reset por segunda vez

**Resultado esperado:** Reset exitoso, tokens anteriores inválidos, token de reset de un solo uso  
**Resultado encontrado:** [ ]

---

## MÓDULO 2: AUTORIZACIÓN Y RBAC — CRÍTICO

### TEST-RBAC-01: Endpoints de configuración requieren autenticación admin
**Objetivo:** Verificar que endpoints de configuración están protegidos  
**Pasos:**
1. `GET /configuracion/sistema/seed-all` SIN token → esperado: HTTP 401
2. `GET /configuracion/sistema/seed-all` CON token de usuario normal → esperado: HTTP 403
3. `GET /configuracion/sistema/seed-all` CON token de admin → esperado: HTTP 200

**Resultado esperado:** Solo admins acceden a seed endpoints  
**Resultado encontrado:** [ ]  
**NOTA:** Con el código actual este test FALLARÁ (endpoint público). Corrección requerida primero.

---

### TEST-RBAC-02: Asignación de roles requiere autenticación admin
**Objetivo:** Verificar que un usuario normal no puede escalar privilegios  
**Pasos:**
1. Registrar usuario normal (rol: cliente)
2. `POST /usuarios/1/roles` con `{ id_rol: 1 }` usando token del usuario normal
3. Verificar respuesta de error

**Resultado esperado:** HTTP 401 o 403  
**Resultado encontrado:** [ ]  
**NOTA:** Con el código actual este test FALLARÁ. Corrección requerida primero.

---

### TEST-RBAC-03: Usuario no puede ver/modificar datos de otro usuario
**Objetivo:** Verificar IDOR en módulo de usuarios  
**Pasos:**
1. Usuario A hace login, obtiene token
2. `GET /usuarios/[ID_USUARIO_B]` con token de A → verificar si retorna datos
3. `PATCH /usuarios/[ID_USUARIO_B]` con token de A → verificar si actualiza

**Resultado esperado:** HTTP 403 en ambos casos  
**Resultado encontrado:** [ ]  
**NOTA:** Con el código actual este test FALLARÁ. Corrección requerida primero.

---

### TEST-RBAC-04: Productor no puede modificar perfil de otro productor
**Objetivo:** Verificar IDOR en módulo de productores  
**Pasos:**
1. Productor A hace login
2. `PATCH /productores/[ID_PRODUCTOR_B]` con token de A
3. Verificar respuesta

**Resultado esperado:** HTTP 403  
**Resultado encontrado:** [ ]

---

### TEST-RBAC-05: Audit logs accesibles solo para administradores
**Objetivo:** Verificar que logs de auditoría son privados  
**Pasos:**
1. `GET /auditoria` SIN token → esperado: HTTP 401
2. `GET /auditoria` CON token de cliente → esperado: HTTP 403
3. `GET /auditoria` CON token de admin → esperado: HTTP 200

**Resultado esperado:** Solo admins acceden a auditoría  
**Resultado encontrado:** [ ]  
**NOTA:** Con el código actual este test FALLARÁ. Corrección requerida primero.

---

## MÓDULO 3: FLUJO COMPLETO DE COMPRA

### TEST-FLOW-01: Visitante → Registro → Login
**Objetivo:** Flujo de onboarding funcional  
**Pasos:**
1. Acceder al marketplace sin cuenta
2. Intentar agregar producto al carrito → verificar redirección a login
3. Registrarse con email/password
4. Confirmar email si aplica
5. Login exitoso

**Resultado esperado:** Flujo sin errores, carrito preservado después de login  
**Resultado encontrado:** [ ]

---

### TEST-FLOW-02: Carrito → Checkout — Precio no manipulable
**Objetivo:** Verificar que el precio final viene del backend, no del frontend  
**Pasos:**
1. Agregar producto ($500 MXN) al carrito
2. Interceptar petición de checkout con devtools/proxy
3. Modificar el campo `subtotal` a $1 en la petición
4. Verificar respuesta del backend

**Resultado esperado:** Error de validación — backend rechaza subtotal manipulado  
**Resultado encontrado:** [ ]

---

### TEST-FLOW-03: Carrito con cantidad mayor al stock
**Objetivo:** Verificar que el sistema maneja intentos de compra sobre el stock disponible  
**Pasos:**
1. Producto con stock = 5
2. Agregar 10 unidades al carrito
3. Proceder al checkout
4. Verificar comportamiento

**Resultado esperado:** Error claro indicando stock insuficiente antes o durante checkout  
**Resultado encontrado:** [ ]  
**NOTA:** Con el código actual, el carrito permite agregar 10 unidades. El error solo ocurre en checkout.

---

### TEST-FLOW-04: Checkout → Stripe → Confirmación
**Objetivo:** Flujo completo de pago con Stripe exitoso  
**Pasos:**
1. Agregar producto al carrito
2. Ingresar dirección de entrega
3. Seleccionar método de envío
4. Pagar con tarjeta de prueba Stripe `4242 4242 4242 4242`
5. Verificar que se genera el pedido con estado correcto
6. Verificar que el inventario se decrementó
7. Verificar que se envía email de confirmación

**Resultado esperado:** Pedido creado, inventario decrementado, email enviado  
**Resultado encontrado:** [ ]

---

### TEST-FLOW-05: Stripe webhook duplicado
**Objetivo:** Verificar idempotencia de webhooks  
**Pasos:**
1. Completar un pago exitoso (TEST-FLOW-04)
2. Enviar el mismo evento de webhook `payment_intent.succeeded` por segunda vez
3. Verificar en BD que el pago NO fue procesado dos veces

**Resultado esperado:** Segundo webhook ignorado (idempotencia), transfers no duplicados  
**Resultado encontrado:** [ ]

---

### TEST-FLOW-06: Checkout → PayPal → Confirmación
**Objetivo:** Flujo completo de pago con PayPal  
**Pasos:**
1. Seleccionar PayPal en checkout
2. Completar pago en sandbox de PayPal
3. Verificar webhook recibido y procesado
4. Verificar estado del pedido

**Resultado esperado:** Pedido confirmado, misma experiencia que Stripe  
**Resultado encontrado:** [ ]

---

### TEST-FLOW-07: Pago fallido — Experiencia de usuario
**Objetivo:** Verificar que un pago rechazado no deja estados inconsistentes  
**Pasos:**
1. Usar tarjeta de prueba `4000 0000 0000 0002` (forzar decline)
2. Verificar que el pedido queda en estado pendiente/fallido
3. Verificar que el inventario NO fue decrementado
4. Verificar que el usuario puede intentar pagar de nuevo

**Resultado esperado:** Estado limpio, inventario sin cambios, reintento posible  
**Resultado encontrado:** [ ]

---

### TEST-FLOW-08: Cancelación y reembolso
**Objetivo:** Verificar flujo completo de reembolso  
**Pasos:**
1. Completar pedido (TEST-FLOW-04)
2. Admin ejecuta `POST /pagos/:id/reembolso`
3. Verificar que Stripe procesa el reembolso
4. Verificar que el inventario se restaura
5. Intentar hacer segundo reembolso del mismo pago
6. Verificar error en segundo intento

**Resultado esperado:** Reembolso único, inventario restaurado, error en duplicado  
**Resultado encontrado:** [ ]

---

## MÓDULO 4: INVENTARIO

### TEST-INV-01: Compra simultánea del último item
**Objetivo:** Verificar que no hay sobreventa bajo carga concurrente  
**Pasos:**
1. Crear producto con stock = 1
2. Lanzar 10 peticiones simultáneas de checkout para el mismo producto
3. Verificar que exactamente 1 pedido fue creado exitosamente
4. Verificar que el stock final es 0, no negativo

**Resultado esperado:** Solo 1 compra exitosa, stock = 0  
**Resultado encontrado:** [ ]  
**Script sugerido:**
```bash
for i in {1..10}; do
  curl -X POST https://api/pedidos/ID/detalle \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"id_producto": X, "cantidad": 1}' &
done
wait
```

---

### TEST-INV-02: Cancelación restaura stock correctamente
**Objetivo:** Verificar que cancelar pedido devuelve stock  
**Pasos:**
1. Producto con stock = 10
2. Comprar 3 unidades → stock debería ser 7
3. Admin cancela/reembolsa el pedido
4. Verificar que stock vuelve a 10

**Resultado esperado:** Stock restaurado a 10  
**Resultado encontrado:** [ ]

---

## MÓDULO 5: ENVÍOS

### TEST-SHIP-01: Cotización con producto sin dimensiones
**Objetivo:** Verificar comportamiento cuando producto no tiene largo_cm/ancho_cm/alto_cm  
**Pasos:**
1. Crear producto sin llenar campos de dimensiones
2. Agregar al carrito y proceder a checkout
3. Solicitar cotización de envío
4. Comparar precio cotizado con precio real aproximado del carrier

**Resultado esperado:** Sistema alerta que faltan dimensiones O usa fallback razonable claramente documentado  
**Resultado encontrado:** [ ]

---

### TEST-SHIP-02: Envío multiproductor (2 vendedores)
**Objetivo:** Verificar cotización correcta con productos de 2 productores distintos  
**Pasos:**
1. Agregar producto de Productor A al carrito
2. Agregar producto de Productor B al carrito
3. Proceder a cotización de envío
4. Verificar que se cotiza envío DESDE la dirección de cada productor
5. Verificar que el total de envío es la suma correcta

**Resultado esperado:** Cotización independiente por productor, suma correcta  
**Resultado encontrado:** [ ]

---

### TEST-SHIP-03: Restricción de envío de alcohol — Detección temprana
**Objetivo:** Verificar que restricciones se detectan ANTES del pago  
**Pasos:**
1. Configurar dirección de entrega en estado/país con restricción de alcohol
2. Agregar botella de mezcal al carrito
3. Proceder al checkout
4. Verificar cuándo aparece el error de restricción (¿en cotización o en creación de guía?)

**Resultado esperado:** Error de restricción ANTES de mostrar métodos de pago  
**Resultado encontrado:** [ ]  
**NOTA:** Con el código actual, el error aparece al crear la guía (después del pago).

---

### TEST-SHIP-04: Tracking de envío — Control de acceso
**Objetivo:** Verificar que un usuario no puede ver el tracking de otro  
**Pasos:**
1. Usuario A completa un pedido con envío
2. Usuario B intenta `GET /envios/[ID_ENVIO_DE_A]/tracking`
3. Verificar respuesta

**Resultado esperado:** HTTP 403  
**Resultado encontrado:** [ ]

---

## MÓDULO 6: SEGURIDAD

### TEST-SEC-01: XSS en nombre de producto
**Objetivo:** Verificar que inputs maliciosos son sanitizados  
**Pasos:**
1. Crear producto con nombre: `<script>alert(document.cookie)</script>`
2. Navegar al catálogo
3. Verificar que el script NO se ejecuta (el texto se muestra escapado)

**Resultado esperado:** El texto aparece literal, sin ejecución de JS  
**Resultado encontrado:** [ ]  
**NOTA:** Con el código actual este test FALLARÁ si el frontend usa innerHTML.

---

### TEST-SEC-02: Manipulación de estado de pago — CRÍTICO
**Objetivo:** Verificar que solo webhooks pueden marcar pagos como completados  
**Pasos:**
1. Usuario autenticado (no admin) ejecuta:
   ```bash
   POST /pagos -H "Authorization: Bearer $USER_TOKEN" \
     -d '{"id_pedido": X, "estado": "completado", "monto": 0.01}'
   ```
2. Verificar respuesta

**Resultado esperado:** HTTP 403 — solo administradores o webhooks pueden crear pagos  
**Resultado encontrado:** [ ]  
**NOTA:** Con el código actual este test FALLARÁ.

---

### TEST-SEC-03: Upload de archivo enorme — DoS
**Objetivo:** Verificar que el servidor rechaza archivos muy grandes  
**Pasos:**
1. Crear archivo de 10 MB
2. `POST /archivos/upload` con token válido
3. Verificar respuesta

**Resultado esperado:** HTTP 413 Entity Too Large o similar  
**Resultado encontrado:** [ ]  
**NOTA:** Con el código actual el servidor aceptará el archivo (o crasheará con archivos muy grandes).

---

### TEST-SEC-04: Rate limiting global
**Objetivo:** Verificar que el rate limiting global funciona  
**Pasos:**
1. Ejecutar 130 peticiones a cualquier endpoint en 60 segundos
2. Verificar que la petición 121+ retorna HTTP 429

**Resultado esperado:** HTTP 429 después de 120 requests/60s  
**Resultado encontrado:** [ ]

---

### TEST-SEC-05: SQL Injection en búsqueda de productos
**Objetivo:** Verificar que no hay SQL injection  
**Pasos:**
1. `GET /productos?search='; DROP TABLE productos; --`
2. Verificar que la BD sigue intacta

**Resultado esperado:** Respuesta normal (Prisma usa queries parametrizados), BD intacta  
**Resultado encontrado:** [ ]

---

### TEST-SEC-06: Comisión negativa no permitida
**Objetivo:** Verificar que no se pueden crear comisiones negativas  
**Pasos:**
1. Como admin: `POST /comisiones` con `{ porcentaje: -0.5 }`
2. Verificar respuesta

**Resultado esperado:** Error de validación — porcentaje debe ser >= 0  
**Resultado encontrado:** [ ]  
**NOTA:** Con el código actual este test FALLARÁ.

---

## MÓDULO 7: IMPUESTOS Y MONEDA

### TEST-TAX-01: IVA calculado en backend — No manipulable
**Objetivo:** Verificar que el cliente no puede enviar un monto de impuesto falso  
**Pasos:**
1. Interceptar petición de creación de Stripe intent
2. Modificar campo de impuesto a 0
3. Verificar que el backend recalcula el impuesto real

**Resultado esperado:** Backend ignora el impuesto del cliente y calcula el real  
**Resultado encontrado:** [ ]

---

### TEST-TAX-02: IVA correcto para pedido nacional (México)
**Objetivo:** Verificar cálculo de IVA para pedido MX → MX  
**Pasos:**
1. Usuario con dirección en México
2. Producto de $100 MXN
3. Verificar que el impuesto calculado es $16 MXN (IVA 16%)

**Resultado esperado:** IVA = 16%, total = $116 MXN  
**Resultado encontrado:** [ ]

---

### TEST-TAX-03: Pedido internacional — Sin IVA, con clasificación correcta
**Objetivo:** Verificar que exportaciones no aplican IVA mexicano  
**Pasos:**
1. Dirección de entrega en USA
2. Verificar que no se aplica IVA del 16%
3. Verificar que se aplica la tasa correcta según `tasas_impuesto` para USA

**Resultado esperado:** Impuesto diferente para exportación  
**Resultado encontrado:** [ ]

---

## MÓDULO 8: MULTIPRODUCTOR

### TEST-MULTI-01: Pedido con 2 productores — División de pago
**Objetivo:** Verificar distribución correcta entre 2 productores  
**Pasos:**
1. Agregar producto A ($300) de Productor 1
2. Agregar producto B ($200) de Productor 2
3. Completar pedido ($500 + envío + impuesto)
4. Verificar en BD que `pedido_productor` tiene 2 registros
5. Verificar que `monto_neto_productor` de P1 + P2 + comisiones = total - envío

**Resultado esperado:** División correcta, sin pérdida de dinero en la suma  
**Resultado encontrado:** [ ]

---

### TEST-MULTI-02: Transfer a productor onboardeado
**Objetivo:** Verificar que solo productores con Stripe Connect onboardeado reciben transfer  
**Pasos:**
1. Productor 1: onboardeado en Stripe Connect
2. Productor 2: NO onboardeado
3. Completar pedido con ambos
4. Verificar que P1 recibe transfer en Stripe
5. Verificar que P2 recibe notificación pendiente de onboarding

**Resultado esperado:** Transfer solo para P1, notificación para P2  
**Resultado encontrado:** [ ]

---

## MÓDULO 9: INFRAESTRUCTURA

### TEST-INFRA-01: Variables de entorno críticas validadas al inicio
**Objetivo:** Verificar que el servidor no arranca con configuración incompleta  
**Pasos:**
1. Quitar `STRIPE_WEBHOOK_SECRET` del .env
2. Intentar iniciar el servidor
3. Verificar error

**Resultado esperado:** Error explícito al arrancar  
**Resultado encontrado:** [ ]

---

### TEST-INFRA-02: Secretos no expuestos en respuestas de API
**Objetivo:** Verificar que respuestas de API no contienen secretos  
**Pasos:**
1. `GET /configuracion/sistema` (si tiene datos sensibles)
2. `GET /usuarios/:id`
3. `GET /productores/:id`
4. Verificar que las respuestas no contienen hashes de contraseña, tokens, o claves API

**Resultado esperado:** Ningún secreto en las respuestas  
**Resultado encontrado:** [ ]

---

### TEST-INFRA-03: Logs no contienen PII
**Objetivo:** Verificar que los logs del servidor no contienen datos de usuarios  
**Pasos:**
1. Ejecutar un flujo completo de login y compra
2. Revisar la salida de logs del servidor
3. Buscar emails, nombres, direcciones en los logs

**Resultado esperado:** Logs estructurados sin PII  
**Resultado encontrado:** [ ]  
**NOTA:** Con el código actual hay console.log con datos de usuario.

---

## RESUMEN DE PRUEBAS

| Módulo | Total Tests | Críticos | Estado |
|--------|------------|----------|--------|
| Autenticación | 6 | 1 | ⏳ Pendiente |
| Autorización RBAC | 5 | 5 | ⏳ Pendiente |
| Flujo de Compra | 8 | 3 | ⏳ Pendiente |
| Inventario | 2 | 1 | ⏳ Pendiente |
| Envíos | 4 | 2 | ⏳ Pendiente |
| Seguridad | 6 | 4 | ⏳ Pendiente |
| Impuestos | 3 | 1 | ⏳ Pendiente |
| Multiproductor | 2 | 1 | ⏳ Pendiente |
| Infraestructura | 3 | 1 | ⏳ Pendiente |
| **TOTAL** | **39** | **19** | ⏳ Pendiente |

---

## CRITERIO DE APROBACIÓN

**Para lanzamiento mínimo seguro:** Todos los 19 tests críticos en ✅ PASA  
**Para lanzamiento recomendado:** Los 39 tests en ✅ PASA  

> Tests marcados con "NOTA: Con el código actual este test FALLARÁ" requieren  
> que las correcciones del `PRODUCTION_READINESS_REPORT.md` sean aplicadas primero.

---

*Checklist generado el 2026-06-07*
