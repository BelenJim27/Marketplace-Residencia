-- Una venta puede conservar historial de CFDI cancelados, pero solo una factura
-- activa (preliminar/timbrada/error) por pedido. La sustitución fiscal requiere
-- conservar el comprobante cancelado y relacionarlo con el UUID sustituto.

ALTER TABLE "facturas"
  ADD COLUMN IF NOT EXISTS "cancelado_en" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "motivo_cancelacion" VARCHAR(2),
  ADD COLUMN IF NOT EXISTS "uuid_sustituto" VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "nombre_razon_social" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "email_factura" VARCHAR(254),
  ADD COLUMN IF NOT EXISTS "codigo_postal" VARCHAR(5);

-- Los registros actuales son documentos simulados, no CFDI timbrados.
UPDATE "facturas"
SET "estado" = CASE
  WHEN lower(trim("estado")) = 'cancelada' THEN 'cancelada'
  WHEN lower(trim("estado")) = 'timbrada' THEN 'timbrada'
  WHEN lower(trim("estado")) = 'error' THEN 'error'
  ELSE 'preliminar'
END;

UPDATE "facturas"
SET "cancelado_en" = COALESCE("cancelado_en", "actualizado_en", "creado_en")
WHERE "estado" = 'cancelada';

UPDATE "facturas" AS f
SET
  "subtotal" = COALESCE(f."subtotal", p."total" - p."tax_amount"),
  "impuestos_total" = COALESCE(f."impuestos_total", p."tax_amount"),
  "total" = COALESCE(f."total", p."total"),
  "moneda" = COALESCE(f."moneda", p."moneda")
FROM "pedidos" AS p
WHERE p."id_pedido" = f."id_pedido";

ALTER TABLE "facturas" ALTER COLUMN "estado" SET DEFAULT 'preliminar';

-- No se eliminan ni cancelan duplicados silenciosamente. La migración se detiene
-- para que el equipo los revise y preserve la trazabilidad antes de desplegar.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "facturas" WHERE "id_pedido" IS NULL) THEN
    RAISE EXCEPTION 'Existen facturas sin pedido. Deben corregirse antes de aplicar la restricción.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "facturas"
    WHERE "estado" <> 'cancelada'
    GROUP BY "id_pedido"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existen pedidos con más de una factura activa. Resuelve los duplicados antes de aplicar uq_facturas_pedido_activa.';
  END IF;
END $$;

ALTER TABLE "facturas" ALTER COLUMN "id_pedido" SET NOT NULL;

ALTER TABLE "facturas"
  ADD CONSTRAINT "ck_facturas_estado"
  CHECK ("estado" IN ('preliminar', 'timbrada', 'cancelada', 'error'));

ALTER TABLE "facturas"
  ADD CONSTRAINT "ck_facturas_cancelacion"
  CHECK (
    ("estado" = 'cancelada' AND "cancelado_en" IS NOT NULL)
    OR
    ("estado" <> 'cancelada' AND "cancelado_en" IS NULL)
  );

CREATE UNIQUE INDEX "uq_facturas_pedido_activa"
  ON "facturas" ("id_pedido")
  WHERE "estado" <> 'cancelada';
