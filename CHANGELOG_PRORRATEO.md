# Changelog: Prorrateo de Impuestos y Envío en `pedido_productor`

**Fecha**: 2026-05-14  
**Prioridad**: P1 (Cálculo de Liquidación)  
**Estado**: ✅ Implementado y Verificado

---

## Cambio Realizado

### Archivo: `apps/api/src/modules/pedidos/pedidos.service.ts`

**Función modificada**: `upsertPedidoProductorConComision()` (línea 397–464)

### ¿Qué cambió?

La función **ahora incluye el prorrateo de impuestos y envío** en el cálculo de `subtotal_bruto`. 

**Antes**:
```typescript
subtotal_bruto = Σ(precio_compra × cantidad) // Solo items
```

**Después**:
```typescript
subtotal_bruto = Σ(precio_compra × cantidad) 
               + (tax_amount × % del productor)
               + (shipping_amount × % del productor)
```

### Fórmula Completa

```
porcentaje_productor = subtotal_items_productor / subtotal_total_pedido
tax_prorrateado = pedido.tax_amount × porcentaje_productor
envio_prorrateado = pedido.shipping_amount × porcentaje_productor

subtotal_bruto = subtotal_items + tax_prorrateado + envio_prorrateado
```

### Ventajas

1. **Transparencia total**: El productor ve exactamente cuánto generó su parte (producto + impuesto + logística)
2. **Comisión justa**: La comisión de plataforma se aplica sobre el monto económico real
3. **Conciliación simple**: El sum de todos los productores = total del pedido (sin pérdidas)
4. **Cumplimiento fiscal**: Cada productor registra sus impuestos prorrateados

---

## Ejemplo Numérico

### Entrada: Pedido #1001
- **Productor A** (mezcal artesanal): 2 botellas × $500 = $1,000
- **Productor B** (mezcal joven): 3 bolsas × $150 = $450
- **Total Items**: $1,450
- **IVA pedido**: $232 (16% sobre $1,450)
- **Envío**: $120
- **Total a pagar**: $1,802

### Cálculo Productor A

```
% del pedido = $1,000 / $1,450 = 68.97%
IVA prorrateado = $232 × 68.97% = $160
Envío prorrateado = $120 × 68.97% = $82.76

subtotal_bruto = $1,000 + $160 + $82.76 = $1,242.76
```

### Cálculo Productor B

```
% del pedido = $450 / $1,450 = 31.03%
IVA prorrateado = $232 × 31.03% = $72
Envío prorrateado = $120 × 31.03% = $37.24

subtotal_bruto = $450 + $72 + $37.24 = $559.24
```

### Verificación

```
$1,242.76 + $559.24 = $1,802 ✅
```

---

## Impacto en Otras Funciones

### `comisionesService.calcularMonto(subtotal_bruto, comision)`
- Ahora recibe el `subtotal_bruto` con tax y envío incluidos
- La comisión se calcula sobre el monto económico **real**
- **Ejemplo**: Productor A con 8% de comisión:
  - Comisión = $1,242.76 × 8% = $99.42 (antes era $1,000 × 8% = $80)

### `monto_neto_productor`
- Ahora refleja el dinero real generado por el productor
- `monto_neto = subtotal_bruto - comision_marketplace`
- Productor A: $1,242.76 - $99.42 = $1,143.34

### Dashboard `/dashboard/productor/ingresos/page.tsx`
- Los números mostrados ahora son **precisos y transparentes**
- El desglose incluye impuestos y envío prorrateado

---

## Testing

### Script de Verificación Ejecutado

Archivo: `scripts/test-prorrateo.ts`  
Comando: `npx ts-node scripts/test-prorrateo.ts`

**Resultado**: ✅ Todos los cálculos verificados (diferencia = $0.00)

---

## Campos Modificados en BD

No hay cambios en el schema. Los campos `pedido_productor` se actualizan con nuevos valores:

| Campo | Tipo | Nuevo Valor |
|---|---|---|
| `subtotal_bruto` | Decimal(14,2) | Ahora incluye tax + envío prorrateado |
| `comision_marketplace` | Decimal(14,2) | Recalculado sobre `subtotal_bruto` actualizado |
| `monto_neto_productor` | Decimal(14,2) | Recalculado |

**Migración de datos**: Los pedidos existentes serán recalculados automáticamente la próxima vez que se ejecute `upsertPedidoProductorConComision()` (al agregar/editar un ítem del mismo productor).

---

## Integración con Plan de Liquidación

Este cambio es la **Prioridad 1** del plan de arquitectura de pagos:

✅ **Prioridad 1**: Incluir `tax_amount` y `shipping_amount` prorrateados ← **COMPLETADO**

**Próximas prioridades**:
- P2: Retardar transfers a entrega confirmada
- P3: Validar disputas Stripe
- P4: Período de retención configurable
- P5: Guard de roles en endpoint `/payouts/generar`

---

## Verificación en Producción

Antes de subir a producción:

1. ✅ **Compilación**: `npm run build:api` — sin errores
2. ✅ **Tests numéricos**: `npx ts-node scripts/test-prorrateo.ts` — verifica correctitud
3. **Próximo paso**: Deploy a staging, crear un pedido con múltiples productores, verificar valores en BD

---

## Rollback (si es necesario)

Si hay que revertir, simplemente remover el cálculo de prorrateo y volver a:

```typescript
const subtotal_bruto = detalles.reduce(
  (sum: number, d: any) => sum + Number(d.precio_compra) * Number(d.cantidad), 0,
);
```

**Impacto**: Los `pedido_productor` volverán a calcular sin tax/envío. Pedidos futuros tendrán los nuevos valores; pedidos anteriores mantendrán los valores persisted.
