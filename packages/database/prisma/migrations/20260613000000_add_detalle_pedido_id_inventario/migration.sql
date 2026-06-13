-- Trazabilidad de lote (multi-inventario): registra de qué fila de inventario
-- se descontó cada línea del pedido, para restaurar el stock al MISMO lote al
-- cancelar/expirar (antes se restauraba a un lote arbitrario por `orderBy stock asc`).

ALTER TABLE "detalle_pedido" ADD COLUMN "id_inventario" BIGINT;

CREATE INDEX "idx_detalle_inventario" ON "detalle_pedido"("id_inventario");

ALTER TABLE "detalle_pedido"
  ADD CONSTRAINT "detalle_pedido_id_inventario_fkey"
  FOREIGN KEY ("id_inventario") REFERENCES "inventario"("id_inventario")
  ON DELETE SET NULL ON UPDATE NO ACTION;
