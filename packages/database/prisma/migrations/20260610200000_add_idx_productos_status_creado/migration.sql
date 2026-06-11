-- Índice para el catálogo público de productos.
-- Patrón de query: WHERE status='activo' AND eliminado_en IS NULL ORDER BY creado_en DESC.
-- Antes solo existían idx_productos_status (simple) e idx_productos_tienda_status; ninguno
-- cubría el ORDER BY creado_en, forzando un sort en cada request del catálogo.
-- Idempotente (IF NOT EXISTS) para el flujo manual de Neon.
--
-- NOTA producción: en una base con tráfico/datos grandes, considera CREATE INDEX CONCURRENTLY
-- (fuera de transacción) para evitar bloquear escrituras durante la creación.

CREATE INDEX IF NOT EXISTS "idx_productos_status_creado"
  ON "productos" ("status", "eliminado_en", "creado_en" DESC);
