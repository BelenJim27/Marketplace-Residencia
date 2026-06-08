-- Migration: migrar_bodega_a_direcciones
-- Adds id_direccion_bodega FK on productores → direcciones.
-- Migrates existing bodega_* data into direcciones rows of tipo='bodega'.

-- 1. Add FK column
ALTER TABLE "productores" ADD COLUMN "id_direccion_bodega" BIGINT;

-- 2. Create direcciones rows for producers that already have bodega data
INSERT INTO "direcciones" (
  "id_usuario", "tipo", "linea_1", "ciudad", "estado",
  "codigo_postal", "pais_iso2", "telefono", "ubicacion", "es_internacional"
)
SELECT
  p."id_usuario",
  'bodega',
  p."bodega_calle",
  p."bodega_ciudad",
  p."bodega_estado",
  p."bodega_codigo_postal",
  COALESCE(p."bodega_pais_iso2", 'MX'),
  p."bodega_telefono",
  '{}'::jsonb,
  false
FROM "productores" p
WHERE p."bodega_calle" IS NOT NULL
   OR p."bodega_ciudad" IS NOT NULL
   OR p."bodega_codigo_postal" IS NOT NULL;

-- 3. Link FK
UPDATE "productores" p
SET "id_direccion_bodega" = d."id_direccion"
FROM "direcciones" d
WHERE d."id_usuario" = p."id_usuario"
  AND d."tipo" = 'bodega';

-- 4. Index + FK constraint
CREATE INDEX "idx_productores_dir_bodega" ON "productores"("id_direccion_bodega");

ALTER TABLE "productores"
  ADD CONSTRAINT "productores_id_direccion_bodega_fkey"
  FOREIGN KEY ("id_direccion_bodega")
  REFERENCES "direcciones"("id_direccion")
  ON DELETE SET NULL ON UPDATE NO ACTION;
