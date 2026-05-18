-- ============================================================
-- Migration: add_productor_categoria
-- Date: 2026-05-12
-- Purpose: Add missing join table for productor <-> categoria relations.
-- ============================================================

CREATE TABLE "productor_categoria" (
  "id_productor" INTEGER NOT NULL,
  "id_categoria" INTEGER NOT NULL,
  "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "productor_categoria_pkey" PRIMARY KEY ("id_productor", "id_categoria")
);

CREATE INDEX "idx_prod_cat_categoria"
  ON "productor_categoria"("id_categoria");

ALTER TABLE "productor_categoria"
  ADD CONSTRAINT "productor_categoria_id_productor_fkey"
  FOREIGN KEY ("id_productor") REFERENCES "productores"("id_productor")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "productor_categoria"
  ADD CONSTRAINT "productor_categoria_id_categoria_fkey"
  FOREIGN KEY ("id_categoria") REFERENCES "categorias"("id_categoria")
  ON DELETE CASCADE ON UPDATE NO ACTION;
