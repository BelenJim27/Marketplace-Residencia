# Auditoría del módulo de facturación

Fecha: 24 de junio de 2026

## Resumen ejecutivo

El sistema no cumplía el principio **“una venta = una factura”**. La tabla `facturas` aceptaba varias filas para el mismo pedido, la API no comprobaba pago ni factura previa, el cliente podía enviar importes y estado, y existían tres flujos distintos de “solicitud de factura”. Dos llamadas concurrentes podían crear dos facturas válidas para la aplicación.

La implementación queda endurecida en las cuatro capas:

- PostgreSQL garantiza como máximo una factura activa por pedido mediante `uq_facturas_pedido_activa`.
- La API solo factura pedidos con estado pagado/en proceso y evidencia de un pago `completado`.
- Las carreras y llamadas repetidas terminan en `409 Conflict`; la base de datos es la autoridad final.
- La UI muestra y descarga la factura existente, y solo ofrece **Generar factura** cuando el pedido es elegible y no tiene una activa.
- Se eliminaron el formulario de checkout, el flujo de pago exitoso, el correo y las rutas antiguas vinculadas a “Solicitar factura”.
- El PDF dejó de simular UUID, RFC emisor, certificados y cadena SAT. Mientras no exista PAC se identifica expresamente como documento preliminar sin validez fiscal.

## Resultado por regla

| Regla | Antes | Después |
|---|---|---|
| Una factura activa por pedido | No cumplía: índice normal y relación 1:N sin límite | Cumple en código y migración: índice único parcial para estados distintos de `cancelada` |
| Bloquear segunda factura | No cumplía | Cumple: comprobación transaccional y manejo de `P2002` como `409` |
| Mostrar factura existente | No cumplía: el frontend ignoraba `facturas` | Cumple: consulta autenticada, estado visible y descarga PDF |
| Solo pedidos elegibles | No cumplía | Cumple: lista blanca de estados más pago `completado` obligatorio |
| Importes confiables | No cumplía: el cliente podía enviar subtotal, impuestos, total y moneda | Cumple: los calcula el backend desde el pedido |
| Eliminar “Solicitar factura” | No cumplía: checkout, pago exitoso, detalle y correo | Cumple: no quedan botones, formularios, almacenamiento de sesión, métodos de correo ni rutas antiguas |
| Concurrencia | No cumplía | Cumple: una creación persiste y la perdedora recibe `409` |
| Consulta/descarga protegida | Parcial; no había descarga y se exponía información al cargar el pedido de productor | Cumple: endpoints restringidos al comprador o administrador; la factura se retiró del detalle compartido con productores |

## Riesgos detectados originalmente

1. **P0, duplicados por concurrencia.** Dos `POST /pedidos/:id/facturas` podían superar cualquier validación previa porque no existía restricción única.
2. **P0, facturación de pedidos no pagados.** `addFactura` solo comprobaba propiedad; aceptaba pedidos pendientes, cancelados o reembolsados.
3. **P0, documento fiscal simulado.** El PDF incluía UUID, certificados, cadena original y RFC emisor ficticios, aunque la UI lo presentaba como CFDI.
4. **P1, manipulación de datos.** El DTO aceptaba UUID, URLs, emisor, importes, moneda y estado enviados por el cliente.
5. **P1, borrado y edición por el comprador.** Las rutas `PATCH /pedidos/facturas/:id` y `DELETE /pedidos/facturas/:id` permitían alterar o eliminar el registro y volver a generarlo.
6. **P1, UI basada en estado local.** Recargar la página hacía reaparecer el botón aunque ya existiera una factura.
7. **P1, flujos duplicados.** Checkout, pago exitoso y detalle podían disparar el alta independientemente, incluida lógica de reintento en `sessionStorage`.
8. **P1, exposición de datos fiscales.** El detalle genérico del pedido incluía facturas incluso cuando lo consultaba un productor participante.

## Cambios implementados

### Base de datos

- `facturas.id_pedido` pasa a ser obligatorio.
- Estados normalizados: `preliminar`, `timbrada`, `cancelada` y `error`.
- Se agregan datos persistentes para regenerar el documento y preparar el timbrado: razón social, correo, código postal, fecha/motivo de cancelación y UUID sustituto.
- El índice parcial `uq_facturas_pedido_activa` permite historial de canceladas, pero nunca dos activas.
- La migración rellena importes nulos desde el pedido y se detiene si encuentra facturas huérfanas o duplicados activos. No elimina ni cancela datos silenciosamente.

Esta política sigue el proceso vigente del SAT: una sustitución usa motivo `01` y debe relacionar el folio fiscal del comprobante sustituto. Por eso se conserva la cancelada y se permite una nueva activa solo después de la cancelación formal. Fuente: [Proceso de cancelación del SAT](https://www.sat.gob.mx/minisitio/Factura/cancela_procesocancelacion.htm).

### API y servicio

- `POST /pedidos/:id/factura`: genera la única factura activa.
- `GET /pedidos/:id/factura`: devuelve la factura activa existente.
- `GET /pedidos/:id/factura/pdf`: descarga el PDF autenticado.
- Se retiraron las rutas plurales anteriores y los endpoints públicos de edición y eliminación.
- Respuestas relevantes:
  - `400`: pedido sin pago completado/vigente.
  - `403`: usuario sin acceso al pedido.
  - `404`: pedido o factura inexistente.
  - `409`: el pedido ya tiene una factura activa.
- El envío de correo ocurre después del commit. Un fallo de correo no revierte la factura ni habilita una segunda creación.

### Frontend

- Checkout ya no captura ni almacena una solicitud fiscal antes del pago.
- Pago exitoso ya no crea ni reintenta facturas.
- El detalle de compra consulta el estado real del servidor:
  - no elegible: informa que debe confirmarse el pago;
  - elegible sin factura: muestra **Generar factura**;
  - con factura: muestra folio/estado y **Descargar factura**.
- Si otra petición gana la carrera y la UI recibe `409`, consulta la factura existente y cambia al estado de consulta, sin ofrecer una nueva generación.

### Documento preliminar y evolución a CFDI

El documento actual sigue siendo una simulación operativa, no un CFDI. Ahora:

- no inventa UUID, certificados, RFC emisor ni cadena original;
- muestra “Documento preliminar sin timbrado y sin validez fiscal”;
- conserva campos nulos para `uuid_fiscal`, `xml_url` y `pdf_url`;
- el estado `preliminar` podrá evolucionar a `timbrada` cuando un PAC devuelva los artefactos reales;
- `cancelada`, `motivo_cancelacion` y `uuid_sustituto` preparan el flujo posterior de cancelación/sustitución.

Antes de presentar el documento como CFDI real debe integrarse un PAC, validar los catálogos SAT, guardar XML/PDF timbrados y certificados, consultar el estado de cancelación y auditar las transiciones.

## Archivos y componentes involucrados

- Base de datos: `packages/database/prisma/schema.prisma` y migración `20260623090000_factura_unica_activa`.
- Backend: controlador, servicio y DTO de `apps/api/src/modules/pedidos`; generación/correo en `apps/api/src/modules/email`.
- Frontend: cliente API, checkout, pago exitoso y detalle de compra bajo `apps/web/src`.
- Cobertura: `apps/api/src/modules/pedidos/facturas.service.spec.ts`.

## Evidencia de pruebas

### Despliegue de la restricción en Neon

La migración `20260623090000_factura_unica_activa` fue aplicada correctamente el 24 de junio de 2026 mediante `prisma migrate deploy`.

- Preflight: 0 facturas sin pedido y 0 pedidos con facturas activas duplicadas.
- Datos migrados: 3 registros `pendiente` normalizados a `preliminar`.
- Verificación posterior: `id_pedido` sin nulos, `ck_facturas_estado` y `ck_facturas_cancelacion` presentes.
- Índice confirmado en PostgreSQL: `uq_facturas_pedido_activa ON facturas(id_pedido) WHERE estado <> 'cancelada'`.

### Casos obligatorios

| Caso | Evidencia | Resultado |
|---|---|---|
| 1. Pedido pagado sin factura | Test crea con estado `pagado`, pago `completado` y sin activa | Pasa; se crea `preliminar` |
| 2. Pedido con factura | Test devuelve existente y no ejecuta `create` | Pasa; se rechaza con `409` |
| 3. Dos peticiones simultáneas | Dos promesas compiten; una creación persiste y la otra simula `P2002` | Pasa; un éxito y un `409` |
| 4. API directa sobre pedido facturado | Llamada directa a `addFactura` con activa existente | Pasa; operación rechazada |
| 5. Ruta/acción manual repetida | La misma regla se aplica en servicio y DB; rutas de edición/eliminación y ruta plural fueron retiradas | Pasa por prueba de servicio y búsqueda estática |

Comando específico:

```text
npm test -- --runInBand --testPathPattern=facturas.service.spec
PASS: 1 suite, 5 tests
```

Verificaciones adicionales:

- `npx prisma validate --schema=packages/database/prisma/schema.prisma`: válido.
- `npm run build` en `apps/api`: correcto.
- `npm run build` en `apps/web`: correcto; conserva una advertencia preexistente de dependencia de `useEffect` en `ImagenesProducto.tsx`.
- Búsqueda global de “Solicitar factura”, rutas plurales y datos SAT simulados: sin coincidencias funcionales.

La regresión completa de API queda en **9 suites aprobadas y 4 fallidas; 62 pruebas aprobadas y 4 fallidas**. Las cuatro fallas ya estaban presentes en la línea base y no pertenecen a facturación: mocks incompletos de payout/transacción, restauración de inventario, una expectativa inconsistente de usuario y suites de pagos/envíos sin secretos JWT de prueba.

## Recomendaciones y despliegue

1. En ambientes nuevos, aplicar siempre las migraciones antes de desplegar la API; desplegar código sin el índice reabriría una ventana de carrera.
2. Configurar monitoreo de respuestas `409` para detectar clientes repetitivos; son esperables ocasionalmente, pero un aumento puede indicar dobles envíos de UI o integraciones.
3. No habilitar el estado `timbrada` hasta integrar un PAC y almacenar XML, UUID, certificados, sello y cadena reales.
4. Implementar la cancelación como operación administrativa/PAC auditada; nunca como borrado físico.
5. Añadir una prueba E2E con PostgreSQL real para demostrar el índice parcial bajo concurrencia de procesos, además de la prueba unitaria de `P2002`.
6. Corregir las cuatro fallas preexistentes de la suite completa para recuperar una señal de CI totalmente verde.
