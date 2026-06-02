-- B10: Campos de dirección de bodega para cada productor (dirección del shipper en FedEx)
ALTER TABLE "productores"
  ADD COLUMN IF NOT EXISTS "bodega_calle"          VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "bodega_ciudad"         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "bodega_estado"         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "bodega_codigo_postal"  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "bodega_pais_iso2"      CHAR(2) DEFAULT 'MX',
  ADD COLUMN IF NOT EXISTS "bodega_telefono"       VARCHAR(30);

-- B25: Ampliar precisión de pagos.monto de Decimal(10,2) a Decimal(14,2)
ALTER TABLE "pagos" ALTER COLUMN "monto" TYPE DECIMAL(14,2);

-- B17: Agregar monto_reembolsado para tracking de refunds parciales
ALTER TABLE "pagos" ADD COLUMN "monto_reembolsado" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- Índice por proveedor para reportes/reconciliación
CREATE INDEX IF NOT EXISTS "idx_pagos_proveedor" ON "pagos"("proveedor");

-- B23: Tabla payment_fees para registrar comisiones del procesador de pago
CREATE TABLE "payment_fees" (
    "id_fee"      BIGSERIAL PRIMARY KEY,
    "id_pago"     BIGINT NOT NULL,
    "proveedor"   VARCHAR(50) NOT NULL,
    "monto_fee"   DECIMAL(14,6) NOT NULL,
    "moneda"      CHAR(3) NOT NULL,
    "porcentaje"  DECIMAL(6,4),
    "monto_fijo"  DECIMAL(14,2),
    "descripcion" VARCHAR(200),
    "creado_en"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "payment_fees_id_pago_fkey"
        FOREIGN KEY ("id_pago") REFERENCES "pagos"("id_pago")
        ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS "idx_payment_fees_pago" ON "payment_fees"("id_pago");

-- B24: Tabla refunds para tracking completo de devoluciones
CREATE TABLE "refunds" (
    "id_refund"        BIGSERIAL PRIMARY KEY,
    "id_pago"          BIGINT NOT NULL,
    "id_pedido"        BIGINT NOT NULL,
    "monto"            DECIMAL(14,2) NOT NULL,
    "moneda"           CHAR(3) NOT NULL,
    "motivo"           VARCHAR(500),
    "estado"           VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    "tipo"             VARCHAR(20) NOT NULL DEFAULT 'total',
    "proveedor_ref_id" VARCHAR(150),
    "solicitado_en"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "procesado_en"     TIMESTAMPTZ,
    CONSTRAINT "refunds_id_pago_fkey"
        FOREIGN KEY ("id_pago") REFERENCES "pagos"("id_pago")
        ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "refunds_id_pedido_fkey"
        FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido")
        ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS "idx_refunds_pago"    ON "refunds"("id_pago");
CREATE INDEX IF NOT EXISTS "idx_refunds_pedido"  ON "refunds"("id_pedido");
CREATE INDEX IF NOT EXISTS "idx_refunds_estado"  ON "refunds"("estado");
