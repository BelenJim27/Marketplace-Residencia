# AUDITORÍA DE SISTEMA — Marketplace-Residencia
> Generado el 2026-06-06. Basado en análisis directo del código fuente.

---

## CRÍTICOS — Impiden vender o causan pérdida de datos

---

### C-01: Reembolso accesible por cualquier usuario autenticado

**Descripción**: El endpoint `POST /pagos/:id/reembolso` solo tiene `@UseGuards(AuthGuard)`. Cualquier usuario autenticado que conozca el ID del pago puede iniciar un reembolso completo.

**Evidencia**:
```typescript
// apps/api/src/modules/pagos/pagos.controller.ts:111
@UseGuards(AuthGuard)
@Post(':id/reembolso')
reembolsarPago(@Param('id') id: string) {
  return this.service.reembolsarPago(id);
}
```
No hay verificación de rol admin ni de propiedad del pedido.

**Impacto**: Pérdida directa de ingresos. Un cliente malicioso puede reembolsar pedidos de otros usuarios.

**Solución**: Agregar guard de rol Admin: `@UseGuards(AuthGuard, RbacGuard) @Roles('admin')` o verificar que `pedido.id_usuario === req.user.id_usuario`.

---

### C-02: Sin restauración de stock al cancelar/eliminar ítem de pedido

**Descripción**: Cuando se elimina un detalle de pedido (`DELETE /pedidos/:id/detalles/:id_detalle`) o se cancela un pedido, el stock **no se restaura**. Solo se registra auditoria.

**Evidencia**:
```typescript
// apps/api/src/modules/pedidos/pedidos.service.ts:637
async removeDetalle(id_detalle: string) {
  const id_detalle_big = toBigIntId(id_detalle);
  await this.prisma.detalle_pedido.delete({
    where: { id_detalle: id_detalle_big },
  });
  await this.prisma.auditoria.create({ ... });
  return { message: "Detalle eliminado" };
  // ⚠ NO hay restauración de inventario aquí
}
```

Tampoco hay restauración cuando `reembolsarPago` marca el pedido como `cancelado`.

**Impacto**: Cada cancelación/reembolso reduce stock permanentemente → stock se agota sin ventas reales → pedidos legítimos rechazados por stock insuficiente.

**Solución**:
```typescript
// En removeDetalle:
const detalle = await this.prisma.detalle_pedido.findUnique({ where: {id_detalle: id_detalle_big} });
if (detalle) {
  await this.prisma.inventario.updateMany({
    where: { id_producto: detalle.id_producto },
    data: { stock: { increment: Number(detalle.cantidad) } }
  });
}
```

---

### C-03: Sin regla de comisión global activa rompe el checkout completo

**Descripción**: Si no existe una regla de comisión con `alcance='global'` y `activo=true` en la tabla `comisiones`, el endpoint `addDetalle` lanza un error que **bloquea el checkout por completo**.

**Evidencia**:
```typescript
// apps/api/src/modules/pedidos/pedidos.service.ts:584
} catch (err: any) {
  throw new Error(
    `[pedidos] Sin regla de comisión para productor ${args.id_productor} / país ${args.pais_operacion}...`
  );
}
```

**Impacto**: Si la tabla `comisiones` está vacía (base de datos limpia o después de un wipe), **nadie puede hacer checkout**.

**Solución**: Seed obligatorio de regla global + verificación en startup.

---

### C-04: Dirección de remitente en guías es hardcodeada (no por productor)

**Descripción**: SkydropxService usa una dirección de remitente única tomada de variables de entorno (`SKYDROPX_SHIPPER_*`), en lugar de las coordenadas reales de cada productor (`productores.bodega_*`).

**Evidencia**:
```typescript
// apps/api/src/modules/envios/skydropx.service.ts:48-56
this.shipperStreet = this.config.get('SKYDROPX_SHIPPER_STREET', 'Calle Principal 1');
this.shipperZip = this.config.get('SKYDROPX_SHIPPER_POSTAL_CODE', '68000');
// ...
```

Cada productor tiene `bodega_calle`, `bodega_ciudad`, `bodega_codigo_postal`, etc. en la BD, pero estos campos no se usan al generar guías.

**Impacto**: Las guías de envío tienen dirección incorrecta del remitente → el carrier NO puede recoger en la ubicación real del productor → envíos fallidos o costos incorrectos.

**Solución**: En `crearEnviosPorProductor`, pasar los datos de `productores.bodega_*` al servicio de guías como dirección de origen.

---

### C-05: Sin rate limiting en ningún endpoint

**Descripción**: No existe `ThrottlerModule` ni ningún middleware de rate limiting en la aplicación NestJS.

**Evidencia**: No se encontró importación de `@nestjs/throttler` en ningún archivo del proyecto.

**Impacto**: 
- Ataques de fuerza bruta sobre `POST /auth/login`
- Spam de registros
- Extracción masiva del catálogo
- DoS en endpoints costosos (cotización de envío, checkout)

**Solución**: 
```typescript
// app.module.ts
ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }])
// En auth.controller.ts: @UseGuards(ThrottlerGuard) en login/register
```

---

### C-06: CORS hardcodeado — no configurable por entorno

**Descripción**: Los orígenes permitidos están hardcodeados en `main.ts`.

**Evidencia**:
```typescript
// apps/api/src/main.ts:24-29
app.enableCors({
  origin: [
    'http://localhost:3000',
    'https://marketplace-mezcal.vercel.app',
  ],
  credentials: true,
});
```

**Impacto**: Para agregar un dominio en producción hay que modificar el código y redesplegar.

**Solución**: `origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:3000']`

---

## ALTOS — Afectan ingresos o experiencia de usuario crítica

---

### A-01: Estadísticas de ingresos del admin son incorrectas

**Descripción**: `getStats()` suma ingresos solo para pedidos en estado `completado` o `enviado`, pero el flujo real usa estados `pagado`, `label_purchased`, `entregado`.

**Evidencia**:
```typescript
// apps/api/src/modules/admin/admin.service.ts:26-30
totalIngresos: this.prisma.pedidos.aggregate({
  where: { eliminado_en: null, estado: { in: ['completado', 'enviado'] } },
  _sum: { total: true },
}),
```

**Impacto**: El dashboard del admin muestra ingresos en $0 (o muy bajos) aunque haya ventas reales en estado `pagado`.

**Solución**: Incluir estados `['pagado', 'label_purchased', 'entregado', 'enviado', 'completado']`.

---

### A-02: `getMisVentas` suma el total del pedido completo, no la parte del productor

**Descripción**: El resumen de ingresos del productor suma `pedido.total` de todos los pedidos que contienen sus productos, incluyendo items de otros productores.

**Evidencia**:
```typescript
// apps/api/src/modules/pedidos/pedidos.service.ts:130
ingresosTotales: Number(
  pedidos.reduce((sum, pedido) => sum + Number(pedido.total), 0).toFixed(2),
),
```

**Impacto**: El productor ve ingresos inflados (incluye comisión de plataforma + parte de otros productores en el mismo pedido).

**Solución**: Usar `pedido_productor.monto_neto_productor` en lugar de `pedido.total`.

---

### A-03: Sin paginación en endpoints principales

**Descripción**: `findAll()` en pedidos, pagos, usuarios, inventario devuelve TODOS los registros sin paginación ni límite.

**Evidencia**:
```typescript
// apps/api/src/modules/pedidos/pedidos.service.ts:34-55
async findAll() {
  return serializeBigInts(
    await this.prisma.pedidos.findMany({
      include: { detalle_pedido: { include: ... }, facturas: true, usuarios: true },
      orderBy: { fecha_creacion: 'desc' },
    }),
  );
}
// Sin take/skip ni cursor
```

**Impacto**: Con 10,000+ pedidos la API consume GBs de memoria y tarda minutos → timeouts y caídas del servidor.

**Solución**: Agregar parámetros `page`/`limit` con defaults `take: 50`.

---

### A-04: `validarShippingContraDB` omite validación si no hay cotizaciones guardadas

**Descripción**: Si el frontend llega al paso de pago sin guardar cotizaciones en BD, se acepta cualquier monto de envío.

**Evidencia**:
```typescript
// apps/api/src/modules/pagos/pagos.service.ts:617
if (cotizaciones.length === 0) return; // Sin cotizaciones guardadas, omitir validación
```

**Impacto**: Un cliente malicioso puede enviar `shipping_amount: 0` y el backend lo acepta → plataforma paga el envío de su bolsillo.

**Solución**: Si no hay cotizaciones y `shippingCliente > 0`, aceptar (el cliente no puede bajar el precio). Si `shippingCliente === 0` y hay envío real, rechazar o requerir cotización previa.

---

### A-05: Endpoint `POST /pagos/stripe/webhook` no verifica el secreto cuando este no está configurado

**Descripción**: `this.stripeService.constructWebhookEvent(rawBody, signature, secret!)` — el `!` asume que `secret` existe. Si `STRIPE_WEBHOOK_SECRET` no está en `.env`, el constructor de Stripe lanzará una excepción no manejada o procesará el evento sin verificación.

**Impacto**: Stripe webhooks falsos podrían marcar pedidos como `pagado` sin pago real.

**Solución**: Validar que `secret` no es vacío al arrancar la app.

---

### A-06: `compra_verificada` en reseñas siempre es `false`

**Descripción**: El campo `compra_verificada` en `resenas` existe en la BD pero nunca se establece a `true` automáticamente al crear una reseña.

**Evidencia**:
```typescript
// Buscar en resenas.service.ts — el campo no se calcula en create()
```

**Impacto**: Todas las reseñas aparecen como "no verificadas" → pérdida de confianza del comprador.

**Solución**: Al crear una reseña, verificar si el usuario tiene un pedido entregado del producto.

---

### A-07: No hay validación de propiedad en `PATCH /pedidos/detalles/:id`

**Descripción**: `updateDetalle` no verifica que el usuario que llama sea dueño del pedido o sea admin.

**Evidencia**:
```typescript
// apps/api/src/modules/pedidos/pedidos.service.ts:623
async updateDetalle(id_detalle: string, dto: UpdateDetallePedidoDto) {
  return serializeBigInts(
    await this.prisma.detalle_pedido.update({
      where: { id_detalle: toBigIntId(id_detalle) },
      data: { ... },
    }),
  );
}
```

Tampoco restaura/ajusta inventario cuando cambia la cantidad.

**Impacto**: Manipulación de cantidades en pedidos ajenos + desincronización de stock.

---

## MEDIOS — Errores operativos

---

### M-01: FedEx completamente eliminado sin fallback documentado

**Descripción**: `apps/api/src/modules/envios/fedex.service.ts` fue eliminado. La función `selectCarrier()` siempre devuelve SkydropX independientemente del parámetro.

**Evidencia** (git status):
```
D  apps/api/src/modules/envios/fedex.service.ts
```

**Impacto**: Si SkydropX no está disponible, no hay carrier alternativo.

---

### M-02: No existe modelo `password_reset_tokens` en el schema

**Descripción**: La documentación del CLAUDE.md menciona `password_reset_tokens`, pero el modelo no existe en `schema.prisma`. El reset de contraseña usa JWT temporal, lo cual es funcional pero los tokens no se pueden revocar.

**Evidencia**: Búsqueda en `schema.prisma` — no hay modelo `password_reset_tokens`.

**Impacto**: No es posible revocar un token de reset de contraseña una vez emitido (hasta que expire en 30 min).

---

### M-03: Sin integración real de CFDI (facturación)

**Descripción**: El sistema guarda datos de factura en tabla `facturas` y genera un PDF por email, pero NO hay integración con SAT/PAC para emitir CFDI válidos.

**Evidencia**:
```typescript
// apps/api/src/modules/pedidos/pedidos.service.ts:654
// Los datos se guardan en BD con uuid_fiscal null y se genera un PDF "simulado"
```

**Impacto**: Las facturas generadas no son válidas fiscalmente. Riesgo legal para operaciones en México.

---

### M-04: Notificaciones sin mecanismo de push real

**Descripción**: Las notificaciones son solo BD. El frontend hace polling con `useNotificationPoller`. No hay WebSockets ni Server-Sent Events.

**Impacto**: Retraso en notificaciones, overhead de polling innecesario.

---

### M-05: `cotizarEnvio` en PedidosService solo usa SkydropX directamente

**Descripción**: `pedidos.service.ts:cotizarEnvio` llama directamente a `this.skydropxService.cotizarEnvio()` en lugar de usar el patrón `selectCarrier()`. No permite multi-carrier.

---

### M-06: Sin manejo de disputa en PayPal

**Descripción**: El webhook de PayPal maneja `PAYMENT.CAPTURE.COMPLETED` y `PAYMENT.CAPTURE.DENIED` pero no `CUSTOMER.DISPUTE.CREATED`. A diferencia de Stripe (donde se verifica `countOpenDisputesForPaymentIntent`), PayPal no tiene protección de disputas antes del transfer.

---

### M-07: `updateTrackingForProducer` actualiza el primer envío del pedido, no el del productor

**Descripción**:
```typescript
// pedidos.service.ts:1310
const envio = pedidoProductor.pedidos.envios?.[0];
// Toma el primer envío del pedido, no el vinculado al productor específico
```

En un pedido multiproductor con múltiples envíos, el número de rastreo se actualiza en el envío incorrecto.

---

### M-08: `removeById` en wishlist no verifica propiedad

**Descripción**: `DELETE /wishlist/item/:id` no verifica que el item pertenezca al usuario autenticado.

**Evidencia**:
```typescript
// wishlist.controller.ts:76
@UseGuards(AuthGuard)
@Delete('item/:id')
async removeById(@Param('id') id: string) {
  // Sin verificación de propiedad
  return await this.service.removeById(id);
}
```

---

## BAJOS — Mejoras recomendadas

---

### B-01: Swagger expuesto sin autenticación en producción

El endpoint `/api/docs` está expuesto públicamente. Considerar protegerlo en producción.

---

### B-02: `BigInt.prototype.toJSON` es una modificación global del prototipo

```typescript
// main.ts:12
(BigInt.prototype as any).toJSON = function () { return Number(this); };
```

Esto puede causar pérdida de precisión para IDs muy grandes (>2^53). Considerar serializar como string.

---

### B-03: Sin índice en `detalle_pedido.id_productor`

El campo `id_productor` en `detalle_pedido` no tiene índice declarado explícitamente aunque se usa en queries de filtro.

---

### B-04: `reembolsarPago` no verifica si hay disputas abiertas en PayPal

A diferencia del flow de Stripe (donde se verifica con `countOpenDisputesForPaymentIntent`), PayPal no tiene la misma verificación antes de reembolsar.

---

### B-05: Logs con `console.error` mezclados con `Logger`

El código mezcla `this.logger.error()` y `console.error()`. En producción los logs de consola pueden perderse según la configuración.

---

### B-06: Imágenes subidas sin validación de tipo MIME real

Multer usa `fileFilter` en algunos endpoints pero no verifica el contenido real del archivo (magic bytes), solo la extensión.

---

### B-07: Sin health check endpoint

No existe `GET /health` o similar para monitoreo y balanceadores de carga.

---

## Resumen Cuantitativo

| Severidad | Cantidad |
|-----------|---------|
| CRÍTICO | 6 |
| ALTO | 7 |
| MEDIO | 8 |
| BAJO | 7 |
| **Total** | **28** |

---

## Matriz de Preparación para Producción

| Área | Puntuación | Justificación |
|------|-----------|---------------|
| Arquitectura | 7/10 | Monorepo bien estructurado, separación clara. Falta health check, migrations automáticas. |
| Seguridad | 5/10 | Sin rate limiting, reembolso sin RBAC, CORS hardcodeado. Buena deduplicación de webhooks y validación de precios. |
| Escalabilidad | 4/10 | Sin paginación, sin caché, polling de notificaciones, shipper hardcodeado impide escalar a múltiples productores. |
| UX | 7/10 | Checkout en 4 pasos bien implementado, i18n ES/EN, dark mode, notificaciones. |
| Marketplace multiproductor | 6/10 | Schema y lógica de distribución excelentes. Falla en dirección de remitente por productor. |
| Pagos | 7/10 | Stripe + PayPal + deduplicación + retry. Falla: reembolso sin RBAC, webhook sin validación de secreto ausente. |
| Envíos | 5/10 | SkydropX funcional, multicarrier incompleto. Dirección remitente global es bloqueante. FedEx eliminado. |
| Observabilidad | 4/10 | Logger básico, sin métricas, sin tracing, logs mezclados console/Logger. |
| Rendimiento | 4/10 | Sin paginación, N+1 en algunas queries, sin caché. |
| Facturación/Fiscal | 2/10 | Sin CFDI real. Las facturas generadas no son válidas ante el SAT. |

**Puntuación global: 5.1/10**

---

## Acciones Prioritarias para Producción

### Semana 1 — Bloqueantes de ventas
1. **[C-01]** Agregar rol `admin` al endpoint `POST /pagos/:id/reembolso`
2. **[C-02]** Restaurar stock en `removeDetalle` y al cancelar pedido
3. **[C-03]** Seed obligatorio de regla de comisión global
4. **[C-04]** Usar `productores.bodega_*` como dirección de remitente en guías/antes verifica si es mejor relacionar direcciones con productores y ya no agregar los cambos bodega
5. **[A-01]** Corregir estados en consulta de ingresos del admin
6. **[A-02]** Corregir cálculo de ingresos del productor

### Semana 2 — Seguridad y estabilidad
7. **[C-05]** Agregar rate limiting (ThrottlerModule)
8. **[C-06]** CORS configurable por variable de entorno
9. **[A-05]** Validar presencia de `STRIPE_WEBHOOK_SECRET` al arrancar
10. **[A-03]** Paginación en todos los `findAll`

### Semana 3 — Funcionalidad completa
11. **[A-06]** Calcular `compra_verificada` automáticamente
12. **[A-07]** Validar propiedad en `updateDetalle` + ajustar stock
13. **[M-03]** Integración con PAC para CFDI (o deshabilitar el flujo hasta que esté lista)
14. **[M-07]** Corregir `updateTrackingForProducer` para pedidos multiproductor

### Mediano plazo
15. WebSockets para notificaciones en tiempo real
16. Health check endpoint
17. Paginación cursor-based para listas grandes
18. Integración multicarrier real (FedEx + SkydropX en paralelo)
