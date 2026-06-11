-- Idempotencia de líneas de pedido: un producto no puede aparecer dos veces en el mismo pedido.
-- Evita que un doble-click en checkout duplique la línea y baje stock dos veces (hallazgo #7).
CREATE UNIQUE INDEX "uq_detalle_pedido_producto" ON "detalle_pedido"("id_pedido", "id_producto");

-- Integridad de pagos: un payment_intent_id externo no puede registrarse dos veces (hallazgo #8).
-- En Postgres un índice único permite múltiples NULL, así que pagos sin intent no se ven afectados.
CREATE UNIQUE INDEX "uq_pagos_payment_intent_id" ON "pagos"("payment_intent_id");
