-- ============================================================
-- Migración: Eliminar tabla monedas, crear enum Moneda {MXN, USD}
-- ============================================================

-- Paso 1: Limpiar datos con monedas fuera del enum (EUR, BRL, etc.)
-- tasas_cambio: eliminar filas con monedas no soportadas
DELETE FROM "tasas_cambio"
  WHERE "moneda_origen" NOT IN ('MXN', 'USD')
     OR "moneda_destino" NOT IN ('MXN', 'USD');

-- paises: actualizar moneda_default a USD como fallback
UPDATE "paises" SET "moneda_default" = 'USD'
  WHERE "moneda_default" NOT IN ('MXN', 'USD');

-- usuarios: moneda_preferida → MXN si no es soportada
UPDATE "usuarios" SET "moneda_preferida" = 'MXN'
  WHERE "moneda_preferida" NOT IN ('MXN', 'USD');

-- tasas_impuesto: moneda_monto_fijo → NULL si no es soportada (campo opcional)
UPDATE "tasas_impuesto" SET "moneda_monto_fijo" = NULL
  WHERE "moneda_monto_fijo" NOT IN ('MXN', 'USD') AND "moneda_monto_fijo" IS NOT NULL;

-- pedido_productor: moneda → NULL si no es soportada (campo opcional)
UPDATE "pedido_productor" SET "moneda" = NULL
  WHERE "moneda" NOT IN ('MXN', 'USD') AND "moneda" IS NOT NULL;

-- comisiones: moneda_monto_fijo → NULL si no es soportada (campo opcional)
UPDATE "comisiones" SET "moneda_monto_fijo" = NULL
  WHERE "moneda_monto_fijo" NOT IN ('MXN', 'USD') AND "moneda_monto_fijo" IS NOT NULL;

-- envio_cotizaciones: moneda → NULL si no es soportada (campo opcional)
UPDATE "envio_cotizaciones" SET "moneda" = NULL
  WHERE "moneda" NOT IN ('MXN', 'USD') AND "moneda" IS NOT NULL;

-- facturas: moneda → NULL si no es soportada (campo opcional)
UPDATE "facturas" SET "moneda" = NULL
  WHERE "moneda" NOT IN ('MXN', 'USD') AND "moneda" IS NOT NULL;

-- lista_deseos_item: moneda_snapshot → NULL si no es soportada (campo opcional)
UPDATE "lista_deseos_item" SET "moneda_snapshot" = NULL
  WHERE "moneda_snapshot" NOT IN ('MXN', 'USD') AND "moneda_snapshot" IS NOT NULL;

-- pagos: moneda → MXN si no es soportada (campo requerido)
UPDATE "pagos" SET "moneda" = 'MXN'
  WHERE "moneda" NOT IN ('MXN', 'USD');

-- pedidos: moneda y moneda_referencia → MXN/USD si no son soportadas
UPDATE "pedidos" SET "moneda" = 'MXN'
  WHERE "moneda" NOT IN ('MXN', 'USD');
UPDATE "pedidos" SET "moneda_referencia" = 'USD'
  WHERE "moneda_referencia" NOT IN ('MXN', 'USD');

-- productos: moneda_base → MXN si no es soportada
UPDATE "productos" SET "moneda_base" = 'MXN'
  WHERE "moneda_base" NOT IN ('MXN', 'USD');

-- payouts: moneda → MXN si no es soportada
UPDATE "payouts" SET "moneda" = 'MXN'
  WHERE "moneda" NOT IN ('MXN', 'USD');

-- payment_fees: moneda → MXN si no es soportada
UPDATE "payment_fees" SET "moneda" = 'MXN'
  WHERE "moneda" NOT IN ('MXN', 'USD');

-- refunds: moneda → MXN si no es soportada
UPDATE "refunds" SET "moneda" = 'MXN'
  WHERE "moneda" NOT IN ('MXN', 'USD');

-- carrito_item: moneda_snapshot → MXN si no es soportada
UPDATE "carrito_item" SET "moneda_snapshot" = 'MXN'
  WHERE "moneda_snapshot" NOT IN ('MXN', 'USD');

-- detalle_pedido: moneda_compra → MXN si no es soportada
UPDATE "detalle_pedido" SET "moneda_compra" = 'MXN'
  WHERE "moneda_compra" NOT IN ('MXN', 'USD');

-- envios: moneda_aduana y moneda_costo → MXN si no son soportadas
UPDATE "envios" SET "moneda_aduana" = 'MXN'
  WHERE "moneda_aduana" NOT IN ('MXN', 'USD');
UPDATE "envios" SET "moneda_costo" = 'MXN'
  WHERE "moneda_costo" NOT IN ('MXN', 'USD');

-- Paso 2: Eliminar FK constraints hacia monedas
ALTER TABLE "pagos"             DROP CONSTRAINT IF EXISTS "pagos_moneda_fkey";
ALTER TABLE "pedidos"           DROP CONSTRAINT IF EXISTS "pedidos_moneda_fkey";
ALTER TABLE "productos"         DROP CONSTRAINT IF EXISTS "productos_moneda_base_fkey";
ALTER TABLE "payouts"           DROP CONSTRAINT IF EXISTS "payouts_moneda_fkey";
ALTER TABLE "paises"            DROP CONSTRAINT IF EXISTS "paises_moneda_default_fkey";
ALTER TABLE "pedido_productor"  DROP CONSTRAINT IF EXISTS "pedido_productor_moneda_fkey";
ALTER TABLE "tasas_cambio"      DROP CONSTRAINT IF EXISTS "tasas_cambio_moneda_origen_fkey";
ALTER TABLE "tasas_cambio"      DROP CONSTRAINT IF EXISTS "tasas_cambio_moneda_destino_fkey";
ALTER TABLE "tasas_impuesto"    DROP CONSTRAINT IF EXISTS "tasas_impuesto_moneda_monto_fijo_fkey";

-- Paso 3: Crear el tipo enum
CREATE TYPE "Moneda" AS ENUM ('MXN', 'USD');

-- Paso 4: Convertir todas las columnas al tipo enum

ALTER TABLE "carrito_item"       ALTER COLUMN "moneda_snapshot"    TYPE "Moneda" USING "moneda_snapshot"::"Moneda";
ALTER TABLE "detalle_pedido"     ALTER COLUMN "moneda_compra"       TYPE "Moneda" USING "moneda_compra"::"Moneda";
ALTER TABLE "envio_cotizaciones" ALTER COLUMN "moneda"              TYPE "Moneda" USING "moneda"::"Moneda";
ALTER TABLE "envios"             ALTER COLUMN "moneda_aduana"       TYPE "Moneda" USING "moneda_aduana"::"Moneda";
ALTER TABLE "envios"             ALTER COLUMN "moneda_costo"        TYPE "Moneda" USING "moneda_costo"::"Moneda";
ALTER TABLE "facturas"           ALTER COLUMN "moneda"              TYPE "Moneda" USING "moneda"::"Moneda";
ALTER TABLE "lista_deseos_item"  ALTER COLUMN "moneda_snapshot"     TYPE "Moneda" USING "moneda_snapshot"::"Moneda";
ALTER TABLE "pagos"              ALTER COLUMN "moneda"              TYPE "Moneda" USING "moneda"::"Moneda";
ALTER TABLE "pedidos"            ALTER COLUMN "moneda"              TYPE "Moneda" USING "moneda"::"Moneda";
ALTER TABLE "pedidos"            ALTER COLUMN "moneda_referencia"   TYPE "Moneda" USING "moneda_referencia"::"Moneda";
ALTER TABLE "pedido_productor"   ALTER COLUMN "moneda"              TYPE "Moneda" USING "moneda"::"Moneda";
ALTER TABLE "productos"          ALTER COLUMN "moneda_base"         TYPE "Moneda" USING "moneda_base"::"Moneda";
ALTER TABLE "payouts"            ALTER COLUMN "moneda"              TYPE "Moneda" USING "moneda"::"Moneda";
ALTER TABLE "paises"             ALTER COLUMN "moneda_default"      TYPE "Moneda" USING "moneda_default"::"Moneda";
ALTER TABLE "tasas_cambio"       ALTER COLUMN "moneda_origen"       TYPE "Moneda" USING "moneda_origen"::"Moneda";
ALTER TABLE "tasas_cambio"       ALTER COLUMN "moneda_destino"      TYPE "Moneda" USING "moneda_destino"::"Moneda";
ALTER TABLE "tasas_impuesto"     ALTER COLUMN "moneda_monto_fijo"   TYPE "Moneda" USING "moneda_monto_fijo"::"Moneda";
ALTER TABLE "comisiones"         ALTER COLUMN "moneda_monto_fijo"   TYPE "Moneda" USING "moneda_monto_fijo"::"Moneda";
ALTER TABLE "payment_fees"       ALTER COLUMN "moneda"              TYPE "Moneda" USING "moneda"::"Moneda";
ALTER TABLE "refunds"            ALTER COLUMN "moneda"              TYPE "Moneda" USING "moneda"::"Moneda";
ALTER TABLE "usuarios"           ALTER COLUMN "moneda_preferida"    TYPE "Moneda" USING "moneda_preferida"::"Moneda";

-- Paso 5: Eliminar la tabla monedas
DROP TABLE "monedas";
