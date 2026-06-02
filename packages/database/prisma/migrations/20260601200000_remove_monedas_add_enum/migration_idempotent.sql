-- Idempotent version: handles partial state from failed migration

-- Paso 1: Cleanup data (safe to re-run, only affects non MXN/USD values)
DO $$ BEGIN
  DELETE FROM "tasas_cambio"
    WHERE "moneda_origen" NOT IN ('MXN', 'USD')
       OR "moneda_destino" NOT IN ('MXN', 'USD');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "paises" SET "moneda_default" = 'USD' WHERE "moneda_default" NOT IN ('MXN', 'USD');
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "usuarios" SET "moneda_preferida" = 'MXN' WHERE "moneda_preferida" NOT IN ('MXN', 'USD');
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "tasas_impuesto" SET "moneda_monto_fijo" = NULL WHERE "moneda_monto_fijo" NOT IN ('MXN', 'USD') AND "moneda_monto_fijo" IS NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "pedido_productor" SET "moneda" = NULL WHERE "moneda" NOT IN ('MXN', 'USD') AND "moneda" IS NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "comisiones" SET "moneda_monto_fijo" = NULL WHERE "moneda_monto_fijo" NOT IN ('MXN', 'USD') AND "moneda_monto_fijo" IS NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "envio_cotizaciones" SET "moneda" = NULL WHERE "moneda" NOT IN ('MXN', 'USD') AND "moneda" IS NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "facturas" SET "moneda" = NULL WHERE "moneda" NOT IN ('MXN', 'USD') AND "moneda" IS NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "lista_deseos_item" SET "moneda_snapshot" = NULL WHERE "moneda_snapshot" NOT IN ('MXN', 'USD') AND "moneda_snapshot" IS NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "pagos" SET "moneda" = 'MXN' WHERE "moneda" NOT IN ('MXN', 'USD');
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "pedidos" SET "moneda" = 'MXN' WHERE "moneda" NOT IN ('MXN', 'USD') AND "moneda" IS NOT NULL;
  UPDATE "pedidos" SET "moneda_referencia" = 'USD' WHERE "moneda_referencia" NOT IN ('MXN', 'USD') AND "moneda_referencia" IS NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "productos" SET "moneda_base" = 'MXN' WHERE "moneda_base" NOT IN ('MXN', 'USD');
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "payouts" SET "moneda" = 'MXN' WHERE "moneda" NOT IN ('MXN', 'USD');
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "payment_fees" SET "moneda" = 'MXN' WHERE "moneda" NOT IN ('MXN', 'USD');
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "refunds" SET "moneda" = 'MXN' WHERE "moneda" NOT IN ('MXN', 'USD');
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "carrito_item" SET "moneda_snapshot" = 'MXN' WHERE "moneda_snapshot" NOT IN ('MXN', 'USD');
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "detalle_pedido" SET "moneda_compra" = 'MXN' WHERE "moneda_compra" NOT IN ('MXN', 'USD');
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "envios" SET "moneda_aduana" = 'MXN' WHERE "moneda_aduana" NOT IN ('MXN', 'USD');
  UPDATE "envios" SET "moneda_costo" = 'MXN' WHERE "moneda_costo" NOT IN ('MXN', 'USD');
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Paso 2: Drop FK constraints (IF EXISTS = safe to re-run)
ALTER TABLE "pagos"             DROP CONSTRAINT IF EXISTS "pagos_moneda_fkey";
ALTER TABLE "pedidos"           DROP CONSTRAINT IF EXISTS "pedidos_moneda_fkey";
ALTER TABLE "productos"         DROP CONSTRAINT IF EXISTS "productos_moneda_base_fkey";
ALTER TABLE "payouts"           DROP CONSTRAINT IF EXISTS "payouts_moneda_fkey";
ALTER TABLE "paises"            DROP CONSTRAINT IF EXISTS "paises_moneda_default_fkey";
ALTER TABLE "pedido_productor"  DROP CONSTRAINT IF EXISTS "pedido_productor_moneda_fkey";
ALTER TABLE "tasas_cambio"      DROP CONSTRAINT IF EXISTS "tasas_cambio_moneda_origen_fkey";
ALTER TABLE "tasas_cambio"      DROP CONSTRAINT IF EXISTS "tasas_cambio_moneda_destino_fkey";
ALTER TABLE "tasas_impuesto"    DROP CONSTRAINT IF EXISTS "tasas_impuesto_moneda_monto_fijo_fkey";

-- Paso 3: Create enum (EXCEPTION handles the case it already exists)
DO $$ BEGIN
  CREATE TYPE "Moneda" AS ENUM ('MXN', 'USD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Paso 4: Convert columns — each in its own DO block; skip if already converted
DO $$ BEGIN
  ALTER TABLE "carrito_item" ALTER COLUMN "moneda_snapshot" TYPE "Moneda" USING "moneda_snapshot"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "detalle_pedido" ALTER COLUMN "moneda_compra" TYPE "Moneda" USING "moneda_compra"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "envio_cotizaciones" ALTER COLUMN "moneda" TYPE "Moneda" USING "moneda"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "envios" ALTER COLUMN "moneda_aduana" TYPE "Moneda" USING "moneda_aduana"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "envios" ALTER COLUMN "moneda_costo" TYPE "Moneda" USING "moneda_costo"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "facturas" ALTER COLUMN "moneda" TYPE "Moneda" USING "moneda"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "lista_deseos_item" ALTER COLUMN "moneda_snapshot" TYPE "Moneda" USING "moneda_snapshot"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "pagos" ALTER COLUMN "moneda" TYPE "Moneda" USING "moneda"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "pedidos" ALTER COLUMN "moneda" TYPE "Moneda" USING "moneda"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "pedidos" ALTER COLUMN "moneda_referencia" TYPE "Moneda" USING "moneda_referencia"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "pedido_productor" ALTER COLUMN "moneda" TYPE "Moneda" USING "moneda"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "productos" ALTER COLUMN "moneda_base" TYPE "Moneda" USING "moneda_base"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "payouts" ALTER COLUMN "moneda" TYPE "Moneda" USING "moneda"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "paises" ALTER COLUMN "moneda_default" TYPE "Moneda" USING "moneda_default"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "tasas_cambio" ALTER COLUMN "moneda_origen" TYPE "Moneda" USING "moneda_origen"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "tasas_cambio" ALTER COLUMN "moneda_destino" TYPE "Moneda" USING "moneda_destino"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "tasas_impuesto" ALTER COLUMN "moneda_monto_fijo" TYPE "Moneda" USING "moneda_monto_fijo"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "comisiones" ALTER COLUMN "moneda_monto_fijo" TYPE "Moneda" USING "moneda_monto_fijo"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "payment_fees" ALTER COLUMN "moneda" TYPE "Moneda" USING "moneda"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "refunds" ALTER COLUMN "moneda" TYPE "Moneda" USING "moneda"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "usuarios" ALTER COLUMN "moneda_preferida" TYPE "Moneda" USING "moneda_preferida"::"Moneda";
EXCEPTION WHEN others THEN NULL;
END $$;

-- Paso 5: Drop monedas table if it still exists
DROP TABLE IF EXISTS "monedas";
