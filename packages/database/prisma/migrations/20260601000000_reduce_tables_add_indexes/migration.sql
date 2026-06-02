-- ============================================================
-- Migration: reduce_tables_add_indexes
-- Date: 2026-06-01
-- Purpose:
--   Fase 1: Eliminar tabla productos_traducciones (duplica campo JSONB traducciones en productos)
--   Fase 2: Unificar categorias_traducciones + tiendas_traducciones en tabla polimórfica traducciones
--   Fase 4: Agregar índices faltantes en FKs de alto impacto
--   Fase 5: Cambiar tipo de lotes.grado_alcohol de FLOAT a DECIMAL(5,2)
-- ============================================================

-- ============================================================
-- FASE 1: Eliminar productos_traducciones
-- El campo JSONB productos.traducciones es la fuente de verdad activa.
-- ============================================================
DROP TABLE IF EXISTS "productos_traducciones";

-- ============================================================
-- FASE 2: Tabla unificada de traducciones
-- ============================================================

CREATE TABLE "traducciones" (
  "entidad_tipo"   VARCHAR(30)   NOT NULL,
  "entidad_id"     INTEGER       NOT NULL,
  "idioma"         VARCHAR(10)   NOT NULL,
  "nombre"         VARCHAR(200),
  "descripcion"    TEXT,
  "actualizado_en" TIMESTAMPTZ(6),
  CONSTRAINT "traducciones_pkey" PRIMARY KEY ("entidad_tipo", "entidad_id", "idioma")
);

CREATE INDEX "idx_traducciones_entidad"
  ON "traducciones"("entidad_tipo", "entidad_id");

-- Migrar datos existentes de categorias_traducciones
INSERT INTO "traducciones" ("entidad_tipo", "entidad_id", "idioma", "nombre", "descripcion")
SELECT 'categoria', "id_categoria", "idioma", "nombre", "descripcion"
FROM "categorias_traducciones"
ON CONFLICT DO NOTHING;

-- Migrar datos existentes de tiendas_traducciones
INSERT INTO "traducciones" ("entidad_tipo", "entidad_id", "idioma", "nombre", "descripcion")
SELECT 'tienda', "id_tienda", "idioma", "nombre", "descripcion"
FROM "tiendas_traducciones"
ON CONFLICT DO NOTHING;

-- Eliminar tablas antiguas
DROP TABLE IF EXISTS "categorias_traducciones";
DROP TABLE IF EXISTS "tiendas_traducciones";

-- ============================================================
-- FASE 4: Índices faltantes
-- ============================================================

-- CRÍTICO: detalle_pedido.id_pedido — FK sin índice, usado en cada carga de pedido
CREATE INDEX "idx_detalle_pedido"
  ON "detalle_pedido"("id_pedido");

-- ALTO: refresh_tokens.id_usuario — consultado en cada refresh de token
CREATE INDEX "idx_refresh_tokens_usuario"
  ON "refresh_tokens"("id_usuario");

-- ALTO: lotes.id_productor — consultas de dashboard productor
CREATE INDEX "idx_lotes_productor"
  ON "lotes"("id_productor");

-- MEDIO: facturas.id_pedido — FK sin índice
CREATE INDEX "idx_facturas_pedido"
  ON "facturas"("id_pedido");

-- MEDIO: resenas — agregaciones por producto con soft delete
CREATE INDEX "idx_resenas_prod_eliminado"
  ON "resenas"("id_producto", "eliminado_en");

-- ============================================================
-- FASE 5: Corregir tipo de lotes.grado_alcohol (FLOAT → DECIMAL)
-- FLOAT puede producir valores como 40.500000001 en UI.
-- ============================================================
ALTER TABLE "lotes"
  ALTER COLUMN "grado_alcohol" TYPE DECIMAL(5,2)
  USING ROUND("grado_alcohol"::NUMERIC, 2);
