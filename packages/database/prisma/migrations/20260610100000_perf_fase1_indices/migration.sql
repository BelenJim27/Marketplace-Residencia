-- Fase 1 de optimización de rendimiento: índices faltantes (alto impacto, bajo riesgo).
-- Todas las sentencias son idempotentes (IF NOT EXISTS) para poder re-aplicarse sin error.
--
-- NOTA producción: en una base con tráfico/datos grandes, considera ejecutar cada
-- CREATE INDEX con la variante CONCURRENTLY (fuera de transacción) para evitar bloquear
-- escrituras. Aquí se usa la forma simple por compatibilidad con el flujo manual de Neon.

-- Extensión necesaria para los índices trigram (búsqueda ILIKE de catálogo).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- productos: búsqueda de catálogo (WHERE nombre/descripcion ILIKE '%term%') sin full scan.
CREATE INDEX IF NOT EXISTS "idx_productos_nombre_trgm"
  ON "productos" USING gin ("nombre" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_productos_descripcion_trgm"
  ON "productos" USING gin ("descripcion" gin_trgm_ops);

-- productos.id_lote: FK sin índice (JOINs lotes ↔ productos, cascadas).
CREATE INDEX IF NOT EXISTS "idx_productos_lote"
  ON "productos" ("id_lote");

-- pedidos: historial por usuario (WHERE id_usuario + eliminado_en ORDER BY fecha_creacion DESC).
CREATE INDEX IF NOT EXISTS "idx_pedidos_usuario_soft_fecha"
  ON "pedidos" ("id_usuario", "eliminado_en", "fecha_creacion" DESC);

-- resenas.id_usuario: FK sin índice (reseñas por usuario, cascadas).
CREATE INDEX IF NOT EXISTS "idx_resenas_usuario"
  ON "resenas" ("id_usuario");

-- envios.id_transportista: FK sin índice (analítica/joins por transportista).
CREATE INDEX IF NOT EXISTS "idx_envios_transportista"
  ON "envios" ("id_transportista");

-- envio_cotizaciones: la tabla no tenía índices; FKs más consultadas.
CREATE INDEX IF NOT EXISTS "idx_envio_cotizaciones_pedido"
  ON "envio_cotizaciones" ("id_pedido");
CREATE INDEX IF NOT EXISTS "idx_envio_cotizaciones_usuario"
  ON "envio_cotizaciones" ("id_usuario");
