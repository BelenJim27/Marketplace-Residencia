-- C-4: cobro nativo en USD para destinos != MX, con contabilidad/payout en MXN.
-- monto/moneda en `pagos` pasan a ser el CARGO REAL al cliente (USD o MXN). Se agrega
-- el equivalente en MXN y la tasa MXN→USD congelada al momento del checkout, para que la
-- contabilidad y los payouts a productores sigan en MXN. Nullable: filas existentes (todas
-- en MXN) quedan con monto_mxn = monto implícito y tasa = 1 a nivel de lectura.

ALTER TABLE "pagos" ADD COLUMN "monto_mxn" DECIMAL(14, 2);
ALTER TABLE "pagos" ADD COLUMN "tasa_cambio" DECIMAL(18, 8);
