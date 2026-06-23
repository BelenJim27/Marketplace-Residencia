-- ==============================================================================
-- SCRIPT DE VERIFICACIÓN: Auditoría de Movimientos de Stock
-- ==============================================================================
-- Este script verifica que el stock se reduce correctamente en cada compra
-- Ejecutar con: psql -U user -d marketplace < verify-stock.sql

-- ==============================================================================
-- 1. ÚLTIMOS MOVIMIENTOS DE INVENTARIO (últimas 30 líneas)
-- ==============================================================================
SELECT 
  '📊 ÚLTIMOS 30 MOVIMIENTOS' AS seccion;

SELECT 
  m.id_movimiento,
  p.id_pedido,
  p.estado as pedido_estado,
  prod.nombre as producto,
  m.tipo,
  m.cantidad,
  inv.stock as stock_actual,
  m.stock_resultante,
  (inv.stock - m.stock_resultante) as cambio,
  m.motivo,
  m.creado_en,
  TO_CHAR(m.creado_en, 'YYYY-MM-DD HH24:MI:SS') as fecha_formato
FROM movimientos_inventario m
LEFT JOIN pedidos p ON m.id_pedido = p.id_pedido
LEFT JOIN inventario inv ON m.id_inventario = inv.id_inventario
LEFT JOIN productos prod ON inv.id_producto = prod.id_producto
ORDER BY m.creado_en DESC
LIMIT 30;

-- ==============================================================================
-- 2. ANÁLISIS POR TIPO DE MOVIMIENTO
-- ==============================================================================
SELECT 
  '📈 RESUMEN POR TIPO DE MOVIMIENTO' AS seccion;

SELECT 
  tipo,
  COUNT(*) as total_movimientos,
  SUM(cantidad) as cantidad_total,
  ROUND(AVG(cantidad), 2) as promedio_cantidad,
  MIN(creado_en) as primer_movimiento,
  MAX(creado_en) as ultimo_movimiento
FROM movimientos_inventario
GROUP BY tipo
ORDER BY total_movimientos DESC;

-- ==============================================================================
-- 3. PRODUCTOS CON MÁS MOVIMIENTOS (BESTSELLERS)
-- ==============================================================================
SELECT 
  '🏆 TOP 10 PRODUCTOS CON MÁS MOVIMIENTOS' AS seccion;

SELECT 
  prod.id_producto,
  prod.nombre,
  COUNT(m.id_movimiento) as total_movimientos,
  SUM(CASE WHEN m.tipo = 'venta' THEN m.cantidad ELSE 0 END) as total_vendido,
  SUM(CASE WHEN m.tipo = 'cancelacion' THEN m.cantidad ELSE 0 END) as total_cancelado,
  inv.stock as stock_actual,
  inv.stock_minimo
FROM movimientos_inventario m
JOIN inventario inv ON m.id_inventario = inv.id_inventario
JOIN productos prod ON inv.id_producto = prod.id_producto
GROUP BY prod.id_producto, prod.nombre, inv.stock, inv.stock_minimo
ORDER BY total_movimientos DESC
LIMIT 10;

-- ==============================================================================
-- 4. VERIFICAR INTEGRIDAD: Stock debe ser coherente
-- ==============================================================================
SELECT 
  '🔍 VERIFICACIÓN DE INTEGRIDAD DE STOCK' AS seccion;

-- Para cada producto, verificar que el stock final coincida
-- con el stock inicial + cancelaciones - ventas
SELECT 
  prod.id_producto,
  prod.nombre,
  inv.stock as stock_actual_bd,
  COALESCE(SUM(CASE WHEN m.tipo = 'venta' THEN m.cantidad ELSE 0 END), 0) as total_vendido,
  COALESCE(SUM(CASE WHEN m.tipo = 'cancelacion' THEN m.cantidad ELSE 0 END), 0) as total_cancelado,
  COALESCE(SUM(CASE WHEN m.tipo = 'ajuste_pedido' THEN m.cantidad ELSE 0 END), 0) as total_ajustes,
  CASE 
    WHEN inv.stock >= 0 THEN '✅ OK'
    ELSE '❌ PROBLEMA: Stock negativo'
  END as estado
FROM inventario inv
JOIN productos prod ON inv.id_producto = prod.id_producto
LEFT JOIN movimientos_inventario m ON inv.id_inventario = m.id_inventario
GROUP BY prod.id_producto, prod.nombre, inv.stock
HAVING inv.stock < 0 OR 
       COUNT(CASE WHEN m.tipo = 'venta' THEN 1 END) > 0
ORDER BY inv.stock ASC;

-- ==============================================================================
-- 5. PEDIDOS ACTIVOS CON DETALLES Y SU IMPACTO EN STOCK
-- ==============================================================================
SELECT 
  '🛒 PEDIDOS ACTIVOS Y DETALLES' AS seccion;

SELECT 
  ped.id_pedido,
  ped.estado,
  ped.fecha_creacion,
  prod.nombre as producto,
  dp.cantidad as cantidad_pedida,
  dp.precio_compra,
  inv.stock as stock_disponible_ahora,
  CASE 
    WHEN inv.stock >= dp.cantidad THEN '✅ OK'
    ELSE '⚠️ BAJO STOCK'
  END as alerta,
  m.stock_resultante as stock_cuando_se_compro
FROM pedidos ped
JOIN detalle_pedido dp ON ped.id_pedido = dp.id_pedido
JOIN productos prod ON dp.id_producto = prod.id_producto
LEFT JOIN inventario inv ON dp.id_producto = inv.id_producto
LEFT JOIN movimientos_inventario m ON dp.id_inventario = m.id_inventario 
  AND m.id_pedido = ped.id_pedido 
  AND m.tipo = 'venta'
WHERE ped.estado IN ('pendiente', 'pagado', 'label_purchased')
ORDER BY ped.fecha_creacion DESC
LIMIT 50;

-- ==============================================================================
-- 6. CANCELACIONES: Verificar que restauren correctamente
-- ==============================================================================
SELECT 
  '↩️  CANCELACIONES RECIENTES' AS seccion;

SELECT 
  ped.id_pedido,
  ped.estado,
  COUNT(dp.id_detalle) as items_en_pedido,
  SUM(dp.cantidad) as cantidad_total_cancelada,
  SUM(m.cantidad) as total_movimientos_cancelacion,
  MAX(m.creado_en) as fecha_cancelacion
FROM pedidos ped
JOIN detalle_pedido dp ON ped.id_pedido = dp.id_pedido
LEFT JOIN movimientos_inventario m ON m.id_pedido = ped.id_pedido 
  AND m.tipo = 'cancelacion'
WHERE ped.estado = 'cancelado' 
  AND ped.actualizado_en > NOW() - INTERVAL '7 days'
GROUP BY ped.id_pedido, ped.estado
ORDER BY ped.actualizado_en DESC
LIMIT 20;

-- ==============================================================================
-- 7. ALERTAS: Stock bajo o agotado
-- ==============================================================================
SELECT 
  '🚨 ALERTAS DE STOCK' AS seccion;

SELECT 
  prod.id_producto,
  prod.nombre,
  inv.stock as stock_actual,
  inv.stock_minimo,
  CASE 
    WHEN inv.stock = 0 THEN '❌ AGOTADO'
    WHEN inv.stock <= inv.stock_minimo THEN '⚠️  BAJO'
    WHEN inv.stock <= 10 THEN '⚠️  MUY BAJO'
    ELSE '✅ OK'
  END as estado,
  prod_vendidos.total_vendido
FROM inventario inv
JOIN productos prod ON inv.id_producto = prod.id_producto
LEFT JOIN (
  SELECT id_producto, SUM(cantidad) as total_vendido
  FROM movimientos_inventario m
  JOIN inventario inv ON m.id_inventario = inv.id_inventario
  WHERE m.tipo = 'venta' AND m.creado_en > NOW() - INTERVAL '30 days'
  GROUP BY inv.id_producto
) prod_vendidos ON prod.id_producto = prod_vendidos.id_producto
WHERE inv.stock <= 10 OR inv.stock = 0
ORDER BY inv.stock ASC;

-- ==============================================================================
-- 8. ESTADÍSTICAS POR PEDIDO: Validar movimientos
-- ==============================================================================
SELECT 
  '💹 ESTADÍSTICAS POR PEDIDO' AS seccion;

SELECT 
  COUNT(DISTINCT ped.id_pedido) as total_pedidos,
  SUM(CASE WHEN ped.estado = 'pagado' THEN 1 ELSE 0 END) as pagados,
  SUM(CASE WHEN ped.estado = 'cancelado' THEN 1 ELSE 0 END) as cancelados,
  SUM(CASE WHEN ped.estado = 'entregado' THEN 1 ELSE 0 END) as entregados,
  COUNT(dp.id_detalle) as total_detalles,
  SUM(dp.cantidad) as total_items,
  SUM(CASE 
    WHEN m.tipo = 'venta' THEN m.cantidad 
    ELSE 0 
  END) as total_movimientos_venta
FROM pedidos ped
LEFT JOIN detalle_pedido dp ON ped.id_pedido = dp.id_pedido
LEFT JOIN movimientos_inventario m ON ped.id_pedido = m.id_pedido;

-- ==============================================================================
-- 9. INCONSISTENCIAS: Detectar problemas
-- ==============================================================================
SELECT 
  '🔴 INCONSISTENCIAS DETECTADAS' AS seccion;

-- Detalles de pedido sin movimiento correspondiente
SELECT 
  dp.id_detalle,
  ped.id_pedido,
  prod.nombre,
  dp.cantidad,
  'Detalle sin movimiento de venta' as problema
FROM detalle_pedido dp
JOIN pedidos ped ON dp.id_pedido = ped.id_pedido
JOIN productos prod ON dp.id_producto = prod.id_producto
LEFT JOIN movimientos_inventario m ON m.id_pedido = ped.id_pedido 
  AND m.id_inventario = dp.id_inventario
  AND m.tipo = 'venta'
WHERE m.id_movimiento IS NULL
  AND ped.estado != 'cancelado'
  AND ped.creado_en > NOW() - INTERVAL '30 days'
LIMIT 20;

-- ==============================================================================
-- 10. RESUMEN FINAL
-- ==============================================================================
SELECT 
  '✅ RESUMEN FINAL' AS seccion;

SELECT 
  COUNT(DISTINCT inv.id_inventario) as productos_con_inventario,
  SUM(inv.stock) as stock_total_actual,
  COUNT(DISTINCT m.id_pedido) as pedidos_con_movimientos,
  MAX(m.creado_en) as ultimo_movimiento
FROM inventario inv
LEFT JOIN movimientos_inventario m ON inv.id_inventario = m.id_inventario;

-- ==============================================================================
-- Notas:
-- - Ejecutar regularmente para auditoría
-- - Reportar inconsistencias al equipo de ops
-- - Stock debe ser >= 0 siempre
-- - Cada venta debe tener un movimiento correspondiente
-- - Cancelaciones deben restaurar exactamente lo que se vendió
-- ==============================================================================
