-- Sales tax por estado (EE.UU.): el impuesto de ventas varía por estado y no hay
-- impuesto federal. estado_codigo permite tasas específicas por estado; las filas
-- con estado_codigo NULL siguen aplicando a todo el país (p.ej. IVA de México).
-- Backward-compatible: filas existentes quedan con estado_codigo NULL.

ALTER TABLE "tasas_impuesto" ADD COLUMN "estado_codigo" VARCHAR(3);

CREATE INDEX "idx_tasas_pais_estado" ON "tasas_impuesto"("pais_iso2", "estado_codigo");
