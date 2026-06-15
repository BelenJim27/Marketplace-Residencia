-- Nexo fiscal (EE.UU.): marca los país/estado donde el negocio tiene obligación de
-- cobrar el impuesto de ventas. Cuando una fila está marcada con nexo_activo pero no
-- hay una tasa vigente para el destino, el checkout se bloquea (no vender sin cobrar
-- el impuesto donde existe obligación). Backward-compatible: filas existentes quedan
-- en FALSE (sin nexo declarado → no bloquea).

ALTER TABLE "tasas_impuesto" ADD COLUMN "nexo_activo" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "idx_tasas_nexo" ON "tasas_impuesto"("pais_iso2", "estado_codigo", "nexo_activo");
