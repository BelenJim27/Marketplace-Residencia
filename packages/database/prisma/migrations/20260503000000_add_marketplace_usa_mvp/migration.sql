-- ============================================================
-- Migration: add_marketplace_usa_mvp
-- Date: 2026-05-03
-- Purpose: Fase 1 MVP marketplace USA — campos para verificación
--          de edad por categoría, sales tax/shipping en pedidos,
--          Stripe Connect en productores, y restricciones de envío
--          por (país, estado, categoría).
-- Aditivo: solo ADD COLUMN y CREATE TABLE. No destructivo.
-- ============================================================

-- 1. usuarios: fecha de nacimiento (opcional, validada solo
--    al comprar productos restringidos).
ALTER TABLE "usuarios"
  ADD COLUMN "fecha_nacimiento" DATE;

-- 2. categorias: edad mínima por categoría (e.g. 21 = alcohol).
--    NULL = no requiere verificación.
ALTER TABLE "categorias"
  ADD COLUMN "requiere_edad_minima" INTEGER;

-- 3. productos: override de edad por producto + flag de firma
--    de adulto en entrega + lista de alérgenos.
ALTER TABLE "productos"
  ADD COLUMN "requiere_edad_minima" INTEGER,
  ADD COLUMN "requiere_firma_adulto" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "alergenos" TEXT[];

-- 4. pedidos: desglose de tax/shipping/discount.
ALTER TABLE "pedidos"
  ADD COLUMN "tax_amount"      DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "shipping_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- 5. envios: flag de firma adulto (se propaga a DHL).
ALTER TABLE "envios"
  ADD COLUMN "requires_adult_signature" BOOLEAN NOT NULL DEFAULT false;

-- 6. productores: campos para Stripe Connect Express.
ALTER TABLE "productores"
  ADD COLUMN "stripe_account_id"           VARCHAR(150),
  ADD COLUMN "stripe_onboarding_completed" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "productores_stripe_account_id_key"
  ON "productores"("stripe_account_id");

-- 7. restricciones_envio_categoria: tabla genérica para
--    bloquear envíos por (país, estado, categoría).
CREATE TABLE "restricciones_envio_categoria" (
    "id_restriccion" SERIAL          NOT NULL,
    "pais_iso2"      CHAR(2)         NOT NULL,
    "estado_codigo"  VARCHAR(10)     NOT NULL,
    "id_categoria"   INTEGER         NOT NULL,
    "permitido"      BOOLEAN         NOT NULL DEFAULT true,
    "notas"          TEXT,
    "vigente_desde"  TIMESTAMPTZ(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigente_hasta"  TIMESTAMPTZ(6),
    "creado_en"      TIMESTAMPTZ(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restricciones_envio_categoria_pkey"
      PRIMARY KEY ("id_restriccion")
);

CREATE INDEX "idx_restr_envio_pais_estado"
  ON "restricciones_envio_categoria"("pais_iso2", "estado_codigo");

CREATE INDEX "idx_restr_envio_categoria"
  ON "restricciones_envio_categoria"("id_categoria");

CREATE UNIQUE INDEX "restricciones_envio_categoria_pais_iso2_estado_codigo_id_ca_key"
  ON "restricciones_envio_categoria"("pais_iso2", "estado_codigo", "id_categoria");

ALTER TABLE "restricciones_envio_categoria"
  ADD CONSTRAINT "restricciones_envio_categoria_pais_iso2_fkey"
  FOREIGN KEY ("pais_iso2") REFERENCES "paises"("iso2")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "restricciones_envio_categoria"
  ADD CONSTRAINT "restricciones_envio_categoria_id_categoria_fkey"
  FOREIGN KEY ("id_categoria") REFERENCES "categorias"("id_categoria")
  ON DELETE CASCADE ON UPDATE NO ACTION;
