-- Migración: cierre de 6 gaps críticos para internacionalización
-- Genera tablas paises, idiomas, tasas_cambio, comisiones, payouts, *_traducciones
-- Agrega columnas a usuarios, detalle_pedido, pedido_productor
-- Agrega FKs a paises desde regiones, tiendas, direcciones, tasas_impuesto, pedidos
--
-- Pre-requisito antes de ejecutar:
--   1. Verificar que las 4 migraciones previas estén marcadas como aplicadas:
--      npx prisma migrate resolve --applied 20260414030603_init
--      npx prisma migrate resolve --applied 20260417010000_add_biografia
--      npx prisma migrate resolve --applied 20260420000001_add_estado_productor
--      npx prisma migrate resolve --applied 20260421042621_eliminar_orden_categorias
--   2. Esta migración inserta seeds mínimos (idiomas es/en, paises MX/US) ANTES
--      de los FKs hacia paises para no romper constraints sobre filas existentes
--      con pais_operacion='MX' o pais_iso2='MX'.

-- ============================================================
-- 1. Tablas catálogo (sin FKs hacia ellas todavía)
-- ============================================================

CREATE TABLE "idiomas" (
    "codigo"       VARCHAR(10) NOT NULL,
    "nombre"       VARCHAR(80) NOT NULL,
    "nombre_local" VARCHAR(80),
    "activo"       BOOLEAN NOT NULL DEFAULT true,
    "rtl"          BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "idiomas_pkey" PRIMARY KEY ("codigo")
);

CREATE TABLE "paises" (
    "iso2"             CHAR(2) NOT NULL,
    "iso3"             CHAR(3) NOT NULL,
    "nombre"           VARCHAR(120) NOT NULL,
    "nombre_local"     VARCHAR(120),
    "moneda_default"   CHAR(3) NOT NULL,
    "idioma_default"   VARCHAR(10) NOT NULL DEFAULT 'es',
    "prefijo_telefono" VARCHAR(8),
    "activo_venta"     BOOLEAN NOT NULL DEFAULT false,
    "activo_envio"     BOOLEAN NOT NULL DEFAULT false,
    "creado_en"        TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "paises_pkey" PRIMARY KEY ("iso2")
);

CREATE UNIQUE INDEX "paises_iso3_key" ON "paises"("iso3");
CREATE INDEX "idx_paises_activo_venta" ON "paises"("activo_venta");

ALTER TABLE "paises"
  ADD CONSTRAINT "paises_moneda_default_fkey" FOREIGN KEY ("moneda_default")
    REFERENCES "monedas"("codigo") ON DELETE RESTRICT ON UPDATE NO ACTION,
  ADD CONSTRAINT "paises_idioma_default_fkey" FOREIGN KEY ("idioma_default")
    REFERENCES "idiomas"("codigo") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ============================================================
-- 2. Seed mínimo: idiomas y paises requeridos por datos existentes
-- ============================================================

INSERT INTO "monedas" ("codigo", "nombre", "simbolo", "activo")
  VALUES ('MXN', 'Peso Mexicano', '$', true),
         ('USD', 'Dólar Estadounidense', 'US$', true),
         ('EUR', 'Euro', '€', true)
  ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "idiomas" ("codigo", "nombre", "nombre_local", "activo", "rtl") VALUES
  ('es',    'Spanish',  'Español',  true, false),
  ('en',    'English',  'English',  true, false),
  ('es-MX', 'Spanish (Mexico)',        'Español (México)',         true, false),
  ('en-US', 'English (United States)', 'English (United States)',  true, false);

INSERT INTO "paises" ("iso2", "iso3", "nombre", "nombre_local", "moneda_default", "idioma_default", "prefijo_telefono", "activo_venta", "activo_envio") VALUES
  ('MX', 'MEX', 'Mexico',        'México',         'MXN', 'es', '+52', true,  true),
  ('US', 'USA', 'United States', 'United States',  'USD', 'en', '+1',  false, false);

-- ============================================================
-- 3. tasas_cambio
-- ============================================================

CREATE TABLE "tasas_cambio" (
    "moneda_origen"  CHAR(3) NOT NULL,
    "moneda_destino" CHAR(3) NOT NULL,
    "vigente_desde"  TIMESTAMPTZ(6) NOT NULL,
    "tasa"           DECIMAL(18,8) NOT NULL,
    "fuente"         VARCHAR(50) NOT NULL DEFAULT 'manual',
    "vigente_hasta"  TIMESTAMPTZ(6),
    "creado_en"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tasas_cambio_pkey" PRIMARY KEY ("moneda_origen","moneda_destino","vigente_desde")
);

CREATE INDEX "idx_tasas_cambio_lookup" ON "tasas_cambio"("moneda_origen", "moneda_destino", "vigente_hasta");

ALTER TABLE "tasas_cambio"
  ADD CONSTRAINT "tasas_cambio_moneda_origen_fkey"  FOREIGN KEY ("moneda_origen")
    REFERENCES "monedas"("codigo") ON DELETE RESTRICT ON UPDATE NO ACTION,
  ADD CONSTRAINT "tasas_cambio_moneda_destino_fkey" FOREIGN KEY ("moneda_destino")
    REFERENCES "monedas"("codigo") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ============================================================
-- 4. comisiones
-- ============================================================

CREATE TABLE "comisiones" (
    "id_comision"       SERIAL NOT NULL,
    "alcance"           VARCHAR(20) NOT NULL,
    "pais_iso2"         CHAR(2),
    "id_categoria"      INTEGER,
    "id_productor"      INTEGER,
    "porcentaje"        DECIMAL(6,4) NOT NULL,
    "monto_fijo"        DECIMAL(12,2),
    "moneda_monto_fijo" CHAR(3),
    "prioridad"         INTEGER NOT NULL DEFAULT 100,
    "vigente_desde"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigente_hasta"     TIMESTAMPTZ(6),
    "activo"            BOOLEAN NOT NULL DEFAULT true,
    "creado_en"         TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comisiones_pkey" PRIMARY KEY ("id_comision")
);

CREATE INDEX "idx_comisiones_resolucion" ON "comisiones"("alcance", "activo", "prioridad");
CREATE INDEX "idx_comisiones_productor"  ON "comisiones"("id_productor");

ALTER TABLE "comisiones"
  ADD CONSTRAINT "comisiones_pais_iso2_fkey"    FOREIGN KEY ("pais_iso2")
    REFERENCES "paises"("iso2")           ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "comisiones_id_categoria_fkey" FOREIGN KEY ("id_categoria")
    REFERENCES "categorias"("id_categoria") ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "comisiones_id_productor_fkey" FOREIGN KEY ("id_productor")
    REFERENCES "productores"("id_productor") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Seed: regla global 15%
INSERT INTO "comisiones" ("alcance", "porcentaje", "prioridad", "activo")
  VALUES ('global', 0.1500, 1000, true);

-- ============================================================
-- 5. payouts
-- ============================================================

CREATE TABLE "payouts" (
    "id_payout"          BIGSERIAL NOT NULL,
    "id_productor"       INTEGER NOT NULL,
    "moneda"             CHAR(3) NOT NULL,
    "monto_bruto"        DECIMAL(14,2) NOT NULL,
    "monto_comision"     DECIMAL(14,2) NOT NULL,
    "monto_neto"         DECIMAL(14,2) NOT NULL,
    "estado"             VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "proveedor"          VARCHAR(50),
    "referencia_externa" VARCHAR(150),
    "periodo_desde"      DATE NOT NULL,
    "periodo_hasta"      DATE NOT NULL,
    "notas"              TEXT,
    "creado_en"          TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "procesado_en"       TIMESTAMPTZ(6),
    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id_payout")
);

CREATE INDEX "idx_payouts_productor_estado" ON "payouts"("id_productor", "estado");

ALTER TABLE "payouts"
  ADD CONSTRAINT "payouts_id_productor_fkey" FOREIGN KEY ("id_productor")
    REFERENCES "productores"("id_productor") ON DELETE RESTRICT ON UPDATE NO ACTION,
  ADD CONSTRAINT "payouts_moneda_fkey"       FOREIGN KEY ("moneda")
    REFERENCES "monedas"("codigo")           ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ============================================================
-- 6. Tablas de traducciones
-- ============================================================

CREATE TABLE "productos_traducciones" (
    "id_producto"    BIGINT NOT NULL,
    "idioma"         VARCHAR(10) NOT NULL,
    "nombre"         VARCHAR(200) NOT NULL,
    "descripcion"    TEXT,
    "metadata"       JSONB NOT NULL DEFAULT '{}',
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "productos_traducciones_pkey" PRIMARY KEY ("id_producto","idioma")
);

CREATE INDEX "idx_prod_trad_idioma" ON "productos_traducciones"("idioma");

ALTER TABLE "productos_traducciones"
  ADD CONSTRAINT "productos_traducciones_id_producto_fkey" FOREIGN KEY ("id_producto")
    REFERENCES "productos"("id_producto") ON DELETE CASCADE  ON UPDATE NO ACTION,
  ADD CONSTRAINT "productos_traducciones_idioma_fkey"      FOREIGN KEY ("idioma")
    REFERENCES "idiomas"("codigo")        ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE TABLE "categorias_traducciones" (
    "id_categoria" INTEGER NOT NULL,
    "idioma"       VARCHAR(10) NOT NULL,
    "nombre"       VARCHAR(150) NOT NULL,
    "descripcion"  TEXT,
    CONSTRAINT "categorias_traducciones_pkey" PRIMARY KEY ("id_categoria","idioma")
);

ALTER TABLE "categorias_traducciones"
  ADD CONSTRAINT "categorias_traducciones_id_categoria_fkey" FOREIGN KEY ("id_categoria")
    REFERENCES "categorias"("id_categoria") ON DELETE CASCADE  ON UPDATE NO ACTION,
  ADD CONSTRAINT "categorias_traducciones_idioma_fkey"       FOREIGN KEY ("idioma")
    REFERENCES "idiomas"("codigo")          ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE TABLE "tiendas_traducciones" (
    "id_tienda"   INTEGER NOT NULL,
    "idioma"      VARCHAR(10) NOT NULL,
    "nombre"      VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    CONSTRAINT "tiendas_traducciones_pkey" PRIMARY KEY ("id_tienda","idioma")
);

ALTER TABLE "tiendas_traducciones"
  ADD CONSTRAINT "tiendas_traducciones_id_tienda_fkey" FOREIGN KEY ("id_tienda")
    REFERENCES "tiendas"("id_tienda") ON DELETE CASCADE  ON UPDATE NO ACTION,
  ADD CONSTRAINT "tiendas_traducciones_idioma_fkey"    FOREIGN KEY ("idioma")
    REFERENCES "idiomas"("codigo")    ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ============================================================
-- 7. Modificaciones a tablas existentes — columnas nullable (aditivas)
-- ============================================================

ALTER TABLE "usuarios"
  ADD COLUMN "pais_iso2" CHAR(2),
  ADD COLUMN "timezone"  VARCHAR(64);

ALTER TABLE "detalle_pedido"
  ADD COLUMN "id_productor" INTEGER,
  ADD COLUMN "id_tienda"    INTEGER;

CREATE INDEX "idx_detalle_productor" ON "detalle_pedido"("id_productor");
CREATE INDEX "idx_detalle_tienda"    ON "detalle_pedido"("id_tienda");

ALTER TABLE "pedido_productor"
  ADD COLUMN "subtotal_bruto"       DECIMAL(14,2),
  ADD COLUMN "comision_marketplace" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "monto_neto_productor" DECIMAL(14,2),
  ADD COLUMN "moneda"               CHAR(3),
  ADD COLUMN "id_comision_aplicada" INTEGER,
  ADD COLUMN "id_payout"            BIGINT;

CREATE INDEX "idx_pedido_prod_payout" ON "pedido_productor"("id_payout");

-- ============================================================
-- 8. Backfill antes de FKs (seguro: usa LEFT JOIN, no rompe filas sin productor)
-- ============================================================

-- Denormalizar id_productor / id_tienda en detalle_pedido
UPDATE "detalle_pedido" d
   SET "id_tienda"    = p."id_tienda",
       "id_productor" = t."id_productor"
  FROM "productos" p
  JOIN "tiendas"   t ON t."id_tienda" = p."id_tienda"
 WHERE p."id_producto" = d."id_producto"
   AND d."id_productor" IS NULL;

-- Backfill subtotal_bruto / monto_neto_productor en pedido_productor (regla global 15%)
WITH subtotales AS (
  SELECT pp."id_pedido",
         pp."id_productor",
         SUM(d."precio_compra" * d."cantidad")::DECIMAL(14,2) AS subtotal,
         pe."moneda"::CHAR(3) AS moneda
    FROM "pedido_productor" pp
    JOIN "detalle_pedido"   d  ON d."id_pedido" = pp."id_pedido"
                              AND d."id_productor" = pp."id_productor"
    JOIN "pedidos"          pe ON pe."id_pedido" = pp."id_pedido"
   GROUP BY pp."id_pedido", pp."id_productor", pe."moneda"
)
UPDATE "pedido_productor" pp
   SET "subtotal_bruto"       = s."subtotal",
       "comision_marketplace" = ROUND(s."subtotal" * 0.15, 2),
       "monto_neto_productor" = s."subtotal" - ROUND(s."subtotal" * 0.15, 2),
       "moneda"               = s."moneda"
  FROM subtotales s
 WHERE s."id_pedido"    = pp."id_pedido"
   AND s."id_productor" = pp."id_productor"
   AND pp."subtotal_bruto" IS NULL;

-- ============================================================
-- 9. FKs en columnas modificadas
-- ============================================================

ALTER TABLE "detalle_pedido"
  ADD CONSTRAINT "detalle_pedido_id_productor_fkey" FOREIGN KEY ("id_productor")
    REFERENCES "productores"("id_productor") ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "detalle_pedido_id_tienda_fkey"    FOREIGN KEY ("id_tienda")
    REFERENCES "tiendas"("id_tienda")         ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "pedido_productor"
  ADD CONSTRAINT "pedido_productor_moneda_fkey"               FOREIGN KEY ("moneda")
    REFERENCES "monedas"("codigo")           ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "pedido_productor_id_comision_aplicada_fkey" FOREIGN KEY ("id_comision_aplicada")
    REFERENCES "comisiones"("id_comision")   ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "pedido_productor_id_payout_fkey"            FOREIGN KEY ("id_payout")
    REFERENCES "payouts"("id_payout")        ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "usuarios"
  ADD CONSTRAINT "usuarios_pais_iso2_fkey" FOREIGN KEY ("pais_iso2")
    REFERENCES "paises"("iso2") ON DELETE SET NULL ON UPDATE NO ACTION;

-- ============================================================
-- 10. FKs hacia paises desde tablas existentes (seeds ya garantizan MX/US)
-- ============================================================

ALTER TABLE "regiones"
  ADD CONSTRAINT "regiones_pais_iso2_fkey" FOREIGN KEY ("pais_iso2")
    REFERENCES "paises"("iso2") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "tiendas"
  ADD CONSTRAINT "tiendas_pais_operacion_fkey" FOREIGN KEY ("pais_operacion")
    REFERENCES "paises"("iso2") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "direcciones"
  ADD CONSTRAINT "direcciones_pais_iso2_fkey" FOREIGN KEY ("pais_iso2")
    REFERENCES "paises"("iso2") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "tasas_impuesto"
  ADD CONSTRAINT "tasas_impuesto_pais_iso2_fkey" FOREIGN KEY ("pais_iso2")
    REFERENCES "paises"("iso2") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "pedidos"
  ADD CONSTRAINT "pedidos_pais_destino_iso2_fkey" FOREIGN KEY ("pais_destino_iso2")
    REFERENCES "paises"("iso2") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ============================================================
-- 11. Tasa de cambio inicial (informativa; producción debe poblarla con cron real)
-- ============================================================

INSERT INTO "tasas_cambio" ("moneda_origen", "moneda_destino", "vigente_desde", "tasa", "fuente") VALUES
  ('MXN', 'USD', NOW(), 0.05000000, 'manual'),
  ('USD', 'MXN', NOW(), 20.00000000, 'manual');
